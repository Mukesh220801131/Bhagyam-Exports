const Product = require("../models/Product");

const fallbackFashionImages = [
  "https://images.unsplash.com/photo-1483985988351-763728e1935b?w=900&q=80",
  "https://images.unsplash.com/photo-1445205170230-053b83016050?w=900&q=80",
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900&q=80",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=900&q=80",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80",
  "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&q=80",
];

const toSlug = (value) =>
  value
    ?.toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "") || "";

const csvLikeArray = (value) => {
  if (Array.isArray(value)) return value.map((item) => item?.toString().trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value;
};

const imageForProduct = (product) => {
  const seed = (product.name || product._id?.toString() || "fashion").length;
  return fallbackFashionImages[seed % fallbackFashionImages.length];
};

const withFallbackProduct = (product) => {
  const data = typeof product.toObject === "function" ? product.toObject() : { ...product };
  const fallbackImage = imageForProduct(data);

  if (!data.images?.length) {
    data.images = [fallbackImage];
  }

  if (!data.thumbnail) {
    data.thumbnail = data.images[0] || fallbackImage;
  }

  return data;
};

const normalizeProductPayload = (payload = {}) => {
  const normalized = { ...payload };

  ["sizes", "colors", "tags", "highlights", "images"].forEach((key) => {
    if (normalized[key] !== undefined) normalized[key] = csvLikeArray(normalized[key]);
  });

  if (!normalized.slug && normalized.name) normalized.slug = toSlug(normalized.name);
  if (normalized.slug) normalized.slug = toSlug(normalized.slug);

  if (normalized.featured !== undefined) normalized.isFeatured = Boolean(normalized.featured);
  if (normalized.isFeatured !== undefined) normalized.featured = Boolean(normalized.isFeatured);

  if (normalized.status) {
    normalized.isActive = normalized.status === "active";
  } else if (normalized.isActive !== undefined) {
    normalized.status = normalized.isActive ? "active" : "hidden";
  }

  if (!normalized.thumbnail && normalized.images?.length > 0) {
    normalized.thumbnail = normalized.images[0];
  }

  // Auto-extract missing attributes for intelligent search
  const nameLower = (normalized.name || "").toLowerCase();
  const descLower = (normalized.description || "").toLowerCase();
  const catLower = (normalized.category || "").toLowerCase();
  const text = nameLower + " " + descLower;

  if (!normalized.gender) {
    if (nameLower.includes("women") || nameLower.includes("girls") || catLower === "women") {
      normalized.gender = "Women";
    } else if (nameLower.includes("men") || nameLower.includes("boys") || catLower === "men") {
      normalized.gender = "Men";
    } else if (nameLower.includes("kids") || nameLower.includes("child") || catLower === "kids") {
      normalized.gender = "Kids";
    } else {
      normalized.gender = "Unisex";
    }
  }

  if (!normalized.productType) {
    if (nameLower.includes("hoodie")) normalized.productType = "hoodie";
    else if (nameLower.includes("t-shirt") || nameLower.includes(" tee") || nameLower.includes("graphic tee")) normalized.productType = "t-shirt";
    else if (nameLower.includes("shirt")) normalized.productType = "shirt";
    else if (nameLower.includes("polo")) normalized.productType = "polo";
    else if (nameLower.includes("kurta") || nameLower.includes("kurti")) normalized.productType = "kurta";
    else if (nameLower.includes("jeans")) normalized.productType = "jeans";
    else if (nameLower.includes("trousers")) normalized.productType = "trousers";
    else if (nameLower.includes("jacket")) normalized.productType = "jacket";
    else if (nameLower.includes("shorts")) normalized.productType = "shorts";
    else if (nameLower.includes("dress")) normalized.productType = "dress";
    else if (nameLower.includes("sneakers") || nameLower.includes("shoes") || nameLower.includes("jutti") || nameLower.includes("mojari")) normalized.productType = "footwear";
  }

  if (!normalized.sleeveType) {
    if (text.includes("short sleeve")) normalized.sleeveType = "short sleeve";
    else if (text.includes("long sleeve")) normalized.sleeveType = "long sleeve";
    else if (text.includes("sleeveless")) normalized.sleeveType = "sleeveless";
    else if (text.includes("full sleeve")) normalized.sleeveType = "full sleeve";
    else if (text.includes("half sleeve")) normalized.sleeveType = "half sleeve";
  }

  if (!normalized.fit) {
    if (text.includes("oversized")) normalized.fit = "oversized";
    else if (text.includes("slim fit")) normalized.fit = "slim fit";
    else if (text.includes("regular fit")) normalized.fit = "regular fit";
    else if (text.includes("relaxed fit")) normalized.fit = "relaxed fit";
  }

  if (!normalized.material) {
    if (text.includes("cotton")) normalized.material = "cotton";
    else if (text.includes("linen")) normalized.material = "linen";
    else if (text.includes("rayon")) normalized.material = "rayon";
    else if (text.includes("polyester")) normalized.material = "polyester";
    else if (text.includes("denim")) normalized.material = "denim";
  }

  if (!normalized.color) {
    if (nameLower.includes("pink")) normalized.color = "pink";
    else if (nameLower.includes("blue")) normalized.color = "blue";
    else if (nameLower.includes("black")) normalized.color = "black";
    else if (nameLower.includes("white")) normalized.color = "white";
    else if (nameLower.includes("green")) normalized.color = "green";
    else if (nameLower.includes("beige")) normalized.color = "beige";
    else if (normalized.colors && normalized.colors.length > 0) {
      normalized.color = normalized.colors[0].toLowerCase();
    }
  }

  return normalized;
};

const buildAdminQuery = (queryParams) => {
  const { search, category, brand, status, minPrice, maxPrice } = queryParams;
  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
      { brand: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
    ];
  }

  if (category) query.category = { $regex: category, $options: "i" };
  if (brand) query.brand = { $regex: brand, $options: "i" };
  if (status && status !== "all") {
    query.status = status;
  }

  if (minPrice || maxPrice) {
    query.discountPrice = {};
    if (minPrice) query.discountPrice.$gte = Number(minPrice);
    if (maxPrice) query.discountPrice.$lte = Number(maxPrice);
  }

  return query;
};

// @desc    Get all products with filtering, sorting, pagination
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      sort = "newest",
      page = 1,
      limit = 12,
    } = req.query;

    const query = { isActive: true };

    // Search by text
    if (search) {
      const cleanSearch = search.trim().replace(/\s+/g, ' ');
      const words = cleanSearch.split(' ').map(w => w.toLowerCase());
      if (words.length > 0) {
        query.$and = words.map(word => {
          const escaped = word.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
          const regex = new RegExp(escaped, 'i');
          return {
            $or: [
              { name: regex },
              { category: regex },
              { brand: regex },
              { colors: regex },
              { material: regex },
              { fabric: regex },
              { tags: regex },
              { gender: regex },
              { description: regex },
              { shortDescription: regex },
              { productType: regex },
              { sleeveType: regex },
              { fit: regex },
              { color: regex }
            ]
          };
        });
      }
    }

    // Filter by category
    if (category) query.category = { $regex: category, $options: "i" };

    // Filter by brand
    if (brand) query.brand = { $regex: brand, $options: "i" };

    // Price range filter
    if (minPrice || maxPrice) {
      query.discountPrice = {};
      if (minPrice) query.discountPrice.$gte = Number(minPrice);
      if (maxPrice) query.discountPrice.$lte = Number(maxPrice);
    }

    // Sort options
    const sortOptions = {
      newest: { createdAt: -1 },
      "price-asc": { discountPrice: 1 },
      "price-desc": { discountPrice: -1 },
      popular: { rating: -1, reviews: -1 },
      featured: { isFeatured: -1, createdAt: -1 },
    };

    const useRelevanceRanking = search && (!sort || sort === "newest" || sort === "default");

    let total;
    let productsList;

    if (useRelevanceRanking) {
      const allMatches = await Product.find(query);
      const ranked = rankProducts(allMatches, search);
      total = ranked.length;
      const skip = (Number(page) - 1) * Number(limit);
      productsList = ranked.slice(skip, skip + Number(limit));
    } else {
      const sortOpt = sortOptions[sort] || sortOptions.newest;
      const skip = (Number(page) - 1) * Number(limit);
      total = await Product.countDocuments(query);
      productsList = await Product.find(query)
        .sort(sortOpt)
        .skip(skip)
        .limit(Number(limit));
    }

    res.json({
      success: true,
      count: productsList.length,
      total,
      pages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      data: productsList.map(withFallbackProduct),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all products for admin with inactive/restorable records
// @route   GET /api/products/admin/list
// @access  Admin
const getAdminProducts = async (req, res) => {
  try {
    const {
      sort = "newest",
      page = 1,
      limit = 12,
      sortField,
      sortDirection = "desc",
    } = req.query;

    const query = buildAdminQuery(req.query);
    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      "price-asc": { discountPrice: 1, price: 1 },
      "price-desc": { discountPrice: -1, price: -1 },
      "stock-asc": { stock: 1 },
      "stock-desc": { stock: -1 },
      name: { name: 1 },
    };

    const customSort = sortField
      ? { [sortField]: sortDirection === "asc" ? 1 : -1 }
      : sortOptions[sort] || sortOptions.newest;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(customSort)
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      count: products.length,
      total,
      pages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      data: products.map(withFallbackProduct),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, data: withFallbackProduct(product) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get products by category
// @route   GET /api/products/category/:category
// @access  Public
const getProductsByCategory = async (req, res) => {
  try {
    const products = await Product.find({
      category: { $regex: req.params.category, $options: "i" },
      isActive: true,
    });
    res.json({ success: true, count: products.length, data: products.map(withFallbackProduct) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get products by brand
// @route   GET /api/products/brand/:brand
// @access  Public
const getProductsByBrand = async (req, res) => {
  try {
    const products = await Product.find({
      brand: { $regex: req.params.brand, $options: "i" },
      isActive: true,
    });
    res.json({ success: true, count: products.length, data: products.map(withFallbackProduct) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const rankProducts = (productsList, originalSearchTerm) => {
  if (!originalSearchTerm) return productsList;
  const searchLower = originalSearchTerm.toLowerCase().trim().replace(/\s+/g, ' ');
  const words = searchLower.split(' ');

  return productsList.map(p => {
    const product = typeof p.toObject === 'function' ? p.toObject() : p;
    let score = 0;
    const nameLower = (product.name || "").toLowerCase();
    const categoryLower = (product.category || "").toLowerCase();
    const brandLower = (product.brand || "").toLowerCase();
    const descriptionLower = (product.description || "").toLowerCase();
    const shortDescLower = (product.shortDescription || "").toLowerCase();
    const materialLower = (product.material || "").toLowerCase();
    const fabricLower = (product.fabric || "").toLowerCase();
    const genderLower = (product.gender || "").toLowerCase();
    const colorsLower = (product.colors || []).map(c => c.toLowerCase());
    const tagsLower = (product.tags || []).map(t => t.toLowerCase());

    // New fields
    const productTypeLower = (product.productType || "").toLowerCase();
    const sleeveTypeLower = (product.sleeveType || "").toLowerCase();
    const fitLower = (product.fit || "").toLowerCase();
    const colorLower = (product.color || "").toLowerCase();

    // 1. Exact matches on full search term
    if (nameLower === searchLower) score += 2000;
    else if (nameLower.startsWith(searchLower)) score += 1000;
    else if (nameLower.includes(searchLower)) score += 500;

    if (categoryLower === searchLower) score += 800;
    if (brandLower === searchLower) score += 800;
    if (genderLower === searchLower) score += 800;
    if (productTypeLower === searchLower) score += 800;

    // 2. Word-by-word matches
    words.forEach(word => {
      // Exact matches on field values
      if (brandLower === word) score += 200;
      if (categoryLower === word) score += 200;
      if (genderLower === word || (word === "mens" && genderLower === "men") || (word === "womens" && genderLower === "women")) score += 250;
      if (colorsLower.includes(word) || colorLower === word) score += 200;
      if (tagsLower.includes(word)) score += 150;
      if (materialLower === word) score += 150;
      if (fabricLower === word) score += 100;
      if (productTypeLower === word) score += 200;
      if (sleeveTypeLower === word) score += 200;
      if (fitLower === word) score += 200;

      // Partial matches
      if (nameLower.includes(word)) score += 50;
      if (categoryLower.includes(word)) score += 20;
      if (brandLower.includes(word)) score += 20;
      if (descriptionLower.includes(word)) score += 10;
      if (shortDescLower.includes(word)) score += 10;
      if (materialLower.includes(word)) score += 10;
      if (fabricLower.includes(word)) score += 5;
      if (productTypeLower.includes(word)) score += 30;
      if (sleeveTypeLower.includes(word)) score += 30;
      if (fitLower.includes(word)) score += 30;
      if (colorLower.includes(word)) score += 20;
    });

    return { product: p, score };
  })
  .sort((a, b) => b.score - a.score)
  .map(item => item.product);
};

// @desc    Get live search suggestions and trending products
// @route   GET /api/products/search/suggestions
// @access  Public
const getSearchSuggestions = async (req, res) => {
  try {
    const term = req.query.q?.toString().trim() || "";
    const query = { isActive: true };
    if (term) {
      const words = term.replace(/\s+/g, ' ').split(' ').map(w => w.toLowerCase());
      if (words.length > 0) {
        query.$and = words.map(word => {
          const escaped = word.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
          const regex = new RegExp(escaped, 'i');
          return {
            $or: [
              { name: regex },
              { category: regex },
              { brand: regex },
              { colors: regex },
              { material: regex },
              { fabric: regex },
              { tags: regex },
              { gender: regex },
              { description: regex },
              { shortDescription: regex },
              { productType: regex },
              { sleeveType: regex },
              { fit: regex },
              { color: regex }
            ]
          };
        });
      }
    }

    const [matches, trendingProducts, popularSearches] = await Promise.all([
      Product.find(query)
        .select("name brand category discountPrice price rating reviews images thumbnail trending bestSeller")
        .limit(100),
      Product.find({ isActive: true, $or: [{ trending: true }, { bestSeller: true }] })
        .sort({ reviews: -1, rating: -1 })
        .limit(8)
        .select("name brand category discountPrice price rating reviews images thumbnail"),
      Product.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
    ]);

    let rankedMatches = matches;
    if (term) {
      rankedMatches = rankProducts(matches, term);
    }
    const finalMatches = rankedMatches.slice(0, 8);

    res.json({
      success: true,
      data: {
        suggestions: finalMatches.map((product) => ({
          id: product._id,
          label: product.name,
          brand: product.brand,
          category: product.category,
        })),
        products: finalMatches.map(withFallbackProduct),
        trendingProducts: trendingProducts.map(withFallbackProduct),
        popularSearches: popularSearches.map((item) => item._id).filter(Boolean),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new product (Admin)
// @route   POST /api/products
// @access  Admin
const createProduct = async (req, res) => {
  try {
    const product = await Product.create(normalizeProductPayload(req.body));
    res.status(201).json({ success: true, message: "Product created successfully", data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update product (Admin)
// @route   PUT /api/products/:id
// @access  Admin
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, normalizeProductPayload(req.body), {
      new: true,
      runValidators: true,
    });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, message: "Product updated successfully", data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete product (Admin)
// @route   DELETE /api/products/:id
// @access  Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false, status: "hidden" },
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Restore hidden product (Admin)
// @route   PUT /api/products/:id/restore
// @access  Admin
const restoreProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: true, status: "active" },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, message: "Product restored successfully", data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Duplicate product as hidden draft (Admin)
// @route   POST /api/products/:id/duplicate
// @access  Admin
const duplicateProduct = async (req, res) => {
  try {
    const source = await Product.findById(req.params.id).lean();

    if (!source) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const now = Date.now();
    const duplicate = { ...source };
    delete duplicate._id;
    delete duplicate.createdAt;
    delete duplicate.updatedAt;
    delete duplicate.__v;

    duplicate.name = `${source.name} Copy`;
    duplicate.slug = `${toSlug(source.slug || source.name)}-copy-${now.toString().slice(-5)}`;
    duplicate.sku = `${source.sku || "FS-SKU"}-COPY-${now.toString().slice(-5)}`;
    duplicate.isActive = false;
    duplicate.status = "hidden";
    duplicate.featured = false;
    duplicate.isFeatured = false;

    const product = await Product.create(duplicate);
    res.status(201).json({ success: true, message: "Product duplicated successfully", data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Bulk update products (Admin)
// @route   PATCH /api/products/bulk
// @access  Admin
const bulkUpdateProducts = async (req, res) => {
  try {
    const { ids = [], operation, updates = {} } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "Select at least one product" });
    }

    let payload = normalizeProductPayload(updates);

    if (operation === "soft-delete") payload = { isActive: false, status: "hidden" };
    if (operation === "restore") payload = { isActive: true, status: "active" };

    if (operation === "category-change") {
      if (!updates.category) {
        return res.status(400).json({ success: false, message: "Category is required" });
      }
      payload = { category: updates.category };
    }

    if (operation === "price-update") {
      payload = {};
      if (updates.price !== undefined && updates.price !== "") payload.price = Number(updates.price);
      if (updates.discountPrice !== undefined && updates.discountPrice !== "") {
        payload.discountPrice = Number(updates.discountPrice);
      }

      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ success: false, message: "Price or discount price is required" });
      }
    }

    const result = await Product.updateMany({ _id: { $in: ids } }, { $set: payload }, { runValidators: true });

    res.json({
      success: true,
      message: `${result.modifiedCount || 0} product(s) updated successfully`,
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
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
};
