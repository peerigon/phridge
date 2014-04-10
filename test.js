"use strict";

var phantomFarm = require("./lib/main.js");

phantomFarm.create().then(function (phantom) {
    phantom.childProcess.stdout.pipe(process.stdout);
    phantom.childProcess.stderr.pipe(process.stderr);
    phantom.run(function (resolve, reject) {
        var page = webpage.create();

        page.content = "<html><body></body></html>";

        page.evaluate(function () {
            console.log(document.elementFromPoint(0, 0));
        });
    }).then(function (element) {
        console.log(element);
    }, function (err) {
        console.log(err);
    });
});