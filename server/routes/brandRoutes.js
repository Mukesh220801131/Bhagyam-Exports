const express = require("express");
const router = express.Router();
const {
  getBrands,
  getBrandById,
  getBrandBySlug,
  createBrand,
  updateBrand,
  deleteBrand,
} = require("../controllers/brandController");
const { authorizeAdmin } = require("../middleware/authMiddleware");

// Public routes
router.get("/", getBrands);
router.get("/slug/:slug", getBrandBySlug);
router.get("/:id", getBrandById);

// Admin-protected routes
router.post("/", authorizeAdmin, createBrand);
router.put("/:id", authorizeAdmin, updateBrand);
router.delete("/:id", authorizeAdmin, deleteBrand);

module.exports = router;
