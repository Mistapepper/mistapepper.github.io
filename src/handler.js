require("env2")("./config.env");

const fs = require("fs");
const querystring = require("query-string");
const path = require("path");
const formidable = require("formidable");
const cookie = require("cookie");

// const mime = require("mime");
// const util = require('util');
const createPostFromTemplate = require("./createPostFromTemplate.js");
const readingTimeCalculator = require("./helpers/readingTimeCalculator.js");

const { getAllMainImages, getAllPosts, getAllThumbnails, getComments, getPost, getTags, getUser, getUsername, deleteEmailVerificationToken, getEmailVerificationToken, submitEmailVerificationToken, submitNewComment, submitNewImage, submitNewPost, submitNewThumbnail, submitNewUser, updateVerifiedUser } = require("../queries/index");

const validateNewUser = require("./authentication/validateNewUser.js");
const { hashPassword, comparePassword } = require("./authentication/hash.js");
const generateJSONWebToken = require("./authentication/generateJWT.js");
const decodeJSONWebToken = require("./authentication/decodeJWT.js");
const sendEmail = require("./authentication/sendEmail.js");
const generateEmailVerificationToken = require("./authentication/generateEmailVerificationToken.js");
const generateAWSSignature = require("./authentication/generateAWSSignature.js");
const getSignedAwsRequest = require("./authentication/getSignedAwsRequest.js");
const getProjects = require("./airtable/getProjects.js");

const customLog = require("./utils/customLog");

//GET REQUEST HANDLERS

const homeHandler = res => {
  fs.readFile(__dirname + "/../index.html", function(error, file) {
    if (error) {
      console.log("error");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(file);
  });
};

const allPostsHandler = (req, res) => {
  fs.readFile(__dirname + "/../public/blog/all-posts.html", function(
    error,
    file
  ) {
    if (error) {
      console.log("error");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(file);
  });
};

const specificPostHandler = (req, res, endpoint) => {
  let filename = `${endpoint.split("/")[2].split(".html")[0]}` + ".html";

  generateAWSSignature
    .getAwsFile(filename)
    .then(response => {
      let fileContents = response["Body"].toString();
      fs.writeFile(
        __dirname + "/../public" + "/posts/" + filename,
        fileContents,
        (err, file) => {
          if (err) console.log(err);
          console.log(
            "File has been written to the local filepath! Now reading..."
          );

          fs.readFile(
            __dirname + "/../public" + "/posts/" + filename,
            "utf8",
            (error, file) => {
              if (error) {
                console.log(error);
                return;
              }
              fs.unlink(
                __dirname + "/../public" + "/posts/" + filename,
                err => {
                  if (err) {
                    console.log(err);
                    return;
                  }
                  console.log(
                    "Blog post successfully deleted from local filesystem"
                  );
                  res.writeHead(200, { "Content-Type": "text/html" });
                  res.end(file);
                }
              );
            }
          );
        }
      );
    })
    .catch(error => {
      console.log(error);
    });
};

const postsJSONHandler = res => {
  fs.readFile(__dirname + "/posts.json", "utf8", (error, file) => {
    if (error) {
      console.log(error);
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    const blogPosts = JSON.parse(file);
    res.end(file);
  });
};

const recentPostsHandler = async (res) => {
  try {
    let posts = await getAllPosts();
    let thumbnails = await getAllThumbnails();

    for (let i = 0; i < posts.length; i++) {
      for (let j = 0; j < thumbnails.length; j++) {
        if (thumbnails[j].pk_thumbnail_id === posts[i].thumbnail_id) {
          posts[i]["thumbnail"] = thumbnails[j];
        }
      }
    }
    res.end(JSON.stringify(posts));
  } catch (e) {
    customLog(`Error in recentPostsHandler: ${e}`, 'error');
  }
};

const mainImagesHandler = async (res) => {
  try {
    const images = await getAllMainImages();
    res.end(JSON.stringify(images));
  } catch (e) {
    customLog(`Error in mainImagesHandler: ${e}`, 'error');
  }
};

const createAccountPageHandler = res => {
  fs.readFile(
    __dirname + "/../public/blog/create-account.html",
    "utf8",
    (error, file) => {
      if (error) {
        console.log(error);
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(file);
    }
  );
};

const newPostHandler = (req, res) => {
  let jwt = cookie.parse(req.headers.cookie).jwt;
  if (jwt !== undefined) {
    decodeJSONWebToken(jwt)
      .then(decodedToken => {
        if (decodedToken.logged_in === true) {
          if (decodedToken.role === "admin") {
            fs.readFile(
              __dirname + "/../public/blog/create-post.html",
              "utf8",
              (error, file) => {
                if (error) {
                  console.log(error);
                  return;
                }
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(file);
              }
            );
          } else {
            res.writeHead(302, {
              Location: "./authorisation-failure.html"
            });
            res.end();
          }
        }
      })
      .catch(error => console.log(error));
  } else {
    res.writeHead(302, { Location: "/blog/publish-failure.html" });
    res.end();
  }
};

const imageManagerPageHandler = (req, res) => {
  let jwt = cookie.parse(req.headers.cookie).jwt;
  if (jwt !== undefined) {
    decodeJSONWebToken(jwt)
      .then(decodedToken => {
        if (decodedToken.logged_in === true) {
          if (decodedToken.role === "admin") {
            fs.readFile(
              __dirname + "/../public/blog/image-manager.html",
              "utf8",
              (error, file) => {
                if (error) {
                  console.log(error);
                  return;
                }
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(file);
              }
            );
          } else {
            res.writeHead(302, {
              Location: "./authorisation-failure.html"
            });
            res.end();
          }
        }
      })
      .catch(error => console.log(error));
  } else {
    res.writeHead(302, { Location: "/blog/publish-failure.html" });
    res.end();
  }
};

const domScriptsHandler = (res, endpoint, extension) => {
  let filename = `${endpoint.split("/")[4]}`;
  const extensionType = {
    html: "text/html",
    css: "text/css",
    js: "text/javascript",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    ico: "image/x-icon",
    svg: "image/svg+xml",
    gif: "image/gif",
    json: "application/json"
  };

  fs.readFile(__dirname + "/../public/" + filename, (error, file) => {
    if (error) {
      console.log(error);
      return;
    }
    res.writeHead(200, { "Content-Type": extensionType[extension] });
    res.end(file);
  });
};

const publicHandler = (res, endpoint, extension) => {
  let mimeType;
  if (extension === "min") {
    mimeType = "css";
  } else {
    mimeType = extension;
  }
  const extensionType = {
    html: "text/html",
    css: "text/css",
    js: "text/javascript",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    ico: "image/x-icon",
    svg: "image/svg+xml",
    gif: "image/gif",
    json: "application/json",
    ttf: "application/octet-stream"
  };

  fs.readFile(__dirname + "/../public" + endpoint, function(error, file) {
    if (error) {
      console.log(
        "Error: One of the requested files couldn't be found (probably the favicon :P)"
      );
      return;
    }
    res.writeHead(200, { "Content-Type": extensionType[mimeType] });
    res.end(file);
  });
};

const loginPageHandler = res => {
  fs.readFile(
    __dirname + "/../public/blog/login.html",
    "utf8",
    (error, file) => {
      if (error) {
        console.log(error);
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(file);
    }
  );
};

const checkLoginStatusHandler = async (req, res) => {
  try {
  if (!req.headers.cookie) {
    const user = {loginStatus: false};
    return res.end(JSON.stringify(user));
  }

  let jwt = cookie.parse(req.headers.cookie).jwt;
  if (!jwt) {
    const user = {loginStatus: false};
    return res.end(JSON.stringify(user));
  }

  const decodedToken = await decodeJSONWebToken(jwt);
  let user = {
    loginStatus: decodedToken.logged_in,
    id: decodedToken.user_id
  };

  if (user.loginStatus) {
    const userData = await getUsername(user.id)
          user.username = userData.username;
          user.avatar = userData.avatar_filepath;
          user.role = userData.role;
          return res.end(JSON.stringify(user));
  }
} catch (e) {
  customLog(`Error in checkLoginStatusHandler: ${e}`, 'error');
}
};

const getProjectsHandler = (req, res) => {
  getProjects()
    .then(response => {
      res.end(JSON.stringify(response));
    })
    .catch(error => {
      console.log(error);
    });
};

const getCommentsHandler = async (req, res) => {
  try {
    const postName = req.headers.referer.split("/")[4];
    let comments = await getComments(postName);
    res.end(JSON.stringify(comments))
  } catch (e) {
    customLog(`Error in getCommentsHandler: ${e}`, 'error');
  }
};

const getAuthorHandler = async (req, res, endpoint) => {
  try {
  let postName = req.headers.referer.split("/")[4];
  const postData = await getPost(postName);
  const user = await getUsername(postData.user_id)
  const authorData = {
    username: user.username,
    avatar: user.avatar_filepath,
    role: user.role
  };

  return res.end(JSON.stringify(authorData));
  } catch (e) {
    customLog(`Error in getAuthorHandler: ${e}`, 'error');
  }
};

const getTagsHandler = async (req, res) => {
  try {
  const query = req.url.split("?q=")[1];
  const tags = await getTags(query);
  res.end(JSON.stringify(tags));
}
  catch (e) {
    customLog(`Error in getTagsHandler: ${e}`, 'error');
    res.end(JSON.stringify(""));
  }
  return;
};

//POST REQUEST HANDLERS

const contactFormHandler = (req, res) => {
  let form = new formidable.IncomingForm();

  form.uploadDir = __dirname + "/../public/assets/images/blog";
  form.keepExtensions = true;
  form.maxFieldsSize = 10 * 1024 * 1024; // 10MB

  form.on("fileBegin", function(name, file) {
    file.path = path.join(__dirname, "../public/assets/images/blog", file.name);
  });

  form.parse(req, (error, fields, files) => {
    if (error) {
      console.log(`Cannot upload images. Error is ${error}`);
      return error;
    } else {
      console.log("Form data parsing underway...");
      Promise.all([sendEmail(fields)])
        .then(response => {
          res.writeHead(302, { Location: "/index.html" });
          res.end();
        })
        .catch(console.error);
    }
  });
};

const createPostHandler = async (req, res, encodedJwt) => {
  const decodedToken = await decodeJSONWebToken(encodedJwt)
  if (!decodedToken) {
    customLog("It was not possible to decode the JWT, suggesting that the user may not be logged in.", 'warning');
    res.writeHead(302, { Location: "/blog/publish-failure.html" });
    return res.end();
  } 
    const username = decodedToken.username;
    const form = new formidable.IncomingForm();

    form.uploadDir = __dirname + "/../public/assets/images/blog";
    form.keepExtensions = true;
    form.maxFieldsSize = 10 * 1024 * 1024; // 10MB

    form.on("fileBegin", function(name, file) {
      file.path = path.join(
        __dirname,
        "../public/assets/images/blog",
        file.name
      );
    });

    const formData = await new Promise((resolve, reject) => {
      form.parse(req, (error, fields, files) => {
        if (error) {
          customLog(`Cannot upload images. Error is ${error}`, 'error');
          reject(error);
          return;
        } 
  
          const mainImage = {
            name: files["main_image"]["name"],
            size: files["main_image"]["size"],
            path: fields["main_image_url"],
            type: files["main_image"]["type"]
          };
  
          const thumbnail = {
            name: files["thumbnail"]["name"],
            size: files["thumbnail"]["size"],
            path: fields["thumbnail_url"],
            type: files["thumbnail"]["type"]
          };
  
          let timeOfPublication = Date.now();
          let dateOfPublication = Date(timeOfPublication);
  
          fields["main_image"] = mainImage;
          fields["thumbnail"] = thumbnail;
          fields["author_name"] = username;
          fields["pub_timestamp"] = timeOfPublication.toString();
          fields["pub_date"] = dateOfPublication;
          fields["reading_mins"] = readingTimeCalculator(fields["post"]);
          fields["filename"] = `${fields["postUrl"]
            .toLowerCase()
            .replace(/\s/g, "-")}.html`;
          if (process.env.NODE_ENV === "start") {
            fields[
              "filepath"
            ] = `https://s3.eu-west-2.amazonaws.com/console-blog/blog-posts/${fields["filename"]}`;
          } else if (process.env.NODE_ENV === "local") {
            fields[
              "filepath"
            ] = `https://s3.eu-west-2.amazonaws.com/console-blog/local-uploads/practice-posts/${fields["filename"]}`;
          }
  
          customLog("Image upload complete!", 'success');
          resolve(fields);
        });
    })

        await submitNewImage(formData.main_image);
        await submitNewThumbnail(formData.thumbnail);
        await submitNewPost(formData);

        formData["url"] = `/posts/${formData["filename"]}`;
        const newPostContent = await createPostFromTemplate(formData);

        const awsAuthData = await generateAWSSignature.generateAWSSignature(`/sign-s3?file-name=${formData["filename"]}&file-type=text/html`);

        await getSignedAwsRequest.uploadFile(
          newPostContent,
          awsAuthData.signedRequest
        );

        // Delete the main image from the local filesystem
        try {
          const mainImageLocalFilepath = __dirname + "/../public/assets/images/blog/" + formData["main_image"]["name"]
          fs.unlinkSync(mainImageLocalFilepath);
          customLog(`Successfully deleted ${mainImageLocalFilepath} from the local filesystem`, 'success');
        }
        catch (e) {
          customLog(`There was a problem deleting the main image from the local filesystem: ${e}`, 'error');
        }

        // Delete the thumbnail from the local filesystem
        try {
          const thumbnailLocalFilepath = __dirname + "/../public/assets/images/blog/" + formData["thumbnail"]["name"]
          fs.unlinkSync(thumbnailLocalFilepath);
          customLog(`Successfully deleted ${thumbnailLocalFilepath} from the local filesystem`, 'success');
        }
        catch (e) {
          customLog(`There was a problem deleting the thumbnail from the local filesystem: ${e}`, 'error');
        }

        res.writeHead(302, { Location: "/blog/blog.html" });
        res.end();
};

const uploadImageHandler = async (req, res, encodedJwt) => {

  const decodedToken = await decodeJSONWebToken(encodedJwt)
  if (!decodedToken) {
    customLog("It was not possible to decode the JWT, suggesting that the user may not be logged in.", 'warning');
    res.writeHead(302, { Location: "/blog/publish-failure.html" });
    return res.end();
  }

  const username = decodedToken.username;

  const form = new formidable.IncomingForm();

  // Formidable module configs (TODO: move these to a config file)
        form.uploadDir = __dirname + "/../public/assets/images/blog";
        form.keepExtensions = true;
        form.maxFieldsSize = 10 * 1024 * 1024; // 10MB

        form.on("fileBegin", (name, file) => {
          file.path = path.join(
            __dirname,
            "../public/assets/images/blog",
            file.name
          );
        });

  const formData = await new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      customLog("Form data parsing underway...", 'info');
      if (error) {
        customLog(`Cannot upload images. Error is ${error}`, 'error');
        reject(error);
        return;
      } 

        const mainImage = {
          name: files["main_image"]["name"],
          size: files["main_image"]["size"],
          path: fields["main_image_url"],
          type: files["main_image"]["type"]
        };

        fields["main_image"] = mainImage;

        customLog("Uploaded images successfully", 'success');
        resolve(fields);
      })
  })
  
  await submitNewImage(formData.main_image);

  // Delete the main image from the local filesystem
  try {
    const imageLocalFilepath = __dirname + "/../public/assets/images/blog/" + formData["main_image"]["name"];
    fs.unlinkSync(imageLocalFilepath);
    customLog(`Successfully deleted ${imageLocalFilepath} from the local filesystem`, 'success');
  }
  catch (e) {
    customLog(`There was a problem deleting the image from the local filesystem: ${e}`, 'error');
  }

  res.writeHead(302, { Location: "/blog/image-manager" });
  res.end();
};

const createAccountSubmitHandler = async (req, res) => {
  try {
  let form = new formidable.IncomingForm();

  let filename;

  // Formidable module configs (TODO: move these to a config file)
  form.uploadDir = __dirname + "/../public/assets/images/users";
  form.keepExtensions = true;
  form.maxFieldsSize = 10 * 1024 * 1024; // 10MB

  form.on("fileBegin", (name, file) => {
    filename = file.name;
    file.path = path.join(
      __dirname,
      "../public/assets/images/users",
      file.name
    );
  });

  const formData = await new Promise((resolve, reject) => {
    form.parse(req, async (error, fields, files) => {
      if (error) {
        throw new Error(`Cannot upload images. Error is ${error}`);
      } 
      const userImage = {
        name: files["userImage"]["name"],
        size: files["userImage"]["size"],
        path: fields["userUrl"],
        type: files["userImage"]["type"]
      };
      fields["userImage"] = userImage;
  
      customLog("Avatar upload complete!", 'success');
      resolve(fields);
    });
  })

    const isValidUser = await validateNewUser(formData);
    if (!isValidUser) {
      // TODO: Figure out the best page to redirect the user to (probably back to the register page)
      res.writeHead(302, { Location: "/blog/register-failure.html" });
      return res.end();
    }

    const usernameIsTaken = await getUser(formData.username.toLowerCase());
    if (usernameIsTaken) {
      // TODO: Figure out the best page to redirect the user to (probably back to the register page)
      res.writeHead(302, { Location: "/blog/register-failure.html" });
      return res.end();
    }

    // Hash the password before adding the user to the database
    const hash = await hashPassword(formData["password"]);
    formData["password"] = hash;

    await submitNewUser(formData);

    const emailToken = generateEmailVerificationToken();
    await sendEmail(formData, emailToken);

    const verificationTokenData = {
      token: emailToken,
      username: formData.username,
      timestamp: Date.now()
    }
    await submitEmailVerificationToken(verificationTokenData);

    // Delete the user image from the local filesystem
    try {
      const localImageFilepath = __dirname + "/../public/assets/images/users/" + filename;
      fs.unlinkSync(localImageFilepath);
      customLog(`Successfully deleted ${localImageFilepath} from the local filesystem`, 'success');

      res.writeHead(302, { Location: "/blog/validate-account.html" });
      return res.end();
    }
    catch (e) {
      customLog(`There was a problem deleting ${localImageFilepath} from the local filesystem: ${err}`, 'error');
    }
} 
catch (e) {
  customLog(`Error in createAccountSubmitHandler: ${e}`, 'error');
}
};

const confirmEmailHandler = async (req, endpoint, res) => {
  try {
  let token = endpoint.split("?evt=")[1].split("&username")[0];
  let username = endpoint.split("&username=")[1];

  const emailVerificationToken = await getEmailVerificationToken(token);
  const tokenAge = Date.now() - emailVerificationToken.created_at;
  await deleteEmailVerificationToken(token);
      if (tokenAge < 43200000) {
        await updateVerifiedUser(username);
        res.writeHead(302, {
          // "Set-Cookie": `evt=${evt}; max-age=9000; path=/; HttpOnly`,
          Location: "/blog/login.html"
        });
        return res.end();
      } else {
        res.writeHead(302, {
          Location: "/blog/login.html"
        });
        return res.end();
      }
    } catch (e) {
        customLog(`Error in confirmEmailHandler: ${e}`, 'error');
      }
};

const awsSignatureHandler = (req, endpoint, res) => {
  generateAWSSignature
    .generateAWSSignature(endpoint, res)
    .catch(error => console.log(error));
};

const loginSubmitHandler = async (req, res) => {
  try {
  let allTheData = "";
  req.on("data", chunk => {
    allTheData += chunk;
  });

  req.on("end", async () => {
    const loginData = querystring.parse(allTheData);

    const user = await getUser(loginData.username)

    if (!user.is_verified) {
      res.writeHead(302, { Location: "/blog/validate-account.html" });
      return res.end();
    }

    const validPassword = await comparePassword(loginData.password, user.password)

    if (!validPassword) {
      res.writeHead(302, { Location: "/blog/login-failure.html" });
      return res.end();
    }

    const jwt = await generateJSONWebToken({
        user_id: user.pk_user_id,
        username: user.username,
        logged_in: true,
        role: user.role
      })

    res.writeHead(302, {
      "Set-Cookie": `jwt=${jwt}; max-age=9000; path=/; domain=; HttpOnly`,
      Location: "/blog/blog.html"
    });

    return res.end();
  });
} catch (e) {
  customLog(`Error in loginSubmitHandler: ${e}`, 'error');
}
};

const logoutHandler = (req, res) => {
  const pageName = req.headers.referer.split("/")[4];
  const cookieReset = cookie.serialize('jwt', "", {
    maxAge: 0,
    path: "/"
  });
  res.writeHead(302, {
    "Set-Cookie": cookieReset,
    Location: `/blog/${pageName}`
  });
  return res.end();
};

const commentSubmitHandler = async (req, res, encodedJwt) => {
  try {
    const decodedToken = await decodeJSONWebToken(encodedJwt);
    if (decodedToken === undefined) {
      res.writeHead(302, { Location: "/blog/publish-failure.html" });
      res.end();
    }

  let allTheData = "";

  req.on("data", chunk => {
    allTheData += chunk;
  });

  req.on("end", async () => {
  const comment = querystring.parse(allTheData);
  const postName = req.headers.referer.split("/")[4];
  const post = await getPost(postName);
  const user = await getUsername(decodedToken.user_id);

  const commentData = {
    comment: comment.comment,
    postId: post.pk_post_id,
    userId: decodedToken.user_id,
    timestamp: Date.now(),
    date: Date(Date.now()),
    username: user.username,
    avatarName: user.avatar_name,
    avatarFilepath: user.avatar_filepath
  }

  await submitNewComment(commentData);

  res.writeHead(302, { Location: `/posts/${postName}` });
  return res.end();
  })
} catch (e) {
      customLog(`Error in commentSubmitHandler: ${e}`, 'error');
    }
};

module.exports = {
  homeHandler,
  allPostsHandler,
  specificPostHandler,
  postsJSONHandler,
  recentPostsHandler,
  mainImagesHandler,
  createAccountPageHandler,
  newPostHandler,
  imageManagerPageHandler,
  domScriptsHandler,
  publicHandler,
  loginPageHandler,
  checkLoginStatusHandler,
  getProjectsHandler,
  getCommentsHandler,
  getAuthorHandler,
  getTagsHandler,
  contactFormHandler,
  createPostHandler,
  uploadImageHandler,
  createAccountSubmitHandler,
  confirmEmailHandler,
  awsSignatureHandler,
  loginSubmitHandler,
  logoutHandler,
  commentSubmitHandler
};
