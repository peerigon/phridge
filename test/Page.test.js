"use strict";

var chai = require("chai"),
    when = require("when"),
    Page = require("../lib/Page.js"),
    sinon = require("sinon"),
    expect = chai.expect,
    phridge = require("../lib/main.js"),
    Phantom = require("../lib/Phantom.js"),
    slow = require("./helpers/slow.js"),
    createWritableMock = require("./helpers/createWritableMock.js");

chai.config.includeStack = true;
chai.use(require("chai-as-promised"));
chai.use(require("sinon-chai"));

describe("Page", function () {

    describe(".prototype", function () {
        var fakeStderr = createWritableMock(),
            phantom,
            page;

        function createPage() {
            page = phantom.createPage();
        }

        before(slow(function () {
            phridge.config.stderr = fakeStderr;
            return phridge.create({ }).then(function (newPhantom) {
                phantom = newPhantom;
            });
        }));

        after(slow(function () {
            phridge.config.stderr = process.stderr;
            return phantom.dispose();
        }));

        describe(".constructor(phantom, id)", function () {

            it("should return an instance of Page with the given arguments applied", function () {
                page = new Page(phantom, 1);
                expect(page).to.be.an.instanceOf(Page);
                expect(page.phantom).to.equal(phantom);
                expect(page._id).to.equal(1);
            });

        });

        describe(".phantom", function () {

            it("should be null by default", function () {
               expect(Page.prototype.phantom).to.equal(null);
            });

        });

        describe(".run(arg1, arg2, arg3, fn)", function () {

            beforeEach(createPage);

            describe("with fn being an asynchronous function", function () {

                it("should provide a resolve function", function () {
                    return expect(page.run(function (resolve) {
                        resolve("everything ok");
                    })).to.eventually.equal("everything ok");
                });

                it("should provide the possibility to resolve with any stringify-able data", function () {
                    return when.all([
                        expect(page.run(function (resolve) {
                            resolve();
                        })).to.eventually.equal(undefined),
                        expect(page.run(function (resolve) {
                            resolve(true);
                        })).to.eventually.equal(true),
                        expect(page.run(function (resolve) {
                            resolve(2);
                        })).to.eventually.equal(2),
                        expect(page.run(function (resolve) {
                            resolve(null);
                        })).to.eventually.equal(null),
                        expect(page.run(function (resolve) {
                            resolve([1, 2, 3]);
                        })).to.eventually.deep.equal([1, 2, 3]),
                        expect(page.run(function (resolve) {
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
                    return page.run(function (resolve, reject) {
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

                    page.run(function (resolve) {
                        resolve();
                        resolve();
                    });
                }));

                it("should print an error if the request has already been rejected", slow(function (done) {
                    fakeStderr.callback = function () {
                        expect(fakeStderr.message).to.contain("Cannot reject value: The response has already been closed. Have you called resolve/reject twice?");
                        done();
                    };

                    page.run(function (resolve, reject) {
                        reject();
                        reject();
                    });
                }));

            });

            describe("with fn being a synchronous function", function () {

                it("should resolve to the returned value", function () {
                    return expect(page.run(function () {
                        return "everything ok";
                    })).to.eventually.equal("everything ok");
                });

                it("should provide the possibility to resolve with any stringify-able data", function () {
                    return when.all([
                        expect(page.run(function () {
                            // returns undefined
                        })).to.eventually.equal(undefined),
                        expect(page.run(function () {
                            return true;
                        })).to.eventually.equal(true),
                        expect(page.run(function () {
                            return 2;
                        })).to.eventually.equal(2),
                        expect(page.run(function () {
                            return null;
                        })).to.eventually.equal(null),
                        expect(page.run(function () {
                            return [1, 2, 3];
                        })).to.eventually.deep.equal([1, 2, 3]),
                        expect(page.run(function () {
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
                    return page.run(function () {
                        throw new Error("not ok");
                    }).catch(function (err) {
                        expect(err.message).to.equal("not ok");
                    });
                });

            });

            it("should provide all phantomjs default modules as convenience", function () {
                return page.run(function () {
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
                return expect(page.run(function () {
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

                return expect(page.run(params, params, params, function (params1, params2, params3) {
                    return [params1, params2, params3];
                })).to.eventually.deep.equal([params, params, params]);
            });

            it("should report errors", function () {
                return expect(page.run(function () {
                    undefinedVariable;
                })).to.be.rejectedWith("Can't find variable: undefinedVariable");
            });

            it("should preserve all error details like stack traces", function () {
                return page.run(function brokenFunction() {
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

            it("should run the function with the page as context", function () {
                return page.run(function () {
                    if (!this.clipRect) {
                        throw new Error("The function's context is not the web page");
                    }
                });
            });

        });

        describe(".dispose()", function () {

            it("should remove the page from the pages-object", function () {
                var pageId = page._id;

                page.dispose();
                phantom.run(pageId, function (pageId, resolve, reject) {
                    if (pages[pageId]) {
                        return reject(new Error("page is still present in the page-object"));
                    }
                    resolve();
                });
            });

            it("should remove the phantom reference", function () {
                return page.dispose().then(function () {
                    expect(page.phantom).to.equal(null);
                });
            });

        });

    });

});