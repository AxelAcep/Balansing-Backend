const userControllers = require("./user.controller");
const kaderControllers = require("./kader.controller");
const ibuControllers = require("./ibu.controller");

module.exports = {
  ...userControllers,
  ...kaderControllers,
  ...ibuControllers,
};
