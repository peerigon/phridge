"use strict";

var phridge = require("../../lib/main.js");
var keepAlive = Number(process.argv[process.argv.length - 1]);

phridge.spawn()
    .then(function (phantom) {
        // It's necessary to exit cleanly because otherwise phantomjs doesn't exit on Windows
        function disposeAndExit() {
            phantom.dispose().then(function () {
                process.exit(0);
            });
        }

        phantom.on("error", function (err) {
            console.error(err.stack);
            disposeAndExit();
        });

        setTimeout(function () {
            console.log("Everything alright");
            disposeAndExit();
        }, keepAlive);

        phantom.childProcess.emit("error", new Error("Fake error"));
    });
