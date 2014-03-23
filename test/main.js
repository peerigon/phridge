"use strict";

var chai = require("chai"),
    expect = chai.expect,
    phantomFarm = require("../lib/main.js"),
    Phantom = require("../lib/Phantom.js");

// enable global promise shim
// @see https://github.com/cujojs/when/blob/master/docs/es6-promise-shim.md
require("when/es6-shim/Promise");

chai.config.includeStack = true;

describe("phantom-farm", function () {

    describe(".create()", function () {

        it("should return an es6 promise", function () {
            var promise = phantomFarm.create();

            expect(promise).to.be.an.instanceOf(Promise);
        });

        it("should resolve to an instance of Phantom", function (done) {
            this.timeout(10000);
            phantomFarm.create({ webSecurity: false }).then(function (phantom) {
                expect(phantom).to.be.an.instanceOf(Phantom);
                done();
            }).catch(done);
        });

    });

});