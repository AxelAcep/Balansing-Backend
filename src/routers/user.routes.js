const express = require("express");
const { passport } = require("../passport");

const { login, registerKader, logout } = require("../controllers");

const { loginRateLimiter } = require("../middlewares/RateLimit");

const router = express.Router();

router.post("/registerKader", registerKader);
router.post("/login", loginRateLimiter, login);
router.post("/logout", logout);

router.get("/test1", (req, res) => {
  res.send("Test");
}); // debugging

router.get("/test2", (req, res) => {
  res.send("Test Auth");
}); // debugging

module.exports = router;
