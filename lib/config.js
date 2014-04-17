"use strict";

module.exports = {
    minPort: 2000,
    //@see http://stackoverflow.com/questions/113224/what-is-the-largest-tcp-ip-network-port-number-allowable-for-ipv4
    maxPort: Math.pow(2, 16),
    stdout: process.stdout,
    stderr: process.stderr
};