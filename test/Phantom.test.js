"use strict";

var chai = require("chai");
var when = require("when");
var path = require("path");
var sinon = require("sinon");
var childProcess = require("child_process");
var expect = chai.expect;
var phridge = require("../lib/main.js");
var Phantom = require("../lib/Phantom.js");
var Page = require("../lib/Page.js");
var instances = require("../lib/instances.js");
var slow = require("./helpers/slow.js");
var testServer = require("./helpers/testServer.js");
var Writable = require("stream").Writable;

require("./helpers/setup.js");

function noop() {}

describe("Phantom", function () {
    var childProcessMock = {
        on: noop,
        phridge: {
            on: noop
        },
        stdin: {
            write: noop
        }
    };
    var phantom;
    var spawnPhantom;
    var exitPhantom;
    var stdout;
    var stderr;

    function mockConfigStreams() {
        stdout = phridge.config.stdout;
        stderr = phridge.config.stderr;
        phridge.config.stdout = new Writable();
        phridge.config.stderr = new Writable();
    }

    function unmockConfigStreams() {
        phridge.config.stdout = stdout;
        phridge.config.stderr = stderr;
    }

    spawnPhantom = slow(function () {
        if (phantom && phantom.childProcess) {
            return;
        }
        return phridge.spawn({ someConfig: true })
            .then(function (newPhantom) {
                phantom = newPhantom;
            });
    });
    exitPhantom = slow(function () {
        if (!phantom) {
            return;
        }

        return phantom.dispose();
    });

    before(testServer.start);
    after(exitPhantom);
    after(testServer.stop);

    describe(".prototype", function () {

        describe(".constructor(childProcess, port, secret)", function () {

            after(function () {
                exitPhantom.call(this);
                // Null out phantom so spawnPhantom() will spawn a fresh one
                phantom = null;
                // Remove mocked Phantom instances from the instances-array
                instances.length = 0;
            });

            it("should return an instance of Phantom", function () {
                phantom = new Phantom(childProcessMock);
                expect(phantom).to.be.an.instanceof(Phantom);
            });

            it("should set the childProcess", function () {
                phantom = new Phantom(childProcessMock);
                expect(phantom.childProcess).to.equal(childProcessMock);
            });

            it("should add the instance to the instances array", function () {
                expect(instances).to.contain(phantom);
            });

        });

        describe(".childProcess", function () {

            beforeEach(spawnPhantom);

            it("should provide a reference on the child process object created by node", function () {
                expect(phantom.childProcess).to.be.an("object");
                expect(phantom.childProcess.stdin).to.be.an("object");
                expect(phantom.childProcess.stdout).to.be.an("object");
                expect(phantom.childProcess.stderr).to.be.an("object");
            });

        });

        describe(".run(arg1, arg2, arg3, fn)", function () {

            beforeEach(spawnPhantom);

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

                it("should print an error when resolve is called and the request has already been finished", slow(function (done) {
                    var execPath = '"' + process.execPath + '" ';

                    childProcess.exec(execPath + require.resolve("./cases/callResolveTwice"), function (error, stdout, stderr) {
                        expect(error).to.be.null;
                        expect(stderr).to.contain("Cannot call resolve() after the promise has already been resolved or rejected");
                        done();
                    });
                }));

                it("should print an error when reject is called and the request has already been finished", slow(function (done) {
                    var execPath = '"' + process.execPath + '" ';

                    childProcess.exec(execPath + require.resolve("./cases/callRejectTwice"), function (error, stdout, stderr) {
                        expect(error).to.be.null;
                        expect(stderr).to.contain("Cannot call reject() after the promise has already been resolved or rejected");
                        done();
                    });
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
                    someConfig: true
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
                return when.all([
                    phantom
                        .run(function brokenFunction() {
                            undefinedVariable;
                        }).catch(function (err) {
                            expect(err).to.have.property("message", "Can't find variable: undefinedVariable");
                            expect(err).to.have.property("stack");
                            //console.log(err.stack);
                        }),
                    phantom
                        .run(function (resolve, reject) {
                            reject(new Error("Custom Error"));
                        })
                        .catch(function (err) {
                            expect(err).to.have.property("message", "Custom Error");
                            expect(err).to.have.property("stack");
                            //console.log(err.stack);
                        })
                ]);
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

            beforeEach(spawnPhantom);

            it("should return an instance of Page", function () {
                expect(phantom.createPage()).to.be.an.instanceof(Page);
            });

        });

        describe(".openPage(url)", function () {

            beforeEach(spawnPhantom);

            it("should resolve to an instance of Page", slow(function () {
                return expect(phantom.openPage(this.testServerUrl)).to.eventually.be.an.instanceof(Page);
            }));

            it("should resolve when the given page has loaded", slow(function () {
                return phantom.openPage(this.testServerUrl).then(function (page) {
                    return page.run(function () {
                        var headline;
                        var imgIsLoaded;

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

            it("should reject when the page is not available", slow(function () {
                return expect(
                    // localhost:1 should fail fast because it doesn't require a DNS lookup
                    phantom.openPage("http://localhost:1")
                ).to.be.rejectedWith("Cannot load http://localhost:1: Phantomjs returned status fail");
            }));

        });

        describe(".dispose()", function () {

            before(mockConfigStreams);
            beforeEach(spawnPhantom);
            after(unmockConfigStreams);

            it("should terminate the child process with exit-code 0 and then resolve", slow(function () {
                var exit = false;

                phantom.childProcess.on("exit", function (code) {
                    expect(code).to.equal(0);
                    exit = true;
                });

                return phantom.dispose().then(function () {
                    expect(exit).to.equal(true);
                    phantom = null;
                });
            }));

            it("should remove the instance from the instances array", slow(function () {
                return phantom.dispose().then(function () {
                    expect(instances).to.not.contain(phantom);
                    phantom = null;
                });
            }));

            // @see https://github.com/peerigon/phridge/issues/27
            it("should neither call end() on config.stdout nor config.stderr", function () {
                phridge.config.stdout.end = sinon.spy();
                phridge.config.stderr.end = sinon.spy();

                return phantom.dispose().then(function () {
                    expect(phridge.config.stdout.end).to.not.have.been.called;
                    expect(phridge.config.stderr.end).to.not.have.been.called;
                    phantom = null;
                });
            });

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