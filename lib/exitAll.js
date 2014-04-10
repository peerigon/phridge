"use strict";

var instances = require("./instances.js"),
    when = require("when");

// enable global promise shim
// @see https://github.com/cujojs/when/blob/master/docs/es6-promise-shim.md
require("when/es6-shim/Promise");

function exit(phantom) {
    return phantom.exit();
}

function exitAll() {
    var copy = instances.slice(0); // copy the array because phantom.exit() will modify it

    return new Promise(function (resolve, reject) {
        when.map(copy, exit).then(resolve, reject);
    });
}

module.exports = exitAll;