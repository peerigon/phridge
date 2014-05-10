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
        setImmediate(callback);
        if (writable.callback) {
            setImmediate(writable.callback);
        }
    };

    return writable;
}

module.exports = createWritableMock;