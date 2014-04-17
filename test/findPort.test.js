"use strict";

var chai = require("chai"),
    when = require("when"),
    rewire = require("rewire"),
    sinon = require("sinon"),
    net = require("net"),
    expect = chai.expect,
    slow = require("./helpers/slow.js"),
    findPort = rewire("../lib/findPort.js"),
    getport = require("getport"),
    phantomFarm = require("../lib/main.js");

chai.config.includeStack = true;
chai.use(require("chai-as-promised"));
chai.use(require("sinon-chai"));

describe("findPort()", function () {

    it("should resolve with a free port", slow(function () {
        return findPort()
            .then(function (port) {
                return when.promise(function (resolve, reject) {
                    net.connect(port, reject).on("error", resolve);
                });
            });
    }));

    it("should respect the minPort-config", function () {
        var getportSpy = sinon.spy();

        findPort.__set__("getport", getportSpy);
        phantomFarm.config.minPort = 30000;
        findPort();
        phantomFarm.config.minPort = 2000;
        expect(getportSpy.firstCall.args[0]).to.equal(30000);
    });

    it("should respect the maxPort-config", function () {
        var getportSpy = sinon.spy();

        findPort.__set__("getport", getportSpy);

        phantomFarm.config.maxPort = 30000;
        findPort();
        expect(getportSpy.firstCall.args[1]).to.equal(30000);
    });

});