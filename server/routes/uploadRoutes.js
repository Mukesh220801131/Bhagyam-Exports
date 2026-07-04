const express = require("express");
const router = express.Router();
const {
  uploadSingleImage,
  uploadMultipleImages,
  deleteImage,
} = require("../controllers/uploadController");
const { authorizeAdmin } = require("../middleware/authMiddleware");

router.post("/single", authorizeAdmin, uploadSingleImage);
router.post("/multiple", authorizeAdmin, uploadMultipleImages);
router.delete("/:publicId", authorizeAdmin, deleteImage);

module.exports = router;
