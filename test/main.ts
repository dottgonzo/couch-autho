import * as mocha from "mocha";
import * as chai from "chai";

import couchauth from "../index";


const spawnPouchdbServer = require('spawn-pouchdb-server');



let expect = chai.expect;



let usercredentials = {

};



let Server;

let db = __dirname + '/../.db'
/*
let CouchAuth = new couchauth({
hostname:'',
user:'',
password:''
});

*/

before(function (done) {
    spawnPouchdbServer(
        {
            port: 8741,
            backend: false,
            config:{
                admins:{"adminuser": "adminpass"},
                file:false
            },
            log:{
                file:false,
                level:'none'
            }
        }, function (error, server) {
            if (error) {
                throw error;

            } else {

                console.log('PouchDB Server stared at localhost:8741/_utils')
                Server = server
                done()
            }
        })

});

// write tests about multiple values (2 ip or 2 gateway for the same interface)
describe("test user", function () {

    it("expect return an object", function () {
        expect("ok").to.be.ok;
    });

});

after(function (done) {
    Server.stop(function () {
        console.log('PouchDB Server stopped')
        done()

    })

});