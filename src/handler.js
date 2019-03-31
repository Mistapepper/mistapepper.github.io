const fs = require("fs");
const querystring = require("querystring");
const path = require("path");
// const formidable = require('formidable');
// const mime = require("mime");
// const util = require('util');

const extensionType = {
  html: "text/html",
  css: "text/css",
  js: "application/javascript",
  jpg: "image/jpeg",
  png: "image/png",
  ico: "image/x-icon",
  svg: "image/svg+xml",
  gif: "image/gif"
};

function handler(request, response) {
  const endpoint = request.url;
  // console.log("ENDPOINT:", endpoint);
  const extension = endpoint.split(".")[1];
  const method = request.method;
  // console.log("METHOD:", method);

  if (method === "GET") {

    if (endpoint === "/" || endpoint === "/index.html") {
      fs.readFile(__dirname + "/../index.html", function(error, file) {
        if (error) {
          console.log("error");
          return;
        }
        response.writeHead(200, { "Content-Type": "text/html" });
        response.end(file);
      });
    }

    else if (endpoint === "/posts") {
      fs.readFile(__dirname + "/posts.json", "utf8", (error, file) => {
        if (error) {
          // console.log("hi");
          console.log(error);
          return;
        }
        response.writeHead(200, {"Content-Type": "application/json"});
        // response.write("You're on the posts page");
        // console.log(JSON.parse(file));
        const blogPosts = JSON.parse(file);
        // console.log("BLOG POSTS:", blogPosts['1456059074613']);
        response.end(file);
      });
    }

    else if (endpoint.includes("/scripts")) {
      fs.readFile(__dirname + "/../" + endpoint, (error, file) => {
        if (error) {
          console.log(error);
          return;
        }
        response.writeHead(200, {"Content-Type": extensionType[extension]});
        response.end(file);
      });
    }

    else {
      // const extension = endpoint.split(".")[1];
      // console.log(extension);

      fs.readFile(__dirname + "/../public" + endpoint, function(error, file) {
        if (error) {
          // console.log(endpoint);
          console.log("Error");
          return;
        }
        // console.log(__dirname + "/../public" + endpoint);
        response.writeHead(200, { "Content-Type": extensionType[extension] });
        response.end(file);
      });
    }
  }

  if (method === "POST") {
    if (endpoint === "/create/post") {
      console.log("POST request received");

      // STEP 6: Sending blog post to the Server
      // This stackoverflow answer helped me find out how to pass the image data
      // to the server: https://stackoverflow.com/questions/21745432/image-upload-to-server-in-node-js-without-using-express

      let allTheData = "";
      request.on("data", function(chunkOfData) {
        console.log("Writing to file...");
        allTheData += chunkOfData;
      });

      request.on("end", function() {
        const convertedData = querystring.parse(allTheData);
        console.log(convertedData.post);

        fs.readFile(__dirname + "/posts.json", "utf8", (error, file) => {
          if (error) {
            console.log(error);
            return;
          }
          console.log(file);
          const blogPosts = JSON.parse(file);
          console.log(blogPosts);
          blogPosts[Date.now()] = {
            "Title": convertedData.title,
            "Content": convertedData.post,
            "Main Image": convertedData.mainImage,
            "Thumbnail": convertedData.thumbnail,
            "Meta title": convertedData.metatitle,
            "Meta description": convertedData.metadescription
          }
          const final = JSON.stringify(blogPosts);
          // console.log(blogPosts);

          fs.writeFile(__dirname + "/posts.json", final, function(error) {
            if (error) {
              console.log("Error");
              return;
          }
          console.log("Successfully written to file");
          // response.writeHead(200, {"Content-Type": "application/json"});
          // response.end(file);
        });
      });

      response.writeHead(302, { Location: "/blog/blog.html" });
      response.end();
    });
  }
  }
}

module.exports = handler;
