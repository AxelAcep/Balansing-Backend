const express = require("express");
const { passport } = require("../passport");
const { authenticateJWT } = require("../passport");

const { getKader, editKader, changePassword, unggahAnak, getRecap, getRecapById, editAnak, deleteAnak, getAnakKaderByMonth  } = require("../controllers");
const router = express.Router();


router.get("/profile/:email", authenticateJWT ,getKader); // Endpoint to get kader by email\
router.get("/recap/:email", authenticateJWT, getRecap);
router.get("/detailRecap/:id", authenticateJWT, getRecapById); // Endpoint to get recap for all kaders
router.post("/filterAnak", authenticateJWT, getAnakKaderByMonth); // Endpoint to get anak kader by month

router.put("/profile/edit", authenticateJWT, editKader );
router.put("/password", authenticateJWT, changePassword);
router.put("/anak", authenticateJWT, editAnak); // Endpoint to edit anak kader

router.post("/anak", authenticateJWT, unggahAnak)
router.delete("/anak/:id", authenticateJWT, deleteAnak); // Endpoint to delete anak kader

router.get("/test1", (req, res) => {
  res.send("Test");
}); // debugging

module.exports = router;
