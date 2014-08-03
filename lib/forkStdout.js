"use strict";

var ForkStream = require("fork-stream");

var messageToNode = "message to node: ";

/**
 * Creates a fork stream which pipes messages starting with 'message to node: ' to our phridge stream
 * and any other message to the other stream. Thus console.log() inside phantomjs is still printed to the
 * console while using stdout as communication channel for phridge.
 *
 * @returns {ForkStream}
 */
function forkStdout() {
    var fork;
    var push;

    fork = new ForkStream({
        classifier: function (chunk, done) {
            chunk = chunk
                .toString("utf8")
                .slice(0, messageToNode.length);
            done(null, chunk === messageToNode);
        }
    });

    // fork.a provides all messages that started with 'message to node: '
    fork.phridge = fork.a;
    // fork.b provides the rest
    fork.other = fork.b;

    // We know that phantomjs messages to node are not binary
    fork.phridge.setEncoding("utf8");

    // Overriding the push()-method because we need to slice off the 'message to node: '-prefix in order
    // to parse it via JSON.parse()
    push = fork.phridge.push;
    fork.phridge.push = function (chunk) {
        if (chunk !== null) {
            chunk = chunk.slice(messageToNode.length);
        }

        return push.call(this, chunk);
    };

    return fork;
}

module.exports = forkStdout;