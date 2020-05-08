/* Third-party modules */
const express = require("express");
const path = require("path");


// const routes = require("./app");

/* Local modules */
const templating = require("./src/global/templating");

module.exports = () => {

    /* Global objects */
const app = express();

/* Constants */
const SITE_DIR = path.join(__dirname, "site");

/* App settings */
app.engine("html", templating.engine);
app.set("views", path.join(__dirname, "views"));
// You can turn 'strict routing' on to distinguish between URLs with trailing slashes
// app.set("strict routing", true);


// Remove the X-Powered-By: Express header from responses
app.disable("x-powered-by");

// Check the Origin header if present, to protect against
// cross-site request forgery attacks.
app.use(function(req, res, next) {
    const host = req.headers.host;
    const origin = req.headers.origin;

    // Allow GET requests without Origin header check. Safari sends Origin when
    // a POST request is redirected to GET, other browsers do not.
    if (req.method === "GET") {
        next();
        return;
    }

    if (origin && origin != process.env.PROD_APP_URL && origin !== "http://" + host && origin !== "https://" + host) {
        res.status(403)
            .header("Content-Type", "application/json")
            .send(JSON.stringify({ "error": "Unknown origin " + origin }));
        return;
    }

    next();
});

/* Serve static files */
app.use(express.static(SITE_DIR));

/* Main app */
// app.routes(routes);

const port = process.env.PORT || 9000;

function startServer() {
    return new Promise((resolve) => {
        const httpServer = app.listen(port, () => {
            console.info(`App is listening on port ${port}`);
        })
        resolve(httpServer);
    })
}
return startServer();
}