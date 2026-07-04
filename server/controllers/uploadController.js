const { cloudinary, uploadSingle, uploadMultiple } = require("../middleware/uploadMiddleware");

// @desc    Upload single image
// @route   POST /api/upload/single
// @access  Admin
const uploadSingleImage = (req, res) => {
  uploadSingle(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }
    res.json({
      success: true,
      message: "Image uploaded successfully",
      data: {
        url: req.file.path,
        publicId: req.file.filename,
        originalName: req.file.originalname,
      },
    });
  });
};

// @desc    Upload multiple images (max 5)
// @route   POST /api/upload/multiple
// @access  Admin
const uploadMultipleImages = (req, res) => {
  uploadMultiple(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No image files provided" });
    }
    const images = req.files.map((file) => ({
      url: file.path,
      publicId: file.filename,
      originalName: file.originalname,
    }));
    res.json({
      success: true,
      message: `${images.length} image(s) uploaded successfully`,
      data: images,
    });
  });
};

// @desc    Delete image from Cloudinary
// @route   DELETE /api/upload/:publicId
// @access  Admin
const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.params;
    // Decode the publicId since it may contain slashes (e.g. fashionstore/abc123)
    const decodedId = decodeURIComponent(publicId);
    const result = await cloudinary.uploader.destroy(decodedId);

    if (result.result !== "ok") {
      return res.status(400).json({ success: false, message: "Failed to delete image" });
    }
    res.json({ success: true, message: "Image deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { uploadSingleImage, uploadMultipleImages, deleteImage };
