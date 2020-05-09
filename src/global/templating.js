const path = require("path");
const expressHandlebars = require("express-handlebars");
const Handlebars = require("handlebars");

// Initialise the handlebars engine
const hb = expressHandlebars.create({
	extname: ".html",
	defaultLayout: "main",
	layoutsDir: path.join("src/views", "layouts"),
	partialsDir: path.join("src/views", "partials")
});

function render(template_path, params) {
	return hb.render.call(hb, template_path, Object.assign({ config }, params), { cache: true });
}

module.exports = {
	engine: hb.engine,
	render: render,
};