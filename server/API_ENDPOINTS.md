/**
 * Fashion Store API - Complete CRUD Testing Guide
 * Base URL: http://localhost:5000/api
 */

// ==========================================
// PRODUCT ENDPOINTS
// ==========================================

// 1. Get All Products with Filters
// GET /api/products?page=1&limit=10&category=Men&sort=price-asc
// Query Params:
//   - page: Page number (default: 1)
//   - limit: Items per page (default: 10)
//   - category: Filter by category (Men, Women, Kids, Accessories)
//   - brand: Filter by brand
//   - minPrice: Minimum price filter
//   - maxPrice: Maximum price filter
//   - search: Search by name or description
//   - sort: price-asc, price-desc, newest, popular

// 2. Get Single Product
// GET /api/products/:id

// 3. Get Products by Category
// GET /api/products/category/Men?limit=10

// 4. Get Products by Brand
// GET /api/products/brand/Nike?limit=10

// 5. Create Product (Admin)
// POST /api/products
// Body: {
//   "name": "New Product",
//   "description": "Product description",
//   "brand": "Nike",
//   "category": "Men",
//   "price": 1999,
//   "discountPrice": 1499,
//   "images": ["url1", "url2"],
//   "sizes": ["S", "M", "L"],
//   "colors": ["Black", "White"],
//   "stock": 50
// }

// 6. Update Product (Admin)
// PUT /api/products/:id
// Body: { "name": "Updated Name", "price": 1599, ... }

// 7. Delete Product (Admin)
// DELETE /api/products/:id

// ==========================================
// CATEGORY ENDPOINTS
// ==========================================

// 1. Get All Categories
// GET /api/categories?limit=50

// 2. Get Single Category
// GET /api/categories/:id

// 3. Get Category by Slug
// GET /api/categories/slug/men

// 4. Create Category (Admin)
// POST /api/categories
// Body: {
//   "name": "Men",
//   "description": "Men's fashion collection",
//   "image": "https://cloudinary-url",
//   "icon": "👔"
// }

// 5. Update Category (Admin)
// PUT /api/categories/:id
// Body: { "name": "Updated Name", "isActive": true, ... }

// 6. Delete Category (Admin)
// DELETE /api/categories/:id

// ==========================================
// BRAND ENDPOINTS
// ==========================================

// 1. Get All Brands
// GET /api/brands?limit=50

// 2. Get Single Brand
// GET /api/brands/:id

// 3. Get Brand by Slug
// GET /api/brands/slug/nike

// 4. Create Brand (Admin)
// POST /api/brands
// Body: {
//   "name": "Nike",
//   "description": "Global leader in sportswear",
//   "logo": "https://cloudinary-url",
//   "website": "https://www.nike.com",
//   "countryOfOrigin": "United States",
//   "popularity": 5
// }

// 5. Update Brand (Admin)
// PUT /api/brands/:id
// Body: { "name": "Updated", "popularity": 4, ... }

// 6. Delete Brand (Admin)
// DELETE /api/brands/:id

// ==========================================
// EXAMPLE CURL COMMANDS FOR TESTING
// ==========================================

/*
# Get all products with pagination
curl http://localhost:5000/api/products?page=1&limit=5

# Get products by category
curl http://localhost:5000/api/products/category/Men

# Get products by brand
curl http://localhost:5000/api/products/brand/Nike

# Search products
curl "http://localhost:5000/api/products?search=T-Shirt"

# Filter by price
curl "http://localhost:5000/api/products?minPrice=500&maxPrice=2000"

# Get all categories
curl http://localhost:5000/api/categories

# Get all brands
curl http://localhost:5000/api/brands

# Create a new product
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Shirt",
    "description": "Cool shirt",
    "brand": "Adidas",
    "category": "Men",
    "price": 1500,
    "discountPrice": 1000,
    "stock": 50
  }'

# Update a product
curl -X PUT http://localhost:5000/api/products/{id} \
  -H "Content-Type: application/json" \
  -d '{"price": 1200}'

# Delete a product
curl -X DELETE http://localhost:5000/api/products/{id}
*/
