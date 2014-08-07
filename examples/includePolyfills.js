/**
 * This example demonstrates how to include polyfills for browser features which PhantomJS doesn't support
 */

"use strict";

// should just be require("phridge") in your code
var phridge = require("../lib/main.js");
var path = require("path");

// phridge.spawn() creates a new PhantomJS process
phridge.spawn()

    .then(function (phantom) {
        // creates a new webpage internally
        var page = phantom.createPage();

        // resolving the path to the AudioContext-polyfill assuming that it has been installed via bower
        var audioContextPolyfill = path.resolve(__dirname, "../bower_components/audiocontext-polyfill/audiocontext-polyfill.js");

        // we can't just access the audioContextPolyfill variable from the scope
        // we need to pass it explicitly to PhantomJS
        return page.run(audioContextPolyfill, function (audioContextPolyfill, resolve, reject) {
            var page = this;

            // onInitialized is called after the web page is created but before
            // a URL is loaded according to the docs of PhantomJS
            // @see http://phantomjs.org/api/webpage/handler/on-initialized.html
            page.onInitialized = function () {
                page.injectJs(audioContextPolyfill);
            };

            page.open("http://example.com", function (status) {
                var audioContextAvailable;

                if (status !== "success") {
                    reject(new Error("Cannot load http://example.com: Phantomjs returned status " + status));
                    return;
                }

                // check if AudioContext is available on the window-object
                audioContextAvailable = page.evaluate(function () {
                    return Boolean(window.AudioContext);
                });

                if (!audioContextAvailable) {
                    reject(new Error("Something went wrong while injecting the AudioContext-polyfill"));
                    return;
                }

                resolve();
            });
        });

    })

    // phridge.disposeAll() exits cleanly all previously created child processes.
    // This should be called in any case to clean up everything.
    .finally(phridge.disposeAll)

    .done(function () {
        // everything is alright
    }, function (err) {
        // Don't forget to handle errors
        // In this case we're just throwing it
        throw err;
    });
