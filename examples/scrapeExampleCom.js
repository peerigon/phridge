/**
 * In this example we're visiting http://example.com with PhantomJS and are trying to parse
 * the contents of the <h1>-tag
 */

"use strict";

// should just be require("phridge") in your code
var phridge = require("../lib/main.js");

// phridge.spawn() creates a new PhantomJS process
phridge.spawn()

    .then(function (phantom) {
        // phantom.openPage(url) loads a page with the given url
        return phantom.openPage("http://example.com");
    })

    .then(function (page) {
        // page.run(fn) runs fn inside PhantomJS
        return page.run(function () {
            // Here we're inside PhantomJS, so we can't reference variables in the scope

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