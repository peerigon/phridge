"use strict";

var instances = require("./instances.js"),
    when = require("when");

function exit(phantom) {
    return phantom.exit();
}

function exitAll() {
    var copy = instances.slice(0); // copy the array because phantom.exit() will modify it

    return when.map(copy, exit);
}

module.exports = exitAll;