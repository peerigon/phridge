"use strict";

/**
 * Opens the given page and resolves when phantomjs called back.
 * Will be executed inside of phantomjs.
 *
 * @private
 * @param {string} url
 * @param {Function} resolve
 * @param {Function} reject
 */
function openPage(url, resolve, reject) { /* jshint validthis: true */
    this.open(url, function onPageLoaded(status) {
        if (status !== "success") {
            return reject(new Error("Cannot load " + url + ": Phantomjs returned status " + status));
        }
        resolve();
    });
}

/**
 * Closing the server after some time so this response can be finished properly.
 * That's probably a bug of phantomjs which is responding with a 404 sometimes.
 *
 * @private
 */
function closeServer() { /* global server, phantom */
    setTimeout(function () {
        server.close();
        phantom.exit();
    }, 500);
}

/**
 * Cleans all references to a specific page.
 *
 * @private
 * @param {number} pageId
 */
function disposePage(pageId) { /* global pages */
    delete pages[pageId];
}

exports.openPage = openPage;
exports.closeServer = closeServer;
exports.disposePage = disposePage;