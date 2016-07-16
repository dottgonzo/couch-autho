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

    return new Promise<boolean>(function(resolve, reject) {
        rpj.get(internal_couchdb.for(user, password, db)).then(function() {
            resolve(true)
        }).catch(function(err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err)
            }

            reject(err)
        })
    })

}


function testapp_id(internal_couchdb, app_id) {


    // return true if app_id exist


    return new Promise<boolean>(function(resolve, reject) {
        rpj.get(internal_couchdb.my('app_' + app_id)).then(function() {
            resolve(true)
        }).catch(function(err) {

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


    return new Promise(function(resolve, reject) {
        getuserapp(user, password, app_id).then(function(db) {
            testlogin(internal_couchdb, user, password, db).then(function() {
                resolve(true)
            }).catch(function(err) {
                if (err.statusCode != 404) {
                    throw Error("ERROR!!!" + err)
                }

                reject(err)
            })
        }).catch(function(err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err)
            }

            reject(err)
        })

    })

}





function getuserdb(internal_couchdb, username) {
    
    // return all the user doc in _users
    

    return new Promise<IUserDB>(function(resolve, reject) {
        rpj.get(internal_couchdb.my('_users/org.couchdb.user:' + username)).then(function(doc) {
            resolve(doc)
        }).catch(function(err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err)
            }

            reject(err)
        })
    })
}


function getuserdbs(internal_couchdb, username) {
    
    // return all the user credentials for every application which they have access (internal)

    return new Promise<IcommonDB[]>(function(resolve, reject) {
        getuserdb(internal_couchdb, username).then(function(doc) {
            resolve(doc.db)
        }).catch(function(err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err)
            }

            reject(err)
        })
    })
}



function getuserapp(internal_couchdb, username, app_id) {
    
    
    // return user credentials (internal)
    

    return new Promise<IcommonDB>(function(resolve, reject) {
        getuserdbs(internal_couchdb, username).then(function(doc) {
            _.map(doc, function(d) {
                if (d.app_id == app_id && d.dbtype == 'mine') {
                    resolve(d)
                }
            })
        }).catch(function(err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err)
            }

            reject(err)
        })
    })
}



function getmymachine(internal_couchdb, app_id, username, label) {
    
    
    // return credentials by application and label  (internal)

    return new Promise<IcommonDB>(function(resolve, reject) {
        getuserdbs(internal_couchdb, username).then(function(doc) {
            _.map(doc, function(d) {
                if (d.app_id == app_id && d.dbtype == 'machine' && d.label == label) {
                    resolve(d)
                }
            })
        }).catch(function(err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err)
            }

            reject(err)
        })
    })
}

function getmymachines(internal_couchdb, app_id, username) {
    
    
    // return all user credentials for it's machines (internal)

    return new Promise<IcommonDB[]>(function(resolve, reject) {
        getuserdbs(internal_couchdb, username).then(function(doc) {
            var dbs = [];
            _.map(doc, function(d) {
                if (d.app_id == app_id && d.dbtype == 'machine') {
                    dbs.push(d)
                }
            })
            resolve(dbs)
        }).catch(function(err) {
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
    
    

    return new Promise<{ password: string; user: string }>(function(resolve, reject) {
        let slave = random_slave(username);
        rpj.put(internal_couchdb.my('/_users/org.couchdb.user:' + slave.user), {
            name: slave.user,
            roles: ['slave'],
            app: { db: userappdb, user: username },
            dbtype: "userslave",
            type: "user",
            password: slave.password
        }).then(function() {
            resolve(slave)
        }).catch(function(err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err)
            }

            reject(err)
        });
    })
}

function subscribeapp(internal_couchdb, app_id, username, owner) {


    // every user must have a personal db for every application that they have access
    // when an user subscribe an app, a db and it's slave user  will be created for him, and the user doc in _users register the new credentials generated 



    return new Promise<boolean>(function(resolve, reject) {

        getuserdb(internal_couchdb, username).then(function(doc) {

            var newuserdb = gen_db('member', { username: username, app_id: app_id });

            create_slave_userapp(internal_couchdb, username, newuserdb).then(function(slave) {

                var newdb = { app_id: app_id, dbname: newuserdb, slave: { username: slave.user, password: slave.password }, dbtype: "mine", roles: ['owner'] };
                doc.db.push(newdb);

                if (owner) {
                    doc.roles.push('app_' + app_id);
                    var startapp = { app_id: app_id, dbname: 'app_' + app_id, dbtype: "application", roles: ['owner'] };
                    doc.db.push(startapp);
                }

                rpj.put(internal_couchdb.my('/_users/org.couchdb.user:' + username), doc).then(function() { // push new user settings
                    rpj.put(internal_couchdb.my('/' + newuserdb), doc).then(function() {  // create an empty db
                        rpj.put(internal_couchdb.my('/' + newuserdb + '/_security'), { "members": { "names": [username, slave.user], "roles": [] } }).then(function() { // push security changes to app db
                            resolve(true)

                            // confirmDB.post({confirm:false}).then(function(doc){
                            //   //  registerMail('darioyzf@gmail.com',doc.id); // TO BE ALIVE
                            // }).catch(function(err){
                            //   reject(err)
                            // });

                        }).catch(function(err) {
                            if (err.statusCode != 404) {
                                throw Error("ERROR!!!" + err)
                            }

                            reject(err)
                        })
                    }).catch(function(err) {
                        if (err.statusCode != 404) {
                            throw Error("ERROR!!!" + err)
                        }

                        reject(err)
                    })
                }).catch(function(err) {
                    if (err.statusCode != 404) {
                        throw Error("ERROR!!!" + err)
                    }

                    reject(err)
                })
            }).catch(function(err) {
                if (err.statusCode != 404) {
                    throw Error("ERROR!!!" + err)
                }

                reject(err)
            })
        }).catch(function(err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err)
            }

            reject(err)
        })
    })
}

function createapp(internal_couchdb, app_id) {

    // create an application (imperative)
    // return true only


    return new Promise<boolean>(function(resolve, reject) {

        rpj.put(internal_couchdb.my('app_' + app_id)).then(function() {
            rpj.put(internal_couchdb.my('/app_' + app_id + '/_design/auth'), {
                "language": "javascript",
                "validate_doc_update": "function(n,o,u){if(n._id&&!n._id.indexOf(\"_local/\"))return;if(!u||!u.roles||u.roles.indexOf(\"app_" + app_id + "\")==-1){throw({forbidden:'Denied.'})}}"
            }).then(function() {
                resolve(true)
            }).catch(function(err) {
                if (err.statusCode != 404) {
                    throw Error("ERROR!!!" + err)
                }

                reject(err)
            })
        }).catch(function(err) {
            if (err.statusCode != 404) {
                throw Error("ERROR!!!" + err)
            }

            reject(err)
        })

    })

}





function createappforuser(internal_couchdb, app_id, username) { // create a new application
    
    
    
    
    return new Promise<boolean>(function(resolve, reject) {


                createapp(internal_couchdb, app_id).then(function() {
                    subscribeapp(internal_couchdb, app_id, username, true).then(function() {
                        resolve(true)
                    }).catch(function(err) {
                        if (err.statusCode != 404) {
                            throw Error("ERROR!!!" + err)
                        }

                        reject(err)
                    })
                }).catch(function(err) {
                    if (err.statusCode != 404) {
                        throw Error("ERROR!!!" + err)
                    }

                    reject(err)
                })
                
                
                
                
    })
}








function sharemach(internal_couchdb, app_id, user, label, friend) { // create or subscribe new application
    var internal_couchdb = this

    return new Promise<boolean>(function(resolve, reject) {
        getmymachine(internal_couchdb, app_id, user, label).then(function(m) {

            getuserapp(internal_couchdb, app_id, friend).then(function() {

                getmymachine(internal_couchdb, app_id, friend, label).then(function() {
                    resolve(true)
                }).catch(function(err) {

                    var newdb: IcommonDB = { app_id: app_id, dbname: machinedb, slave: { username: machineuser, password: machinepassw, token: machinetoken }, label: label, dbtype: "machine", roles: ['shared'] };
                    doc.db.push(newdb)

                    rpj.put(internal_couchdb.my('/_users/org.couchdb.user:' + friend), doc).then(function() {

                        rpj.get(internal_couchdb.my('/_users/org.couchdb.user:' + machineuser), doc).then(function(updateslave) {

                            updateslave.app.users.push(newusername);

                            rpj.put(internal_couchdb.my('/_users/org.couchdb.user:' + machineuser), updateslave).then(function() {
                                resolve(true)
                            }).catch(function(err) {
                                if (err.statusCode != 404) {
                                    throw Error("ERROR!!!" + err)
                                }

                                reject(err)
                            })
                        }).catch(function(err) {
                            if (err.statusCode != 404) {
                                throw Error("ERROR!!!" + err)
                            }

                            reject(err)
                        })
                    }).catch(function(err) {
                        if (err.statusCode != 404) {
                            throw Error("ERROR!!!" + err)
                        }

                        reject(err)
                    })
                })
            }).catch(function(err) {
                if (err.statusCode != 404) {
                    throw Error("ERROR!!!" + err)
                }

                reject(err)
            })
        }).catch(function(err) {
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

    constructor(rootaccessdb:IClassConf) {
        super(rootaccessdb)

        rpj.get(this.my('_users/org.couchdb.user:' + this.user)).then(function() {


            rpj.get(this.couchurl.my('app_main')).then(function() {
                return true
            }).catch(function(err) {

                createapp(this, 'main').then(function() {
                    return true
                }).catch(function(err) {

                    throw Error('can\'t create main app');

                })

            })
        }).catch(function(err) {
            throw Error('wrong admin user')
        })

    }

    testlogin(user, password, db) {


        return testlogin(this, user, password, db);
    }


    testapp_id(app_id) {


        return testapp_id(this, app_id);
    }



    testauth(user, password, app_id) {
        return testauth(this, user, password, app_id)

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


    create_slave_userapp(username, userdb) {


        return create_slave_userapp(this, username, userdb)
    }

    subscribeapp(app_id, username, owner) {



        return subscribeapp(this, app_id, username, owner)
    }

    createapp(app_id, username) {


        return createappforuser(this, app_id, username)

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
