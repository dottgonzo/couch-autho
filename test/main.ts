import * as mocha from "mocha";
import * as chai from "chai";

import couchauth from "../index";

const rpj = require('request-promise-json');
const spawnPouchdbServer = require('spawn-pouchdb-server');

const testport = 8742;

const user0 = {
    user: 'testuser0',
    password: 'testpassw0',
    email: 'testuser0@test.tst'
}

const user1 = {
    user: 'testuser1',
    password: 'testpassw1',
    email: 'testuser1@test.tst'
}

let expect = chai.expect;


let Server;



let CouchAuth: couchauth;



before(function (done) {
    this.timeout(20000);
    spawnPouchdbServer(
        {
            port: testport,
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
                    port: testport,
                    user: 'adminuser',
                    password: 'adminpass'
                });


                setTimeout(function () {
                    done()
                }, 1000)
            }
        })







});


describe("test app_main", function () {
    this.timeout(20000);

    it("verificate presence of app_main db", function (done) {


        rpj.get(CouchAuth.my('app_main')).then(function (d) {

            rpj.put(CouchAuth.my('app_main') + '/testdoctobepresent0', { _id: 'testdoctobepresent0', ee: true }).then(function (d) {
                expect(d).to.be.ok;
                expect(d).to.be.an('object');
                done();
            }).catch((err) => {
                console.log(err)
                done(Error(err));
            })


        }).catch((err) => {
            done(Error(err));
        })
    });

    it("verificate that app_main db is private", function (done) {
        //    console.log(CouchAuth.my('app_main'))
        rpj.put(CouchAuth.publink + '/app_main/testdocnotbepresent0', { _id: 'testdocnotbepresent0', ee: true }).then(function (d) {
            done(Error(d));
        }).catch((err) => {
            expect(err).to.be.ok;
            done();
        })

    });


    it("verificate admin user", function (done) {
        //    console.log(CouchAuth.my('app_main'))
        rpj.get(CouchAuth.my('_users/org.couchdb.user:' + 'adminuser')).then(function (d) {
            expect(d).to.be.ok;
            expect(d).to.have.property('name').that.eq('adminuser');
            expect(d).to.have.property('email');
            expect(d).to.have.property('roles').that.is.an('array');
            expect(d).to.have.property('db').that.is.an('array');
            done();
        }).catch((err) => {
            done(Error(err));
        })

    });


});
describe("create a new app", function () {
    it("main admin add first app", function (done) {
        CouchAuth.createapp('testapp').then(function (d) {
            expect(d).to.be.ok;

            done()
        }).catch((err) => {
            done(Error(err));
        })
    })
})
describe("users", function () {
    describe("registration", function () {
        let slave;

        it("create an user", function (done) {
            CouchAuth.register({ username: user0.user, password: user0.password, email: user0.email, app_id: 'testapp' }).then(function () {


                rpj.get(CouchAuth.my('_users/org.couchdb.user:' + user0.user)).then(function (d) {

                    expect(d).to.be.ok;
                    expect(d).to.have.property('name').that.eq(user0.user);
                    expect(d).to.have.property('email').that.eq(user0.email);

                    expect(d).to.have.property('roles').that.is.an('array');
                    expect(d.roles[0]).to.be.eq('user');

                    expect(d).to.have.property('type').that.eq('user');

                    expect(d).to.have.property('db').that.is.an('array');

                    expect(d.db[0]).to.have.property('app_id').that.is.a('string').that.eq('testapp');
                    expect(d.db[0]).to.have.property('dbname').that.is.a('string');
                    expect(d.db[0]).to.have.property('dbtype').that.is.a('string').that.eq('mine');

                    expect(d.db[0]).to.have.property('roles').that.is.an('array');
                    expect(d.db[0].roles[0]).to.be.eq('owner');

                    expect(d.db[0]).to.have.property('slave').that.is.an('object');
                    expect(d.db[0].slave).to.have.property('username').that.is.a('string');
                    expect(d.db[0].slave).to.have.property('password').that.is.a('string');

                    slave = d.db[0].slave;
                    done();



                }).catch((err) => {
                    done(Error(err));
                })
            }).catch((err) => {
                done(Error(err));
            })



        })

        it("check slave", function (done) {

            rpj.get(CouchAuth.my('_users/org.couchdb.user:' + slave.username)).then((d) => {

                expect(d).to.be.ok;

                expect(d).to.have.property('name').that.eq(slave.username);

                expect(d).to.have.property('roles').that.is.an('array');
                expect(d.roles[0]).to.be.eq('slave');


                expect(d).to.have.property('app').that.is.an('object');
                expect(d.app).to.have.property('db').that.is.a('string');
                expect(d.app).to.have.property('user').that.is.a('string');

                expect(d).to.have.property('dbtype').that.is.a('string').that.eq('userslave');

                expect(d).to.have.property('type').that.is.a('string').that.eq('user');

                done();
            }).catch((err) => {
                done(Error(err));
            })



        })

        it("can login", function (done) {


            CouchAuth.login({ username: user0.user, password: user0.password, app_id: 'testapp' }).then(() => {

                done();
            }).catch((err) => {
                done(Error(err));
            })



        })

    })


    describe("machine", function () {


        it("create a machine for an app subscribed", function (done) {
            done();
        })
        it("can't create a machine for an app that not subscribed yet", function (done) {
            done();
        })
        it("share a machine that own", function (done) {
            done();
        })
        it("can't share a machine that not own", function (done) {
            done();
        })
        it("change a user role for a machine that own", function (done) {
            done();
        })
        it("can't change  a user role for a machine that not own", function (done) {
            done();
        })
        it("delete a machine that own", function (done) {
            done();
        })
        it("can't delete a machine that not own", function (done) {
            done();
        })

    })


})



after(function (done) {
    Server.stop(function () {
        done()
    })

});