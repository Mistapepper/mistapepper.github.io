const getAllMainImages = require("./getAllMainImages");
const getAllPosts = require("./getAllPosts");
const getAllThumbnails = require("./getAllThumbnails");
const getComments = require("./getComments");
const getPost = require("./getPost");
const getTags = require("./getTags");
const getUser = require("./getUser");
const getUsername = require("./getUsername");
const deleteEmailVerificationToken = require("./deleteEmailVerificationToken");
const getEmailVerificationToken = require("./getEmailVerificationToken");
const submitEmailVerificationToken = require("./submitEmailVerificationToken");
const submitNewComment = require("./submitNewComment");
const submitNewImage = require("./submitNewImage");
const submitNewPost = require("./submitNewPost");
const submitNewThumbnail = require("./submitNewThumbnail");
const submitNewUser = require("./submitNewUser");
const updateVerifiedUser = require("./updateVerifiedUser");

module.exports = {
    getAllMainImages,
    getAllPosts,
    getAllThumbnails,
    getComments,
    getPost,
    getTags,
    getUser,
    getUsername,
    deleteEmailVerificationToken,
    getEmailVerificationToken,
    submitEmailVerificationToken,
    submitNewComment,
    submitNewImage,
    submitNewPost,
    submitNewThumbnail,
    submitNewUser,
    updateVerifiedUser
}