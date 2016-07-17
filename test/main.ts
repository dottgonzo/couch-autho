import * as mocha from "mocha";
import * as chai from "chai";

let rpj = require('request-promise-json');

import couchauth from "../index";


const spawnPouchdbServer = require('spawn-pouchdb-server');



let expect = chai.expect;

let should = chai.should;

let usercredentials = {

};



let Server;

let db = __dirname + '/../.db'

let CouchAuth: couchauth;



before(function (done) {
    this.timeout(10000);
    spawnPouchdbServer(
        {
            port: 8741,
            backend: false,
            config: {
                admins: { "adminuser": "adminpass" },
                file: false
            },
            log: {
                file: false,
                level: 'info'
            }
        }, function (error, server) {
            if (error) {
                throw error;

            } else {
                Server = server
                CouchAuth = new couchauth({
                    hostname: 'localhost',
                    protocol: 'http',
                    port: 8741,
                    user: 'adminuser',
                    password: 'adminpass'
                });
                setTimeout(function () {
                    done()
                }, 5000)
            }
        })

});

// write tests about multiple values (2 ip or 2 gateway for the same interface)
describe("test app_main", function () {
    this.timeout(20000);

    it("verificate presence of app_main db", function (done) {
        //    console.log(CouchAuth.my('app_main'))

        rpj.get(CouchAuth.my('app_main')).then(function (d) {
            expect(d.db_name).to.be.eq('app_main');
            done();
        }).catch((err) => {
            done(Error(err));
        })
    });

    it("verificate that app_main db is private", function (done) {
        //    console.log(CouchAuth.my('app_main'))
        rpj.get(CouchAuth.publink + '/app_main').then(function (d) {
            done(Error(d));
        }).catch((err) => {
            console.log(err)
            expect(err).to.be.ok;
            done()
        })
    });


});
describe("main admins", function () {
    it("create a main admin (for test only)", function (done) {
    })
    it("create an app", function (done) {
    })
})

describe("users", function () {
    it("user registration", function (done) {
    })
    it("user subscribe an app", function (done) {
    })
    it("user login", function (done) {
    })
    it("create a machine for an app subscribed", function (done) {
    })
    it("can't create a machine for an app that not subscribed yet", function (done) {
    })
    it("share a machine that own", function (done) {
    })
    it("can't share a machine that not own", function (done) {
    })
    it("change a user role for a machine that own", function (done) {
    })
    it("can't change  a user role for a machine that not own", function (done) {
    })
    it("delete a machine that own", function (done) {
    })
    it("can't delete a machine that not own", function (done) {
    })
    it("garant a privilege", function (done) {
    })
    it("revoke a privilege", function (done) {
    })
});

after(function (done) {
    Server.stop(function () {
        done()
    })

});