"use strict";

var phantomFarm = require("../lib/main.js");

phantomFarm.create({ webSecurity: false })
    .then(function (phantom) {
        return phantom.run(function (resolve, reject) {
            var page = require('webpage').create();

            page.open("http://localhost:3000", function (status) {
                if (status === "success") {
                    resolve(status);
                } else {
                    reject(status);
                }
            });
        });
    })
    .then(function (status) {
        console.log("status", status);
    })
    .catch(function (err) {
        console.log("err", err);
    });