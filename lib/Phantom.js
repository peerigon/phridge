"use strict";

var http = require("http");

// enable global promise shim
// @see https://github.com/cujojs/when/blob/master/docs/es6-promise-shim.md
require("when/es6-shim/Promise");

function Phantom(process, port) {
    this.process = process;
    this.port = port;
}

Phantom.prototype.process = null;

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

Phantom.prototype.kill = function () {
    this.process.exit(0);
};

module.exports = Phantom;