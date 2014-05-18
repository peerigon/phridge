"use strict";

function slow(fn) {
    if (fn.length === 1) {
        return function (done) {
            this.slow(2000);
            this.timeout(15000);
            return fn.apply(this, arguments);
        };
    }
    return function () {
        this.slow(2000);
        this.timeout(15000);
        return fn.apply(this, arguments);
    };
}

module.exports = slow;