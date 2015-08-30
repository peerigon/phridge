"use strict";

var instances = require("./instances.js");
var when = require("when");

/**
 * Terminates all running PhantomJS processes. Returns a Promises/A+ compliant promise
 * which resolves when a processes terminated cleanly.
 *
 * @returns {Promise}
 */
function disposeAll() {
    var copy = instances.slice(0); // copy the array because phantom.exit() will modify it

    return when.map(copy, exit);
}

/**
 * @private
 * @param {Phantom} phantom
 * @returns {Promise}
 */
function exit(phantom) {
    return phantom.dispose();
}

module.exports = disposeAll;