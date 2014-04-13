"use strict";

var chai = require("chai"),
    when = require("when"),
    node = require("when/node"),
    getport = require("getport"),
    chaiAsPromised = require("chai-as-promised"),
    net = require("net"),
    http = require("http"),
    expect = chai.expect,
    phantomFarm = require("../lib/main.js"),
    Phantom = require("../lib/Phantom.js"),
    instances = require("../lib/instances.js");

var request;

// enable global promise shim
// @see https://github.com/cujojs/when/blob/master/docs/es6-promise-shim.md
require("when/es6-shim/Promise");

chai.config.includeStack = true;
chai.use(chaiAsPromised);

getport = node.lift(getport);
request = node.lift(http.request);

describe("phantom-farm", function () {

    after(slow(function () {
        return phantomFarm.exitAll();
    }));

    describe(".create(config?)", function () {

        it("should return a promise", function () {
            expect(phantomFarm.create()).to.be.an.instanceOf(Promise);
        });

        it("should resolve to an instance of Phantom", slow(function () {
            return phantomFarm.create().then(function (phantom) {
                expect(phantom).to.be.an.instanceOf(Phantom);
            });
        }));

        it.skip("should pass the provided config to phantomjs", slow(function () {
            var debuggerPort;

            return getport(10000)
                .then(function (port) {
                    debuggerPort = port;
                    console.log("debuggerPort", port);
                    return phantomFarm.create({ remoteDebuggerPort: port });
                })
                .then(function () {
                    return new Promise(function (resolve, reject) {
                        var client = net.connect(debuggerPort, function () {
                            client.destroy();
                            resolve();
                        });

                        client.on("error", reject);
                    });
                });
        }));

        it("should share a secret with the phantomjs process so no untrusted code can be executed", slow(function () {
            var evilCode = "resolve('harharhar')";

            return phantomFarm.create().then(function (phantom) {
                return new Promise(function (resolve) {
                    http.request({
                        host:    "localhost",
                        port:    phantom.port,
                        path:    "/",
                        method:  "POST",
                        headers: {
                            "Content-Length": evilCode.length,
                            "Content-Type":   "application/json"
                        }
                    }, resolve).end(evilCode, "utf8");
                });
            }).then(function (response) {
                expect(response.statusCode).to.equal(403);
            });
        }));

    });

    describe(".exitAll()", function () {

        it("should return a promise", function () {
            expect(phantomFarm.exitAll()).to.be.an.instanceOf(Promise);
        });

        it("should exit cleanly all running phantomjs instances", slow(function () {
            var exitted = [];

            return when.all([
                    phantomFarm.create(),
                    phantomFarm.create(),
                    phantomFarm.create()
                ])
                .then(function (p) {
                    p[0].childProcess.on("exit", function () { exitted.push(0); });
                    p[1].childProcess.on("exit", function () { exitted.push(1); });
                    p[2].childProcess.on("exit", function () { exitted.push(2); });

                    return phantomFarm.exitAll();
                })
                .then(function () {
                    exitted.sort();
                    expect(exitted).to.eql([0, 1, 2]);
                });
        }));

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

        describe(".constructor(childProcess, port, secret)", function () {

            it("should set the childProcess and port accordingly", function () {
                var childProcess = {
                        on: function () {}
                    },
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

        describe(".run(fn, params?)", function () {

            it("should return a promise", function () {
                expect(phantom.run(function (resolve) { resolve(); })).to.be.an.instanceOf(Promise);
            });

            it("should provide a resolve function", function () {
                return expect(phantom.run(function (resolve) {
                    resolve("everything ok");
                })).to.eventually.equal("everything ok");
            });

            it("should provide the possibility to resolve with any stringify-able data", function () {
                return when.all([
                    expect(phantom.run(function (resolve) {
                        resolve();
                    })).to.eventually.equal(undefined),
                    expect(phantom.run(function (resolve) {
                        resolve(true);
                    })).to.eventually.equal(true),
                    expect(phantom.run(function (resolve) {
                        resolve(2);
                    })).to.eventually.equal(2),
                    expect(phantom.run(function (resolve) {
                        resolve(null);
                    })).to.eventually.equal(null),
                    expect(phantom.run(function (resolve) {
                        resolve([1, 2, 3]);
                    })).to.eventually.deep.equal([1, 2, 3]),
                    expect(phantom.run(function (resolve) {
                        resolve({
                            someArr: [1, 2, 3],
                            otherObj: {}
                        });
                    })).to.eventually.deep.equal({
                        someArr: [1, 2, 3],
                        otherObj: {}
                    })
                ]);
            });

            it("should provide a reject function", function () {
                return phantom.run(function (resolve, reject) {
                    reject(new Error("not ok"));
                }).catch(function (err) {
                    expect(err).to.be.an.instanceOf(Error);
                    expect(err.message).to.equal("not ok");
                });
            });
            
            it("should provide all phantomjs default modules as convenience", function () {
                return phantom.run(function (resolve, reject) {
                    if (!webpage) {
                        return reject(new Error("webpage not available"));
                    }
                    if (!system) {
                        return reject(new Error("system not available"));
                    }
                    if (!fs) {
                        return reject(new Error("fs not available"));
                    }
                    if (!webserver) {
                        return reject(new Error("webserver not available"));
                    }
                    if (!child_process) {
                        return reject(new Error("child_process not available"));
                    }
                    resolve();
                });
            });

            it("should provide an the config object to store all kind of configuration", function () {
                return expect(phantom.run(function (resolve) {
                    resolve(config);
                })).to.eventually.deep.equal({
                    phantomFarm: {
                        port: phantom.port,
                        secret: phantom.secret
                    }
                });
            });

            it("should provide the possibility to pass params", function () {
                var params = {
                    some: ["param"],
                    withSome: "crazy",
                    values: {
                        number1: 1
                    }
                };

                return expect(phantom.run(function (params, resolve) {
                    resolve(params);
                }, params)).to.eventually.deep.equal(params);
            });

            it("should report errors", function () {
                return expect(phantom.run(function () {
                    undefinedVariable;
                })).to.be.rejectedWith("Can't find variable: undefinedVariable");
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
        this.timeout(6000);
        return fn();
    };
}