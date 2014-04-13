"use strict";

var node = require("when/node"),
    findPort = require("./findPort"),
    childProcess = require("child_process"),
    phantomjs = require("phantomjs"),
    fs = require("fs"),
    temp = require("temp").track(),
    path = require("path"),
    Phantom = require("./Phantom.js");

var startScript = path.resolve(__dirname, "./phantom/start.js"),
    close,
    open;

open = node.lift(temp.open);
close = node.lift(fs.close);

// enable global promise shim
// @see https://github.com/cujojs/when/blob/master/docs/es6-promise-shim.md
require("when/es6-shim/Promise");

function create(config) {
    return new Promise(function create(resolve, reject) {
        var configPath;

        config = config || {};
        config.phantomFarm = {
            secret: Math.random().toString().substr(2)
        };

        findPort()
            .then(function (p) {
                config.phantomFarm.port = p;
                return open(null);
            })
            .then(function (info) {
                configPath = info.path;

                fs.write(info.fd, JSON.stringify(config));
                return close(info.fd);
            })
            .then(function startPhantom() {
                var child;

                child = childProcess.spawn(phantomjs.path, [
                    "--config=" + configPath,
                    startScript,
                    configPath
                ]);

                child.stderr.pipe(process.stderr);

                child.stdout.once("data", function onFirstData(data) {
                    temp.cleanup();

                    child.stdout.pipe(process.stdout);

                    if (data.toString().trim() === "ok") {
                        resolve(new Phantom(child, config.phantomFarm.port, config.phantomFarm.secret));
                    } else {
                        reject(new Error("Cannot start phantomjs: Expected sub-process to respond with 'ok', instead got '" + data + "'"));
                    }
                });
                child.stderr.once("data", function (data) {
                    reject(new Error("Cannot start phantomjs: " + data));
                });
            })
            .catch(reject);
    });
}

module.exports = create;