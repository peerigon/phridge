"use strict";

var chai = require("chai"),
    expect = chai.expect,
    config = require("../lib/config"),
    create = require("../lib/create"),
    exitAll = require("../lib/exitAll"),
    phantomFarm = require("../lib/main.js");

chai.config.includeStack = true;

describe("phantom-farm", function () {

    describe(".config", function () {

        it("should be the config-module", function () {
            expect(phantomFarm.config).to.equal(config);
        });

    });

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