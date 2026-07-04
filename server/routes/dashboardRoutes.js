const express = require("express");
const router = express.Router();
const { getDashboardStats } = require("../controllers/dashboardController");
const { authorizeAdmin } = require("../middleware/authMiddleware");

router.get("/stats", authorizeAdmin, getDashboardStats);

module.exports = router;
