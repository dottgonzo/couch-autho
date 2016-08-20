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
        getuserapp(internal_couchdb, user, app_id).then(function (db) {
            testlogin(internal_couchdb, user, password, db.dbname).then(function () {
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
        rpj.put(internal_couchdb.my('_users/org.couchdb.user:' + slave.user), {
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
function sharemach(internal_couchdb, app_id, user, label, friend) {
    return new Promise(function (resolve, reject) {
        getmymachine(internal_couchdb, app_id, user, label).then(function (m) {
            getuserapp(internal_couchdb, app_id, friend).then(function () {
                getmymachine(internal_couchdb, app_id, friend, label).then(function () {
                    resolve(true);
                }).catch(function (err) {
                    var newdb = { app_id: app_id, dbname: machinedb, slave: { username: machineuser, password: machinepassw, token: machinetoken }, label: label, dbtype: "machine", roles: ['shared'] };
                    doc.db.push(newdb);
                    rpj.put(internal_couchdb.my('_users/org.couchdb.user:' + friend), doc).then(function () {
                        rpj.get(internal_couchdb.my('_users/org.couchdb.user:' + machineuser), doc).then(function (updateslave) {
                            updateslave.app.users.push(newusername);
                            rpj.put(internal_couchdb.my('_users/org.couchdb.user:' + machineuser), updateslave).then(function () {
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
        function addAdminRole() {
            that.addAppRole(that.user, 'main').then(function () {
                console.log("created!");
                return true;
            }).catch(function (err) {
                console.log("errRRR " + err);
            });
        }
        rpj.get(that.my('app_main')).then(function () {
            getuserdb(that, that.user).then(function (u) {
                if (u.roles.indexOf('app_main') != -1) {
                    addAdminRole();
                }
                else {
                    console.log("created!");
                    return true;
                }
            }).catch(function (err) {
                that.createUser(that.user, that.password, '').then(function () {
                    addAdminRole();
                }).catch(function (err) {
                    console.error("err " + err);
                });
            });
        }).catch(function (err) {
            that.createapp('main').then(function () {
                getuserdb(that, that.user).then(function (u) {
                    if (u.roles.indexOf('app_main') != -1) {
                        addAdminRole();
                    }
                    else {
                        console.log("created!");
                        return true;
                    }
                }).catch(function (err) {
                    that.createUser(that.user, that.password, '').then(function () {
                        addAdminRole();
                    }).catch(function (err) {
                        console.error("err " + err);
                    });
                });
            }).catch(function (err) {
                console.error("err " + err);
            });
        });
    }
    couchAccess.prototype.login = function (o) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (o && o.username && o.password && o.app_id) {
                testauth(_this, o.username, o.password, o.app_id).then(function () {
                    resolve(true);
                }).catch(function (err) {
                    reject(err);
                });
            }
            else {
                if (!o) {
                    reject('no options provided');
                }
                else if (!o.username) {
                    reject('no username provided');
                }
                else if (!o.password) {
                    reject('no password provided');
                }
                else if (!o.app_id) {
                    reject('no app_id provided');
                }
            }
        });
    };
    couchAccess.prototype.register = function (o) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (o && o.username && o.password && o.email && o.app_id) {
                _this.createUser(o.username, o.password, o.email).then(function () {
                    _this.subscribeapp(o.app_id, o.username).then(function () {
                        resolve(true);
                    }).catch(function (err) {
                        reject(err);
                    });
                }).catch(function (err) {
                    reject(err);
                });
            }
            else {
                if (!o) {
                    reject('no options provided');
                }
                else if (!o.username) {
                    reject('no username provided');
                }
                else if (!o.password) {
                    reject('no password provided');
                }
                else if (!o.email) {
                    reject('no email provided');
                }
                else if (!o.app_id) {
                    reject('no app_id provided');
                }
            }
        });
    };
    couchAccess.prototype.createappforuser = function (app_id, username) {
        var internal_couchdb = this;
        return new Promise(function (resolve, reject) {
            internal_couchdb.createapp(app_id).then(function () {
                internal_couchdb.subscribeapp(app_id, username, true).then(function () {
                    resolve(true);
                }).catch(function (err) {
                    reject(err);
                });
            }).catch(function (err) {
                reject(err);
            });
        });
    };
    couchAccess.prototype.addAppRole = function (username, app_id) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            getuserdb(_this, username).then(function (u) {
                u.roles.push('app_' + app_id);
                rpj.put(_this.my('_users/org.couchdb.user:' + username), u).then(function () {
                    resolve(true);
                }).catch(function (err) {
                    reject(err);
                });
            }).catch(function (err) {
                reject(err);
            });
        });
    };
    couchAccess.prototype.createUser = function (username, password, email) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            getuserdb(_this, username).then(function (u) {
                reject("user " + username + " just eixsts");
            }).catch(function (err) {
                var doc = { name: username, email: email, db: [], "roles": ['user'], "type": "user", password: password };
                rpj.put(_this.my('_users/org.couchdb.user:' + username), doc).then(function () {
                    getuserdb(_this, username).then(function (u) {
                        resolve(u);
                    }).catch(function (err) {
                        reject(err);
                    });
                }).catch(function (err) {
                    reject(err);
                });
            });
        });
    };
    couchAccess.prototype.testlogin = function (user, password, db) {
        return testlogin(this, user, password, db);
    };
    couchAccess.prototype.testapp_id = function (app_id) {
        return testapp_id(this, app_id);
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
        var internal_couchdb = this;
        return new Promise(function (resolve, reject) {
            function sub(doc) {
                var newuserdb = gen_db('member', { username: username, app_id: app_id });
                create_slave_userapp(internal_couchdb, username, newuserdb).then(function (slave) {
                    var newdb = { app_id: app_id, dbname: newuserdb, slave: { username: slave.user, password: slave.password }, dbtype: "mine", roles: ['owner'] };
                    doc.db.push(newdb);
                    if (owner) {
                        doc.roles.push('app_' + app_id);
                        var startapp = { app_id: app_id, dbname: 'app_' + app_id, dbtype: "application", roles: ['owner'] };
                        doc.db.push(startapp);
                    }
                    rpj.put(internal_couchdb.my('_users/org.couchdb.user:' + username), doc).then(function () {
                        rpj.put(internal_couchdb.my(newuserdb), doc).then(function () {
                            rpj.put(internal_couchdb.my(newuserdb + '/_security'), { "members": { "names": [username, slave.user], "roles": [] } }).then(function () {
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
            }
            getuserdb(internal_couchdb, username).then(function (doc) {
                testapp_id(internal_couchdb, app_id).then(function () {
                    sub(doc);
                }).catch(function (err) {
                    reject(err);
                });
            }).catch(function (err) {
                reject(err);
            });
        });
    };
    couchAccess.prototype.createapp = function (app_id) {
        var internal_couchdb = this;
        return new Promise(function (resolve, reject) {
            rpj.put(internal_couchdb.my('app_' + app_id)).then(function () {
                rpj.put(internal_couchdb.my('app_' + app_id + '/_design/auth'), {
                    "language": "javascript",
                    "validate_doc_update": "function(n,o,u){if(n._id&&!n._id.indexOf(\"_local/\"))return;if(!u||!u.roles||(u.roles.indexOf(\"app_" + app_id + "\")==-1&&u.roles.indexOf(\"_admin\")==-1)){throw({forbidden:'Denied.'})}}"
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

//# sourceMappingURL=data:application/json;base64,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QUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQ2pFLEtBQUssQ0FBQztRQUNWLEtBQUssU0FBUztZQUNWLE1BQU0sQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQzVDLEtBQUssQ0FBQztJQUVkLENBQUM7QUFDTCxDQUFDO0FBQ0Qsc0JBQXNCLFFBQVE7SUFFMUIsTUFBTSxDQUFDO1FBQ0gsUUFBUSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDakIsSUFBSSxFQUFFLEtBQUssR0FBRyxRQUFRLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7S0FDeEMsQ0FBQTtBQUVMLENBQUM7QUFHRDtrQkFBZSxXQUFXLENBQUEiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBQcm9taXNlIGZyb20gXCJibHVlYmlyZFwiO1xuaW1wb3J0ICogYXMgXyBmcm9tIFwibG9kYXNoXCI7XG5cbmltcG9ydCBjb3VjaEpzb25Db25mIGZyb20gXCJjb3VjaGpzb25jb25mXCI7XG5cbmxldCB1aWQgPSByZXF1aXJlKFwidWlkXCIpO1xubGV0IHJwaiA9IHJlcXVpcmUoXCJyZXF1ZXN0LXByb21pc2UtanNvblwiKTtcblxuXG5cblxuXG5pbnRlcmZhY2UgSWNvbW1vbkRCIHtcbiAgICBhcHBfaWQ6IHN0cmluZztcbiAgICBkYm5hbWU6IHN0cmluZztcbiAgICBzbGF2ZT86IHtcbiAgICAgICAgdXNlcm5hbWU6IHN0cmluZztcbiAgICAgICAgcGFzc3dvcmQ6IHN0cmluZztcbiAgICB9LFxuICAgIGRidHlwZTogc3RyaW5nXG4gICAgcm9sZXM6IHN0cmluZ1tdO1xuICAgIGxhYmVsPzogc3RyaW5nO1xufVxuXG5cbmludGVyZmFjZSBJVXNlckRCIHtcbiAgICBfaWQ6IHN0cmluZyxcbiAgICBfcmV2OiBzdHJpbmcsXG4gICAgcGFzc3dvcmRfc2NoZW1lOiBzdHJpbmc7XG4gICAgaXRlcmF0aW9uczogc3RyaW5nO1xuICAgIG5hbWU6IHN0cmluZztcbiAgICBlbWFpbDogc3RyaW5nO1xuICAgIGRiOiBJY29tbW9uREJbXTtcbiAgICByb2xlczogc3RyaW5nW107XG4gICAgdHlwZTogc3RyaW5nO1xuICAgIGRlcml2ZWRfa2V5OiBzdHJpbmc7XG4gICAgc2FsdDogc3RyaW5nO1xuXG59XG5cblxuXG5cblxuXG5mdW5jdGlvbiB0ZXN0bG9naW4oaW50ZXJuYWxfY291Y2hkYiwgdXNlciwgcGFzc3dvcmQsIGRiKSB7XG5cbiAgICAvLyByZXR1cm4gdHJ1ZSBpZiBjcmVkZW50aWFscyBhcmUgY29ycmVjdCBmb3IgZ2l2ZW4gZGJcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgcnBqLmdldChpbnRlcm5hbF9jb3VjaGRiLmZvcih1c2VyLCBwYXNzd29yZCwgZGIpKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgaWYgKGVyci5zdGF0dXNDb2RlICE9IDQwNCkge1xuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgfSlcbiAgICB9KVxuXG59XG5cblxuZnVuY3Rpb24gdGVzdGFwcF9pZChpbnRlcm5hbF9jb3VjaGRiLCBhcHBfaWQpIHtcblxuXG4gICAgLy8gcmV0dXJuIHRydWUgaWYgYXBwX2lkIGV4aXN0XG5cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHJwai5nZXQoaW50ZXJuYWxfY291Y2hkYi5teSgnYXBwXycgKyBhcHBfaWQpKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuXG4gICAgICAgICAgICBpZiAoZXJyLnN0YXR1c0NvZGUgIT0gNDA0KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJFUlJPUiEhIVwiICsgZXJyKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICB9KVxuICAgIH0pXG59XG5cblxuXG5cblxuXG5mdW5jdGlvbiB0ZXN0YXV0aChpbnRlcm5hbF9jb3VjaGRiLCB1c2VyLCBwYXNzd29yZCwgYXBwX2lkKSB7XG5cblxuICAgIC8vIHJldHVybiB0cnVlIGlmIGNyZWRlbnRpYWxzIGFyZSBjb3JyZWN0IGZvciBnaXZlbiBhcHBfaWRcblxuICAgIC8vIGdldCB1c2VyIGNyZWRlbnRpYWxzIGJ5IHVzZXJuYW1lIGFuZCBwYXNzd29yZCBhbmQgdGFrZSB0aGUgYXBwX2lkIGRiLCB0aGVuIHRlc3QgbG9naW4gd2l0aCBpdFxuXG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBnZXR1c2VyYXBwKGludGVybmFsX2NvdWNoZGIsIHVzZXIsIGFwcF9pZCkudGhlbihmdW5jdGlvbiAoZGIpIHtcblxuICAgICAgICAgICAgdGVzdGxvZ2luKGludGVybmFsX2NvdWNoZGIsIHVzZXIsIHBhc3N3b3JkLCBkYi5kYm5hbWUpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyLnN0YXR1c0NvZGUgIT0gNDA0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgaWYgKGVyci5zdGF0dXNDb2RlICE9IDQwNCkge1xuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgfSlcblxuICAgIH0pXG5cbn1cblxuXG5cblxuXG5mdW5jdGlvbiBnZXR1c2VyZGIoaW50ZXJuYWxfY291Y2hkYiwgdXNlcm5hbWUpIHtcblxuICAgIC8vIHJldHVybiBhbGwgdGhlIHVzZXIgZG9jIGluIF91c2Vyc1xuXG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8SVVzZXJEQj4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBycGouZ2V0KGludGVybmFsX2NvdWNoZGIubXkoJ191c2Vycy9vcmcuY291Y2hkYi51c2VyOicgKyB1c2VybmFtZSkpLnRoZW4oZnVuY3Rpb24gKGRvYykge1xuICAgICAgICAgICAgcmVzb2x2ZShkb2MpXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIuc3RhdHVzQ29kZSAhPSA0MDQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkVSUk9SISEhXCIgKyBlcnIpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgIH0pXG4gICAgfSlcbn1cblxuXG5mdW5jdGlvbiBnZXR1c2VyZGJzKGludGVybmFsX2NvdWNoZGIsIHVzZXJuYW1lKSB7XG5cbiAgICAvLyByZXR1cm4gYWxsIHRoZSB1c2VyIGNyZWRlbnRpYWxzIGZvciBldmVyeSBhcHBsaWNhdGlvbiB3aGljaCB0aGV5IGhhdmUgYWNjZXNzIChpbnRlcm5hbClcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxJY29tbW9uREJbXT4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBnZXR1c2VyZGIoaW50ZXJuYWxfY291Y2hkYiwgdXNlcm5hbWUpLnRoZW4oZnVuY3Rpb24gKGRvYykge1xuICAgICAgICAgICAgcmVzb2x2ZShkb2MuZGIpXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIuc3RhdHVzQ29kZSAhPSA0MDQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkVSUk9SISEhXCIgKyBlcnIpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgIH0pXG4gICAgfSlcbn1cblxuXG5cbmZ1bmN0aW9uIGdldHVzZXJhcHAoaW50ZXJuYWxfY291Y2hkYiwgdXNlcm5hbWUsIGFwcF9pZCkge1xuXG5cbiAgICAvLyByZXR1cm4gdXNlciBjcmVkZW50aWFscyAoaW50ZXJuYWwpXG5cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxJY29tbW9uREI+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZ2V0dXNlcmRicyhpbnRlcm5hbF9jb3VjaGRiLCB1c2VybmFtZSkudGhlbihmdW5jdGlvbiAoZG9jKSB7XG4gICAgICAgICAgICBfLm1hcChkb2MsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGQuYXBwX2lkID09IGFwcF9pZCAmJiBkLmRidHlwZSA9PSAnbWluZScpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShkKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIuc3RhdHVzQ29kZSAhPSA0MDQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkVSUk9SISEhXCIgKyBlcnIpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgIH0pXG4gICAgfSlcbn1cblxuXG5cbmZ1bmN0aW9uIGdldG15bWFjaGluZShpbnRlcm5hbF9jb3VjaGRiLCBhcHBfaWQsIHVzZXJuYW1lLCBsYWJlbCkge1xuXG5cbiAgICAvLyByZXR1cm4gY3JlZGVudGlhbHMgYnkgYXBwbGljYXRpb24gYW5kIGxhYmVsICAoaW50ZXJuYWwpXG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8SWNvbW1vbkRCPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGdldHVzZXJkYnMoaW50ZXJuYWxfY291Y2hkYiwgdXNlcm5hbWUpLnRoZW4oZnVuY3Rpb24gKGRvYykge1xuICAgICAgICAgICAgXy5tYXAoZG9jLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIGlmIChkLmFwcF9pZCA9PSBhcHBfaWQgJiYgZC5kYnR5cGUgPT0gJ21hY2hpbmUnICYmIGQubGFiZWwgPT0gbGFiZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShkKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIuc3RhdHVzQ29kZSAhPSA0MDQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkVSUk9SISEhXCIgKyBlcnIpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgIH0pXG4gICAgfSlcbn1cblxuZnVuY3Rpb24gZ2V0bXltYWNoaW5lcyhpbnRlcm5hbF9jb3VjaGRiLCBhcHBfaWQsIHVzZXJuYW1lKSB7XG5cblxuICAgIC8vIHJldHVybiBhbGwgdXNlciBjcmVkZW50aWFscyBmb3IgaXQncyBtYWNoaW5lcyAoaW50ZXJuYWwpXG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8SWNvbW1vbkRCW10+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZ2V0dXNlcmRicyhpbnRlcm5hbF9jb3VjaGRiLCB1c2VybmFtZSkudGhlbihmdW5jdGlvbiAoZG9jKSB7XG4gICAgICAgICAgICB2YXIgZGJzID0gW107XG4gICAgICAgICAgICBfLm1hcChkb2MsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGQuYXBwX2lkID09IGFwcF9pZCAmJiBkLmRidHlwZSA9PSAnbWFjaGluZScpIHtcbiAgICAgICAgICAgICAgICAgICAgZGJzLnB1c2goZClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgcmVzb2x2ZShkYnMpXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIuc3RhdHVzQ29kZSAhPSA0MDQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIkVSUk9SISEhXCIgKyBlcnIpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgIH0pXG4gICAgfSlcbn1cblxuXG5mdW5jdGlvbiBjcmVhdGVfc2xhdmVfdXNlcmFwcChpbnRlcm5hbF9jb3VjaGRiLCB1c2VybmFtZSwgdXNlcmFwcGRiKSB7XG5cbiAgICAvLyBjcmVhdGUgdGhlIHVzZXIgdGhhdCB3aWxsIGhhdmUgYWNjZXNzIHRvIGEgY29udGFpbmVyIChpbnRlcm5hbClcblxuICAgIC8vIHJldHVybiB1c2VybmFtZSBhbmQgcGFzc3dvcmQgZm9yIHRoZSB1c2VyIGNyZWF0ZWQgKHBhc3N3b3JkIGlzIGdlbmVyYXRlZCBoZXJlKVxuXG5cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTx7IHBhc3N3b3JkOiBzdHJpbmc7IHVzZXI6IHN0cmluZyB9PihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGxldCBzbGF2ZSA9IHJhbmRvbV9zbGF2ZSh1c2VybmFtZSk7XG4gICAgICAgIHJwai5wdXQoaW50ZXJuYWxfY291Y2hkYi5teSgnX3VzZXJzL29yZy5jb3VjaGRiLnVzZXI6JyArIHNsYXZlLnVzZXIpLCB7XG4gICAgICAgICAgICBuYW1lOiBzbGF2ZS51c2VyLFxuICAgICAgICAgICAgcm9sZXM6IFsnc2xhdmUnXSxcbiAgICAgICAgICAgIGFwcDogeyBkYjogdXNlcmFwcGRiLCB1c2VyOiB1c2VybmFtZSB9LFxuICAgICAgICAgICAgZGJ0eXBlOiBcInVzZXJzbGF2ZVwiLFxuICAgICAgICAgICAgdHlwZTogXCJ1c2VyXCIsXG4gICAgICAgICAgICBwYXNzd29yZDogc2xhdmUucGFzc3dvcmRcbiAgICAgICAgfSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXNvbHZlKHNsYXZlKVxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyLnN0YXR1c0NvZGUgIT0gNDA0KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJFUlJPUiEhIVwiICsgZXJyKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICB9KTtcbiAgICB9KVxufVxuXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5mdW5jdGlvbiBzaGFyZW1hY2goaW50ZXJuYWxfY291Y2hkYjogY291Y2hBY2Nlc3MsIGFwcF9pZCwgdXNlciwgbGFiZWwsIGZyaWVuZCkgeyAvLyBjcmVhdGUgb3Igc3Vic2NyaWJlIG5ldyBhcHBsaWNhdGlvblxuXG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBnZXRteW1hY2hpbmUoaW50ZXJuYWxfY291Y2hkYiwgYXBwX2lkLCB1c2VyLCBsYWJlbCkudGhlbihmdW5jdGlvbiAobSkge1xuXG4gICAgICAgICAgICBnZXR1c2VyYXBwKGludGVybmFsX2NvdWNoZGIsIGFwcF9pZCwgZnJpZW5kKS50aGVuKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgIGdldG15bWFjaGluZShpbnRlcm5hbF9jb3VjaGRiLCBhcHBfaWQsIGZyaWVuZCwgbGFiZWwpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXdkYjogSWNvbW1vbkRCID0geyBhcHBfaWQ6IGFwcF9pZCwgZGJuYW1lOiBtYWNoaW5lZGIsIHNsYXZlOiB7IHVzZXJuYW1lOiBtYWNoaW5ldXNlciwgcGFzc3dvcmQ6IG1hY2hpbmVwYXNzdywgdG9rZW46IG1hY2hpbmV0b2tlbiB9LCBsYWJlbDogbGFiZWwsIGRidHlwZTogXCJtYWNoaW5lXCIsIHJvbGVzOiBbJ3NoYXJlZCddIH07XG4gICAgICAgICAgICAgICAgICAgIGRvYy5kYi5wdXNoKG5ld2RiKVxuXG4gICAgICAgICAgICAgICAgICAgIHJwai5wdXQoaW50ZXJuYWxfY291Y2hkYi5teSgnX3VzZXJzL29yZy5jb3VjaGRiLnVzZXI6JyArIGZyaWVuZCksIGRvYykudGhlbihmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJwai5nZXQoaW50ZXJuYWxfY291Y2hkYi5teSgnX3VzZXJzL29yZy5jb3VjaGRiLnVzZXI6JyArIG1hY2hpbmV1c2VyKSwgZG9jKS50aGVuKGZ1bmN0aW9uICh1cGRhdGVzbGF2ZSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlc2xhdmUuYXBwLnVzZXJzLnB1c2gobmV3dXNlcm5hbWUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcnBqLnB1dChpbnRlcm5hbF9jb3VjaGRiLm15KCdfdXNlcnMvb3JnLmNvdWNoZGIudXNlcjonICsgbWFjaGluZXVzZXIpLCB1cGRhdGVzbGF2ZSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIuc3RhdHVzQ29kZSAhPSA0MDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyLnN0YXR1c0NvZGUgIT0gNDA0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVyci5zdGF0dXNDb2RlICE9IDQwNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChlcnIuc3RhdHVzQ29kZSAhPSA0MDQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJFUlJPUiEhIVwiICsgZXJyKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyLnN0YXR1c0NvZGUgIT0gNDA0KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJFUlJPUiEhIVwiICsgZXJyKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICB9KVxuICAgIH0pXG59XG5cblxuXG5cbmludGVyZmFjZSBJQ2xhc3NDb25mIHtcbiAgICBob3N0bmFtZTogc3RyaW5nO1xuICAgIHByb3RvY29sPzogc3RyaW5nO1xuICAgIHBvcnQ/OiBudW1iZXI7XG4gICAgZGI/OiBzdHJpbmc7XG4gICAgdXNlcjogc3RyaW5nO1xuICAgIHBhc3N3b3JkOiBzdHJpbmc7XG59XG5cblxuXG5cblxuXG5cbmNsYXNzIGNvdWNoQWNjZXNzIGV4dGVuZHMgY291Y2hKc29uQ29uZiB7XG5cbiAgICBjb25zdHJ1Y3Rvcihyb290YWNjZXNzZGI6IElDbGFzc0NvbmYpIHtcbiAgICAgICAgc3VwZXIocm9vdGFjY2Vzc2RiKVxuXG4gICAgICAgIGxldCB0aGF0ID0gdGhpcztcblxuICAgICAgICBmdW5jdGlvbiBhZGRBZG1pblJvbGUoKSB7XG4gICAgICAgICAgICB0aGF0LmFkZEFwcFJvbGUodGhhdC51c2VyLCAnbWFpbicpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY3JlYXRlZCFcIilcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZXJyUlJSIFwiICsgZXJyKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG5cblxuXG4gICAgICAgIHJwai5nZXQodGhhdC5teSgnYXBwX21haW4nKSkudGhlbihmdW5jdGlvbiAoKSB7XG5cblxuICAgICAgICAgICAgZ2V0dXNlcmRiKHRoYXQsIHRoYXQudXNlcikudGhlbigodSkgPT4ge1xuXG4gICAgICAgICAgICAgICAgaWYgKHUucm9sZXMuaW5kZXhPZignYXBwX21haW4nKSAhPSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBhZGRBZG1pblJvbGUoKVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY3JlYXRlZCFcIilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcblxuICAgICAgICAgICAgICAgIHRoYXQuY3JlYXRlVXNlcih0aGF0LnVzZXIsIHRoYXQucGFzc3dvcmQsICcnKS50aGVuKCgpID0+IHtcblxuXG4gICAgICAgICAgICAgICAgICAgIGFkZEFkbWluUm9sZSgpXG5cblxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcImVyciBcIiArIGVycilcbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICB9KVxuXG5cbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuXG5cbiAgICAgICAgICAgIHRoYXQuY3JlYXRlYXBwKCdtYWluJykudGhlbigoKSA9PiB7XG5cbiAgICAgICAgICAgICAgICBnZXR1c2VyZGIodGhhdCwgdGhhdC51c2VyKS50aGVuKCh1KSA9PiB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHUucm9sZXMuaW5kZXhPZignYXBwX21haW4nKSAhPSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWRkQWRtaW5Sb2xlKClcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY3JlYXRlZCFcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcblxuICAgICAgICAgICAgICAgICAgICB0aGF0LmNyZWF0ZVVzZXIodGhhdC51c2VyLCB0aGF0LnBhc3N3b3JkLCAnJykudGhlbigoKSA9PiB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZEFkbWluUm9sZSgpXG5cblxuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiZXJyIFwiICsgZXJyKVxuICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgfSlcblxuXG5cbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcblxuXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcImVyciBcIiArIGVycilcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG5cblxuICAgIH1cblxuICAgIGxvZ2luKG86IHsgdXNlcm5hbWU6IHN0cmluZywgcGFzc3dvcmQ6IHN0cmluZywgYXBwX2lkOiBzdHJpbmcgfSkge1xuICAgICAgICBjb25zdCBfdGhpcyA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPGJvb2xlYW4+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICAgICAgaWYgKG8gJiYgby51c2VybmFtZSAmJiBvLnBhc3N3b3JkICYmIG8uYXBwX2lkKSB7XG4gICAgICAgICAgICAgICAgdGVzdGF1dGgoX3RoaXMsIG8udXNlcm5hbWUsIG8ucGFzc3dvcmQsIG8uYXBwX2lkKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghbykge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoJ25vIG9wdGlvbnMgcHJvdmlkZWQnKVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIW8udXNlcm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCdubyB1c2VybmFtZSBwcm92aWRlZCcpXG5cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFvLnBhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCgnbm8gcGFzc3dvcmQgcHJvdmlkZWQnKVxuXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghby5hcHBfaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCdubyBhcHBfaWQgcHJvdmlkZWQnKVxuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcmVnaXN0ZXIobzogeyB1c2VybmFtZTogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nLCBlbWFpbDogc3RyaW5nLCBhcHBfaWQ6IHN0cmluZyB9KTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgICAgIGNvbnN0IF90aGlzID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgaWYgKG8gJiYgby51c2VybmFtZSAmJiBvLnBhc3N3b3JkICYmIG8uZW1haWwgJiYgby5hcHBfaWQpIHtcbiAgICAgICAgICAgICAgICBfdGhpcy5jcmVhdGVVc2VyKG8udXNlcm5hbWUsIG8ucGFzc3dvcmQsIG8uZW1haWwpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy5zdWJzY3JpYmVhcHAoby5hcHBfaWQsIG8udXNlcm5hbWUpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIW8pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCdubyBvcHRpb25zIHByb3ZpZGVkJylcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFvLnVzZXJuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCgnbm8gdXNlcm5hbWUgcHJvdmlkZWQnKVxuXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghby5wYXNzd29yZCkge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoJ25vIHBhc3N3b3JkIHByb3ZpZGVkJylcblxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIW8uZW1haWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCdubyBlbWFpbCBwcm92aWRlZCcpXG5cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFvLmFwcF9pZCkge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoJ25vIGFwcF9pZCBwcm92aWRlZCcpXG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSlcblxuICAgIH1cblxuICAgIGNyZWF0ZWFwcGZvcnVzZXIoYXBwX2lkLCB1c2VybmFtZSkgeyAvLyBjcmVhdGUgYSBuZXcgYXBwbGljYXRpb25cblxuICAgICAgICBjb25zdCBpbnRlcm5hbF9jb3VjaGRiID0gdGhpcztcblxuXG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPGJvb2xlYW4+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuXG4gICAgICAgICAgICBpbnRlcm5hbF9jb3VjaGRiLmNyZWF0ZWFwcChhcHBfaWQpLnRoZW4oZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgICAgaW50ZXJuYWxfY291Y2hkYi5zdWJzY3JpYmVhcHAoYXBwX2lkLCB1c2VybmFtZSwgdHJ1ZSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG5cblxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycilcblxuXG4gICAgICAgICAgICB9KVxuXG5cblxuXG4gICAgICAgIH0pXG4gICAgfVxuXG5cbiAgICBhZGRBcHBSb2xlKHVzZXJuYW1lOiBzdHJpbmcsIGFwcF9pZDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgICAgIGNvbnN0IF90aGlzID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPGJvb2xlYW4+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICAgICAgZ2V0dXNlcmRiKF90aGlzLCB1c2VybmFtZSkudGhlbigodSkgPT4ge1xuICAgICAgICAgICAgICAgIHUucm9sZXMucHVzaCgnYXBwXycgKyBhcHBfaWQpXG5cbiAgICAgICAgICAgICAgICBycGoucHV0KF90aGlzLm15KCdfdXNlcnMvb3JnLmNvdWNoZGIudXNlcjonICsgdXNlcm5hbWUpLCB1KS50aGVuKCgpID0+IHtcblxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG5cbiAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgfSlcblxuICAgICAgICB9KVxuXG4gICAgfVxuXG5cblxuICAgIGNyZWF0ZVVzZXIodXNlcm5hbWU6IHN0cmluZywgcGFzc3dvcmQ6IHN0cmluZywgZW1haWw6IHN0cmluZyk6IFByb21pc2U8SVVzZXJEQj4ge1xuICAgICAgICBjb25zdCBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxJVXNlckRCPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgICAgIGdldHVzZXJkYihfdGhpcywgdXNlcm5hbWUpLnRoZW4oKHUpID0+IHtcbiAgICAgICAgICAgICAgICByZWplY3QoXCJ1c2VyIFwiICsgdXNlcm5hbWUgKyBcIiBqdXN0IGVpeHN0c1wiKVxuXG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBkb2MgPSB7IG5hbWU6IHVzZXJuYW1lLCBlbWFpbDogZW1haWwsIGRiOiBbXSwgXCJyb2xlc1wiOiBbJ3VzZXInXSwgXCJ0eXBlXCI6IFwidXNlclwiLCBwYXNzd29yZDogcGFzc3dvcmQgfTtcblxuICAgICAgICAgICAgICAgIHJwai5wdXQoX3RoaXMubXkoJ191c2Vycy9vcmcuY291Y2hkYi51c2VyOicgKyB1c2VybmFtZSksIGRvYykudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGdldHVzZXJkYihfdGhpcywgdXNlcm5hbWUpLnRoZW4oKHUpID0+IHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh1KVxuXG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgIH0pXG5cblxuXG5cbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICB0ZXN0bG9naW4odXNlciwgcGFzc3dvcmQsIGRiKSB7XG5cblxuICAgICAgICByZXR1cm4gdGVzdGxvZ2luKHRoaXMsIHVzZXIsIHBhc3N3b3JkLCBkYik7XG4gICAgfVxuXG5cbiAgICB0ZXN0YXBwX2lkKGFwcF9pZCkge1xuXG5cbiAgICAgICAgcmV0dXJuIHRlc3RhcHBfaWQodGhpcywgYXBwX2lkKTtcbiAgICB9XG5cblxuICAgIGdldHVzZXJkYnModXNlcm5hbWUpIHtcblxuICAgICAgICByZXR1cm4gZ2V0dXNlcmRicyh0aGlzLCB1c2VybmFtZSlcbiAgICB9XG5cblxuXG4gICAgZ2V0dXNlcmFwcCh1c2VybmFtZSwgYXBwX2lkKSB7XG5cbiAgICAgICAgcmV0dXJuIGdldHVzZXJhcHAodGhpcywgdXNlcm5hbWUsIGFwcF9pZClcbiAgICB9XG5cblxuXG4gICAgZ2V0bXltYWNoaW5lKGFwcF9pZCwgdXNlcm5hbWUsIGxhYmVsKSB7XG5cbiAgICAgICAgcmV0dXJuIGdldG15bWFjaGluZSh0aGlzLCBhcHBfaWQsIHVzZXJuYW1lLCBsYWJlbClcbiAgICB9XG5cbiAgICBnZXRteW1hY2hpbmVzKGFwcF9pZCwgdXNlcm5hbWUpIHtcblxuICAgICAgICByZXR1cm4gZ2V0bXltYWNoaW5lcyh0aGlzLCBhcHBfaWQsIHVzZXJuYW1lKVxuICAgIH1cblxuXG4gICAgY3JlYXRlX3NsYXZlX3VzZXJhcHAodXNlcm5hbWU6IHN0cmluZywgdXNlcmRiOiBzdHJpbmcpIHtcblxuXG4gICAgICAgIHJldHVybiBjcmVhdGVfc2xhdmVfdXNlcmFwcCh0aGlzLCB1c2VybmFtZSwgdXNlcmRiKVxuICAgIH1cblxuICAgIHN1YnNjcmliZWFwcChhcHBfaWQ6IHN0cmluZywgdXNlcm5hbWU6IHN0cmluZywgb3duZXI/OiBib29sZWFuKSB7XG5cblxuXG4gICAgICAgIC8vIGV2ZXJ5IHVzZXIgbXVzdCBoYXZlIGEgcGVyc29uYWwgZGIgZm9yIGV2ZXJ5IGFwcGxpY2F0aW9uIHRoYXQgdGhleSBoYXZlIGFjY2Vzc1xuICAgICAgICAvLyB3aGVuIGFuIHVzZXIgc3Vic2NyaWJlIGFuIGFwcCwgYSBkYiBhbmQgaXQncyBzbGF2ZSB1c2VyICB3aWxsIGJlIGNyZWF0ZWQgZm9yIGhpbSwgYW5kIHRoZSB1c2VyIGRvYyBpbiBfdXNlcnMgcmVnaXN0ZXIgdGhlIG5ldyBjcmVkZW50aWFscyBnZW5lcmF0ZWQgXG5cblxuXG5cbiAgICAgICAgY29uc3QgaW50ZXJuYWxfY291Y2hkYiA9IHRoaXM7XG5cblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG5cblxuICAgICAgICAgICAgZnVuY3Rpb24gc3ViKGRvYykge1xuXG5cbiAgICAgICAgICAgICAgICB2YXIgbmV3dXNlcmRiID0gZ2VuX2RiKCdtZW1iZXInLCB7IHVzZXJuYW1lOiB1c2VybmFtZSwgYXBwX2lkOiBhcHBfaWQgfSk7XG5cbiAgICAgICAgICAgICAgICBjcmVhdGVfc2xhdmVfdXNlcmFwcChpbnRlcm5hbF9jb3VjaGRiLCB1c2VybmFtZSwgbmV3dXNlcmRiKS50aGVuKGZ1bmN0aW9uIChzbGF2ZSkge1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXdkYiA9IHsgYXBwX2lkOiBhcHBfaWQsIGRibmFtZTogbmV3dXNlcmRiLCBzbGF2ZTogeyB1c2VybmFtZTogc2xhdmUudXNlciwgcGFzc3dvcmQ6IHNsYXZlLnBhc3N3b3JkIH0sIGRidHlwZTogXCJtaW5lXCIsIHJvbGVzOiBbJ293bmVyJ10gfTtcbiAgICAgICAgICAgICAgICAgICAgZG9jLmRiLnB1c2gobmV3ZGIpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChvd25lcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9jLnJvbGVzLnB1c2goJ2FwcF8nICsgYXBwX2lkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzdGFydGFwcCA9IHsgYXBwX2lkOiBhcHBfaWQsIGRibmFtZTogJ2FwcF8nICsgYXBwX2lkLCBkYnR5cGU6IFwiYXBwbGljYXRpb25cIiwgcm9sZXM6IFsnb3duZXInXSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9jLmRiLnB1c2goc3RhcnRhcHApO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcnBqLnB1dChpbnRlcm5hbF9jb3VjaGRiLm15KCdfdXNlcnMvb3JnLmNvdWNoZGIudXNlcjonICsgdXNlcm5hbWUpLCBkb2MpLnRoZW4oZnVuY3Rpb24gKCkgeyAvLyBwdXNoIG5ldyB1c2VyIHNldHRpbmdzXG4gICAgICAgICAgICAgICAgICAgICAgICBycGoucHV0KGludGVybmFsX2NvdWNoZGIubXkobmV3dXNlcmRiKSwgZG9jKS50aGVuKGZ1bmN0aW9uICgpIHsgIC8vIGNyZWF0ZSBhbiBlbXB0eSBkYlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJwai5wdXQoaW50ZXJuYWxfY291Y2hkYi5teShuZXd1c2VyZGIgKyAnL19zZWN1cml0eScpLCB7IFwibWVtYmVyc1wiOiB7IFwibmFtZXNcIjogW3VzZXJuYW1lLCBzbGF2ZS51c2VyXSwgXCJyb2xlc1wiOiBbXSB9IH0pLnRoZW4oZnVuY3Rpb24gKCkgeyAvLyBwdXNoIHNlY3VyaXR5IGNoYW5nZXMgdG8gYXBwIGRiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25maXJtREIucG9zdCh7Y29uZmlybTpmYWxzZX0pLnRoZW4oZnVuY3Rpb24oZG9jKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAvLyAgcmVnaXN0ZXJNYWlsKCdkYXJpb3l6ZkBnbWFpbC5jb20nLGRvYy5pZCk7IC8vIFRPIEJFIEFMSVZFXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIH0pLmNhdGNoKGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIuc3RhdHVzQ29kZSAhPSA0MDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyLnN0YXR1c0NvZGUgIT0gNDA0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVyci5zdGF0dXNDb2RlICE9IDQwNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIuc3RhdHVzQ29kZSAhPSA0MDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiRVJST1IhISFcIiArIGVycilcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cblxuXG5cblxuICAgICAgICAgICAgZ2V0dXNlcmRiKGludGVybmFsX2NvdWNoZGIsIHVzZXJuYW1lKS50aGVuKGZ1bmN0aW9uIChkb2MpIHtcblxuICAgICAgICAgICAgICAgIHRlc3RhcHBfaWQoaW50ZXJuYWxfY291Y2hkYiwgYXBwX2lkKS50aGVuKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgICAgICBzdWIoZG9jKVxuXG5cbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG5cblxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcblxuXG4gICAgfVxuXG4gICAgY3JlYXRlYXBwKGFwcF9pZCkge1xuICAgICAgICBjb25zdCBpbnRlcm5hbF9jb3VjaGRiID0gdGhpcztcblxuICAgICAgICAvLyBjcmVhdGUgYW4gYXBwbGljYXRpb24gKGltcGVyYXRpdmUpXG4gICAgICAgIC8vIHJldHVybiB0cnVlIG9ubHlcblxuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgICAgIHJwai5wdXQoaW50ZXJuYWxfY291Y2hkYi5teSgnYXBwXycgKyBhcHBfaWQpKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBycGoucHV0KGludGVybmFsX2NvdWNoZGIubXkoJ2FwcF8nICsgYXBwX2lkICsgJy9fZGVzaWduL2F1dGgnKSwge1xuICAgICAgICAgICAgICAgICAgICBcImxhbmd1YWdlXCI6IFwiamF2YXNjcmlwdFwiLFxuICAgICAgICAgICAgICAgICAgICBcInZhbGlkYXRlX2RvY191cGRhdGVcIjogXCJmdW5jdGlvbihuLG8sdSl7aWYobi5faWQmJiFuLl9pZC5pbmRleE9mKFxcXCJfbG9jYWwvXFxcIikpcmV0dXJuO2lmKCF1fHwhdS5yb2xlc3x8KHUucm9sZXMuaW5kZXhPZihcXFwiYXBwX1wiICsgYXBwX2lkICsgXCJcXFwiKT09LTEmJnUucm9sZXMuaW5kZXhPZihcXFwiX2FkbWluXFxcIik9PS0xKSl7dGhyb3coe2ZvcmJpZGRlbjonRGVuaWVkLid9KX19XCJcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVyci5zdGF0dXNDb2RlICE9IDQwNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJFUlJPUiEhIVwiICsgZXJyKVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChlcnIuc3RhdHVzQ29kZSAhPSA0MDQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJFUlJPUiEhIVwiICsgZXJyKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgIH0pXG4gICAgfVxuXG5cblxuXG5cbiAgICBzaGFyZW1hY2goYXBwX2lkLCB1c2VyLCBsYWJlbCwgZnJpZW5kKSB7IC8vIGNyZWF0ZSBvciBzdWJzY3JpYmUgbmV3IGFwcGxpY2F0aW9uXG5cblxuXG4gICAgICAgIHJldHVybiBzaGFyZW1hY2godGhpcywgYXBwX2lkLCB1c2VyLCBsYWJlbCwgZnJpZW5kKVxuICAgIH1cblxuXG5cblxuXG5cbn1cblxuXG5mdW5jdGlvbiBnZW5fZGIoa2luZCwgZGF0YSk6IHN0cmluZyB7XG4gICAgc3dpdGNoIChraW5kKSB7XG4gICAgICAgIGNhc2UgJ21lbWJlcic6XG4gICAgICAgICAgICByZXR1cm4gJ21lbV8nICsgdWlkKDMpICsgJ18nICsgZGF0YS5hcHBfaWQgKyAnXycgKyBkYXRhLnVzZXJuYW1lO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ21hY2hpbmUnOlxuICAgICAgICAgICAgcmV0dXJuICdtYWNoXycgKyB1aWQoNikgKyAnXycgKyBkYXRhLmFwcF9pZDtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgfVxufVxuZnVuY3Rpb24gcmFuZG9tX3NsYXZlKHVzZXJuYW1lKTogeyBwYXNzd29yZDogc3RyaW5nOyB1c2VyOiBzdHJpbmcgfSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBwYXNzd29yZDogdWlkKDEyKSxcbiAgICAgICAgdXNlcjogJ3NsXycgKyB1c2VybmFtZSArICdfJyArIHVpZCg2KVxuICAgIH1cblxufVxuXG5cbmV4cG9ydCBkZWZhdWx0IGNvdWNoQWNjZXNzXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
