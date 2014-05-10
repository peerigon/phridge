"use strict";

function serializeFn(fn, params) {
    var args = ["resolve", "reject"];

    if (arguments.length > 1) {
        args.unshift(JSON.stringify(params));
    }

    // Currently sourceURLs aren't supported by PhantomJS but maybe in the future
    return "(" + fn.toString() + ").call(context," + args.join() + "); //# sourceURL=phridge.js";
}

module.exports = serializeFn;