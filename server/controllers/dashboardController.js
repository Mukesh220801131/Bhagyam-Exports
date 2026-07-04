const Product = require("../models/Product");
const Category = require("../models/Category");
const Brand = require("../models/Brand");
const User = require("../models/User");
const Order = require("../models/Order");

// @desc    Get admin dashboard stats
// @route   GET /api/dashboard/stats
// @access  Admin
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalProducts,
      totalCategories,
      totalBrands,
      totalUsers,
      totalOrders,
      pendingOrders,
      outOfStock,
      featuredProducts,
      deliveredOrders,
      cancelledOrders,
    ] =
      await Promise.all([
        Product.countDocuments({ isActive: true }),
        Category.countDocuments({ isActive: true }),
        Brand.countDocuments({ isActive: true }),
        User.countDocuments({ role: "user", isActive: true }),
        Order.countDocuments({}),
        Order.countDocuments({ status: "Pending" }),
        Product.countDocuments({ stock: 0, isActive: true }),
        Product.countDocuments({ isFeatured: true, isActive: true }),
        Order.countDocuments({ status: "Delivered" }),
        Order.countDocuments({ status: "Cancelled" }),
      ]);

    const [lowStockCount, revenueResult, averageOrderResult] = await Promise.all([
      Product.countDocuments({ stock: { $gt: 0, $lte: 10 }, isActive: true }),
      Order.aggregate([
        { $match: { status: { $ne: "Cancelled" }, "payment.status": { $in: ["Paid", "Pending"] } } },
        { $group: { _id: null, revenue: { $sum: "$total" } } },
      ]),
      Order.aggregate([
        { $match: { status: { $ne: "Cancelled" } } },
        { $group: { _id: null, averageOrderValue: { $avg: "$total" } } },
      ]),
    ]);

    // Top rated products
    const topRatedProducts = await Product.find({ isActive: true })
      .sort({ rating: -1 })
      .limit(5)
      .select("name brand category rating reviews discountPrice price stock images thumbnail createdAt");

    const recentProducts = await Product.find({})
      .sort({ createdAt: -1 })
      .limit(8)
      .select("name brand category discountPrice price stock status isActive images thumbnail createdAt");

    const recentOrders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(8)
      .select("orderNumber customer.fullName items total status payment createdAt estimatedDelivery");

    // Low stock products (stock < 10)
    const lowStockProducts = await Product.find({ stock: { $gt: 0, $lte: 10 }, isActive: true })
      .sort({ stock: 1 })
      .limit(5)
      .select("name brand category stock discountPrice price images thumbnail");

    // Products by category
    const productsByCategory = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", name: { $first: "$category" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Products by brand (top 5)
    const productsByBrand = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$brand", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const monthlyProductsAdded = await Product.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: "$_id.month" },
              "/",
              { $toString: "$_id.year" },
            ],
          },
          count: 1,
        },
      },
    ]);

    const salesAnalytics = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180) },
          status: { $ne: "Cancelled" },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: "$_id.month" },
              "/",
              { $toString: "$_id.year" },
            ],
          },
          revenue: { $round: ["$revenue", 0] },
          orders: 1,
        },
      },
    ]);

    const topSellingProducts = await Order.aggregate([
      { $match: { status: { $ne: "Cancelled" } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.name" },
          image: { $first: "$items.image" },
          brand: { $first: "$items.brand" },
          quantity: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.lineTotal" },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 8 },
    ]);

    const orderStatusDistribution = await Order.aggregate([
      { $group: { _id: "$status", name: { $first: "$status" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          revenue: revenueResult[0]?.revenue || 0,
          totalProducts,
          totalCategories,
          totalBrands,
          totalUsers,
          totalOrders,
          pendingOrders,
          deliveredOrders,
          cancelledOrders,
          averageOrderValue: Math.round(averageOrderResult[0]?.averageOrderValue || 0),
          lowStockProducts: lowStockCount,
          outOfStock,
          featuredProducts,
        },
        topRatedProducts,
        topSellingProducts,
        lowStockProducts,
        recentProducts,
        recentOrders,
        monthlyProductsAdded,
        salesAnalytics,
        categoryDistribution: productsByCategory,
        orderStatusDistribution,
        lowStockGraph: lowStockProducts.map((product) => ({
          name: product.name,
          stock: product.stock,
        })),
        inventoryAnalytics: {
          lowStock: lowStockCount,
          outOfStock,
          inStock: totalProducts - outOfStock,
        },
        productsByCategory,
        productsByBrand,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats };
