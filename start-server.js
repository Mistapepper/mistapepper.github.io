/* Third-party modules */


/* Local modules */
const templating = require("./global/templating");

/* Global objects */
const app = express();

/* App settings */
app.engine("html", templating.engine);
app.set("views", path.join(__dirname, "views"));
// You can turn 'strict routing' on to distinguish between URLs with trailing slashes
// app.set("strict routing", true);


// Remove the X-Powered-By: Express header from responses
app.disable("x-powered-by");

const port = process.env.PORT || 9000;