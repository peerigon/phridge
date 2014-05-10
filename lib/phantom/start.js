var webpage = require("webpage"),
    system = require("system"),
    fs = require("fs"),
    webserver = require("webserver"),
    child_process = require("child_process");

var config = JSON.parse(fs.read(system.args[1])),
    server = webserver.create(),
    pages = {},
    context = {};

server.listen(config.phridge.port, function (request, response) {
    var pageIdMatch;

    if (request.url.indexOf(config.phridge.secret) === -1) {
        response.statusCode = 403;
        response.write("Forbidden");
        response.close();
        return;
    }

    if (pageIdMatch = /\/page\/([0-9]+)\?/.exec(request.url)) {
        runOnPage(pageIdMatch[1], request, response);
        return;
    }

    run(context, request, response);
});

function run(context, request, response) {
    var responseClosed = false;

    function resolve(val) {
        if (responseClosed) {
            throw new Error("Cannot resolve value: The response has already been closed. Have you called resolve/reject twice?");
        }
        response.statusCode = 200;
        response.write(JSON.stringify(val));
        response.close();
        responseClosed = true;
    }

    function reject(val) {
        if (responseClosed) {
            throw new Error("Cannot reject value: The response has already been closed. Have you called resolve/reject twice?");
        }
        response.statusCode = 400;
        response.write(JSON.stringify(val));
        response.close();
        responseClosed = true;
    }

    try {
        eval(request.post);
    } catch (err) {
        if (responseClosed) {
            system.stderr.writeLine(err.stack.replace(/at :/g, "at phantomjs:"));
        } else {
            reject(err);
        }
    }
}

function runOnPage(pageId, request, response) {
    var page = pages[pageId];

    if (!page) {
        pages[pageId] = page = webpage.create();
    }

    run(page, request, response);
}