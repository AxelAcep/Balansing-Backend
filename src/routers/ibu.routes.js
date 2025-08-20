const express = require("express");
const { passport, authenticateJWT } = require("../passport");

const { getIbu, editIbu } = require("../controllers");

const { loginRateLimiter } = require("../middlewares/RateLimit");

const router = express.Router();

router.get("/profile/:email", authenticateJWT, getIbu);
router.put("/profile", authenticateJWT, editIbu);


router.get("/test1", (req, res) => {
  res.send("Test");
}); // debugging

router.get("/test2", (req, res) => {
  res.send("Test Auth");
}); // debugging

module.exports = router;
