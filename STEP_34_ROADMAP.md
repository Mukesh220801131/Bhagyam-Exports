# Step 34: Admin Authentication - Implementation Roadmap

## Overview
Admin Authentication is a critical step that will secure all admin operations (create, update, delete) for products, categories, and brands. This involves:
- User/Admin Model
- JWT token generation
- Authentication middleware
- Login/Logout endpoints

---

## What We'll Create

### 1. User Model (`server/models/User.js`)
```javascript
Fields:
- name (String, required)
- email (String, required, unique)
- password (String, required, hashed with bcrypt)
- role (String, enum: ['admin', 'user'], default: 'user')
- isActive (Boolean, default: true)
- timestamps
```

### 2. Authentication Middleware (`server/middleware/authMiddleware.js`)
```javascript
- verifyToken() - Validate JWT token
- authorizeAdmin() - Check if user is admin
- authorizeUser() - Check if user is authenticated
```

### 3. Auth Controller (`server/controllers/authController.js`)
```javascript
Methods:
- register() - Create new user account
- login() - Generate JWT token
- logout() - Invalidate token
- getProfile() - Get current user info
- updateProfile() - Update user data
- verifyToken() - Verify JWT validity
```

### 4. Auth Routes (`server/routes/authRoutes.js`)
```
POST   /api/auth/register - Create account
POST   /api/auth/login - Login and get token
POST   /api/auth/logout - Logout
GET    /api/auth/profile - Get user profile
PUT    /api/auth/profile - Update profile
GET    /api/auth/verify - Verify token
```

### 5. Protected Routes
Update existing CRUD routes to require authentication:
```javascript
// Example for product routes
router.post("/", authorizeAdmin, createProduct);
router.put("/:id", authorizeAdmin, updateProduct);
router.delete("/:id", authorizeAdmin, deleteProduct);
```

---

## Features to Implement

### Security Features
- ✅ Password hashing with bcrypt
- ✅ JWT token generation (RS256 algorithm)
- ✅ Token expiration (24 hours default)
- ✅ Refresh token mechanism
- ✅ Input validation
- ✅ Email validation

### JWT Structure
```javascript
Token Payload:
{
  userId: "mongo_id",
  email: "admin@example.com",
  role: "admin",
  iat: 1234567890,
  exp: 1234567890 + 24*60*60
}
```

### Error Handling
- Invalid credentials
- Token expired
- Token invalid
- Unauthorized access
- User not found

---

## Environment Variables to Add to .env
```
JWT_SECRET=FashionStore@12345  // Already exists
JWT_EXPIRATION=24h
BCRYPT_ROUNDS=10
```

---

## Database Seeding (Admin User)
Create a default admin user:
```javascript
Email: admin@fashionstore.com
Password: Admin@123456
Role: admin
```

---

## Testing Admin Operations

### 1. Register Admin
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@fashionstore.com",
    "password": "Admin@123456"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@fashionstore.com",
    "password": "Admin@123456"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "...",
      "name": "Admin User",
      "email": "admin@fashionstore.com",
      "role": "admin"
    }
  }
}
```

### 3. Use Token in Protected Routes
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -d '{
    "name": "New Product",
    ...
  }'
```

---

## File Structure After Step 34
```
server/
├── models/
│   ├── Product.js
│   ├── Category.js
│   ├── Brand.js
│   └── User.js (NEW)
├── controllers/
│   ├── productController.js
│   ├── categoryController.js
│   ├── brandController.js
│   └── authController.js (NEW)
├── middleware/
│   ├── uploadMiddleware.js
│   └── authMiddleware.js (NEW)
├── routes/
│   ├── productRoutes.js (UPDATED - with auth)
│   ├── categoryRoutes.js (UPDATED - with auth)
│   ├── brandRoutes.js (UPDATED - with auth)
│   └── authRoutes.js (NEW)
└── server.js (UPDATED)
```

---

## Implementation Steps (In Order)

1. **Create User Model**
   - Define schema with email uniqueness
   - Add password hashing middleware
   - Add role-based field

2. **Install bcrypt** (already installed)
   - Verify package is available

3. **Create Auth Middleware**
   - Verify JWT tokens
   - Check admin role
   - Handle token errors

4. **Create Auth Controller**
   - Implement register method
   - Implement login method
   - Implement logout method
   - Add profile methods

5. **Create Auth Routes**
   - Connect controller methods to routes

6. **Update Server.js**
   - Import and mount auth routes

7. **Protect Existing Routes**
   - Add middleware to POST/PUT/DELETE routes

8. **Create Admin Seed Data**
   - Create default admin user with hashed password

9. **Test All Flows**
   - Register admin
   - Login admin
   - Use token to create/update/delete

---

## Passwords vs Security

### During Development
```
admin@fashionstore.com : Admin@123456
user1@fashionstore.com : User@123456
```

### For Production
- Generate strong passwords
- Use environment variables
- Never commit passwords to git
- Use password managers

---

## Token Storage (Frontend - Next)

### Secure Token Storage
In React/client, tokens should be stored in:
- ✅ localStorage (simple)
- ✅ sessionStorage (session-only)
- ✅ httpOnly cookies (most secure)
- ❌ State (lost on refresh)

### Token Refresh Strategy
```javascript
1. User logs in
2. Get access token (24 hours)
3. Get refresh token (7 days)
4. Store both tokens
5. When access token expires, use refresh token
6. Get new access token
7. Continue operations
```

---

## Security Best Practices

### Frontend
- Never expose tokens in URLs
- Use HTTPS only
- Clear tokens on logout
- Validate token before requests

### Backend
- Hash passwords (bcrypt 10 rounds)
- Use JWT with expiration
- Validate all inputs
- Use CORS properly
- Use environment variables
- Log security events

---

## API Response Standards

### Login Success
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "user": { "id", "name", "email", "role" }
  }
}
```

### Login Failed
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized - Admin access required"
}
```

---

## Ready to Implement Step 34?

This roadmap provides all the information needed to implement admin authentication. The implementation will:
- ✅ Secure all CRUD operations
- ✅ Allow multiple user roles
- ✅ Generate JWT tokens
- ✅ Validate requests
- ✅ Handle errors gracefully

**Confirmation needed: Ready to proceed with Step 34 implementation?**
