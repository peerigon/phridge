"use strict";

module.exports = {
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