var webserver = require("webserver"),
    system = require("system");

var port = parseInt(system.args[1]),
    isRunning;

isRunning = webserver.create().listen(port, function (request, response) {
    function resolve(val) {
        response.statusCode = 200;
        response.write(JSON.stringify(val));
        response.close();
    }

    function reject(val) {
        response.statusCode = 400;
        response.write(JSON.stringify(val));
        response.close();
    }

    eval("(" + request.post + ")(resolve, reject)");
});
// tell node if the server is running
// console.log() is the only way to communicate to stdout
console.log(isRunning);