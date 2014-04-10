"use strict";

var getport = require("getport");

var startPort = 2000,
    currentPromise;

// enable global promise shim
// @see https://github.com/cujojs/when/blob/master/docs/es6-promise-shim.md
require("when/es6-shim/Promise");

function findPort() {
    return new Promise(function (resolve, reject) {
        var self = this;

        function startQuery() {
            getport(nextStartPort(), function (err, port) {
                if (currentPromise === self) {
                    currentPromise = undefined;
                }

                if (err) {
                    return reject(err);
                }
                resolve(port);
            });
        }

        if (currentPromise) {
            currentPromise.then(startQuery);
        } else {
            startQuery();
        }
        currentPromise = this;
    });
}

function nextStartPort() {
    if (startPort >= 60000) {
        return 2000;
    }
    return startPort++;
}

module.exports = findPort;