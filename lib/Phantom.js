"use strict";

var when = require("when");
var os = require("os");
var instances = require("./instances.js");
var Page = require("./Page.js");
var serializeFn = require("./serializeFn.js");
var phantomMethods = require("./phantom/methods.js");

var pageId = 0;
var slice = Array.prototype.slice;
var pingInterval = 100;
var nextRequestId = 0;

/**
 * Provides methods to run code within a given phantomjs child-process.
 *
 * @constructor
 */
function Phantom(childProcess) {
    Phantom.prototype.constructor.apply(this, arguments);
}

/**
 * The ChildProcess-instance returned by node.
 *
 * @type {child_process.ChildProcess}
 */
Phantom.prototype.childProcess = null;

/**
 * The current scheduled ping id as returned by setTimeout()
 *
 * @type {*}
 * @private
 */
Phantom.prototype._pingTimeoutId = null;

/**
 * The number of currently pending requests. This is necessary so we can stop the interval
 * when no requests are pending.
 *
 * @type {number}
 * @private
 */
Phantom.prototype._pending = 0;

/**
 * An object providing the resolve- and reject-function of all pending requests. Thus we can
 * resolve or reject a pending promise in a different scope.
 *
 * @type {Object}
 * @private
 */
Phantom.prototype._pendingDeferreds = null;

/**
 * Initializes a new Phantom instance.
 *
 * @param {child_process.ChildProcess} childProcess
 */
Phantom.prototype.constructor = function (childProcess) {
    var self = this;

    this._receive = this._receive.bind(this);

    this.childProcess = childProcess;
    this._pendingDeferreds = {};

    instances.push(this);

    childProcess.phridge.on("data", this._receive);

    childProcess.on("exit", function onExit() {
        instances.splice(instances.indexOf(self), 1);
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

    return this._send({
        action: "run",
        data: {
            src: serializeFn(fn, args)
        }
    }, args.length === fn.length);
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

    return page.run(url, phantomMethods.openPage)
        .then(function () {
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
        if (!self.childProcess) {
            resolve();
            return;
        }

        self.childProcess.on("exit", resolve);

        self.run(phantomMethods.exitPhantom).catch(reject);

        self.childProcess = null;
        clearTimeout(self._pingTimeoutId);
    });
};

/**
 * Prepares the given message and writes it to childProcess.stdin.
 *
 * @param {Object} message
 * @param {boolean} fnIsSync
 * @returns {Promise}
 * @private
 */
Phantom.prototype._send = function (message, fnIsSync) {
    var self = this;

    message.from = new Error().stack
        .split(/\n/g)
        .slice(1)
        .join("\n");

    return when.promise(function (resolve, reject) {
        message.id = nextRequestId++;
        self._pendingDeferreds[message.id] = {
            resolve: resolve,
            reject: reject
        };
        if (!fnIsSync) {
            self._schedulePing();
        }
        self._pending++;

        write(self.childProcess, message);
    });
};

/**
 * Parses the given message via JSON.parse() and resolves or rejects the pending promise.
 *
 * @param {string} message
 * @private
 */
Phantom.prototype._receive = function (message) {
    var deferred;

    // That's our initial hi message which should be ignored by this method
    if (message === "hi") {
        return;
    }

    // Not wrapping with try-catch here because if this message is invalid
    // we have no chance to map it back to a pending promise.
    // Luckily this JSON can't be invalid because it has been JSON.stringified by PhantomJS.
    message = JSON.parse(message);

    // pong messages are special
    if (message.status === "pong") {
        this._pingTimeoutId = null;

        // If we're still waiting for a message, we need to schedule a new ping
        if (this._pending > 0) {
            this._schedulePing();
        }
        return;
    }

    deferred = this._pendingDeferreds[message.id];

    // istanbul ignore next because this is tested in a separated process and thus isn't recognized by istanbul
    if (!deferred) {
        // This happens when resolve() or reject() have been called twice
        if (message.status === "success") {
            throw new Error("Cannot call resolve() after the promise has already been resolved or rejected");
        } else if (message.status === "fail") {
            throw new Error("Cannot call reject() after the promise has already been resolved or rejected");
        }
    }

    delete this._pendingDeferreds[message.id];
    this._pending--;

    if (message.status === "success") {
        deferred.resolve(message.data);
    } else {
        deferred.reject(message.data);
    }
};

/**
 * Sends a ping to the PhantomJS process after a given delay.
 * Check out lib/phantom/start.js for an explanation of the ping action.
 *
 * @private
 */
Phantom.prototype._schedulePing = function () {
    // Don't schedule ping when we're already disposed or another timeout is already set
    if (!this.childProcess || this._pingTimeoutId) {
        return;
    }
    this._pingTimeoutId = setTimeout(write, pingInterval, this.childProcess, { action: "ping" });
};

/**
 * Helper function that stringifies the given message-object, appends an end of line character
 * and writes it to childProcess.stdin.
 *
 * @param {child_process.ChildProcess} childProcess
 * @param {Object} message
 */
function write(childProcess, message) {
    childProcess.stdin.write(JSON.stringify(message) + os.EOL, "utf8");
}

module.exports = Phantom;