"use strict";

var getport = require("getport"),
    config = require("./config.js"),
    when = require("when");

var startPort = -1,
    currentPromise;

function findPort() {
    return when.promise(function findPort(resolve, reject) {
        var self = this;

        function startQuery() {
            getport(nextStartPort(), config.maxPort, function onGetPort(err, port) {
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
    if (config.minPort >= config.maxPort) {
        throw new Error("Invalid configuration: config.minPort must be lower than config.maxPort");
    }
    if (startPort < config.minPort || startPort >= config.maxPort) {
        startPort = config.minPort;
    }
    return startPort++;
}

module.exports = findPort;