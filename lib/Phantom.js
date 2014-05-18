"use strict";

var when = require("when"),
    instances = require("./instances.js"),
    request = require("./request.js"),
    Page = require("./Page.js"),
    serializeFn = require("./serializeFn.js");

var pageId = 0,
    slice = Array.prototype.slice;

/**
 * Provides methods to run code within a given phantomjs child-process.
 *
 * @param {child_process.ChildProcess} childProcess
 * @param {number} port
 * @param {string} secret
 * @constructor
 */
function Phantom(childProcess, port, secret) {
    Phantom.prototype.constructor.apply(this, arguments);
}

/**
 * The ChildProcess-instance returned by node.
 *
 * @type {child_process.ChildProcess}
 */
Phantom.prototype.childProcess = null;

/**
 * The port where the internal phantomjs http server listens to.
 *
 * @type {number}
 */
Phantom.prototype.port = null;

/**
 * Shared secret between this process and phantomjs to ensure that no other process is able
 * to execute code within phantomjs.
 *
 * @type {string}
 */
Phantom.prototype.secret = null;

/**
 * Boolean flag to indicate if the phantomjs process exited already.
 * @type {boolean}
 */
Phantom.prototype.exited = false;

/**
 * Initializes a new Phantom instance.
 *
 * @param {child_process.ChildProcess} childProcess
 * @param {number} port
 * @param {string} secret
 */
Phantom.prototype.constructor = function (childProcess, port, secret) {
    var self = this;

    this.childProcess = childProcess;
    this.port = port;
    this.secret = secret;

    instances.push(this);

    childProcess.on("exit", function onExit() {
        instances.splice(instances.indexOf(self), 1);
        self.exited = true;
    });
};

/**
 * Stringifies the given function fn, sends it to phantomjs and runs it in the scope of phantomjs.
 * You may prepend any number of arguments which will be passed to fn inside of phantomjs. Please note that all
 * arguments should be stringifyable with JSON.stringify().
 *
 * Returns a Promises/A+ compliant promise which resolves when function fn returned or resolved.
 *
 * @param {...*} args
 * @param {Function} fn
 * @returns {Promise}
 */
Phantom.prototype.run = function (args, fn) {
    args = slice.call(arguments);

    fn = args.pop();

    return this._request("/", serializeFn(fn, args));
};

/**
 * Returns a new instance of a Page which can be used to run code in the context of a specific page.
 *
 * @returns {Page}
 */
Phantom.prototype.createPage = function () {
    var self = this;

    return new Page(self, pageId++);
};

/**
 * Creates a new instance of Page, opens the given url and resolves when the page has been loaded.
 *
 * @param url
 * @returns {Promise}
 */
Phantom.prototype.openPage = function (url) {
    var page = this.createPage();

    return page.run(url, openPage).then(function () {
        return page;
    });
};

/**
 * Exits the phantomjs process cleanly and cleans up references.
 *
 * Returns a Promises/A+ compliant promise which resolves when the childProcess emits an 'exit'-event.
 *
 * @returns {Promise}
 */
Phantom.prototype.dispose = function () {
    var self = this;

    return when.promise(function dispose(resolve, reject) {
        if (self.exited) {
            resolve();
            return;
        }

        self.childProcess.on("exit", resolve);
        self.childProcess = null;

        self.run(function () {
                // Closing the server after some time so this response can be finished properly.
                // That's probably a bug of phantomjs which is responding with a 404 sometimes.
                setTimeout(function () {
                    server.close();
                    phantom.exit();
                }, 500);
            })
            .catch(reject);
    });
};

/**
 * Sends an http request to the phantomjs process.
 *
 * @param {string} path
 * @param {string} body
 * @returns {Promise|*}
 * @private
 */
Phantom.prototype._request = function (path, body) {
    var statusCode;

    return request({
        port: this.port,
        path: path + "?" + this.secret,
        body: body
    }).then(function onResponse(res) {
        statusCode = res.statusCode;
        if (res.body) {
            return when.try(JSON.parse, res.body);
        }
    }).then(function onResponseBodyParse(body) {
        if (statusCode === 200) {
            return body;
        }

        if (typeof body === "object") {
            throw body;
        } else {
            throw new Error(body);
        }
    });
};

/**
 * Opens the given page and resolves when phantomjs called back.
 * Will be executed inside of phantomjs.
 *
 * @private
 * @param {string} url
 * @param {Function} resolve
 * @param {Function} reject
 */
function openPage(url, resolve, reject) { /* jshint validthis: true */
    this.open(url, function onPageLoaded(status) {
        if (status !== "success") {
            return reject(new Error("Cannot load " + url + ": Phantomjs returned status " + status));
        }
        resolve();
    });
}

module.exports = Phantom;