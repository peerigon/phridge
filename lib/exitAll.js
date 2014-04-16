"use strict";

var instances = require("./instances.js"),
    when = require("when");

function exitAll() {
    var copy = instances.slice(0); // copy the array because phantom.exit() will modify it

    return when.map(copy, exit);
}

function exit(phantom) {
    return phantom.exit();
}

module.exports = exitAll;