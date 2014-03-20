var webserver = require("webserver"),
    system = require("system");

var port = parseInt(system.args[1]),
    isRunning;

isRunning = webserver.create().listen(port, function (request, response) {
    response.statusCode = 200;
    response.write('<html><body>Hello!</body></html>');
    response.close();
});
// tell node if the server is running
// console.log() is the only way to communicate to stdout
console.log(isRunning);