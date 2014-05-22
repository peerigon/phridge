"use strict";

var chai = require("chai"),
    expect = chai.expect,
    config = require("../lib/config"),
    spawn = require("../lib/spawn"),
    disposeAll = require("../lib/disposeAll"),
    phridge = require("../lib/main.js");

chai.config.includeStack = true;

describe("phridge", function () {

    describe(".config", function () {

        it("should be the config-module", function () {
            expect(phridge.config).to.equal(config);
        });

    });

    describe(".spawn", function () {

        it("should be the spawn-module", function () {
            expect(phridge.spawn).to.equal(spawn);
        });

    });

    describe(".disposeAll", function () {

        it("should be the exitAll-module", function () {
            expect(phridge.disposeAll).to.equal(disposeAll);
        });

    });

});