const express = require("express");
const router = express.Router();
const {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");
const { authorizeAdmin } = require("../middleware/authMiddleware");

// Public routes
router.get("/", getCategories);
router.get("/slug/:slug", getCategoryBySlug);
router.get("/:id", getCategoryById);

// Admin-protected routes
router.post("/", authorizeAdmin, createCategory);
router.put("/:id", authorizeAdmin, updateCategory);
router.delete("/:id", authorizeAdmin, deleteCategory);

module.exports = router;
