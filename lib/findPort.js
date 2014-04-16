"use strict";

var getport = require("getport"),
    when = require("when");

var startPort = 2000,
    currentPromise;

function findPort() {
    return when.promise(function findPort(resolve, reject) {
        var self = this;

        function startQuery() {
            getport(nextStartPort(), function onGetPort(err, port) {
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