"use strict";

var http = require("http"),
    getport = require("getport"),
    when = require("when"),
    fs = require("fs");

var testPage = fs.readFileSync(__dirname + "/testPage.html", "utf8"),
    alamidLogo = fs.readFileSync(__dirname + "/alamid.png"),
    server;

function start() {
    /* jshint validthis: true */
    var self = this;

    return when.promise(function (resolve, reject) {
        getport(30000, function (err, port) {
            if (err) {
                return reject(err);
            }
            if (server) {
                stop();
            }
            server = http
                .createServer(serveTestFiles)
                .listen(port, function onListen(err) {
                    if (err) {
                        return reject(err);
                    }
                    self.testServerUrl = "http://localhost:" + port;
                    resolve(port);
                });
        });
    });
}

function stop() {
    server.close();
    server.removeAllListeners();
}

function serveTestFiles(req, res) {
    if (req.url.indexOf("alamid") > -1) {
        res.setHeader("Content-Type", "image/png");
        res.end(alamidLogo);
        return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf8");
    res.end(testPage, "utf8");
}

exports.start = start;
exports.stop = stop;