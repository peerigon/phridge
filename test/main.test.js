"use strict";

var chai = require("chai"),
    when = require("when"),
    node = require("when/node"),
    getport = require("getport"),
    chaiAsPromised = require("chai-as-promised"),
    http = require("http"),
    stream = require("stream"),
    expect = chai.expect,
    phantomFarm = require("../lib/main.js"),
    Phantom = require("../lib/Phantom.js"),
    instances = require("../lib/instances.js");

chai.config.includeStack = true;
chai.use(chaiAsPromised);

getport = node.lift(getport);

describe("phantom-farm", function () {

    after(slow(function () {
        return phantomFarm.exitAll();
    }));

    describe.skip(".create(config?)", function () {

        it("should return a promise", function () {
            expect(when.isPromiseLike(phantomFarm.create())).to.equal(true);
        });

        it("should resolve to an instance of Phantom", slow(function (done) {
            phantomFarm.create().then(function (phantom) {
                expect(phantom).to.be.an.instanceOf(Phantom);
                done();
            }).catch(done);
        }));

        it("should pass the provided config to phantomjs", slow(function (done) {
            var debuggerPort;

            getport()
                .then(function (port) {
                    debuggerPort = port;
                    console.log(debuggerPort);
                    return phantomFarm.create({ remoteDebuggerPort: port });
                })
                .then(nextTick(function () {
                    try {
                        http.createServer().listen(debuggerPort);
                    } catch (err) {
                        console.log(err);
                        done();
                    }
                }))
                .catch(done);
        }));

    });

    describe.skip(".exitAll()", function () {

        it("should return an es6 promise", function () {
            expect(when.isPromiseLike(phantomFarm.exitAll())).to.equal(true);
        });

        it("should exit cleanly all running phantomjs instances", function () {
            var currentInstances = [phantomFarm.create(), phantomFarm.create(), phantomFarm.create()],
                exitted = [];

            return when.all(currentInstances).then(function () {
                    console.log("hi");
                    currentInstances[0].childProcess.on("exit", function () { exitted.push(0); });
                    currentInstances[1].childProcess.on("exit", function () { exitted.push(1); });
                    currentInstances[2].childProcess.on("exit", function () { exitted.push(2); });

                    return phantomFarm.exitAll();
                })
                .then(function () {
                    exitted.sort();
                    expect(exitted).to.eql([0, 1, 2]);
                });
        });

    });

});

describe("Phantom", function () {
    var phantom;

    beforeEach(slow(function () {
        return phantomFarm.create().then(function (newPhantom) {
            phantom = newPhantom;
        });
    }));

    afterEach(slow(function () {
        return phantom.exit();
    }));

    describe(".prototype", function () {

        describe(".constructor(childProcess, port)", function () {

            it("should set the childProcess and port accordingly", function () {
                var childProcess = {},
                    port = 3000;

                // exit() the instance created by the beforeEach hook
                // we're creating our own instance for this test
                phantom.exit();

                phantom = new Phantom(childProcess, port);
                expect(phantom.childProcess).to.equal(childProcess);
                expect(phantom.port).to.equal(port);

                phantom.exit = function () {
                    instances.splice(instances.indexOf(this), 1);
                };
            });

            it("should add the instance to the instances array", function () {
                expect(instances).to.contain(phantom);
            });

        });

        describe(".childProcess", function () {

            it("should provide a reference on the child process object created by node", function () {
                expect(phantom.childProcess).to.be.an("object");
                expect(phantom.childProcess.stdin).to.be.an("object");
                expect(phantom.childProcess.stdout).to.be.an("object");
                expect(phantom.childProcess.stderr).to.be.an("object");
            });

        });

        describe(".port", function () {

            it("should be a number", function () {
                expect(phantom.port).to.be.a("number");
            });

        });

        describe(".run(fn)", function () {

            it.only("should execute the given function in the phantomjs environment", function (done) {
                phantom.childProcess.stdout.on("data", function (chunk) {
                    expect(chunk.toString().trim()).to.equal("typeof webpage.create = function");
                    done();
                });

                phantom.run(function () {
                    var webpage = require("webpage");

                    console.log("typeof webpage.create = " + typeof webpage.create);
                });
            });

        });

        describe(".exit()", function () {

            it("should return a promise", function () {
                expect(phantom.exit()).to.be.an.instanceOf(Promise);
            });

            it("should terminate the child process with exit-code 0 and then resolve", slow(function (done) {
                var exit = false;

                phantom.childProcess.on("exit", function (code) {
                    expect(code).to.equal(0);
                    exit = true;
                });
                phantom.exit().then(function () {
                    expect(exit).to.equal(true);
                    done();
                }, done);
            }));

            it("should remove the instance from the instances array", slow(function (done) {
                phantom.exit().then(function () {
                    expect(instances).to.not.contain(phantom);
                    done();
                }, done);
            }));

            it("should be save to call .exit() multiple times", slow(function (done) {
                phantom.exit();
                phantom.exit();
                phantom.exit().then(done, done);
            }));

        });

    });

});

function slow(fn) {
    return function () {
        this.slow(2000);
        this.timeout(5000);
        return fn();
    };
}

function nextTick(fn) {
    return function () {
        setImmediate(fn);
    };
}