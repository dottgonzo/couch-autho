"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Promise = require("bluebird");
var _ = require("lodash");
var couchjsonconf_1 = require("couchjsonconf");
var uid = require("uid");
var rpj = require("request-promise-json");
function testlogin(internal_couchdb, user, password, db) {
    return new Promise(function (resolve, reject) {
        rpj.get(internal_couchdb.for(user, password, db)).then(function () {
            resolve(true);
        }).catch(function (err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err);
            }
            reject(err);
        });
    });
}
function testapp_id(internal_couchdb, app_id) {
    return new Promise(function (resolve, reject) {
        rpj.get(internal_couchdb.my('app_' + app_id)).then(function () {
            resolve(true);
        }).catch(function (err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err);
            }
            reject(err);
        });
    });
}
function testauth(internal_couchdb, user, password, app_id) {
    return new Promise(function (resolve, reject) {
        getuserapp(user, password, app_id).then(function (db) {
            testlogin(internal_couchdb, user, password, db).then(function () {
                resolve(true);
            }).catch(function (err) {
                if (err.statusCode != 404) {
                    throw Error("ERROR!!!" + err);
                }
                reject(err);
            });
        }).catch(function (err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err);
            }
            reject(err);
        });
    });
}
function getuserdb(internal_couchdb, username) {
    return new Promise(function (resolve, reject) {
        rpj.get(internal_couchdb.my('_users/org.couchdb.user:' + username)).then(function (doc) {
            resolve(doc);
        }).catch(function (err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err);
            }
            reject(err);
        });
    });
}
function getuserdbs(internal_couchdb, username) {
    return new Promise(function (resolve, reject) {
        getuserdb(internal_couchdb, username).then(function (doc) {
            resolve(doc.db);
        }).catch(function (err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err);
            }
            reject(err);
        });
    });
}
function getuserapp(internal_couchdb, username, app_id) {
    return new Promise(function (resolve, reject) {
        getuserdbs(internal_couchdb, username).then(function (doc) {
            _.map(doc, function (d) {
                if (d.app_id == app_id && d.dbtype == 'mine') {
                    resolve(d);
                }
            });
        }).catch(function (err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err);
            }
            reject(err);
        });
    });
}
function getmymachine(internal_couchdb, app_id, username, label) {
    return new Promise(function (resolve, reject) {
        getuserdbs(internal_couchdb, username).then(function (doc) {
            _.map(doc, function (d) {
                if (d.app_id == app_id && d.dbtype == 'machine' && d.label == label) {
                    resolve(d);
                }
            });
        }).catch(function (err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err);
            }
            reject(err);
        });
    });
}
function getmymachines(internal_couchdb, app_id, username) {
    return new Promise(function (resolve, reject) {
        getuserdbs(internal_couchdb, username).then(function (doc) {
            var dbs = [];
            _.map(doc, function (d) {
                if (d.app_id == app_id && d.dbtype == 'machine') {
                    dbs.push(d);
                }
            });
            resolve(dbs);
        }).catch(function (err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err);
            }
            reject(err);
        });
    });
}
function create_slave_userapp(internal_couchdb, username, userappdb) {
    return new Promise(function (resolve, reject) {
        var slave = random_slave(username);
        rpj.put(internal_couchdb.my('/_users/org.couchdb.user:' + slave.user), {
            name: slave.user,
            roles: ['slave'],
            app: { db: userappdb, user: username },
            dbtype: "userslave",
            type: "user",
            password: slave.password
        }).then(function () {
            resolve(slave);
        }).catch(function (err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err);
            }
            reject(err);
        });
    });
}
function subscribeapp(internal_couchdb, app_id, username, owner) {
    return new Promise(function (resolve, reject) {
        getuserdb(internal_couchdb, username).then(function (doc) {
            var newuserdb = gen_db('member', { username: username, app_id: app_id });
            create_slave_userapp(internal_couchdb, username, newuserdb).then(function (slave) {
                var newdb = { app_id: app_id, dbname: newuserdb, slave: { username: slave.user, password: slave.password }, dbtype: "mine", roles: ['owner'] };
                doc.db.push(newdb);
                if (owner) {
                    doc.roles.push('app_' + app_id);
                    var startapp = { app_id: app_id, dbname: 'app_' + app_id, dbtype: "application", roles: ['owner'] };
                    doc.db.push(startapp);
                }
                rpj.put(internal_couchdb.my('/_users/org.couchdb.user:' + username), doc).then(function () {
                    rpj.put(internal_couchdb.my('/' + newuserdb), doc).then(function () {
                        rpj.put(internal_couchdb.my('/' + newuserdb + '/_security'), { "members": { "names": [username, slave.user], "roles": [] } }).then(function () {
                            resolve(true);
                        }).catch(function (err) {
                            if (err.statusCode != 404) {
                                throw Error("ERROR!!!" + err);
                            }
                            reject(err);
                        });
                    }).catch(function (err) {
                        if (err.statusCode != 404) {
                            throw Error("ERROR!!!" + err);
                        }
                        reject(err);
                    });
                }).catch(function (err) {
                    if (err.statusCode != 404) {
                        throw Error("ERROR!!!" + err);
                    }
                    reject(err);
                });
            }).catch(function (err) {
                if (err.statusCode != 404) {
                    throw Error("ERROR!!!" + err);
                }
                reject(err);
            });
        }).catch(function (err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err);
            }
            reject(err);
        });
    });
}
function createapp(internal_couchdb, app_id) {
    return new Promise(function (resolve, reject) {
        rpj.put(internal_couchdb.my('app_' + app_id)).then(function () {
            rpj.put(internal_couchdb.my('/app_' + app_id + '/_design/auth'), {
                "language": "javascript",
                "validate_doc_update": "function(n,o,u){if(n._id&&!n._id.indexOf(\"_local/\"))return;if(!u||!u.roles||u.roles.indexOf(\"app_" + app_id + "\")==-1){throw({forbidden:'Denied.'})}}"
            }).then(function () {
                resolve(true);
            }).catch(function (err) {
                if (err.statusCode != 404) {
                    throw Error("ERROR!!!" + err);
                }
                reject(err);
            });
        }).catch(function (err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err);
            }
            reject(err);
        });
    });
}
function createappforuser(internal_couchdb, app_id, username) {
    return new Promise(function (resolve, reject) {
        createapp(internal_couchdb, app_id).then(function () {
            subscribeapp(internal_couchdb, app_id, username, true).then(function () {
                resolve(true);
            }).catch(function (err) {
                if (err.statusCode != 404) {
                    throw Error("ERROR!!!" + err);
                }
                reject(err);
            });
        }).catch(function (err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err);
            }
            reject(err);
        });
    });
}
function sharemach(internal_couchdb, app_id, user, label, friend) {
    var internal_couchdb = this;
    return new Promise(function (resolve, reject) {
        getmymachine(internal_couchdb, app_id, user, label).then(function (m) {
            getuserapp(internal_couchdb, app_id, friend).then(function () {
                getmymachine(internal_couchdb, app_id, friend, label).then(function () {
                    resolve(true);
                }).catch(function (err) {
                    var newdb = { app_id: app_id, dbname: machinedb, slave: { username: machineuser, password: machinepassw, token: machinetoken }, label: label, dbtype: "machine", roles: ['shared'] };
                    doc.db.push(newdb);
                    rpj.put(internal_couchdb.my('/_users/org.couchdb.user:' + friend), doc).then(function () {
                        rpj.get(internal_couchdb.my('/_users/org.couchdb.user:' + machineuser), doc).then(function (updateslave) {
                            updateslave.app.users.push(newusername);
                            rpj.put(internal_couchdb.my('/_users/org.couchdb.user:' + machineuser), updateslave).then(function () {
                                resolve(true);
                            }).catch(function (err) {
                                if (err.statusCode != 404) {
                                    throw Error("ERROR!!!" + err);
                                }
                                reject(err);
                            });
                        }).catch(function (err) {
                            if (err.statusCode != 404) {
                                throw Error("ERROR!!!" + err);
                            }
                            reject(err);
                        });
                    }).catch(function (err) {
                        if (err.statusCode != 404) {
                            throw Error("ERROR!!!" + err);
                        }
                        reject(err);
                    });
                });
            }).catch(function (err) {
                if (err.statusCode != 404) {
                    throw Error("ERROR!!!" + err);
                }
                reject(err);
            });
        }).catch(function (err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err);
            }
            reject(err);
        });
    });
}
var couchAccess = (function (_super) {
    __extends(couchAccess, _super);
    function couchAccess(rootaccessdb) {
        _super.call(this, rootaccessdb);
        var that = this;
        rpj.get(that.my('app_main')).then(function () {
            return true;
        }).catch(function (err) {
            rpj.put(that.my('app_main')).then(function () {
                return true;
            }).catch(function (err) {
                throw Error('can\'t create main app');
            });
        });
    }
    couchAccess.prototype.testlogin = function (user, password, db) {
        return testlogin(this, user, password, db);
    };
    couchAccess.prototype.testapp_id = function (app_id) {
        return testapp_id(this, app_id);
    };
    couchAccess.prototype.testauth = function (user, password, app_id) {
        return testauth(this, user, password, app_id);
    };
    couchAccess.prototype.getuserdbs = function (username) {
        return getuserdbs(this, username);
    };
    couchAccess.prototype.getuserapp = function (username, app_id) {
        return getuserapp(this, username, app_id);
    };
    couchAccess.prototype.getmymachine = function (app_id, username, label) {
        return getmymachine(this, app_id, username, label);
    };
    couchAccess.prototype.getmymachines = function (app_id, username) {
        return getmymachines(this, app_id, username);
    };
    couchAccess.prototype.create_slave_userapp = function (username, userdb) {
        return create_slave_userapp(this, username, userdb);
    };
    couchAccess.prototype.subscribeapp = function (app_id, username, owner) {
        return subscribeapp(this, app_id, username, owner);
    };
    couchAccess.prototype.createapp = function (app_id, username) {
        return createappforuser(this, app_id, username);
    };
    couchAccess.prototype.sharemach = function (app_id, user, label, friend) {
        return sharemach(this, app_id, user, label, friend);
    };
    return couchAccess;
}(couchjsonconf_1.default));
function gen_db(kind, data) {
    switch (kind) {
        case 'member':
            return 'mem_' + uid(3) + '_' + data.app_id + '_' + data.username;
            break;
        case 'machine':
            return 'mach_' + uid(6) + '_' + data.app_id;
            break;
    }
}
function random_slave(username) {
    return {
        password: uid(12),
        user: 'sl_' + username + '_' + uid(6)
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = couchAccess;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLElBQVksT0FBTyxXQUFNLFVBQVUsQ0FBQyxDQUFBO0FBQ3BDLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBRTVCLDhCQUEwQixlQUFlLENBQUMsQ0FBQTtBQUUxQyxJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDekIsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7QUF1QzFDLG1CQUFtQixnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUU7SUFJbkQsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFVLFVBQVUsT0FBTyxFQUFFLE1BQU07UUFDakQsR0FBRyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNuRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDakIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRztZQUNsQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hCLE1BQU0sS0FBSyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsQ0FBQTtZQUNqQyxDQUFDO1lBRUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2YsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDLENBQUMsQ0FBQTtBQUVOLENBQUM7QUFHRCxvQkFBb0IsZ0JBQWdCLEVBQUUsTUFBTTtJQU14QyxNQUFNLENBQUMsSUFBSSxPQUFPLENBQVUsVUFBVSxPQUFPLEVBQUUsTUFBTTtRQUNqRCxHQUFHLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDL0MsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2pCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7WUFFbEIsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN4QixNQUFNLEtBQUssQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUE7WUFDakMsQ0FBQztZQUVELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNmLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQyxDQUFDLENBQUE7QUFDTixDQUFDO0FBT0Qsa0JBQWtCLGdCQUFnQixFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsTUFBTTtJQVF0RCxNQUFNLENBQUMsSUFBSSxPQUFPLENBQUMsVUFBVSxPQUFPLEVBQUUsTUFBTTtRQUN4QyxVQUFVLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ2hELFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDakQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2pCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7Z0JBQ2xCLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDeEIsTUFBTSxLQUFLLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFBO2dCQUNqQyxDQUFDO2dCQUVELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNmLENBQUMsQ0FBQyxDQUFBO1FBQ04sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRztZQUNsQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hCLE1BQU0sS0FBSyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsQ0FBQTtZQUNqQyxDQUFDO1lBRUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2YsQ0FBQyxDQUFDLENBQUE7SUFFTixDQUFDLENBQUMsQ0FBQTtBQUVOLENBQUM7QUFNRCxtQkFBbUIsZ0JBQWdCLEVBQUUsUUFBUTtJQUt6QyxNQUFNLENBQUMsSUFBSSxPQUFPLENBQVUsVUFBVSxPQUFPLEVBQUUsTUFBTTtRQUNqRCxHQUFHLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQywwQkFBMEIsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUc7WUFDbEYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2hCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7WUFDbEIsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN4QixNQUFNLEtBQUssQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUE7WUFDakMsQ0FBQztZQUVELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNmLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQyxDQUFDLENBQUE7QUFDTixDQUFDO0FBR0Qsb0JBQW9CLGdCQUFnQixFQUFFLFFBQVE7SUFJMUMsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFjLFVBQVUsT0FBTyxFQUFFLE1BQU07UUFDckQsU0FBUyxDQUFDLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUc7WUFDcEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNuQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO1lBQ2xCLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDeEIsTUFBTSxLQUFLLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFBO1lBQ2pDLENBQUM7WUFFRCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDZixDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUMsQ0FBQyxDQUFBO0FBQ04sQ0FBQztBQUlELG9CQUFvQixnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsTUFBTTtJQU1sRCxNQUFNLENBQUMsSUFBSSxPQUFPLENBQVksVUFBVSxPQUFPLEVBQUUsTUFBTTtRQUNuRCxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRztZQUNyRCxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUM7Z0JBQ2xCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQztvQkFDM0MsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNkLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7WUFDbEIsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN4QixNQUFNLEtBQUssQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUE7WUFDakMsQ0FBQztZQUVELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNmLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQyxDQUFDLENBQUE7QUFDTixDQUFDO0FBSUQsc0JBQXNCLGdCQUFnQixFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsS0FBSztJQUszRCxNQUFNLENBQUMsSUFBSSxPQUFPLENBQVksVUFBVSxPQUFPLEVBQUUsTUFBTTtRQUNuRCxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRztZQUNyRCxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUM7Z0JBQ2xCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLElBQUksU0FBUyxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQztvQkFDbEUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNkLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7WUFDbEIsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN4QixNQUFNLEtBQUssQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUE7WUFDakMsQ0FBQztZQUVELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNmLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQyxDQUFDLENBQUE7QUFDTixDQUFDO0FBRUQsdUJBQXVCLGdCQUFnQixFQUFFLE1BQU0sRUFBRSxRQUFRO0lBS3JELE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBYyxVQUFVLE9BQU8sRUFBRSxNQUFNO1FBQ3JELFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRSxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHO1lBQ3JELElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztZQUNiLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQztnQkFDbEIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxNQUFNLElBQUksQ0FBQyxDQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDO29CQUM5QyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNmLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQTtZQUNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNoQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO1lBQ2xCLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDeEIsTUFBTSxLQUFLLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFBO1lBQ2pDLENBQUM7WUFFRCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDZixDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUMsQ0FBQyxDQUFBO0FBQ04sQ0FBQztBQUdELDhCQUE4QixnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsU0FBUztJQVEvRCxNQUFNLENBQUMsSUFBSSxPQUFPLENBQXFDLFVBQVUsT0FBTyxFQUFFLE1BQU07UUFDNUUsSUFBSSxLQUFLLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ25DLEdBQUcsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLDJCQUEyQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNuRSxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDaEIsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDO1lBQ2hCLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTtZQUN0QyxNQUFNLEVBQUUsV0FBVztZQUNuQixJQUFJLEVBQUUsTUFBTTtZQUNaLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUTtTQUMzQixDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ0osT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2xCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7WUFDbEIsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN4QixNQUFNLEtBQUssQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUE7WUFDakMsQ0FBQztZQUVELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNmLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxDQUFDLENBQUE7QUFDTixDQUFDO0FBRUQsc0JBQXNCLGdCQUFnQixFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsS0FBSztJQVEzRCxNQUFNLENBQUMsSUFBSSxPQUFPLENBQVUsVUFBVSxPQUFPLEVBQUUsTUFBTTtRQUVqRCxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRztZQUVwRCxJQUFJLFNBQVMsR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUV6RSxvQkFBb0IsQ0FBQyxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsS0FBSztnQkFFNUUsSUFBSSxLQUFLLEdBQUcsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQy9JLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUVuQixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO29CQUNSLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsQ0FBQztvQkFDaEMsSUFBSSxRQUFRLEdBQUcsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEdBQUcsTUFBTSxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDcEcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzFCLENBQUM7Z0JBRUQsR0FBRyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsMkJBQTJCLEdBQUcsUUFBUSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO29CQUMzRSxHQUFHLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsU0FBUyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO3dCQUNwRCxHQUFHLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsU0FBUyxHQUFHLFlBQVksQ0FBQyxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQzs0QkFDL0gsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO3dCQVFqQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHOzRCQUNsQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0NBQ3hCLE1BQU0sS0FBSyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsQ0FBQTs0QkFDakMsQ0FBQzs0QkFFRCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7d0JBQ2YsQ0FBQyxDQUFDLENBQUE7b0JBQ04sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRzt3QkFDbEIsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDOzRCQUN4QixNQUFNLEtBQUssQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUE7d0JBQ2pDLENBQUM7d0JBRUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO29CQUNmLENBQUMsQ0FBQyxDQUFBO2dCQUNOLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7b0JBQ2xCLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQzt3QkFDeEIsTUFBTSxLQUFLLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFBO29CQUNqQyxDQUFDO29CQUVELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDZixDQUFDLENBQUMsQ0FBQTtZQUNOLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7Z0JBQ2xCLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDeEIsTUFBTSxLQUFLLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFBO2dCQUNqQyxDQUFDO2dCQUVELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNmLENBQUMsQ0FBQyxDQUFBO1FBQ04sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRztZQUNsQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hCLE1BQU0sS0FBSyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsQ0FBQTtZQUNqQyxDQUFDO1lBRUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2YsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDLENBQUMsQ0FBQTtBQUNOLENBQUM7QUFFRCxtQkFBbUIsZ0JBQWdCLEVBQUUsTUFBTTtJQU12QyxNQUFNLENBQUMsSUFBSSxPQUFPLENBQVUsVUFBVSxPQUFPLEVBQUUsTUFBTTtRQUVqRCxHQUFHLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDL0MsR0FBRyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsT0FBTyxHQUFHLE1BQU0sR0FBRyxlQUFlLENBQUMsRUFBRTtnQkFDN0QsVUFBVSxFQUFFLFlBQVk7Z0JBQ3hCLHFCQUFxQixFQUFFLHNHQUFzRyxHQUFHLE1BQU0sR0FBRyx5Q0FBeUM7YUFDckwsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDSixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDakIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRztnQkFDbEIsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUN4QixNQUFNLEtBQUssQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUE7Z0JBQ2pDLENBQUM7Z0JBRUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2YsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO1lBQ2xCLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDeEIsTUFBTSxLQUFLLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFBO1lBQ2pDLENBQUM7WUFFRCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDZixDQUFDLENBQUMsQ0FBQTtJQUVOLENBQUMsQ0FBQyxDQUFBO0FBRU4sQ0FBQztBQU1ELDBCQUEwQixnQkFBZ0IsRUFBRSxNQUFNLEVBQUUsUUFBUTtJQUt4RCxNQUFNLENBQUMsSUFBSSxPQUFPLENBQVUsVUFBVSxPQUFPLEVBQUUsTUFBTTtRQUdqRCxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3JDLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDeEQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2pCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7Z0JBQ2xCLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDeEIsTUFBTSxLQUFLLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFBO2dCQUNqQyxDQUFDO2dCQUVELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNmLENBQUMsQ0FBQyxDQUFBO1FBQ04sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRztZQUNsQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hCLE1BQU0sS0FBSyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsQ0FBQTtZQUNqQyxDQUFDO1lBRUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2YsQ0FBQyxDQUFDLENBQUE7SUFLTixDQUFDLENBQUMsQ0FBQTtBQUNOLENBQUM7QUFTRCxtQkFBbUIsZ0JBQWdCLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTTtJQUM1RCxJQUFJLGdCQUFnQixHQUFHLElBQUksQ0FBQTtJQUUzQixNQUFNLENBQUMsSUFBSSxPQUFPLENBQVUsVUFBVSxPQUFPLEVBQUUsTUFBTTtRQUNqRCxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBRWhFLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUU5QyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUM7b0JBQ3ZELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDakIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRztvQkFFbEIsSUFBSSxLQUFLLEdBQWMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztvQkFDaE0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBRWxCLEdBQUcsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLDJCQUEyQixHQUFHLE1BQU0sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQzt3QkFFekUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsMkJBQTJCLEdBQUcsV0FBVyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsV0FBVzs0QkFFbkcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDOzRCQUV4QyxHQUFHLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQywyQkFBMkIsR0FBRyxXQUFXLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0NBQ3RGLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTs0QkFDakIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRztnQ0FDbEIsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO29DQUN4QixNQUFNLEtBQUssQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUE7Z0NBQ2pDLENBQUM7Z0NBRUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBOzRCQUNmLENBQUMsQ0FBQyxDQUFBO3dCQUNOLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7NEJBQ2xCLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztnQ0FDeEIsTUFBTSxLQUFLLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFBOzRCQUNqQyxDQUFDOzRCQUVELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTt3QkFDZixDQUFDLENBQUMsQ0FBQTtvQkFDTixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO3dCQUNsQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7NEJBQ3hCLE1BQU0sS0FBSyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsQ0FBQTt3QkFDakMsQ0FBQzt3QkFFRCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7b0JBQ2YsQ0FBQyxDQUFDLENBQUE7Z0JBQ04sQ0FBQyxDQUFDLENBQUE7WUFDTixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO2dCQUNsQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQ3hCLE1BQU0sS0FBSyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsQ0FBQTtnQkFDakMsQ0FBQztnQkFFRCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDZixDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7WUFDbEIsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN4QixNQUFNLEtBQUssQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUE7WUFDakMsQ0FBQztZQUVELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNmLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQyxDQUFDLENBQUE7QUFDTixDQUFDO0FBZ0JEO0lBQTBCLCtCQUFhO0lBRW5DLHFCQUFZLFlBQXdCO1FBQ2hDLGtCQUFNLFlBQVksQ0FBQyxDQUFBO1FBRW5CLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQztRQUVoQixHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDOUIsTUFBTSxDQUFDLElBQUksQ0FBQTtRQUNmLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7WUFFbEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUM5QixNQUFNLENBQUMsSUFBSSxDQUFBO1lBQ2YsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRztnQkFFbEIsTUFBTSxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztZQUUxQyxDQUFDLENBQUMsQ0FBQTtRQUVOLENBQUMsQ0FBQyxDQUFBO0lBR04sQ0FBQztJQUVELCtCQUFTLEdBQVQsVUFBVSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUU7UUFHeEIsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBR0QsZ0NBQVUsR0FBVixVQUFXLE1BQU07UUFHYixNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBSUQsOEJBQVEsR0FBUixVQUFTLElBQUksRUFBRSxRQUFRLEVBQUUsTUFBTTtRQUMzQixNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBRWpELENBQUM7SUFLRCxnQ0FBVSxHQUFWLFVBQVcsUUFBUTtRQUVmLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFJRCxnQ0FBVSxHQUFWLFVBQVcsUUFBUSxFQUFFLE1BQU07UUFFdkIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQzdDLENBQUM7SUFJRCxrQ0FBWSxHQUFaLFVBQWEsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLO1FBRWhDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDdEQsQ0FBQztJQUVELG1DQUFhLEdBQWIsVUFBYyxNQUFNLEVBQUUsUUFBUTtRQUUxQixNQUFNLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDaEQsQ0FBQztJQUdELDBDQUFvQixHQUFwQixVQUFxQixRQUFRLEVBQUUsTUFBTTtRQUdqQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUN2RCxDQUFDO0lBRUQsa0NBQVksR0FBWixVQUFhLE1BQU0sRUFBRSxRQUFRLEVBQUUsS0FBSztRQUloQyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3RELENBQUM7SUFFRCwrQkFBUyxHQUFULFVBQVUsTUFBTSxFQUFFLFFBQVE7UUFHdEIsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFFbkQsQ0FBQztJQUdELCtCQUFTLEdBQVQsVUFBVSxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxNQUFNO1FBSWpDLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFPTCxrQkFBQztBQUFELENBekdBLEFBeUdDLENBekd5Qix1QkFBYSxHQXlHdEM7QUFHRCxnQkFBZ0IsSUFBSSxFQUFFLElBQUk7SUFDdEIsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNYLEtBQUssUUFBUTtZQUNULE1BQU0sQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQ2pFLEtBQUssQ0FBQztRQUNWLEtBQUssU0FBUztZQUNWLE1BQU0sQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQzVDLEtBQUssQ0FBQztJQUVkLENBQUM7QUFDTCxDQUFDO0FBQ0Qsc0JBQXNCLFFBQVE7SUFFMUIsTUFBTSxDQUFDO1FBQ0gsUUFBUSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDakIsSUFBSSxFQUFFLEtBQUssR0FBRyxRQUFRLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7S0FDeEMsQ0FBQTtBQUVMLENBQUM7QUFHRDtrQkFBZSxXQUFXLENBQUEiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBQcm9taXNlIGZyb20gXCJibHVlYmlyZFwiO1xuaW1wb3J0ICogYXMgXyBmcm9tIFwibG9kYXNoXCI7XG5cbmltcG9ydCBjb3VjaEpzb25Db25mIGZyb20gXCJjb3VjaGpzb25jb25mXCI7XG5cbmxldCB1aWQgPSByZXF1aXJlKFwidWlkXCIpO1xubGV0IHJwaiA9IHJlcXVpcmUoXCJyZXF1ZXN0LXByb21pc2UtanNvblwiKTtcblxuXG5cblxuXG5pbnRlcmZhY2UgSWNvbW1vbkRCIHtcbiAgICBhcHBfaWQ6IHN0cmluZztcbiAgICBkYm5hbWU6IHN0cmluZztcbiAgICBzbGF2ZT86IHtcbiAgICAgICAgdXNlcm5hbWU6IHN0cmluZztcbiAgICAgICAgcGFzc3dvcmQ6IHN0cmluZztcbiAgICB9LFxuICAgIGRidHlwZTogc3RyaW5nXG4gICAgcm9sZXM6IHN0cmluZ1tdO1xuICAgIGxhYmVsPzogc3RyaW5nO1xufVxuXG5cbmludGVyZmFjZSBJVXNlckRCIHtcbiAgICBfaWQ6IHN0cmluZyxcbiAgICBfcmV2OiBzdHJpbmcsXG4gICAgcGFzc3dvcmRfc2NoZW1lOiBzdHJpbmc7XG4gICAgaXRlcmF0aW9uczogc3RyaW5nO1xuICAgIG5hbWU6IHN0cmluZztcbiAgICBlbWFpbDogc3RyaW5nO1xuICAgIGRiOiBJY29tbW9uREJbXTtcbiAgICByb2xlczogc3RyaW5nW107XG4gICAgdHlwZTogc3RyaW5nO1xuICAgIGRlcml2ZWRfa2V5OiBzdHJpbmc7XG4gICAgc2FsdDogc3RyaW5nO1xuXG59XG5cblxuXG5cblxuXG5mdW5jdGlvbiB0ZXN0bG9naW4oaW50ZXJuYWxfY291Y2hkYiwgdXNlciwgcGFzc3dvcmQsIGRiKSB7XG5cbiAgICAvLyByZXR1cm4gdHJ1ZSBpZiBjcmVkZW50aWFscyBhcmUgY29ycmVjdCBmb3IgZ2l2ZW4gZGJcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHJwai5nZXQoaW50ZXJuYWxfY291Y2hkYi5mb3IodXNlciwgcGFzc3dvcmQsIGRiKSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIuc3RhdHVzQ29kZSAhPSA0MDQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkVSUk9SISEhXCIgKyBlcnIpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgIH0pXG4gICAgfSlcblxufVxuXG5cbmZ1bmN0aW9uIHRlc3RhcHBfaWQoaW50ZXJuYWxfY291Y2hkYiwgYXBwX2lkKSB7XG5cblxuICAgIC8vIHJldHVybiB0cnVlIGlmIGFwcF9pZCBleGlzdFxuXG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBycGouZ2V0KGludGVybmFsX2NvdWNoZGIubXkoJ2FwcF8nICsgYXBwX2lkKSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcblxuICAgICAgICAgICAgaWYgKGVyci5zdGF0dXNDb2RlICE9IDQwNCkge1xuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgfSlcbiAgICB9KVxufVxuXG5cblxuXG5cblxuZnVuY3Rpb24gdGVzdGF1dGgoaW50ZXJuYWxfY291Y2hkYiwgdXNlciwgcGFzc3dvcmQsIGFwcF9pZCkge1xuXG5cbiAgICAvLyByZXR1cm4gdHJ1ZSBpZiBjcmVkZW50aWFscyBhcmUgY29ycmVjdCBmb3IgZ2l2ZW4gYXBwX2lkXG5cbiAgICAvLyBnZXQgdXNlciBjcmVkZW50aWFscyBieSB1c2VybmFtZSBhbmQgcGFzc3dvcmQgYW5kIHRha2UgdGhlIGFwcF9pZCBkYiwgdGhlbiB0ZXN0IGxvZ2luIHdpdGggaXRcblxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZ2V0dXNlcmFwcCh1c2VyLCBwYXNzd29yZCwgYXBwX2lkKS50aGVuKGZ1bmN0aW9uIChkYikge1xuICAgICAgICAgICAgdGVzdGxvZ2luKGludGVybmFsX2NvdWNoZGIsIHVzZXIsIHBhc3N3b3JkLCBkYikudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChlcnIuc3RhdHVzQ29kZSAhPSA0MDQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJFUlJPUiEhIVwiICsgZXJyKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyLnN0YXR1c0NvZGUgIT0gNDA0KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJFUlJPUiEhIVwiICsgZXJyKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICB9KVxuXG4gICAgfSlcblxufVxuXG5cblxuXG5cbmZ1bmN0aW9uIGdldHVzZXJkYihpbnRlcm5hbF9jb3VjaGRiLCB1c2VybmFtZSkge1xuXG4gICAgLy8gcmV0dXJuIGFsbCB0aGUgdXNlciBkb2MgaW4gX3VzZXJzXG5cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxJVXNlckRCPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHJwai5nZXQoaW50ZXJuYWxfY291Y2hkYi5teSgnX3VzZXJzL29yZy5jb3VjaGRiLnVzZXI6JyArIHVzZXJuYW1lKSkudGhlbihmdW5jdGlvbiAoZG9jKSB7XG4gICAgICAgICAgICByZXNvbHZlKGRvYylcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgaWYgKGVyci5zdGF0dXNDb2RlICE9IDQwNCkge1xuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgfSlcbiAgICB9KVxufVxuXG5cbmZ1bmN0aW9uIGdldHVzZXJkYnMoaW50ZXJuYWxfY291Y2hkYiwgdXNlcm5hbWUpIHtcblxuICAgIC8vIHJldHVybiBhbGwgdGhlIHVzZXIgY3JlZGVudGlhbHMgZm9yIGV2ZXJ5IGFwcGxpY2F0aW9uIHdoaWNoIHRoZXkgaGF2ZSBhY2Nlc3MgKGludGVybmFsKVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPEljb21tb25EQltdPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGdldHVzZXJkYihpbnRlcm5hbF9jb3VjaGRiLCB1c2VybmFtZSkudGhlbihmdW5jdGlvbiAoZG9jKSB7XG4gICAgICAgICAgICByZXNvbHZlKGRvYy5kYilcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgaWYgKGVyci5zdGF0dXNDb2RlICE9IDQwNCkge1xuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgfSlcbiAgICB9KVxufVxuXG5cblxuZnVuY3Rpb24gZ2V0dXNlcmFwcChpbnRlcm5hbF9jb3VjaGRiLCB1c2VybmFtZSwgYXBwX2lkKSB7XG5cblxuICAgIC8vIHJldHVybiB1c2VyIGNyZWRlbnRpYWxzIChpbnRlcm5hbClcblxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPEljb21tb25EQj4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBnZXR1c2VyZGJzKGludGVybmFsX2NvdWNoZGIsIHVzZXJuYW1lKS50aGVuKGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgICAgICAgIF8ubWFwKGRvYywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZC5hcHBfaWQgPT0gYXBwX2lkICYmIGQuZGJ0eXBlID09ICdtaW5lJykge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGQpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgaWYgKGVyci5zdGF0dXNDb2RlICE9IDQwNCkge1xuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgfSlcbiAgICB9KVxufVxuXG5cblxuZnVuY3Rpb24gZ2V0bXltYWNoaW5lKGludGVybmFsX2NvdWNoZGIsIGFwcF9pZCwgdXNlcm5hbWUsIGxhYmVsKSB7XG5cblxuICAgIC8vIHJldHVybiBjcmVkZW50aWFscyBieSBhcHBsaWNhdGlvbiBhbmQgbGFiZWwgIChpbnRlcm5hbClcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxJY29tbW9uREI+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZ2V0dXNlcmRicyhpbnRlcm5hbF9jb3VjaGRiLCB1c2VybmFtZSkudGhlbihmdW5jdGlvbiAoZG9jKSB7XG4gICAgICAgICAgICBfLm1hcChkb2MsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGQuYXBwX2lkID09IGFwcF9pZCAmJiBkLmRidHlwZSA9PSAnbWFjaGluZScgJiYgZC5sYWJlbCA9PSBsYWJlbCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGQpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgaWYgKGVyci5zdGF0dXNDb2RlICE9IDQwNCkge1xuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgfSlcbiAgICB9KVxufVxuXG5mdW5jdGlvbiBnZXRteW1hY2hpbmVzKGludGVybmFsX2NvdWNoZGIsIGFwcF9pZCwgdXNlcm5hbWUpIHtcblxuXG4gICAgLy8gcmV0dXJuIGFsbCB1c2VyIGNyZWRlbnRpYWxzIGZvciBpdCdzIG1hY2hpbmVzIChpbnRlcm5hbClcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxJY29tbW9uREJbXT4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBnZXR1c2VyZGJzKGludGVybmFsX2NvdWNoZGIsIHVzZXJuYW1lKS50aGVuKGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgICAgICAgIHZhciBkYnMgPSBbXTtcbiAgICAgICAgICAgIF8ubWFwKGRvYywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZC5hcHBfaWQgPT0gYXBwX2lkICYmIGQuZGJ0eXBlID09ICdtYWNoaW5lJykge1xuICAgICAgICAgICAgICAgICAgICBkYnMucHVzaChkKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICByZXNvbHZlKGRicylcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgaWYgKGVyci5zdGF0dXNDb2RlICE9IDQwNCkge1xuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgfSlcbiAgICB9KVxufVxuXG5cbmZ1bmN0aW9uIGNyZWF0ZV9zbGF2ZV91c2VyYXBwKGludGVybmFsX2NvdWNoZGIsIHVzZXJuYW1lLCB1c2VyYXBwZGIpIHtcblxuICAgIC8vIGNyZWF0ZSB0aGUgdXNlciB0aGF0IHdpbGwgaGF2ZSBhY2Nlc3MgdG8gYSBjb250YWluZXIgKGludGVybmFsKVxuXG4gICAgLy8gcmV0dXJuIHVzZXJuYW1lIGFuZCBwYXNzd29yZCBmb3IgdGhlIHVzZXIgY3JlYXRlZCAocGFzc3dvcmQgaXMgZ2VuZXJhdGVkIGhlcmUpXG5cblxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHsgcGFzc3dvcmQ6IHN0cmluZzsgdXNlcjogc3RyaW5nIH0+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgbGV0IHNsYXZlID0gcmFuZG9tX3NsYXZlKHVzZXJuYW1lKTtcbiAgICAgICAgcnBqLnB1dChpbnRlcm5hbF9jb3VjaGRiLm15KCcvX3VzZXJzL29yZy5jb3VjaGRiLnVzZXI6JyArIHNsYXZlLnVzZXIpLCB7XG4gICAgICAgICAgICBuYW1lOiBzbGF2ZS51c2VyLFxuICAgICAgICAgICAgcm9sZXM6IFsnc2xhdmUnXSxcbiAgICAgICAgICAgIGFwcDogeyBkYjogdXNlcmFwcGRiLCB1c2VyOiB1c2VybmFtZSB9LFxuICAgICAgICAgICAgZGJ0eXBlOiBcInVzZXJzbGF2ZVwiLFxuICAgICAgICAgICAgdHlwZTogXCJ1c2VyXCIsXG4gICAgICAgICAgICBwYXNzd29yZDogc2xhdmUucGFzc3dvcmRcbiAgICAgICAgfSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXNvbHZlKHNsYXZlKVxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyLnN0YXR1c0NvZGUgIT0gNDA0KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJFUlJPUiEhIVwiICsgZXJyKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICB9KTtcbiAgICB9KVxufVxuXG5mdW5jdGlvbiBzdWJzY3JpYmVhcHAoaW50ZXJuYWxfY291Y2hkYiwgYXBwX2lkLCB1c2VybmFtZSwgb3duZXIpIHtcblxuXG4gICAgLy8gZXZlcnkgdXNlciBtdXN0IGhhdmUgYSBwZXJzb25hbCBkYiBmb3IgZXZlcnkgYXBwbGljYXRpb24gdGhhdCB0aGV5IGhhdmUgYWNjZXNzXG4gICAgLy8gd2hlbiBhbiB1c2VyIHN1YnNjcmliZSBhbiBhcHAsIGEgZGIgYW5kIGl0J3Mgc2xhdmUgdXNlciAgd2lsbCBiZSBjcmVhdGVkIGZvciBoaW0sIGFuZCB0aGUgdXNlciBkb2MgaW4gX3VzZXJzIHJlZ2lzdGVyIHRoZSBuZXcgY3JlZGVudGlhbHMgZ2VuZXJhdGVkIFxuXG5cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgZ2V0dXNlcmRiKGludGVybmFsX2NvdWNoZGIsIHVzZXJuYW1lKS50aGVuKGZ1bmN0aW9uIChkb2MpIHtcblxuICAgICAgICAgICAgdmFyIG5ld3VzZXJkYiA9IGdlbl9kYignbWVtYmVyJywgeyB1c2VybmFtZTogdXNlcm5hbWUsIGFwcF9pZDogYXBwX2lkIH0pO1xuXG4gICAgICAgICAgICBjcmVhdGVfc2xhdmVfdXNlcmFwcChpbnRlcm5hbF9jb3VjaGRiLCB1c2VybmFtZSwgbmV3dXNlcmRiKS50aGVuKGZ1bmN0aW9uIChzbGF2ZSkge1xuXG4gICAgICAgICAgICAgICAgdmFyIG5ld2RiID0geyBhcHBfaWQ6IGFwcF9pZCwgZGJuYW1lOiBuZXd1c2VyZGIsIHNsYXZlOiB7IHVzZXJuYW1lOiBzbGF2ZS51c2VyLCBwYXNzd29yZDogc2xhdmUucGFzc3dvcmQgfSwgZGJ0eXBlOiBcIm1pbmVcIiwgcm9sZXM6IFsnb3duZXInXSB9O1xuICAgICAgICAgICAgICAgIGRvYy5kYi5wdXNoKG5ld2RiKTtcblxuICAgICAgICAgICAgICAgIGlmIChvd25lcikge1xuICAgICAgICAgICAgICAgICAgICBkb2Mucm9sZXMucHVzaCgnYXBwXycgKyBhcHBfaWQpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgc3RhcnRhcHAgPSB7IGFwcF9pZDogYXBwX2lkLCBkYm5hbWU6ICdhcHBfJyArIGFwcF9pZCwgZGJ0eXBlOiBcImFwcGxpY2F0aW9uXCIsIHJvbGVzOiBbJ293bmVyJ10gfTtcbiAgICAgICAgICAgICAgICAgICAgZG9jLmRiLnB1c2goc3RhcnRhcHApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJwai5wdXQoaW50ZXJuYWxfY291Y2hkYi5teSgnL191c2Vycy9vcmcuY291Y2hkYi51c2VyOicgKyB1c2VybmFtZSksIGRvYykudGhlbihmdW5jdGlvbiAoKSB7IC8vIHB1c2ggbmV3IHVzZXIgc2V0dGluZ3NcbiAgICAgICAgICAgICAgICAgICAgcnBqLnB1dChpbnRlcm5hbF9jb3VjaGRiLm15KCcvJyArIG5ld3VzZXJkYiksIGRvYykudGhlbihmdW5jdGlvbiAoKSB7ICAvLyBjcmVhdGUgYW4gZW1wdHkgZGJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJwai5wdXQoaW50ZXJuYWxfY291Y2hkYi5teSgnLycgKyBuZXd1c2VyZGIgKyAnL19zZWN1cml0eScpLCB7IFwibWVtYmVyc1wiOiB7IFwibmFtZXNcIjogW3VzZXJuYW1lLCBzbGF2ZS51c2VyXSwgXCJyb2xlc1wiOiBbXSB9IH0pLnRoZW4oZnVuY3Rpb24gKCkgeyAvLyBwdXNoIHNlY3VyaXR5IGNoYW5nZXMgdG8gYXBwIGRiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uZmlybURCLnBvc3Qoe2NvbmZpcm06ZmFsc2V9KS50aGVuKGZ1bmN0aW9uKGRvYyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAvLyAgcmVnaXN0ZXJNYWlsKCdkYXJpb3l6ZkBnbWFpbC5jb20nLGRvYy5pZCk7IC8vIFRPIEJFIEFMSVZFXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gfSkuY2F0Y2goZnVuY3Rpb24oZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyLnN0YXR1c0NvZGUgIT0gNDA0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVyci5zdGF0dXNDb2RlICE9IDQwNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIuc3RhdHVzQ29kZSAhPSA0MDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyLnN0YXR1c0NvZGUgIT0gNDA0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgaWYgKGVyci5zdGF0dXNDb2RlICE9IDQwNCkge1xuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgfSlcbiAgICB9KVxufVxuXG5mdW5jdGlvbiBjcmVhdGVhcHAoaW50ZXJuYWxfY291Y2hkYiwgYXBwX2lkKSB7XG5cbiAgICAvLyBjcmVhdGUgYW4gYXBwbGljYXRpb24gKGltcGVyYXRpdmUpXG4gICAgLy8gcmV0dXJuIHRydWUgb25seVxuXG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgIHJwai5wdXQoaW50ZXJuYWxfY291Y2hkYi5teSgnYXBwXycgKyBhcHBfaWQpKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJwai5wdXQoaW50ZXJuYWxfY291Y2hkYi5teSgnL2FwcF8nICsgYXBwX2lkICsgJy9fZGVzaWduL2F1dGgnKSwge1xuICAgICAgICAgICAgICAgIFwibGFuZ3VhZ2VcIjogXCJqYXZhc2NyaXB0XCIsXG4gICAgICAgICAgICAgICAgXCJ2YWxpZGF0ZV9kb2NfdXBkYXRlXCI6IFwiZnVuY3Rpb24obixvLHUpe2lmKG4uX2lkJiYhbi5faWQuaW5kZXhPZihcXFwiX2xvY2FsL1xcXCIpKXJldHVybjtpZighdXx8IXUucm9sZXN8fHUucm9sZXMuaW5kZXhPZihcXFwiYXBwX1wiICsgYXBwX2lkICsgXCJcXFwiKT09LTEpe3Rocm93KHtmb3JiaWRkZW46J0RlbmllZC4nfSl9fVwiXG4gICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVyci5zdGF0dXNDb2RlICE9IDQwNCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkVSUk9SISEhXCIgKyBlcnIpXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIuc3RhdHVzQ29kZSAhPSA0MDQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkVSUk9SISEhXCIgKyBlcnIpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgIH0pXG5cbiAgICB9KVxuXG59XG5cblxuXG5cblxuZnVuY3Rpb24gY3JlYXRlYXBwZm9ydXNlcihpbnRlcm5hbF9jb3VjaGRiLCBhcHBfaWQsIHVzZXJuYW1lKSB7IC8vIGNyZWF0ZSBhIG5ldyBhcHBsaWNhdGlvblxuXG5cblxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPGJvb2xlYW4+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuXG4gICAgICAgIGNyZWF0ZWFwcChpbnRlcm5hbF9jb3VjaGRiLCBhcHBfaWQpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc3Vic2NyaWJlYXBwKGludGVybmFsX2NvdWNoZGIsIGFwcF9pZCwgdXNlcm5hbWUsIHRydWUpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyLnN0YXR1c0NvZGUgIT0gNDA0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgaWYgKGVyci5zdGF0dXNDb2RlICE9IDQwNCkge1xuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgfSlcblxuXG5cblxuICAgIH0pXG59XG5cblxuXG5cblxuXG5cblxuZnVuY3Rpb24gc2hhcmVtYWNoKGludGVybmFsX2NvdWNoZGIsIGFwcF9pZCwgdXNlciwgbGFiZWwsIGZyaWVuZCkgeyAvLyBjcmVhdGUgb3Igc3Vic2NyaWJlIG5ldyBhcHBsaWNhdGlvblxuICAgIHZhciBpbnRlcm5hbF9jb3VjaGRiID0gdGhpc1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPGJvb2xlYW4+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZ2V0bXltYWNoaW5lKGludGVybmFsX2NvdWNoZGIsIGFwcF9pZCwgdXNlciwgbGFiZWwpLnRoZW4oZnVuY3Rpb24gKG0pIHtcblxuICAgICAgICAgICAgZ2V0dXNlcmFwcChpbnRlcm5hbF9jb3VjaGRiLCBhcHBfaWQsIGZyaWVuZCkudGhlbihmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgICBnZXRteW1hY2hpbmUoaW50ZXJuYWxfY291Y2hkYiwgYXBwX2lkLCBmcmllbmQsIGxhYmVsKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgbmV3ZGI6IEljb21tb25EQiA9IHsgYXBwX2lkOiBhcHBfaWQsIGRibmFtZTogbWFjaGluZWRiLCBzbGF2ZTogeyB1c2VybmFtZTogbWFjaGluZXVzZXIsIHBhc3N3b3JkOiBtYWNoaW5lcGFzc3csIHRva2VuOiBtYWNoaW5ldG9rZW4gfSwgbGFiZWw6IGxhYmVsLCBkYnR5cGU6IFwibWFjaGluZVwiLCByb2xlczogWydzaGFyZWQnXSB9O1xuICAgICAgICAgICAgICAgICAgICBkb2MuZGIucHVzaChuZXdkYilcblxuICAgICAgICAgICAgICAgICAgICBycGoucHV0KGludGVybmFsX2NvdWNoZGIubXkoJy9fdXNlcnMvb3JnLmNvdWNoZGIudXNlcjonICsgZnJpZW5kKSwgZG9jKS50aGVuKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgcnBqLmdldChpbnRlcm5hbF9jb3VjaGRiLm15KCcvX3VzZXJzL29yZy5jb3VjaGRiLnVzZXI6JyArIG1hY2hpbmV1c2VyKSwgZG9jKS50aGVuKGZ1bmN0aW9uICh1cGRhdGVzbGF2ZSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlc2xhdmUuYXBwLnVzZXJzLnB1c2gobmV3dXNlcm5hbWUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcnBqLnB1dChpbnRlcm5hbF9jb3VjaGRiLm15KCcvX3VzZXJzL29yZy5jb3VjaGRiLnVzZXI6JyArIG1hY2hpbmV1c2VyKSwgdXBkYXRlc2xhdmUpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyLnN0YXR1c0NvZGUgIT0gNDA0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkVSUk9SISEhXCIgKyBlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVyci5zdGF0dXNDb2RlICE9IDQwNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkVSUk9SISEhXCIgKyBlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIuc3RhdHVzQ29kZSAhPSA0MDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkVSUk9SISEhXCIgKyBlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyLnN0YXR1c0NvZGUgIT0gNDA0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgaWYgKGVyci5zdGF0dXNDb2RlICE9IDQwNCkge1xuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgfSlcbiAgICB9KVxufVxuXG5cblxuXG5pbnRlcmZhY2UgSUNsYXNzQ29uZiB7XG4gICAgaG9zdG5hbWU6IHN0cmluZztcbiAgICBwcm90b2NvbD86IHN0cmluZztcbiAgICBwb3J0PzogbnVtYmVyO1xuICAgIGRiPzogc3RyaW5nO1xuICAgIHVzZXI6IHN0cmluZztcbiAgICBwYXNzd29yZDogc3RyaW5nO1xufVxuXG5cblxuY2xhc3MgY291Y2hBY2Nlc3MgZXh0ZW5kcyBjb3VjaEpzb25Db25mIHtcblxuICAgIGNvbnN0cnVjdG9yKHJvb3RhY2Nlc3NkYjogSUNsYXNzQ29uZikge1xuICAgICAgICBzdXBlcihyb290YWNjZXNzZGIpXG5cbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIHJwai5nZXQodGhhdC5teSgnYXBwX21haW4nKSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG5cbiAgICAgICAgICAgIHJwai5wdXQodGhhdC5teSgnYXBwX21haW4nKSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcblxuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKCdjYW5cXCd0IGNyZWF0ZSBtYWluIGFwcCcpO1xuXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgIH0pXG5cblxuICAgIH1cblxuICAgIHRlc3Rsb2dpbih1c2VyLCBwYXNzd29yZCwgZGIpIHtcblxuXG4gICAgICAgIHJldHVybiB0ZXN0bG9naW4odGhpcywgdXNlciwgcGFzc3dvcmQsIGRiKTtcbiAgICB9XG5cblxuICAgIHRlc3RhcHBfaWQoYXBwX2lkKSB7XG5cblxuICAgICAgICByZXR1cm4gdGVzdGFwcF9pZCh0aGlzLCBhcHBfaWQpO1xuICAgIH1cblxuXG5cbiAgICB0ZXN0YXV0aCh1c2VyLCBwYXNzd29yZCwgYXBwX2lkKSB7XG4gICAgICAgIHJldHVybiB0ZXN0YXV0aCh0aGlzLCB1c2VyLCBwYXNzd29yZCwgYXBwX2lkKVxuXG4gICAgfVxuXG5cblxuXG4gICAgZ2V0dXNlcmRicyh1c2VybmFtZSkge1xuXG4gICAgICAgIHJldHVybiBnZXR1c2VyZGJzKHRoaXMsIHVzZXJuYW1lKVxuICAgIH1cblxuXG5cbiAgICBnZXR1c2VyYXBwKHVzZXJuYW1lLCBhcHBfaWQpIHtcblxuICAgICAgICByZXR1cm4gZ2V0dXNlcmFwcCh0aGlzLCB1c2VybmFtZSwgYXBwX2lkKVxuICAgIH1cblxuXG5cbiAgICBnZXRteW1hY2hpbmUoYXBwX2lkLCB1c2VybmFtZSwgbGFiZWwpIHtcblxuICAgICAgICByZXR1cm4gZ2V0bXltYWNoaW5lKHRoaXMsIGFwcF9pZCwgdXNlcm5hbWUsIGxhYmVsKVxuICAgIH1cblxuICAgIGdldG15bWFjaGluZXMoYXBwX2lkLCB1c2VybmFtZSkge1xuXG4gICAgICAgIHJldHVybiBnZXRteW1hY2hpbmVzKHRoaXMsIGFwcF9pZCwgdXNlcm5hbWUpXG4gICAgfVxuXG5cbiAgICBjcmVhdGVfc2xhdmVfdXNlcmFwcCh1c2VybmFtZSwgdXNlcmRiKSB7XG5cblxuICAgICAgICByZXR1cm4gY3JlYXRlX3NsYXZlX3VzZXJhcHAodGhpcywgdXNlcm5hbWUsIHVzZXJkYilcbiAgICB9XG5cbiAgICBzdWJzY3JpYmVhcHAoYXBwX2lkLCB1c2VybmFtZSwgb3duZXIpIHtcblxuXG5cbiAgICAgICAgcmV0dXJuIHN1YnNjcmliZWFwcCh0aGlzLCBhcHBfaWQsIHVzZXJuYW1lLCBvd25lcilcbiAgICB9XG5cbiAgICBjcmVhdGVhcHAoYXBwX2lkLCB1c2VybmFtZSkge1xuXG5cbiAgICAgICAgcmV0dXJuIGNyZWF0ZWFwcGZvcnVzZXIodGhpcywgYXBwX2lkLCB1c2VybmFtZSlcblxuICAgIH1cblxuXG4gICAgc2hhcmVtYWNoKGFwcF9pZCwgdXNlciwgbGFiZWwsIGZyaWVuZCkgeyAvLyBjcmVhdGUgb3Igc3Vic2NyaWJlIG5ldyBhcHBsaWNhdGlvblxuXG5cblxuICAgICAgICByZXR1cm4gc2hhcmVtYWNoKHRoaXMsIGFwcF9pZCwgdXNlciwgbGFiZWwsIGZyaWVuZClcbiAgICB9XG5cblxuXG5cblxuXG59XG5cblxuZnVuY3Rpb24gZ2VuX2RiKGtpbmQsIGRhdGEpOiBzdHJpbmcge1xuICAgIHN3aXRjaCAoa2luZCkge1xuICAgICAgICBjYXNlICdtZW1iZXInOlxuICAgICAgICAgICAgcmV0dXJuICdtZW1fJyArIHVpZCgzKSArICdfJyArIGRhdGEuYXBwX2lkICsgJ18nICsgZGF0YS51c2VybmFtZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdtYWNoaW5lJzpcbiAgICAgICAgICAgIHJldHVybiAnbWFjaF8nICsgdWlkKDYpICsgJ18nICsgZGF0YS5hcHBfaWQ7XG4gICAgICAgICAgICBicmVhaztcblxuICAgIH1cbn1cbmZ1bmN0aW9uIHJhbmRvbV9zbGF2ZSh1c2VybmFtZSk6IHsgcGFzc3dvcmQ6IHN0cmluZzsgdXNlcjogc3RyaW5nIH0ge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcGFzc3dvcmQ6IHVpZCgxMiksXG4gICAgICAgIHVzZXI6ICdzbF8nICsgdXNlcm5hbWUgKyAnXycgKyB1aWQoNilcbiAgICB9XG5cbn1cblxuXG5leHBvcnQgZGVmYXVsdCBjb3VjaEFjY2Vzc1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
