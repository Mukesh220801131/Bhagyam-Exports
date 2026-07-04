# API Testing Quick Reference

## Server Status
- ✅ Running on http://localhost:5000
- ✅ MongoDB Connected
- ✅ All endpoints ready

---

## PRODUCT ENDPOINTS

### Get All Products
```bash
curl http://localhost:5000/api/products
```

### Get Products with Filters
```bash
# By category
curl "http://localhost:5000/api/products?category=Men"

# By brand
curl "http://localhost:5000/api/products?brand=Nike"

# By price range
curl "http://localhost:5000/api/products?minPrice=500&maxPrice=2000"

# Search
curl "http://localhost:5000/api/products?search=T-Shirt"

# Sorting
curl "http://localhost:5000/api/products?sort=price-asc"
curl "http://localhost:5000/api/products?sort=price-desc"
curl "http://localhost:5000/api/products?sort=newest"
curl "http://localhost:5000/api/products?sort=popular"

# Pagination
curl "http://localhost:5000/api/products?page=1&limit=5"

# Combined
curl "http://localhost:5000/api/products?category=Men&sort=price-asc&page=1&limit=10"
```

### Get Single Product
```bash
# Replace {id} with actual product ID
curl http://localhost:5000/api/products/{id}
```

### Get by Category/Brand
```bash
curl http://localhost:5000/api/products/category/Men
curl http://localhost:5000/api/products/brand/Nike
```

---

## CATEGORY ENDPOINTS

### Get All Categories
```bash
curl http://localhost:5000/api/categories
```

### Get Single Category
```bash
curl http://localhost:5000/api/categories/{id}
```

### Get Category by Slug
```bash
curl http://localhost:5000/api/categories/slug/men
```

---

## BRAND ENDPOINTS

### Get All Brands
```bash
curl http://localhost:5000/api/brands
```

### Get Single Brand
```bash
curl http://localhost:5000/api/brands/{id}
```

### Get Brand by Slug
```bash
curl http://localhost:5000/api/brands/slug/nike
```

---

## ADMIN OPERATIONS (Next Steps)

### Create Product
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Shirt",
    "description": "High quality cotton shirt",
    "brand": "Nike",
    "category": "Men",
    "price": 1999,
    "discountPrice": 1499,
    "images": ["url1"],
    "sizes": ["S", "M", "L"],
    "colors": ["Black"],
    "stock": 50
  }'
```

### Create Category
```bash
curl -X POST http://localhost:5000/api/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sports",
    "description": "Sports and athletic wear",
    "image": "https://example.com/image.jpg",
    "icon": "⚽"
  }'
```

### Create Brand
```bash
curl -X POST http://localhost:5000/api/brands \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Adidas",
    "description": "German sports apparel company",
    "logo": "https://example.com/logo.jpg",
    "website": "https://www.adidas.com",
    "countryOfOrigin": "Germany",
    "popularity": 5
  }'
```

### Update Product
```bash
curl -X PUT http://localhost:5000/api/products/{id} \
  -H "Content-Type: application/json" \
  -d '{"price": 1799}'
```

### Delete Product
```bash
curl -X DELETE http://localhost:5000/api/products/{id}
```

---

## IMAGE UPLOAD (Requires Cloudinary Credentials)

### Upload Single Image
```bash
curl -X POST http://localhost:5000/api/upload/single \
  -F "image=@/path/to/image.jpg"
```

### Upload Multiple Images
```bash
curl -X POST http://localhost:5000/api/upload/multiple \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

### Delete Image
```bash
curl -X DELETE http://localhost:5000/api/upload/{publicId}
```

---

## Using Postman

1. **Import Base URL**: http://localhost:5000/api
2. **Create Requests**:
   - Select GET/POST/PUT/DELETE
   - Enter endpoint path
   - Add headers: `Content-Type: application/json`
   - Add body for POST/PUT requests
3. **Send Request** and view response

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

---

## Status Codes
- 200: OK
- 201: Created
- 400: Bad Request
- 404: Not Found
- 500: Server Error

---

## Database Seed
To refresh database with sample data:
```bash
cd server
node seed.js
```

---

## Stopping the Server
Press `Ctrl+C` in the terminal where server is running
