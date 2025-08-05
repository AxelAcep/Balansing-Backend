const express = require("express");
const { passport } = require("../passport");
const { authenticateJWT } = require("../passport");

const { getKader, editKader, changePassword, unggahAnak, getRecap  } = require("../controllers");
const router = express.Router();


router.get("/profile/:email", authenticateJWT ,getKader); // Endpoint to get kader by email\
router.get("/recap/:email", authenticateJWT, getRecap);

router.put("/profile/edit", authenticateJWT, editKader );
router.put("/password", authenticateJWT, changePassword);

router.post("/anak", authenticateJWT, unggahAnak)

router.get("/test1", (req, res) => {
  res.send("Test");
}); // debugging

module.exports = router;
