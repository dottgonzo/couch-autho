import * as Promise from "bluebird";
import * as _ from "lodash";

import couchJsonConf from "couchjsonconf";

let uid = require("uid");
let rpj = require("request-promise-json");





interface IcommonDB {
    app_id: string;
    dbname: string;
    slave?: {
        username: string;
        password: string;
    },
    dbtype: string
    roles: string[];
    label?: string;
}


interface IUserDB {
    _id: string,
    _rev: string,
    password_scheme: string;
    iterations: string;
    name: string;
    email: string;
    db: IcommonDB[];
    roles: string[];
    type: string;
    derived_key: string;
    salt: string;

}






function testlogin(internal_couchdb, user, password, db) {

    // return true if credentials are correct for given db

    return new Promise<boolean>(function (resolve, reject) {

        rpj.get(internal_couchdb.for(user, password, db)).then(function () {
            resolve(true)
        }).catch(function (err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err)
            }

            reject(err)
        })
    })

}


function testapp_id(internal_couchdb, app_id) {


    // return true if app_id exist


    return new Promise<boolean>(function (resolve, reject) {
        rpj.get(internal_couchdb.my('app_' + app_id)).then(function () {
            resolve(true)
        }).catch(function (err) {

            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err)
            }

            reject(err)
        })
    })
}






function testauth(internal_couchdb, user, password, app_id) {


    // return true if credentials are correct for given app_id

    // get user credentials by username and password and take the app_id db, then test login with it


    return new Promise(function (resolve, reject) {
        getuserapp(internal_couchdb, user, app_id).then(function (db) {

            testlogin(internal_couchdb, user, password, db.dbname).then(function () {
                resolve(true)
            }).catch(function (err) {
                if (err.statusCode != 404) {
                    throw Error("ERROR!!!" + err)
                }

                reject(err)
            })
        }).catch(function (err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err)
            }

            reject(err)
        })

    })

}





function getuserdb(internal_couchdb, username) {

    // return all the user doc in _users


    return new Promise<IUserDB>(function (resolve, reject) {
        rpj.get(internal_couchdb.my('_users/org.couchdb.user:' + username)).then(function (doc) {
            resolve(doc)
        }).catch(function (err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err)
            }

            reject(err)
        })
    })
}


function getuserdbs(internal_couchdb, username) {

    // return all the user credentials for every application which they have access (internal)

    return new Promise<IcommonDB[]>(function (resolve, reject) {
        getuserdb(internal_couchdb, username).then(function (doc) {
            resolve(doc.db)
        }).catch(function (err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err)
            }

            reject(err)
        })
    })
}



function getuserapp(internal_couchdb, username, app_id) {


    // return user credentials (internal)


    return new Promise<IcommonDB>(function (resolve, reject) {
        getuserdbs(internal_couchdb, username).then(function (doc) {
            _.map(doc, function (d) {
                if (d.app_id == app_id && d.dbtype == 'mine') {
                    resolve(d)
                }
            })
        }).catch(function (err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err)
            }

            reject(err)
        })
    })
}



function getmymachine(internal_couchdb, app_id, username, label) {


    // return credentials by application and label  (internal)

    return new Promise<IcommonDB>(function (resolve, reject) {
        getuserdbs(internal_couchdb, username).then(function (doc) {
            _.map(doc, function (d) {
                if (d.app_id == app_id && d.dbtype == 'machine' && d.label == label) {
                    resolve(d)
                }
            })
        }).catch(function (err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err)
            }

            reject(err)
        })
    })
}

function getmymachines(internal_couchdb, app_id, username) {


    // return all user credentials for it's machines (internal)

    return new Promise<IcommonDB[]>(function (resolve, reject) {
        getuserdbs(internal_couchdb, username).then(function (doc) {
            var dbs = [];
            _.map(doc, function (d) {
                if (d.app_id == app_id && d.dbtype == 'machine') {
                    dbs.push(d)
                }
            })
            resolve(dbs)
        }).catch(function (err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err)
            }

            reject(err)
        })
    })
}


function create_slave_userapp(internal_couchdb, username, userappdb) {

    // create the user that will have access to a container (internal)

    // return username and password for the user created (password is generated here)



    return new Promise<{ password: string; user: string }>(function (resolve, reject) {
        let slave = random_slave(username);
        rpj.put(internal_couchdb.my('_users/org.couchdb.user:' + slave.user), {
            name: slave.user,
            roles: ['slave'],
            app: { db: userappdb, user: username },
            dbtype: "userslave",
            type: "user",
            password: slave.password
        }).then(function () {
            resolve(slave)
        }).catch(function (err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err)
            }

            reject(err)
        });
    })
}
















function sharemach(internal_couchdb: couchAccess, app_id, user, label, friend) { // create or subscribe new application


    return new Promise<boolean>(function (resolve, reject) {
        getmymachine(internal_couchdb, app_id, user, label).then(function (m) {

            getuserapp(internal_couchdb, app_id, friend).then(function () {

                getmymachine(internal_couchdb, app_id, friend, label).then(function () {
                    resolve(true)
                }).catch(function (err) {

                    var newdb: IcommonDB = { app_id: app_id, dbname: machinedb, slave: { username: machineuser, password: machinepassw, token: machinetoken }, label: label, dbtype: "machine", roles: ['shared'] };
                    doc.db.push(newdb)

                    rpj.put(internal_couchdb.my('_users/org.couchdb.user:' + friend), doc).then(function () {

                        rpj.get(internal_couchdb.my('_users/org.couchdb.user:' + machineuser), doc).then(function (updateslave) {

                            updateslave.app.users.push(newusername);

                            rpj.put(internal_couchdb.my('_users/org.couchdb.user:' + machineuser), updateslave).then(function () {
                                resolve(true)
                            }).catch(function (err) {
                                if (err.statusCode != 404) {
                                    throw Error("ERROR!!!" + err)
                                }

                                reject(err)
                            })
                        }).catch(function (err) {
                            if (err.statusCode != 404) {
                                throw Error("ERROR!!!" + err)
                            }

                            reject(err)
                        })
                    }).catch(function (err) {
                        if (err.statusCode != 404) {
                            throw Error("ERROR!!!" + err)
                        }

                        reject(err)
                    })
                })
            }).catch(function (err) {
                if (err.statusCode != 404) {
                    throw Error("ERROR!!!" + err)
                }

                reject(err)
            })
        }).catch(function (err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err)
            }

            reject(err)
        })
    })
}




interface IClassConf {
    hostname: string;
    protocol?: string;
    port?: number;
    db?: string;
    user: string;
    password: string;
}







class couchAccess extends couchJsonConf {

    constructor(rootaccessdb: IClassConf) {
        super(rootaccessdb)

        let that = this;

        function addAdminRole() {
            that.addAppRole(that.user, 'main').then(() => {
                console.log("created!")
                return true
            }).catch((err) => {
                console.log("errRRR " + err)
            })
        }




        rpj.get(that.my('app_main')).then(function () {


            getuserdb(that, that.user).then((u) => {

                if (u.roles.indexOf('app_main') != -1) {
                    addAdminRole()
                } else {
                    console.log("created!")
                    return true
                }

            }).catch((err) => {

                that.createUser(that.user, that.password, '').then(() => {


                    addAdminRole()


                }).catch((err) => {
                    console.error("err " + err)
                })

            })


        }).catch(function (err) {


            that.createapp('main').then(() => {

                getuserdb(that, that.user).then((u) => {

                    if (u.roles.indexOf('app_main') != -1) {
                        addAdminRole()
                    } else {
                        console.log("created!")
                        return true
                    }

                }).catch((err) => {

                    that.createUser(that.user, that.password, '').then(() => {

                        addAdminRole()


                    }).catch((err) => {
                        console.error("err " + err)
                    })

                })



            }).catch((err) => {


                console.error("err " + err)
            })
        })


    }

    login(o: { username: string, password: string, app_id: string }) {
        const _this = this;

        return new Promise<boolean>(function (resolve, reject) {

            if (o && o.username && o.password && o.app_id) {
                testauth(_this, o.username, o.password, o.app_id).then(() => {
                    resolve(true)
                }).catch((err) => {
                    reject(err)
                })

            } else {
                if (!o) {
                    reject('no options provided')
                } else if (!o.username) {
                    reject('no username provided')

                } else if (!o.password) {
                    reject('no password provided')

                } else if (!o.app_id) {
                    reject('no app_id provided')

                }
            }

        })
    }

    register(o: { username: string, password: string, email: string, app_id: string }): Promise<boolean> {
        const _this = this;

        return new Promise<boolean>(function (resolve, reject) {
            if (o && o.username && o.password && o.email && o.app_id) {
                _this.createUser(o.username, o.password, o.email).then(() => {
                    _this.subscribeapp(o.app_id, o.username).then(() => {
                        resolve(true)
                    }).catch((err) => {
                        reject(err)
                    })
                }).catch((err) => {
                    reject(err)
                })
            } else {
                if (!o) {
                    reject('no options provided')
                } else if (!o.username) {
                    reject('no username provided')

                } else if (!o.password) {
                    reject('no password provided')

                } else if (!o.email) {
                    reject('no email provided')

                } else if (!o.app_id) {
                    reject('no app_id provided')

                }
            }

        })

    }

    createappforuser(app_id, username) { // create a new application

        const internal_couchdb = this;



        return new Promise<boolean>(function (resolve, reject) {


            internal_couchdb.createapp(app_id).then(function () {

                internal_couchdb.subscribeapp(app_id, username, true).then(() => {
                    resolve(true)
                }).catch((err) => {
                    reject(err)


                })
            }).catch(function (err) {
                reject(err)


            })




        })
    }


    addAppRole(username: string, app_id: string): Promise<boolean> {
        const _this = this;
        return new Promise<boolean>(function (resolve, reject) {

            getuserdb(_this, username).then((u) => {
                u.roles.push('app_' + app_id)

                rpj.put(_this.my('_users/org.couchdb.user:' + username), u).then(() => {

                    resolve(true)

                }).catch((err) => {
                    reject(err)
                })
            }).catch((err) => {
                reject(err)
            })

        })

    }



    createUser(username: string, password: string, email: string): Promise<IUserDB> {
        const _this = this;
        return new Promise<IUserDB>(function (resolve, reject) {

            getuserdb(_this, username).then((u) => {
                reject("user " + username + " just eixsts")

            }).catch((err) => {

                const doc = { name: username, email: email, db: [], "roles": ['user'], "type": "user", password: password };

                rpj.put(_this.my('_users/org.couchdb.user:' + username), doc).then(() => {
                    getuserdb(_this, username).then((u) => {

                        resolve(u)

                    }).catch((err) => {
                        reject(err)
                    })
                }).catch((err) => {
                    reject(err)
                })




            })

        })
    }

    testlogin(user, password, db) {


        return testlogin(this, user, password, db);
    }


    testapp_id(app_id) {


        return testapp_id(this, app_id);
    }


    getuserdbs(username) {

        return getuserdbs(this, username)
    }



    getuserapp(username, app_id) {

        return getuserapp(this, username, app_id)
    }



    getmymachine(app_id, username, label) {

        return getmymachine(this, app_id, username, label)
    }

    getmymachines(app_id, username) {

        return getmymachines(this, app_id, username)
    }


    create_slave_userapp(username: string, userdb: string) {


        return create_slave_userapp(this, username, userdb)
    }

    subscribeapp(app_id: string, username: string, owner?: boolean) {



        // every user must have a personal db for every application that they have access
        // when an user subscribe an app, a db and it's slave user  will be created for him, and the user doc in _users register the new credentials generated 




        const internal_couchdb = this;


        return new Promise<boolean>(function (resolve, reject) {



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

                    rpj.put(internal_couchdb.my('_users/org.couchdb.user:' + username), doc).then(function () { // push new user settings
                        rpj.put(internal_couchdb.my(newuserdb), doc).then(function () {  // create an empty db
                            rpj.put(internal_couchdb.my(newuserdb + '/_security'), { "members": { "names": [username, slave.user], "roles": [] } }).then(function () { // push security changes to app db
                                resolve(true)

                                // confirmDB.post({confirm:false}).then(function(doc){
                                //   //  registerMail('darioyzf@gmail.com',doc.id); // TO BE ALIVE
                                // }).catch(function(err){
                                //   reject(err)
                                // });

                            }).catch(function (err) {
                                if (err.statusCode != 404) {
                                    throw Error("ERROR!!!" + err)
                                }

                                reject(err)
                            })
                        }).catch(function (err) {
                            if (err.statusCode != 404) {
                                throw Error("ERROR!!!" + err)
                            }

                            reject(err)
                        })
                    }).catch(function (err) {
                        if (err.statusCode != 404) {
                            throw Error("ERROR!!!" + err)
                        }

                        reject(err)
                    })
                }).catch(function (err) {
                    if (err.statusCode != 404) {
                        throw Error("ERROR!!!" + err)
                    }

                    reject(err)
                })
            }




            getuserdb(internal_couchdb, username).then(function (doc) {

                testapp_id(internal_couchdb, app_id).then(function () {

                    sub(doc)


                }).catch(function (err) {
                    reject(err)
                })

            }).catch(function (err) {
                reject(err)


            })
        })


    }

    createapp(app_id) {
        const internal_couchdb = this;

        // create an application (imperative)
        // return true only


        return new Promise<boolean>(function (resolve, reject) {

            rpj.put(internal_couchdb.my('app_' + app_id)).then(function () {
                rpj.put(internal_couchdb.my('app_' + app_id + '/_design/auth'), {
                    "language": "javascript",
                    "validate_doc_update": "function(n,o,u){if(n._id&&!n._id.indexOf(\"_local/\"))return;if(!u||!u.roles||(u.roles.indexOf(\"app_" + app_id + "\")==-1&&u.roles.indexOf(\"_admin\")==-1)){throw({forbidden:'Denied.'})}}"
                }).then(function () {
                    resolve(true)
                }).catch(function (err) {
                    if (err.statusCode != 404) {
                        throw Error("ERROR!!!" + err)
                    }

                    reject(err)
                })
            }).catch(function (err) {
                if (err.statusCode != 404) {
                    throw Error("ERROR!!!" + err)
                }

                reject(err)
            })

        })
    }





    sharemach(app_id, user, label, friend) { // create or subscribe new application



        return sharemach(this, app_id, user, label, friend)
    }






}


function gen_db(kind, data): string {
    switch (kind) {
        case 'member':
            return 'mem_' + uid(3) + '_' + data.app_id + '_' + data.username;
            break;
        case 'machine':
            return 'mach_' + uid(6) + '_' + data.app_id;
            break;

    }
}
function random_slave(username): { password: string; user: string } {

    return {
        password: uid(12),
        user: 'sl_' + username + '_' + uid(6)
    }

}


export default couchAccess
