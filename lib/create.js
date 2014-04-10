"use strict";

var node = require("when/node"),
    findPort = require("./findPort"),
    childProcess = require("child_process"),
    phantomjs = require("phantomjs"),
    fs = require("fs"),
    temp = require("temp").track(),
    path = require("path"),
    Phantom = require("./Phantom.js");

var configId = 0,
    startScript = path.resolve(__dirname, "./phantom/start.js"),
    close,
    open;

open = node.lift(temp.open);
close = node.lift(fs.close);

// enable global promise shim
// @see https://github.com/cujojs/when/blob/master/docs/es6-promise-shim.md
require("when/es6-shim/Promise");

function create(config) {
    return new Promise(function create(resolve, reject) {
        var port,
            configPath;

        findPort()
            .then(function (p) {
                port = p;
                startPhantom();
            }).catch(reject);

        if (!config) {
            return;
        }

        open(configId++)
            .then(function (info) {
                configPath = info.path;

                fs.write(info.fd, JSON.stringify(config));
                return close(info.fd);
            })
            .then(startPhantom)
            .catch(reject);

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
            child.stdout.once("data", function onFirstData(data) {
                temp.cleanup();

                child.stdout.pipe(process.stdout);

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