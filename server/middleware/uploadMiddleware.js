const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");

// Configure Cloudinary v2
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Custom Cloudinary Storage Engine for Multer ────────────────────────────
// multer-storage-cloudinary only supports cloudinary v1.
// We write our own engine that uses cloudinary v2 upload_stream directly.
const cloudinaryStorage = {
  _handleFile(req, file, cb) {
    // Pipe the incoming file buffer into Cloudinary via upload_stream
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "fashionstore",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
        transformation: [
          { width: 800, height: 800, crop: "limit", quality: "auto" },
        ],
      },
      (error, result) => {
        if (error) return cb(error);
        // Expose Cloudinary result fields as multer file properties
        cb(null, {
          path: result.secure_url,       // Full HTTPS URL
          filename: result.public_id,    // e.g. fashionstore/abc123
          size: result.bytes,
        });
      }
    );

    // Convert the multer file stream into the Cloudinary upload stream
    const readableStream = new Readable();
    readableStream.push(null); // end immediately; actual piping below
    file.stream.pipe(uploadStream);
  },

  _removeFile(req, file, cb) {
    // Called by multer when an error occurs mid-upload
    if (file.filename) {
      cloudinary.uploader.destroy(file.filename, cb);
    } else {
      cb(null);
    }
  },
};

// ─── File Filter ─────────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed"), false);
  }
};

// ─── Multer Instances ─────────────────────────────────────────────────────────
// Single image upload (5 MB limit)
const uploadSingle = multer({
  storage: cloudinaryStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("image");

// Multiple images upload — max 5 files, 5 MB each
const uploadMultiple = multer({
  storage: cloudinaryStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).array("images", 5);

module.exports = { cloudinary, uploadSingle, uploadMultiple };
