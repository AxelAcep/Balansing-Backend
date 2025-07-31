const express = require("express");
const { passport } = require("../passport");
const { authenticateJWT } = require("../passport");

const { getKader, editKader, changePassword  } = require("../controllers");
const router = express.Router();


router.get("/profile/:email", authenticateJWT ,getKader); // Endpoint to get kader by email\
router.put("/profile/edit", authenticateJWT, editKader );
router.put("/password", authenticateJWT, changePassword);

router.get("/test1", (req, res) => {
  res.send("Test");
}); // debugging

module.exports = router;
