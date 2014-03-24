"use strict";

var http = require("http"),
    instances = require("./instances.js");

// enable global promise shim
// @see https://github.com/cujojs/when/blob/master/docs/es6-promise-shim.md
require("when/es6-shim/Promise");

function Phantom(childProcess, port) {
    Phantom.prototype.constructor.apply(this, arguments);
}

Phantom.prototype.childProcess = null;

Phantom.prototype.exitted = false;

Phantom.prototype.constructor = function (childProcess, port) {
    this.childProcess = childProcess;
    this.port = port;
    instances.push(this);
};

Phantom.prototype.run = function (fn) {
    var data = fn.toString(),
        reqOptions = {
            host: "localhost",
            port: this.port,
            path: "/",
            method: "POST",
            headers: {
                "Content-Length": data.length,
                "Content-Type": "application/json"
            }
        };

    return new Promise(function (resolve, reject) {
        http.request(reqOptions, function (response) {
            var body = "";

            response.setEncoding("utf8");
            response.on("data", function (chunk) {
                body += chunk;
            });
            response.on("end", function () {
                if (response.statusCode === 200) {
                    resolve(body);
                } else {
                    reject(body);
                }
            });
        }).end(fn.toString(), "utf8");
    });
};

Phantom.prototype.exit = function () {
    var self = this;

    return new Promise(function (resolve, reject) {
        if (self.exitted) {
            return resolve();
        }

        self.childProcess.on("exit", function () {
            instances.splice(instances.indexOf(self), 1);
            self.exitted = true;
            resolve();
        });

        self
            .run(function () {
                server.close();
                phantom.exit();
            })
            .catch(function (err) {
                // Error 403 is expected because the connection was closed
                if (err.search("Error 403: Directory Listing Denied") === -1) {
                    return reject(err);
                }
            });
    });
};

module.exports = Phantom;