"use strict";

var chai = require("chai"),
    when = require("when"),
    expect = chai.expect,
    phridge = require("../lib/main.js"),
    Phantom = require("../lib/Phantom.js"),
    Page = require("../lib/Page.js"),
    instances = require("../lib/instances.js"),
    slow = require("./helpers/slow.js"),
    createWritableMock = require("./helpers/createWritableMock.js"),
    testServer = require("./helpers/testServer.js");

chai.config.includeStack = true;
chai.use(require("chai-as-promised"));

function noop() {}

describe("Phantom", function () {
    var fakeStderr = createWritableMock(),
        phantom,
        childProcess = {
            on: function () {}
        },
        port = 3000,
        secret = "super secret",
        createPhantom,
        exitPhantom;

    createPhantom = slow(function () {
        if (phantom && phantom.childProcess) {
            return;
        }
        phridge.config.stderr = fakeStderr;
        return phridge.create().then(function (newPhantom) {
            phantom = newPhantom;
        });
    });
    exitPhantom = slow(function () {
        phridge.config.stderr = process.stderr;
        return phantom.dispose();
    });

    before(testServer.start);
    after(exitPhantom);
    after(testServer.stop);

    describe(".prototype", function () {

        describe(".constructor(childProcess, port, secret)", function () {

            after(function () {
                // Null out phantom so createPhantom() will create a fresh one
                phantom = null;
            });

            it("should return an instance of Phantom", function () {
                phantom = new Phantom(childProcess, port, secret);
                expect(phantom).to.be.an.instanceof(Phantom);
            });

            it("should set the childProcess, port and secret accordingly", function () {
                phantom = new Phantom(childProcess, port, secret);
                expect(phantom.childProcess).to.equal(childProcess);
                expect(phantom.port).to.equal(port);
                expect(phantom.secret).to.equal(secret);
            });

            it("should add the instance to the instances array", function () {
                expect(instances).to.contain(phantom);
            });

        });

        describe(".childProcess", function () {

            beforeEach(createPhantom);

            it("should provide a reference on the child process object created by node", function () {
                expect(phantom.childProcess).to.be.an("object");
                expect(phantom.childProcess.stdin).to.be.an("object");
                expect(phantom.childProcess.stdout).to.be.an("object");
                expect(phantom.childProcess.stderr).to.be.an("object");
            });

        });

        describe(".port", function () {

            beforeEach(createPhantom);

            it("should be a number", function () {
                expect(phantom.port).to.be.a("number");
            });

        });

        describe(".run(arg1, arg2, arg3, fn)", function () {

            beforeEach(createPhantom);

            describe("with fn being an asynchronous function", function () {

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

                it("should print an error if the request has already been resolved", slow(function (done) {
                    fakeStderr.callback = function () {
                        expect(fakeStderr.message).to.contain("Cannot resolve value: The response has already been closed. Have you called resolve/reject twice?");
                        done();
                    };

                    phantom.run(function (resolve) {
                        resolve();
                        resolve();
                    });
                }));

                it("should print an error if the request has already been rejected", slow(function (done) {
                    fakeStderr.callback = function () {
                        expect(fakeStderr.message).to.contain("Cannot reject value: The response has already been closed. Have you called resolve/reject twice?");
                        done();
                    };

                    phantom.run(function (resolve, reject) {
                        reject();
                        reject();
                    }).catch(noop);
                }));

            });

            describe("with fn being a synchronous function", function () {

                it("should resolve to the returned value", function () {
                    return expect(phantom.run(function () {
                        return "everything ok";
                    })).to.eventually.equal("everything ok");
                });

                it("should provide the possibility to resolve with any stringify-able data", function () {
                    return when.all([
                        expect(phantom.run(function () {
                            // returns undefined
                        })).to.eventually.equal(undefined),
                        expect(phantom.run(function () {
                            return true;
                        })).to.eventually.equal(true),
                        expect(phantom.run(function () {
                            return 2;
                        })).to.eventually.equal(2),
                        expect(phantom.run(function () {
                            return null;
                        })).to.eventually.equal(null),
                        expect(phantom.run(function () {
                            return [1, 2, 3];
                        })).to.eventually.deep.equal([1, 2, 3]),
                        expect(phantom.run(function () {
                            return {
                                someArr: [1, 2, 3],
                                otherObj: {}
                            };
                        })).to.eventually.deep.equal({
                            someArr: [1, 2, 3],
                            otherObj: {}
                        })
                    ]);
                });

                it("should reject the promise if fn throws an error", function () {
                    return phantom.run(function () {
                        throw new Error("not ok");
                    }).catch(function (err) {
                        expect(err.message).to.equal("not ok");
                    });
                });

            });

            it("should provide all phantomjs default modules as convenience", function () {
                return phantom.run(function () {
                    if (!webpage) {
                        throw new Error("webpage not available");
                    }
                    if (!system) {
                        throw new Error("system not available");
                    }
                    if (!fs) {
                        throw new Error("fs not available");
                    }
                    if (!webserver) {
                        throw new Error("webserver not available");
                    }
                    if (!child_process) {
                        throw new Error("child_process not available");
                    }
                });
            });

            it("should provide the config object to store all kind of configuration", function () {
                return expect(phantom.run(function () {
                    return config;
                })).to.eventually.deep.equal({
                    phridge: {
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

                return expect(phantom.run(params, params, params, function (params1, params2, params3) {
                    return [params1, params2, params3];
                })).to.eventually.deep.equal([params, params, params]);
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

            it("should run all functions on the same empty context", function () {
                return phantom.run(function () {
                    if (JSON.stringify(this) !== "{}") {
                        throw new Error("The context is not an empty object");
                    }
                    this.message = "Hi from the first run";
                }).then(function () {
                    return phantom.run(function () {
                        if (this.message !== "Hi from the first run") {
                            throw new Error("The context is not persistent");
                        }
                    });
                });
            });

        });

        describe(".createPage()", function () {

            beforeEach(createPhantom);

            it("should return an instance of Page", function () {
                expect(phantom.createPage()).to.be.an.instanceof(Page);
            });

        });

        describe(".openPage(url)", function () {

            beforeEach(createPhantom);

            it("should resolve to an instance of Page", function () {
                return expect(phantom.openPage(this.testServerUrl)).to.eventually.be.an.instanceof(Page);
            });

            it("should resolve when the given page has loaded", slow(function () {
                return phantom.openPage(this.testServerUrl).then(function (page) {
                    return page.run(function () {
                        var headline,
                            imgIsLoaded;

                        headline = this.evaluate(function () {
                            /* jshint browser:true */
                            return document.querySelector("h1").innerText;
                        });
                        imgIsLoaded = this.evaluate(function () {
                            /* jshint browser:true */
                            return document.querySelector("img").width > 0;
                        });

                        if (headline !== "This is a test page") {
                            throw new Error("Unexpected headline: " + headline);
                        }
                        if (imgIsLoaded !== true) {
                            throw new Error("The image has not loaded yet");
                        }
                    });
                });
            }));

        });

        describe(".dispose()", function () {

            beforeEach(createPhantom);

            it("should terminate the child process with exit-code 0 and then resolve", slow(function () {
                var exit = false;

                phantom.childProcess.on("exit", function (code) {
                    expect(code).to.equal(0);
                    exit = true;
                });

                return phantom.dispose().then(function () {
                    expect(exit).to.equal(true);
                });
            }));

            it("should remove the instance from the instances array", slow(function () {
                phantom.dispose().then(function () {
                    expect(instances).to.not.contain(phantom);
                });
            }));

            it("should be save to call .dispose() multiple times", slow(function () {
                return when.all([
                    phantom.dispose(),
                    phantom.dispose(),
                    phantom.dispose()
                ]);
            }));

        });

    });

});