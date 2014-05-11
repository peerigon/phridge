"use strict";

var chai = require("chai"),
    when = require("when"),
    chaiAsPromised = require("chai-as-promised"),
    expect = chai.expect,
    phridge = require("../lib/main.js"),
    Phantom = require("../lib/Phantom.js"),
    slow = require("./helpers/slow.js");

chai.config.includeStack = true;
chai.use(chaiAsPromised);

describe("disposeAll()", function () {

    it("should exit cleanly all running phantomjs instances", slow(function () {
        var exitted = [];

        return when.all([
                phridge.create(),
                phridge.create(),
                phridge.create()
            ])
            .then(function (p) {
                p[0].childProcess.on("exit", function () { exitted.push(0); });
                p[1].childProcess.on("exit", function () { exitted.push(1); });
                p[2].childProcess.on("exit", function () { exitted.push(2); });

                return phridge.disposeAll();
            })
            .then(function () {
                exitted.sort();
                expect(exitted).to.eql([0, 1, 2]);
            });
    }));

});