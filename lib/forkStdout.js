"use strict";

var Transform = require("stream").Transform;
var os = require("os");
var util = require("util");
var ForkStream = require("fork-stream");
var Linerstream = require("linerstream");
var mapStream = require('map-stream');

var messageToNode = "message to node: ";

/**
 * Creates a fork stream which pipes messages starting with 'message to node: ' to our phridge stream
 * and any other message to the other stream. Thus console.log() inside phantomjs is still printed to the
 * console while using stdout as communication channel for phridge.
 *
 * @param {stream.Readable} stdout
 * @returns {{phridge: stream.Readable, cleanStdout: stream.Readable}}
 */
function forkStdout(stdout) {
    var fork;
    var phridgeEndpoint;
    var cleanStdoutEndpoint;

    fork = new ForkStream({
        classifier: function (chunk, done) {
            chunk = chunk
                .toString("utf8")
                .slice(0, messageToNode.length);
            done(null, chunk === messageToNode);
        }
    });

    stdout
        .pipe(new Linerstream())
        .pipe(fork);

    // Removes the 'message to node: '-prefix from every chunk.
    phridgeEndpoint = fork.a.pipe(mapStream(function(data, cb){
        cb(null, data.slice(messageToNode.length));
    }));

    // We need to restore EOL-character in stdout stream
    cleanStdoutEndpoint = fork.b.pipe(mapStream(function(data, cb){
        cb(null, data + os.EOL);
    }));

    // We know that phantomjs messages to node are not binary
    phridgeEndpoint.setEncoding("utf8");

    return {
        phridge: phridgeEndpoint,
        cleanStdout: cleanStdoutEndpoint
    };
}

module.exports = forkStdout;