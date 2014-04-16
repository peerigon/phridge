"use strict";

function slow(fn) {
    return function () {
        this.slow(2000);
        this.timeout(6000);
        return fn.apply(this, arguments);
    };
}

module.exports = slow;