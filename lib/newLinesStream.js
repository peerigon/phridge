var Transform = require('stream').Transform,
    os = require('os'),
    util = require('util');

function NewLines(options) {
    // allow use without new
    if (!(this instanceof NewLines)) {
        return new NewLines(options);
    }

    // init Transform
    Transform.call(this, options);
}
util.inherits(NewLines, Transform);

NewLines.prototype._transform = function (chunk, enc, cb) {
    this.push(chunk + os.EOL);
    cb();
}

module.exports = NewLines;