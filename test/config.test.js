"use strict";

var chai = require("chai"),
    rewire = require("rewire"),
    expect = chai.expect,
    config = rewire("../lib/config");

chai.config.includeStack = true;

describe("config", function () {
    var internalConf;

    before(function () {
        internalConf = config.__get__("config");
    });

    describe(".set", function () {

        describe(".get", function () {

            it("should be the .get()-function", function () {
                expect(config.set.get).to.equal(config.get);
            });

        });

    });

    describe(".set(conf)", function () {

        it("should merge the config-keys", function () {
            config.set({
                stdout: null,
                stderr: null
            });
            expect(internalConf.stdout).to.equal(null);
            expect(internalConf.stderr).to.equal(null);
        });

    });

    describe(".set(key, value)", function () {

        it("should set the given key", function () {
            config.set("minPort", 3000);
            expect(internalConf.minPort).to.equal(3000);
        });

    });

    describe(".get()", function () {

        it("should return the internal config", function () {
            expect(config.get()).to.equal(internalConf);
        });

    });

    describe(".get(key)", function () {

        it("should return the given config key", function () {
            expect(config.get("maxPort")).to.equal(2^16);
        });

    });

});