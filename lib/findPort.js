"use strict";

var getport = require("getport"),
    config = require("./config.js"),
    when = require("when");

var startPort = -1,
    currentPromise;

/**
 * Tries to find the next available port and memorizes resolved ports. This is basically a wrapper around
 * the getport-module because we need to memorize which ports have been resolved previously. This is necessary
 * because of the interval between the start of the process and when the process is listening on a port.
 *
 * Otherwise spinning up several phantomjs-processes in parallel would yield to all processes listening on the same port.
 *
 * @private
 * @returns {Promise}
 */
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

/**
 * @private
 * @returns {number}
 */
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