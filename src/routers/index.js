const express = require("express");

const userRoutes = require("./user.routes");
const kaderRoutes = require("./kader.routes");

const router = express.Router();

router.use("/user", userRoutes);
router.use("/kader", kaderRoutes);

module.exports = router;