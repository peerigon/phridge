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
 * Provides methods to run code within a given PhantomJS child-process.
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
 * Boolean flag that indicates if this phantom instance has already been disposed
 * either by calling dispose() or by an unexpected IO error.
 *
 * @type {boolean}
 */
Phantom.prototype.isDisposed = false;

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
    this._receive = this._receive.bind(this);
    this._write = this._write.bind(this);
    this._afterExit = this._afterExit.bind(this);
    this._onUnexpectedError = this._onUnexpectedError.bind(this);

    this.childProcess = childProcess;
    this._pendingDeferreds = {};

    instances.push(this);

    // Listen for stdout messages dedicated to phridge
    childProcess.phridge.on("data", this._receive);

    // Add handlers for unexpected events
    childProcess.on("exit", this._onUnexpectedError);
    childProcess.on("error", this._onUnexpectedError);
    childProcess.stdin.on("error", this._onUnexpectedError);
    childProcess.stdout.on("error", this._onUnexpectedError);
    childProcess.stderr.on("error", this._onUnexpectedError);
};

/**
 * Stringifies the given function fn, sends it to PhantomJS and runs it in the scope of PhantomJS.
 * You may prepend any number of arguments which will be passed to fn inside of PhantomJS. Please note that all
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
 * Exits the PhantomJS process cleanly and cleans up references.
 *
 * Returns a Promises/A+ compliant promise which resolves when the childProcess emits an 'exit'-event.
 *
 * @returns {Promise}
 */
Phantom.prototype.dispose = function () {
    var self = this;

    return when.promise(function dispose(resolve, reject) {
        if (self.isDisposed) {
            resolve();
            return;
        }

        // Remove handler for unexpected IO errors and add regular exit handlers
        self.childProcess.removeListener("exit", self._onUnexpectedError);
        self.childProcess.on("exit", self._afterExit);
        self.childProcess.on("exit", resolve);

        self.run(phantomMethods.exitPhantom).catch(reject);

        // Run before exit hook
        self._beforeExit();
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

        self._write(message);
    });
};

/**
 * Helper function that stringifies the given message-object, appends an end of line character
 * and writes it to childProcess.stdin.
 *
 * @param {Object} message
 * @private
 */
Phantom.prototype._write = function (message) {
    if (this.isDisposed) {
        throw new Error("Cannot write message: phantom instance is already disposed");
    }
    this.childProcess.stdin.write(JSON.stringify(message) + os.EOL, "utf8");
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
    if (this._pingTimeoutId !== null) {
        // There is already a ping scheduled. It's unnecessary to schedule another one.
        return;
    }
    this._pingTimeoutId = setTimeout(this._write, pingInterval, { action: "ping" });
};

/**
 * This function is executed before the process is actually killed.
 * If the process was killed autonomously, however, it gets executed postmortem.
 *
 * @private
 */
Phantom.prototype._beforeExit = function () {
    var index;

    index = instances.indexOf(this);
    index !== -1 && instances.splice(index, 1);
    clearTimeout(this._pingTimeoutId);
    this.isDisposed = true;
};

/**
 * This function is executed after the process actually exited.
 *
 * @private
 */
Phantom.prototype._afterExit = function () {
    var deferreds = this._pendingDeferreds;

    this.childProcess.removeAllListeners();
    this.childProcess.stdin.removeAllListeners();
    this.childProcess.stdout.removeAllListeners();
    this.childProcess.stderr.removeAllListeners();
    this.childProcess = null;

    Object.keys(deferreds).forEach(function forEachPendingDeferred(id) {
        deferreds[id].reject(new Error("Cannot communicate with PhantomJS process due to an unexpected IO error"));
    });
    this._pendingDeferreds = null;
};

/**
 * Will be called as soon as an unexpected IO error happened with the attached PhantomJS process.
 *
 * @private
 */
Phantom.prototype._onUnexpectedError = function () {
    this._beforeExit();
    this._afterExit();
};

module.exports = Phantom;