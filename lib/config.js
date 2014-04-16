"use strict";

var config = {
    minPort: 2000,
    //@see http://stackoverflow.com/questions/113224/what-is-the-largest-tcp-ip-network-port-number-allowable-for-ipv4
    maxPort: 2^16,
    stdout: process.stdout,
    stderr: process.stderr
};

function set(conf, value) {
    if (arguments.length === 2) {
        config[conf] = value;
    } else {
        Object.keys(conf).forEach(function forEachConfKey(key) {
            config[key] = conf[key];
        });
    }
}

function get(key) {
    if (arguments.length === 1) {
        return config[key];
    }
    return config;
}

exports.set = set;
exports.get = set.get = get;