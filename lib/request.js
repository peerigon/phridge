"use strict";

var http = require("http"),
    when = require("when");

function request(options) {
    return when.promise(function (resolve, reject) {
        var req;

        options.method = options.method || "POST";
        options.host = options.host || "localhost";
        options.headers = {
            "Content-Length": options.body.length,
            "Content-Type":   "application/json"
        };

        req = http.request(options, function onResponse(response) {
            var body = "";

            response.setEncoding("utf8");
            response.on("data", function (chunk) {
                body += chunk;
            });
            response.on("error", reject);
            response.on("end", function () {
                response.body = body;
                resolve(response);
            });
        });
        req.on("error", reject);
        req.end(options.body);
    });
}

module.exports = request;