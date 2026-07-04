const mongoose = require("mongoose");

const toSlug = (value) =>
  value
    ?.toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "") || "";

const sizeChartSchema = new mongoose.Schema(
  {
    size: { type: String, trim: true },
    chest: { type: String, trim: true, default: "" },
    shoulder: { type: String, trim: true, default: "" },
    length: { type: String, trim: true, default: "" },
    sleeveLength: { type: String, trim: true, default: "" },
    fit: { type: String, trim: true, default: "" },
    recommendedWeight: { type: String, trim: true, default: "" },
    recommendedHeight: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters"],
      maxlength: [200, "Name cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
    },
    shortDescription: {
      type: String,
      trim: true,
      default: "",
      maxlength: [300, "Short description cannot exceed 300 characters"],
    },
    brand: {
      type: String,
      required: [true, "Brand is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    gender: {
      type: String,
      enum: ["Men", "Women", "Kids", "Unisex", "Other", ""],
      default: "",
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    discountPrice: {
      type: Number,
      default: 0,
      min: [0, "Discount price cannot be negative"],
    },
    images: {
      type: [String],
      default: [],
    },
    thumbnail: {
      type: String,
      default: "",
    },
    sizes: {
      type: [String],
      default: [],
    },
    sizeChart: {
      type: [sizeChartSchema],
      default: [],
    },
    colors: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    stock: {
      type: Number,
      required: [true, "Stock is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    weight: {
      type: String,
      trim: true,
      default: "",
    },
    material: {
      type: String,
      trim: true,
      default: "",
    },
    fabric: {
      type: String,
      trim: true,
      default: "",
    },
    fabricQuality: {
      type: String,
      trim: true,
      default: "",
    },
    washCare: {
      type: String,
      trim: true,
      default: "",
    },
    shippingInfo: {
      type: String,
      trim: true,
      default: "Ships in 2-5 business days.",
    },
    returnPolicy: {
      type: String,
      trim: true,
      default: "Easy 7-day returns on eligible products.",
    },
    warranty: {
      type: String,
      trim: true,
      default: "Manufacturing defects covered as per brand policy.",
    },
    countryOfOrigin: {
      type: String,
      trim: true,
      default: "India",
    },
    highlights: {
      type: [String],
      default: [],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviews: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    trending: {
      type: Boolean,
      default: false,
    },
    newArrival: {
      type: Boolean,
      default: false,
    },
    bestSeller: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "hidden", "archived"],
      default: "active",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    productType: {
      type: String,
      trim: true,
      default: "",
    },
    sleeveType: {
      type: String,
      trim: true,
      default: "",
    },
    fit: {
      type: String,
      trim: true,
      default: "",
    },
    color: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

// Text index for search
productSchema.index({ name: "text", description: "text", brand: "text", category: "text" });

productSchema.pre("validate", function (next) {
  if (!this.slug && this.name) {
    this.slug = toSlug(this.name);
  } else if (this.isModified("slug")) {
    this.slug = toSlug(this.slug);
  }

  if (!this.sku && this.name) {
    const suffix = this._id?.toString()?.slice(-6)?.toUpperCase() || Date.now().toString().slice(-6);
    this.sku = `FS-${toSlug(this.name).slice(0, 10).replace(/-/g, "").toUpperCase()}-${suffix}`;
  }

  if (this.isModified("featured")) {
    this.isFeatured = this.featured;
  } else if (this.isModified("isFeatured")) {
    this.featured = this.isFeatured;
  }

  if (this.isModified("status")) {
    this.isActive = this.status === "active";
  } else if (this.isModified("isActive")) {
    this.status = this.isActive ? "active" : "hidden";
  }

  if (!this.thumbnail && this.images?.length > 0) {
    this.thumbnail = this.images[0];
  }

  next();
});

module.exports = mongoose.model("Product", productSchema);
