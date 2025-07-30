const userControllers = require("./user.controller");
const kaderControllers = require("./kader.controller");

module.exports = {
  ...userControllers,
  ...kaderControllers,
};
