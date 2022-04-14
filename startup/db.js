const mongoose = require("mongoose");
const config = require("config");
const winston = require("winston");

const mongoDbUrl = config.get("mongoDb");
module.exports = function () {
  mongoose.connect(mongoDbUrl).then(() => winston.info("connected to mongoDb"));
};
