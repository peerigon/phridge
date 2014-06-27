"use strict";

var phridge = require("../lib/main.js"); // should just be require("phridge") in your code

// phridge.spawn() creates a new PhantomJS process
phridge.spawn()

    // phantom.openPage(url) loads a page with the given url
    .then(function (phantom) {
        return phantom.openPage("http://example.com");
    })

    // page.run(fn) runs fn inside PhantomJS with 'this' bound to an instance of PhantomJS' WebPage.
    .then(function (page) {
        return page.run(function () {

            // 'this' is an instance of PhantomJS' WebPage as returned by require("webpage").create()
            return this.evaluate(function () {
                return document.querySelector("h1").innerText;
            });

        });
    })

    // phridge.disposeAll() exits cleanly all previously created child processes.
    // This should be called in any case to clean up everything.
    .finally(phridge.disposeAll)

    .done(function (text) {
        console.log("Headline on example.com: '%s'", text);
    }, function (err) {
        // Don't forget to handle errors
        // In this case we're just throwing it
        throw err;
    });