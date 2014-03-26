"use strict";

var node = require("when/node"),
    getport = require("getport"),
    childProcess = require("child_process"),
    phantomjs = require("phantomjs"),
    fs = require("fs"),
    temp = require("temp").track(),
    path = require("path"),
    Phantom = require("./Phantom.js");

var configId = 0,
    startScript = path.resolve(__dirname, "./phantom/start.js"),
    open;

//getport = node.lift(getport);
//open = node.lift(temp.open);

// enable global promise shim
// @see https://github.com/cujojs/when/blob/master/docs/es6-promise-shim.md
require("when/es6-shim/Promise");

function create(config) {
    return new Promise(function create(resolve, reject) {
        var port,
            configPath;

        getport(function (err, p) {
            if (err) {
                reject(err);
                return;
            }

            port = p;
            startPhantom();
        });

        if (!config) {
            return;
        }

        temp.open(configId++, function (err, info) {
            if (err) {
                reject(err);
                return;
            }

            fs.write(info.fd, JSON.stringify(config));
            fs.close(info.fd, function (err) {
                if (err) {
                    reject(err);
                    return;
                }

                configPath = info.path;
                startPhantom();
            });
        });

        function startPhantom() {
            var child,
                args;

            if (!port || (config && !configPath)) {
                return;
            }
            args = [startScript, port];
            if (configPath) {
                args.push("--config " + configPath);
            }

            child = childProcess.spawn(phantomjs.path, [startScript, port]);
            child.stdout.once("data", function (data) {
                temp.cleanup();

                if (data.toString().trim() === "ok") {
                    resolve(new Phantom(child, port));
                } else {
                    reject(new Error("Cannot start phantomjs: Expected sub-process to respond with 'ok', instead got '" + data + "'"));
                }
            });
        }
    });
}

module.exports = create;