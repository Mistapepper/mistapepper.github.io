const { Pool } = require("pg");

const pgPromise = require('pg-promise')();

const url = require("url");

require("env2")("./config.env");

let DB_URL = process.env.PROD_DB_URL;

if (process.env.NODE_ENV === "local") {
  DB_URL = process.env.LOCAL_DB_URL;
}

if (process.env.NODE_ENV === "test") {
  DB_URL = process.env.TEST_DB_URL;
}

if (!DB_URL) {
  throw new Error("Environment variable 'DB_URL' must be set");
}

const params = url.parse(DB_URL);
// console.log("this is params---------> ", params);
const [username, password] = params.auth.split(":");

const options = {
  host: params.hostname,
  port: params.port,
  database: params.pathname.split("/")[1],
  max: process.env.DB_MAX_CONNECTIONS || 5,
  user: username,
  password: password
};

options.ssl = options.host !== "localhost";

module.exports = {
  dbConnection: pgPromise(options),
  options
};
