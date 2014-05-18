"use strict";

var serializeFn = require("./serializeFn.js");

var slice = Array.prototype.slice;

/**
 * A wrapper to run code within the context of a specific phantomjs webpage.
 *
 * @see http://phantomjs.org/api/webpage/
 * @param {Phantom} phantom the parent phantomjs instance
 * @param {number} id internal page id
 * @constructor
 */
function Page(phantom, id) {
    Page.prototype.constructor.apply(this, arguments);
}

/**
 * The parent phantom instance.
 *
 * @type {Phantom}
 */
Page.prototype.phantom = null;

/**
 * The internal page id.
 *
 * @private
 * @type {number}
 */
Page.prototype._id = null;

/**
 * Initializes the page instance.
 *
 * @param {Phantom} phantom
 * @param {number} id
 */
Page.prototype.constructor = function (phantom, id) {
    this.phantom = phantom;
    this._id = id;
};

/**
 * Stringifies the given function fn, sends it to phantomjs and runs it in the context of a particular phantomjs webpage.
 * The phantomjs webpage will be available as `this`. You may prepend any number of arguments which will be passed
 * to fn inside of phantomjs. Please note that all arguments should be stringifyable with JSON.stringify().
 *
 * Returns a Promises/A+ compliant promise which resolves when function fn returned or resolved.
 *
 * @param {...*} args
 * @param {Function} fn
 * @returns {Promise}
 */
Page.prototype.run = function (args, fn) {
    args = slice.call(arguments);

    fn = args.pop();

    return this.phantom._request("/page/" + this._id, serializeFn(fn, args));
};

/**
 * Runs a function inside of phantomjs to cleanup memory. Call this function if you intent to not use the page-object
 * anymore.
 *
 * Returns a Promises/A+ compliant promise which resolves when the cleanup function has been executed.
 *
 * @see http://msdn.microsoft.com/en-us/library/system.idisposable.aspx
 * @returns {Promise}
 */
Page.prototype.dispose = function () {
    var self = this;

    return this.run(this._id, disposePage)
        .then(function () {
            self.phantom = null;
        });
};

/**
 * Runs inside of phantomjs and cleans up internal references.
 *
 * @private
 * @param {number} pageId
 */
function disposePage(pageId) { /* global pages */
    delete pages[pageId];
}

module.exports = Page;