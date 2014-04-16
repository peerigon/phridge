"use strict";

var chai = require("chai"),
    expect = chai.expect,
    create = require("../lib/create"),
    exitAll = require("../lib/exitAll"),
    phantomFarm = require("../lib/main.js");

chai.config.includeStack = true;

describe("phantom-farm", function () {

    describe(".create", function () {

        it("should be the create-module", function () {
            expect(phantomFarm.create).to.equal(create);
        });

    });

    describe(".exitAll", function () {

        it("should be the exitAll-module", function () {
            expect(phantomFarm.exitAll).to.equal(exitAll);
        });

    });

});