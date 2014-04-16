"use strict";

var chai = require("chai"),
    when = require("when"),
    chaiAsPromised = require("chai-as-promised"),
    expect = chai.expect,
    phantomFarm = require("../lib/main.js"),
    Phantom = require("../lib/Phantom.js"),
    instances = require("../lib/instances.js"),
    slow = require("./helpers/slow.js");

chai.config.includeStack = true;
chai.use(chaiAsPromised);

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

            it("should set the childProcess, port and secret accordingly", function () {
                var childProcess = {
                        on: function () {}
                    },
                    port = 3000,
                    secret = "super secret";

                // exit() the instance created by the beforeEach hook
                // we're creating our own instance for this test
                phantom.exit();

                phantom = new Phantom(childProcess, port, secret);
                expect(phantom.childProcess).to.equal(childProcess);
                expect(phantom.port).to.equal(port);
                expect(phantom.secret).to.equal(secret);

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

            it("should provide the config object to store all kind of configuration", function () {
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

            it("should preserve all error details like stack traces", function () {
                return phantom.run(function brokenFunction() {
                    undefinedVariable;
                }).catch(function (err) {
                    expect(err).to.have.property("message", "Can't find variable: undefinedVariable");
                    expect(err).to.have.property("line", 2);
                    expect(err).to.have.property("stack", "ReferenceError: Can't find variable: undefinedVariable\n    at brokenFunction (:2)\n    at :3");
                    expect(err.stackArray).to.deep.equal([
                        { "function": "brokenFunction", sourceURL: "", line: 2 },
                        { sourceURL: "", line: 3 }
                    ]);
                });
            });

        });

        describe(".exit()", function () {

            it("should terminate the child process with exit-code 0 and then resolve", slow(function () {
                var exit = false;

                phantom.childProcess.on("exit", function (code) {
                    expect(code).to.equal(0);
                    exit = true;
                });

                return phantom.exit().then(function () {
                    expect(exit).to.equal(true);
                });
            }));

            it("should remove the instance from the instances array", slow(function () {
                phantom.exit().then(function () {
                    expect(instances).to.not.contain(phantom);
                });
            }));

            it("should be save to call .exit() multiple times", slow(function () {
                return when.all([
                    phantom.exit(),
                    phantom.exit(),
                    phantom.exit()
                ]);
            }));

        });

    });

});