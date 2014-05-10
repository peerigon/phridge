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

module.exports = Page;