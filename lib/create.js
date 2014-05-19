"use strict";

var node = require("when/node"),
    findPort = require("./findPort"),
    childProcess = require("child_process"),
    phantomjs = require("phantomjs"),
    config = require("./config.js"),
    when = require("when"),
    fs = require("fs"),
    net = require("net"),
    temp = require("temp").track(), // track() enables auto-cleanup of temp-files
    path = require("path"),
    Phantom = require("./Phantom.js");

var startScript = path.resolve(__dirname, "./phantom/start.js"),
    writeFile,
    open;

open = node.lift(temp.open);
writeFile = node.lift(fs.writeFile);

/**
 * Creates a new phantomjs process with the given phantom config. Returns a Promises/A+ compliant promise
 * which resolves when the process is ready to execute commands.
 *
 * @see http://phantomjs.org/api/command-line.html
 * @param {Object} phantomJsConfig
 * @returns {Promise}
 */
function create(phantomJsConfig) {
    var configPath,
        stdout,
        stderr,
        child;

    phantomJsConfig = phantomJsConfig || {};
    phantomJsConfig.phridge = phantomJsConfig.phridge || {};
    phantomJsConfig.phridge.secret = Math.random().toString().substr(2);
    stdout = config.stdout;
    stderr = config.stderr;

    /**
     * Step 1: Find an available port where we'll spin up the phantomjs internal http server.
     */
    return findPort()
    /**
     * Step 2: Open a temp file where the phantomjs config will be written to.
     */
        .then(function openTempFile(p) {
            phantomJsConfig.phridge.port = p;
            return open(null);
        })
    /**
     * Step 3: Write the config.
     */
        .then(function writeConfig(info) {
            configPath = info.path;

            return writeFile(info.path, JSON.stringify(phantomJsConfig));
        })
    /**
     * Step 4: Start phantomjs with the config path and pipe stderr and stdout.
     */
        .then(function startPhantom() {
            child = childProcess.spawn(phantomjs.path, [
                "--config=" + configPath,
                startScript,
                configPath
            ]);

            if (stdout !== null) {
                child.stdout.pipe(stdout);
            }
            if (stderr !== null) {
                child.stderr.pipe(stderr);
            }
        })
    /**
     * Step 5: Wait until phantomjs responds to our http requests on the given port.
     *
     * Aborts if phantomjs didn't respond within 30s
     */
        .then(function waitForPhantom() {
            return when.promise(function (resolve, reject) {
                var timeout = 30000,
                    interval = 100,
                    then = Date.now(),
                    timeoutId;

                function checkIfPhantomIsRunning() {
                    var client;

                    if (Date.now() - then > timeout) {
                        reject(new Error("Cannot start phantomjs: Phantom didn't respond within " + timeout/1000 + " seconds :("));
                        return;
                    }

                    client = net.connect(phantomJsConfig.phridge.port, function onPhantomResponse() {
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
    /**
     * Step 6: Create Phantom instance with the given port and secret.
     */
        .then(function () {
            return new Phantom(child, phantomJsConfig.phridge.port, phantomJsConfig.phridge.secret);
        });
}

module.exports = create;