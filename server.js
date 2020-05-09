// const http = require("http");
// const router = require("./src/router.js");
// const server = http.createServer(router);
// const port = process.env.PORT || 9000;

// server.listen(port, function() {
//   console.info(`Server is listening on port ${port}`);
// });

global.__basedir = __dirname;

const startServer = require("./start-server");

startServer();
