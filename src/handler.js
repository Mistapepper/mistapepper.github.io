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

const { getAllMainImages, getAllPosts, getAllThumbnails, getComments, getPost, getTags, getUser, getUsername, deleteEmailVerificationToken, getEmailVerificationToken, submitEmailVerificationToken, submitNewComment, submitNewImage, submitNewPost, submitNewThumbnail, submitNewUser, updateVerifiedUser } = require("./queries/index");

const validateNewUser = require("./authentication/validateNewUser.js");
const { hashPassword, comparePassword } = require("./authentication/hash.js");
const generateJSONWebToken = require("./authentication/generateJWT.js");
const decodeJSONWebToken = require("./authentication/decodeJWT.js");
const sendEmail = require("./authentication/sendEmail.js");
const generateEmailVerificationToken = require("./authentication/generateEmailVerificationToken.js");
const { generateAWSSignature, getAwsFile } = require("./authentication/generateAWSSignature.js");
const getSignedAwsRequest = require("./authentication/getSignedAwsRequest.js");
const getProjects = require("./airtable/getProjects.js");

const customLog = require("./utils/customLog");

//GET REQUEST HANDLERS

const homeHandler = (req, res) => {
  res.render("home.html", { stylesheet: "css/minified/home/home.min.css" });
};

const allPostsHandler = (req, res) => {
  res.render("all-posts.html", { stylesheet: "../css/minified/blog/blog.min.css" });
};

const specificPostHandler = async (req, res, endpoint) => {
  try {
  let filename = `${endpoint.split("/")[2].split(".html")[0]}` + ".html";
  const post = await getAwsFile(filename);
    // .then(response => {
  const postContents = response["Body"].toString();
      // fs.writeFile(
      //   __dirname + "/../public" + "/posts/" + filename,
      //   postContents,
      //   (err, file) => {
      //     if (err) console.log(err);
      //     console.log(
      //       "File has been written to the local filepath! Now reading..."
      //     );

      //     fs.readFile(
      //       __dirname + "/../public" + "/posts/" + filename,
      //       "utf8",
      //       (error, file) => {
      //         if (error) {
      //           console.log(error);
      //           return;
      //         }
      //         fs.unlink(
      //           __dirname + "/../public" + "/posts/" + filename,
      //           err => {
      //             if (err) {
      //               console.log(err);
      //               return;
      //             }
      //             console.log(
      //               "Blog post successfully deleted from local filesystem"
      //             );
      //             res.writeHead(200, { "Content-Type": "text/html" });
      //             res.end(file);
      //           }
      //         );
      //       }
      //     );
      //   }
      // );
      return res.render(postContents, { stylesheet: "../css/minified/blog/blog.min.css" });
}
catch (e) {
  customLog(`Error in specificPostHandler: ${e}`, 'error');
}
};

// For now this route isn't being used, but it'll be nice to use it as the basis for 
//a blog posts API (TODO)
const postsJSONHandler = (req, res) => {
  res.sendFile(path.join(__dirname, "posts.json"));
};

const recentPostsHandler = async (req, res) => {
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
    return res.json(posts);
  } catch (e) {
    customLog(`Error in recentPostsHandler: ${e}`, 'error');
  }
};

const mainImagesHandler = async (req, res) => {
  try {
    const images = await getAllMainImages();
    return res.json(images);
  } catch (e) {
    customLog(`Error in mainImagesHandler: ${e}`, 'error');
  }
};

const createAccountPageHandler = (req, res) => {
  return res.render("create-account.html", {stylesheet: "../css/minified/blog/blog.min.css"});
};

const newPostHandler = async (req, res) => {
  const jwt = cookie.parse(req.headers.cookie).jwt;
  if (jwt !== undefined) {
    const decodedToken = await decodeJSONWebToken(jwt);
        if (decodedToken.logged_in) {
          if (decodedToken.role === "admin") {
            return res.render("create-post.html", { stylesheet: "../css/minified/blog/blog.min.css" });
          } else {
            return res.render("authorisation-failure.html", { stylesheet: "../css/minified/blog/blog.min.css" });
          }
        }
  }
  return res.render("publish-failure.html", { stylesheet: "../css/minified/blog/blog.min.css" });
};

const imageManagerPageHandler = async (req, res) => {
  let jwt = cookie.parse(req.headers.cookie).jwt;
  if (jwt !== undefined) {
    const decodedToken = await decodeJSONWebToken(jwt);
        if (decodedToken.logged_in) {
          if (decodedToken.role === "admin") {
            return res.render("image-manager.html", { stylesheet: "../css/minified/blog/blog.min.css" });
          } else {
            return res.render("authorisation-failure.html", { stylesheet: "../css/minified/blog/blog.min.css" });
          }
        }
  }
  return res.render("publish-failure.html", { stylesheet: "../css/minified/blog/blog.min.css" });
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

/* Looks like this publicHandler isn't needed anymore, since Express serves static files
automatically */
// const publicHandler = (res, endpoint, extension) => {
//   let mimeType;
//   if (extension === "min") {
//     mimeType = "css";
//   } else {
//     mimeType = extension;
//   }
//   const extensionType = {
//     html: "text/html",
//     css: "text/css",
//     js: "text/javascript",
//     jpg: "image/jpeg",
//     jpeg: "image/jpeg",
//     png: "image/png",
//     ico: "image/x-icon",
//     svg: "image/svg+xml",
//     gif: "image/gif",
//     json: "application/json",
//     ttf: "application/octet-stream"
//   };

//   fs.readFile(__dirname + "/../public" + endpoint, function(error, file) {
//     if (error) {
//       console.log(
//         "Error: One of the requested files couldn't be found (probably the favicon :P)"
//       );
//       return;
//     }
//     res.writeHead(200, { "Content-Type": extensionType[mimeType] });
//     res.end(file);
//   });
// };

const loginPageHandler = (req, res) => {
  res.render("login.html", { stylesheet: "../css/minified/blog/blog.min.css" });
};

const checkLoginStatusHandler = async (req, res) => {
  try {
  if (!req.headers.cookie) {
    const user = {loginStatus: false};
    return res.json(user);
  }

  const jwt = cookie.parse(req.headers.cookie).jwt;
  if (!jwt) {
    const user = {loginStatus: false};
    return res.json(user);
  }

  const decodedToken = await decodeJSONWebToken(jwt);
  const user = {
    loginStatus: decodedToken.logged_in,
    id: decodedToken.user_id
  };

  if (user.loginStatus) {
    const userData = await getUsername(user.id)
          user.username = userData.username;
          user.avatar = userData.avatar_filepath;
          user.role = userData.role;
          return res.json(user);
  }
} catch (e) {
  customLog(`Error in checkLoginStatusHandler: ${e}`, 'error');
}
};

const getProjectsHandler = async (req, res) => {
    // .then(response => {
    //   res.end(JSON.stringify(response));
    // })
    // .catch(error => {
    //   console.log(error);
    // });
    const projects = JSON.stringify(await getProjects());
    res.send(projects);
};

// This implementation crashes the site if the referral URL isn't a blog post (SHOULD FIX)
// To fix it, rewrite the getComments query to only find the ones for the specific blog post
const getCommentsHandler = async (req, res) => {
  try {
    if (req.header('Referer') !== undefined) {
      const postName = req.headers.referer.split("/")[4];
      const comments = await getComments(postName);
      return res.json(comments);
    }
    return res.json({"comments": "There are no comments to display"});
  } catch (e) {
    customLog(`Error in getCommentsHandler: ${e}`, 'error');
  }
};

const getAuthorHandler = async (req, res) => {
  try {
    if (req.header('Referer') !== undefined) {
      const postName = req.headers.referer.split("/")[4];
      const postData = await getPost(postName);
      const user = await getUsername(postData.user_id)
      const authorData = {
        username: user.username,
        avatar: user.avatar_filepath,
        role: user.role
      };
      return res.json(authorData);
    }
    return res.json({"author": "There is no author to display"});
  } catch (e) {
    customLog(`Error in getAuthorHandler: ${e}`, 'error');
  }
};

const getTagsHandler = async (req, res) => {
  try {
    if (req.query !== undefined) {
      const tags = await getTags(req.query.q);
      return res.json(tags);
    }
    return res.json({"tags": "There are no tags to display"});
}
  catch (e) {
    customLog(`Error in getTagsHandler: ${e}`, 'error');
    res.end(JSON.stringify(""));
  }
};

//POST REQUEST HANDLERS

const contactFormHandler = async (req, res) => {
  try {
  const form = new formidable.IncomingForm();

  form.uploadDir = __dirname + "/../public/assets/images/blog";
  form.keepExtensions = true;
  form.maxFieldsSize = 10 * 1024 * 1024; // 10MB

  form.on("fileBegin", function(name, file) {
    file.path = path.join(__dirname, "../public/assets/images/blog", file.name);
  });

  const formData = await new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) {
        console.log(`Cannot upload images. Error is ${error}`);
        return error;
      } else {
        resolve(fields);
      }
    });
  });
  await sendEmail(formData);
  res.render("/", { stylesheet: "css/minified/home/home.min.css" });
}
catch (e) {
  customLog(`Error in contactFormHandler: ${e}`, 'error');
}
};

const createPostHandler = async (req, res) => {
  const jwt = cookie.parse(req.headers.cookie).jwt;
  const decodedToken = await decodeJSONWebToken(jwt)
  if (!decodedToken) {
    customLog("It was not possible to decode the JWT, suggesting that the user may not be logged in.", 'warning');
    // res.writeHead(302, { Location: "/blog/publish-failure.html" });
    // return res.end();
    return res.render("publish-failure.html", { stylesheet: "../css/minified/blog/blog.min.css" });
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

        const awsAuthData = await generateAWSSignature(`/sign-s3?file-name=${formData["filename"]}&file-type=text/html`);

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
        return res.render("blog.html", { stylesheet: "../css/minified/blog/blog.min.css" });
};

const uploadImageHandler = async (req, res) => {
  const jwt = cookie.parse(req.headers.cookie).jwt;
  const decodedToken = await decodeJSONWebToken(jwt)
  if (!decodedToken) {
    customLog("It was not possible to decode the JWT, suggesting that the user may not be logged in.", 'warning');
    return res.render("publish-failure.html", { stylesheet: "../css/minified/blog/blog.min.css" });
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
  return res.redirect("/blog/image-manager");
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
      return res.render("register-failure.html", {stylesheet: "../css/minified/blog/blog.min.css"});
    }

    const usernameIsTaken = await getUser(formData.username.toLowerCase());
    if (usernameIsTaken) {
      // TODO: Figure out the best page to redirect the user to (probably back to the register page)
      return res.render("register-failure.html", {stylesheet: "../css/minified/blog/blog.min.css"});
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
      return res.render("validate-account.html", {stylesheet: "../css/minified/blog/blog.min.css"});
    }
    catch (e) {
      customLog(`There was a problem deleting ${localImageFilepath} from the local filesystem: ${err}`, 'error');
    }
} 
catch (e) {
  customLog(`Error in createAccountSubmitHandler: ${e}`, 'error');
}
};

const confirmEmailHandler = async (req, res) => {
  try {
  let token = req.url.split("?evt=")[1].split("&username")[0];
  let username = req.url.split("&username=")[1];

  if (token && username) {
    const emailVerificationToken = await getEmailVerificationToken(token);
  const tokenAge = Date.now() - emailVerificationToken.created_at;
  await deleteEmailVerificationToken(token);
      if (tokenAge < 43200000) {
        await updateVerifiedUser(username);
        return res.render("login.html", { stylesheet: "../css/minified/blog/blog.min.css" });
      } else {
        return res.render("login.html", { stylesheet: "../css/minified/blog/blog.min.css" });
      }
  }
  return res.render("login.html", { stylesheet: "../css/minified/blog/blog.min.css" });
    } catch (e) {
        customLog(`Error in confirmEmailHandler: ${e}`, 'error');
      }
};

const awsSignatureHandler = async (req, res) => {
  try {
    return await generateAWSSignature(req.url, res);
  }
  catch (e) {
    customLog(`Error in awsSignatureHandler: ${e}`, 'error');
  }
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
      return res.render("validate-account.html", {stylesheet: "../css/minified/blog/blog.min.css"});
    }

    const validPassword = await comparePassword(loginData.password, user.password)

    if (!validPassword) {
      return res.render("login-failure.html", {stylesheet: "../css/minified/blog/blog.min.css"});
    }

    const jwt = await generateJSONWebToken({
        user_id: user.pk_user_id,
        username: user.username,
        logged_in: true,
        role: user.role
      })

    // res.writeHead(302, {
    //   "Set-Cookie": `jwt=${jwt}; max-age=9000; path=/; domain=; HttpOnly`,
    //   Location: "/blog/blog.html"
    // });
    // return res.end();

    res.set({
      'Set-Cookie': `jwt=${jwt}; max-age=9000; path=/; domain=; HttpOnly`,
      'Location': "/blog/blog.html"
    }).redirect("/blog/blog.html");
  });
} catch (e) {
  customLog(`Error in loginSubmitHandler: ${e}`, 'error');
}
};

const logoutHandler = (req, res) => {
  if (req.header('Referer') !== undefined) {
    const pageName = req.headers.referer.split("/")[4];
    const cookieReset = cookie.serialize('jwt', "", {
    maxAge: 0,
    path: "/"
  });
  return res.redirect(`/blog/${pageName}`);
  }
  // res.writeHead(302, {
  //   "Set-Cookie": cookieReset,
  //   Location: `/blog/${pageName}`
  // });
  // return res.send();
};

const commentSubmitHandler = async (req, res) => {
  try {
    const jwt = cookie.parse(req.headers.cookie).jwt;

    const decodedToken = await decodeJSONWebToken(jwt);
    if (decodedToken === undefined) {
      return res.render("publish-failure.html", { stylesheet: "../css/minified/blog/blog.min.css" });
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

  // res.writeHead(302, { Location: `/posts/${postName}` });
  // return res.end();
  
  return res.redirect(`/posts/${postName}`);
  });
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
  // publicHandler,
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
