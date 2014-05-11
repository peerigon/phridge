"use strict";

var when = require("when"),
    instances = require("./instances.js"),
    request = require("./request.js"),
    Page = require("./Page.js"),
    serializeFn = require("./serializeFn.js");

var pageId = 0,
    slice = Array.prototype.slice;

function Phantom(childProcess, port, secret) {
    Phantom.prototype.constructor.apply(this, arguments);
}

Phantom.prototype.childProcess = null;

Phantom.prototype.port = null;

Phantom.prototype.secret = null;

Phantom.prototype.exitted = false;

Phantom.prototype.constructor = function (childProcess, port, secret) {
    var self = this;

    this.childProcess = childProcess;
    this.port = port;
    this.secret = secret;

    instances.push(this);

    childProcess.on("exit", function onExit() {
        instances.splice(instances.indexOf(self), 1);
        self.exitted = true;
    });
};

Phantom.prototype.run = function (arg1, arg2, arg3, fn) {
    var args = slice.call(arguments);

    fn = args.pop();

    return this._request("/", serializeFn(fn, args));
};

Phantom.prototype.createPage = function () {
    var self = this;

    return new Page(self, pageId++);
};

Phantom.prototype.openPage = function (url) {
    var page = this.createPage();

    return page.run(url, function (url, resolve, reject) {
        this.open(url, function onPageLoaded(status) {
            if (status !== "success") {
                return reject(new Error("Cannot load " + url + ": Phantomjs returned status " + status));
            }
            resolve();
        });
    }).then(function () {
        return page;
    });
};

Phantom.prototype.dispose = function () {
    var self = this;

    return when.promise(function dispose(resolve, reject) {
        if (self.exitted) {
            resolve();
            return;
        }

        self.childProcess.on("exit", resolve);

        self.run(function () {
                // Closing the server after some time so this response can be finished properly.
                // That's probably a bug of phantomjs which is responding with a 404 sometimes.
                setTimeout(function () {
                    server.close();
                    phantom.exit();
                }, 500);
            })
            .catch(reject);
    });
};

Phantom.prototype._request = function (path, body) {
    var statusCode;

    return request({
        port: this.port,
        path: path + "?" + this.secret,
        body: body
    }).then(function onResponse(res) {
        statusCode = res.statusCode;
        if (res.body) {
            return when.try(JSON.parse, res.body);
        }
    }).then(function onResponseBodyParse(body) {
        if (statusCode === 200) {
            return body;
        }

        if (typeof body === "object") {
            throw body;
        } else {
            throw new Error(body);
        }
    });
};

module.exports = Phantom;