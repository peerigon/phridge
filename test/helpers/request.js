"use strict";

var http = require("http"),
    when = require("when");

function request(options, data) {
    return when.promise(function (resolve) {
        options.host = "localhost";
        options.headers = {
            "Content-Length": data.length,
            "Content-Type":   "application/json"
        };

        http.request(options, resolve)
            .end(data, "utf8");
    });
}

module.exports = request;