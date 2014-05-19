"use strict";

var stream = require("stream");

function createWritableMock() {
    var writable = new stream.Writable();

    writable.message = "";
    writable.messageArr = [];
    writable._write = function (chunk, encoding, callback) {
        chunk = chunk.toString();
        writable.message += chunk;
        writable.messageArr.push(chunk);
        callback();
        if (writable.callback) {
            writable.callback();
        }
    };

    return writable;
}

module.exports = createWritableMock;