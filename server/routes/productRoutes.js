const express = require("express");
const router = express.Router();
const {
  getProducts,
  getAdminProducts,
  getProductById,
  getProductsByCategory,
  getProductsByBrand,
  getSearchSuggestions,
  createProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
  duplicateProduct,
  bulkUpdateProducts,
} = require("../controllers/productController");
const { authorizeAdmin } = require("../middleware/authMiddleware");

// Public routes
router.get("/", getProducts);
router.get("/admin/list", authorizeAdmin, getAdminProducts);
router.get("/search/suggestions", getSearchSuggestions);
router.get("/category/:category", getProductsByCategory);
router.get("/brand/:brand", getProductsByBrand);
router.get("/:id", getProductById);

// Admin-protected routes
router.post("/", authorizeAdmin, createProduct);
router.patch("/bulk", authorizeAdmin, bulkUpdateProducts);
router.post("/:id/duplicate", authorizeAdmin, duplicateProduct);
router.put("/:id/restore", authorizeAdmin, restoreProduct);
router.put("/:id", authorizeAdmin, updateProduct);
router.delete("/:id", authorizeAdmin, deleteProduct);

module.exports = router;
