var webpage = require("webpage"),
    system = require("system"),
    fs = require("fs"),
    webserver = require("webserver"),
    child_process = require("child_process");

var port = parseInt(system.args[1]),
    server = webserver.create(),
    config = {};

server.listen(port, function (request, response) {
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

    try {
        eval(request.post);
    } catch (err) {
        reject(err);
    }
});
// tell node if the server is running
// console.log() is the only way to communicate to stdout
console.log("ok");