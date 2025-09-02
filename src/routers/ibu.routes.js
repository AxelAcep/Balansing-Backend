const express = require("express");
const { passport, authenticateJWT } = require("../passport");

const { getIbu, getDashboardAnak, editIbu, addAnak, getAllAnak, getAnakIbubyId, editAnakIbu, deleteAnakbyId, addRecapAnak, getRecapAnakbyId, getRecapAnakMonthly, getAllRecapAnak  } = require("../controllers");

const { loginRateLimiter } = require("../middlewares/RateLimit");

const router = express.Router();

router.get("/profile/:email", authenticateJWT, getIbu);
router.put("/profile", authenticateJWT, editIbu);

router.post("/anak", authenticateJWT, addAnak);
router.put("/anak", authenticateJWT, editAnakIbu);
router.get("/anakDetail/:id", authenticateJWT, getAnakIbubyId);
router.get("/anak/:email", authenticateJWT, getAllAnak);
router.delete("/anak/:id", authenticateJWT, deleteAnakbyId);

router.post("/recap", authenticateJWT, addRecapAnak);

router.get("/recap/:id", authenticateJWT, getRecapAnakbyId);
router.post("/recapMonthly", authenticateJWT, getRecapAnakMonthly); // new route for monthly recap
router.get("/allRecapAnak/:idAnak", authenticateJWT, getAllRecapAnak)
router.get("/dashboard/:id", authenticateJWT, getDashboardAnak);


router.get("/test1", (req, res) => {
  res.send("Test");
}); // debugging

router.get("/test2", (req, res) => {
  res.send("Test Auth");
}); // debugging

module.exports = router;
