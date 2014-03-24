"use strict";

var phantomFarm = require("lib/main.js"),
    fs = require("fs");

phantomFarm.create({ webSecurity: false })
    .then(function (phantom) {
        return phantom.run(function (resolve, reject) {
            var page = webpage.create();

            page.open("http://localhost:3000", function (status) {
                if (status !== "success") {
                    reject(new Error("Returned status by phantomjs is " + status));
                    return;
                }

                resolve(page.renderBase64("JPEG"));
            });
        });
    })
    .then(function (img) {
        fs.writeFileSync(__dirname + "/screenshot.jpg", img);
    })
    .catch(function (err) {
        console.log("err", err);
    });