const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  verifyToken,
} = require("../controllers/authController");
const { authorizeUser } = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/logout", authorizeUser, logout);
router.get("/profile", authorizeUser, getProfile);
router.put("/profile", authorizeUser, updateProfile);
router.get("/verify", authorizeUser, verifyToken);

module.exports = router;
