/* istanbul ignore next */(function() {
    var webpage = require("webpage"),
        system = require("system"),
        fs = require("fs"),
        webserver = require("webserver"),
        child_process = require("child_process");

    var config = JSON.parse(fs.read(system.args[1])),
        server = webserver.create(),
        pages = {},
        context = {};

    server.listen(config.phridge.port, function (req, res) {
        var pageIdMatch;

        if (req.url.indexOf(config.phridge.secret) === -1) {
            res.statusCode = 403;
            res.write("Forbidden");
            res.close();
            return;
        }

        if (pageIdMatch = /\/page\/([0-9]+)\?/.exec(req.url)) {
            runOnPage(pageIdMatch[1], req, res);
            return;
        }

        run(context, req, res);
    });

    function run(context, req, res) {
        var responseClosed = false;

        function resolve(val) {
            if (responseClosed) {
                throw new Error("Cannot resolve value: The response has already been closed. Have you called resolve/reject twice?");
            }
            res.statusCode = 200;
            res.write(JSON.stringify(val));
            res.close();
            responseClosed = true;
        }

        function reject(val) {
            if (responseClosed) {
                throw new Error("Cannot reject value: The response has already been closed. Have you called resolve/reject twice?");
            }
            res.statusCode = 400;
            res.write(JSON.stringify(val));
            res.close();
            responseClosed = true;
        }

        try {
            eval(req.post);
        } catch (err) {
            err.stack = err.stack.replace(/at :/g, "at phantomjs:");
            if (responseClosed) {
                system.stderr.writeLine(err.stack);
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
})();