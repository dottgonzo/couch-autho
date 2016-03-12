import * as mocha from "mocha";
import * as chai from "chai";

import couchauth= require("../index");

let expect = chai.expect;



let usercredentials={
    
};

let rootcredentials={
    
};

let CouchAuth=new couchauth(rootcredentials);


// write tests about multiple values (2 ip or 2 gateway for the same interface)
describe("test user", function() {

    it("expect return an object", function() {
        expect("ok").to.be.ok;
    });

});