/* Third-party modules */
const express = require("express");
const path = require("path");

// Local dependency files
const router = require("./src/router");

/* Local modules */
const templating = require("./src/global/templating");

module.exports = () => {

/* Global objects */
const app = express();

/* App settings */
app.engine("html", templating.engine);
app.set("views", path.join(__dirname, "src/views"));
// You can turn 'strict routing' on to distinguish between URLs with trailing slashes
// app.set("strict routing", true);

// Remove the X-Powered-By: Express header from responses
app.disable("x-powered-by");

// Set general response headers for all HTTP requests
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, DELETE, OPTIONS"
    );
    next();
  });

// Check the Origin header if present, to protect against
// cross-site request forgery attacks.
app.use((req, res, next) => {
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
app.use(express.static(path.join(__dirname, "public")));

/* Main app */
router.routes(app);

const port = process.env.PORT || 9000;

function startServer() {
    return new Promise((resolve) => {
        const httpServer = app.listen(port, () => {
            console.info(`Server is listening on port ${port}`);
        })
        resolve(httpServer);
    })
}
return startServer();
}