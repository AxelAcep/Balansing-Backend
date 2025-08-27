const express = require("express");
const { passport, authenticateJWT } = require("../passport");

const { getIbu, editIbu, addAnak, getAllAnak, getAnakIbubyId, editAnak, deleteAnakbyId  } = require("../controllers");

const { loginRateLimiter } = require("../middlewares/RateLimit");

const router = express.Router();

router.get("/profile/:email", authenticateJWT, getIbu);
router.put("/profile", authenticateJWT, editIbu);

router.post("/anak", authenticateJWT, addAnak);
router.put("/anak", authenticateJWT, editAnak);
router.get("/anakDetail/:id", authenticateJWT, getAnakIbubyId);
router.get("/anak/:email", authenticateJWT, getAllAnak);
router.delete("/anak/:id", authenticateJWT, deleteAnakbyId);


router.get("/test1", (req, res) => {
  res.send("Test");
}); // debugging

router.get("/test2", (req, res) => {
  res.send("Test Auth");
}); // debugging

module.exports = router;
