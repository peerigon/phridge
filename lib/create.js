"use strict";

var node = require("when/node"),
    findPort = require("./findPort"),
    childProcess = require("child_process"),
    phantomjs = require("phantomjs"),
    when = require("when"),
    fs = require("fs"),
    net = require("net"),
    temp = require("temp").track(), // track() enables auto-cleanup of temp-files
    path = require("path"),
    Phantom = require("./Phantom.js");

var startScript = path.resolve(__dirname, "./phantom/start.js"),
    close,
    open;

open = node.lift(temp.open);
close = node.lift(fs.close);

function create(config) {
    var configPath,
        stdout,
        stderr,
        child;

    config = config || {};
    config.phantomFarm = config.phantomFarm || {};
    config.phantomFarm.secret = Math.random().toString().substr(2);
    stdout = config.phantomFarm.stdout;
    delete config.phantomFarm.stdout;
    stderr = config.phantomFarm.stderr;
    delete config.phantomFarm.stderr;

    return findPort()
        .then(function openTempFile(p) {
            config.phantomFarm.port = p;
            return open(null);
        })
        .then(function writeConfig(info) {
            configPath = info.path;

            fs.write(info.fd, JSON.stringify(config));
            return close(info.fd);
        })
        .then(function startPhantom() {
            child = childProcess.spawn(phantomjs.path, [
                "--config=" + configPath,
                startScript,
                configPath
            ]);

            if (stdout !== null) {
                child.stdout.pipe(stdout || process.stdout);
            }
            if (stderr !== null) {
                child.stderr.pipe(stderr || process.stderr);
            }
        })
        .then(function waitForPhantom() {
            return when.promise(function (resolve, reject) {
                var timeout = 20000,
                    interval = 100,
                    then = Date.now(),
                    timeoutId;

                function checkIfPhantomIsRunning() {
                    var client;

                    if (Date.now() - then > timeout) {
                        reject(new Error("Cannot start phantomjs: Phantom didn't respond within " + timeout/1000 + " seconds :("));
                        return;
                    }

                    client = net.connect(config.phantomFarm.port, function onPhantomResponse() {
                            client.destroy();
                            resolve();
                        })
                        .on("error", schedule);
                }

                function schedule(error) {
                    if (error && error.code !== "ECONNREFUSED") {
                        reject(error);
                        return;
                    }
                    timeoutId = setTimeout(checkIfPhantomIsRunning, interval);
                }

                schedule();
            });
        })
        .then(function () {
            return new Phantom(child, config.phantomFarm.port, config.phantomFarm.secret);
        });
}

module.exports = create;