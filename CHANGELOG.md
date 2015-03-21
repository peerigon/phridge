Changelog
---------

### 1.0.8
- Fix an error where the destination streams were ended prematurely [#27](https://github.com/peerigon/phridge/issues/27)

### 1.0.7
- Fix memory leak when disposing pages [#21](https://github.com/peerigon/phridge/pull/21)
- Fix confusing security warning when PhantomJS exits

### 1.0.6
- Fix potential performance issues when PhantomJS' stdin was cluttered with messages

### 1.0.5
- `phantom.childProcess.cleanStdout` now implements the regular Readable interface

### 1.0.4
- Improve performance when running synchronous functions

### 1.0.3
- Fix an error where new line characters where removed from `console.log()`-messages inside PhantomJS

### 1.0.2
- Fix an error where a promise could have been rejected after it has already been resolved

### 1.0.1
- Improved stack traces from PhantomJS

### 1.0.0
- Replaced inter-process communication from HTTP to regular stdin/stdout
- `Phantom.prototype.port` has been removed
- `Phantom.prototype.secret` has been removed
- `config.minPort` has been removed
- `config.maxPort` has been removed
- Improved performance
- Reached stable state :)