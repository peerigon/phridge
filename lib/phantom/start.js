var webpage = require("webpage"),
    system = require("system"),
    fs = require("fs"),
    webserver = require("webserver"),
    child_process = require("child_process");

var config = JSON.parse(fs.read(system.args[1])),
    server = webserver.create();

server.listen(config.phantomFarm.port, function (request, response) {
    if (request.url !== "/" + config.phantomFarm.secret) {
        response.statusCode = 403;
        response.write("Forbidden");
        response.close();
        return;
    }

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