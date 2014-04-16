"use strict";

var http = require("http"),
    when = require("when"),
    instances = require("./instances.js");

function Phantom(childProcess, port, secret) {
    Phantom.prototype.constructor.apply(this, arguments);
}

Phantom.prototype.childProcess = null;

Phantom.prototype.port = null;

Phantom.prototype.secret = null;

Phantom.prototype.exitted = false;

Phantom.prototype.constructor = function (childProcess, port, secret) {
    var self = this;

    this.childProcess = childProcess;
    this.port = port;
    this.secret = secret;

    instances.push(this);

    childProcess.on("exit", function () {
        instances.splice(instances.indexOf(self), 1);
        self.exitted = true;
    });
};

Phantom.prototype.run = function (fn, params) {
    var data = serializeFn.apply(this, arguments),
        reqOptions = {
            host: "localhost",
            port: this.port,
            path: "/" + this.secret,
            method: "POST",
            headers: {
                "Content-Length": data.length,
                "Content-Type": "application/json"
            }
        };

    return when.promise(function (resolve, reject) {
        http.request(reqOptions, function (response) {
            var body = "";

            response.setEncoding("utf8");
            response.on("data", function (chunk) {
                body += chunk;
            });
            response.on("end", function () {
                if (body === "") {
                    resolve();
                    return;
                }

                try {
                    body = JSON.parse(body);
                } catch (e) {
                    reject(new Error(body));
                    return;
                }

                if (response.statusCode === 200) {
                    resolve(body);
                } else {
                    if (typeof body === "object" && typeof body.message === "string") {
                        body = body.message;
                    }
                    reject(new Error(body));
                }
            });
        }).end(data, "utf8");
    });
};

Phantom.prototype.exit = function () {
    var self = this;

    return when.promise(function (resolve, reject) {
        if (self.exitted) {
            resolve();
            return;
        }

        self.childProcess.on("exit", resolve);

        self
            .run(function (resolve) {
                resolve();

                // Closing the server after some time so this response can be finished properly.
                // That's probably a bug of phantomjs which is responding with a 404 sometimes.
                setTimeout(function () {
                    server.close();
                    phantom.exit();
                }, 500);
            })
            .catch(reject);
    });
};

function serializeFn(fn, params) {
    var args = ["resolve", "reject"];

    if (arguments.length > 1) {
        args.unshift(JSON.stringify(params));
    }

    return "(" + fn.toString() + ")(" + args.join() + ")";
}

module.exports = Phantom;