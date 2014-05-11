"use strict";

var serializeFn = require("./serializeFn.js");

var slice = Array.prototype.slice;

function Page(phantom, id, url) {
    Page.prototype.constructor.apply(this, arguments);
}

Page.prototype.phantom = null;

Page.prototype._id = null;

Page.prototype.constructor = function (phantom, id) {
    this.phantom = phantom;
    this._id = id;
};

Page.prototype.run = function (arg1, arg2, arg3, fn) {
    var args = slice.call(arguments);

    fn = args.pop();

    return this.phantom._request("/page/" + this._id, serializeFn(fn, args));
};

Page.prototype.dispose = function () {
    var self = this;

    return this.run(this._id, disposePage)
        .then(function () {
            self.phantom = null;
        });
};

function disposePage(pageId, resolve) {
    delete pages[pageId];
    resolve();
}

module.exports = Page;