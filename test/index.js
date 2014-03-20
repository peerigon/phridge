"use strict";

var phantomFarm = require("../lib/main.js");

phantomFarm.create({ webSecurity: true }).then(function (result) {
    console.log("result", result);
}, function (err) {
    console.log("err", err);
});