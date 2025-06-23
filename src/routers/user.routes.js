const express = require("express");
const { passport, authenticateJWT } = require("../passport");

const { login } = require("../controllers");

const { loginRateLimiter } = require("../middlewares/RateLimit");

const router = express.Router();

router.post("/login", loginRateLimiter, login);

router.get("/test1", (req, res) => {
  res.send("Test Bang");
}); // debugging

router.get("/test2", authenticateJWT, (req, res) => {
  res.send("Test Bang");
}); // debugging

module.exports = router;
