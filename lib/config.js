"use strict";

module.exports = {
    /**
     * The minimal port where phridge will try to communicate with a phantomjs process.
     *
     * @type {number}
     * @default 2000
     */
    minPort: 2000,

    /**
     * The maximum port where phridge will try to communicate with a phantomjs process
     *
     * @type {number}
     * @default 2^16
     * @see http://stackoverflow.com/questions/113224/what-is-the-largest-tcp-ip-network-port-number-allowable-for-ipv4
     */
    maxPort: Math.pow(2, 16),

    /**
     * A writable stream where phridge will pipe phantomjs' stdout messages.
     *
     * @type {stream.Writable}
     * @default process.stdout
     */
    stdout: process.stdout,

    /**
     * A writable stream where phridge will pipe phantomjs' stderr messages.
     *
     * @type {stream.Writable}
     * @default process.stderr
     */
    stderr: process.stderr
};