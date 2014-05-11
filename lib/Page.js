"use strict";

var serializeFn = require("./serializeFn.js");

function Page(phantom, id, url) {
    Page.prototype.constructor.apply(this, arguments);
}

Page.prototype.phantom = null;

Page.prototype._id = null;

Page.prototype.constructor = function (phantom, id) {
    this.phantom = phantom;
    this._id = id;
};

Page.prototype.run = function (fn, params) {
    return this.phantom._request("/page/" + this._id, serializeFn.apply(this, arguments));
};

Page.prototype.dispose = function () {
    var self = this;

    return this.run(disposePage, { pageId: this._id })
        .then(function () {
            self.phantom = null;
        });
};

function disposePage(params, resolve) {
    delete pages[params.pageId];
    resolve();
}

module.exports = Page;