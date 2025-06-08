# Backend API Documentation

This project provides a RESTful API for managing users, stores, products and orders. The base URL for all requests is `http://localhost:5000/api`.

## Authentication Endpoints

### POST `/auth/register`
Register a new user. Example request body:

```json
{
  "name": "Ahmed Hassan",
  "email": "ahmed@example.com",
  "password": "securePassword123",
  "role": "customer"
}
```

On success (status `201`) the response contains the created user object along with both access and refresh tokens.

### POST `/auth/login`
Login an existing user. Example request body:

```json
{
  "email": "ahmed@example.com",
  "password": "securePassword123"
}
```

The response (status `200`) returns the user profile with tokens.

### PUT `/auth/profile`
Update the profile of the logged in user. Requires the `Authorization` header with a valid token. Example body:

```json
{
  "name": "Ahmed Ali Hassan",
  "phone": "+966501234567",
  "address": "New address in Jeddah",
  "avatar": "https://example.com/new-avatar.jpg"
}
```

### POST `/auth/logout`
Invalidate the current refresh token for the authenticated user.

## Retrieve Current User Profile

**Endpoint**: `GET /auth/me`

Use this endpoint to get the profile of the currently authenticated user. The request must include a valid JSON Web Token (JWT) in the `Authorization` header as a Bearer token. If the token is valid, the API responds with the user object that matches the credentials used for authentication.

### Headers
```
Authorization: Bearer <access_token>
```

### Response (200)
```json
{
  "success": true,
  "data": {
    "_id": "60d5ecb8b392c123456789ab",
    "name": "Ahmed Hassan",
    "email": "ahmed@example.com",
    "role": "store_owner",
    "isActive": true,
    "stores": ["60d5ecb8b392c123456789cd"],
    "phone": "+966501234567",
    "address": "Riyadh, Saudi Arabia",
    "avatar": "https://example.com/avatar.jpg",
    "emailVerified": true,
    "twoFactorEnabled": false,
    "lastLogin": "2023-06-08T10:30:00Z"
  }
}
```

The user must be logged in to access this endpoint. If the token is missing or invalid, the server returns a `401 Unauthorized` error.


## Notification Endpoints

### GET `/notifications`
Retrieve notifications for the authenticated user. Supports optional query parameters:
- `type`: `all`, `order_status_update`, `new_order`, `payment_received`, `delivery_update`
- `isRead`: `true` or `false`
- `page`: page number (default `1`)
- `limit`: items per page (default `20`)

Example success response:
```json
{
  "success": true,
  "data": [/* array of notifications */],
  "unreadCount": 5,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

### PATCH `/notifications/:id/read`
Mark a specific notification as read.

### PATCH `/notifications/mark-all-read`
Mark all of the user's notifications as read. Returns the number of marked documents.


### DELETE `/notifications/:id`
Delete a notification belonging to the authenticated user.

## Reviews & Ratings Endpoints

### POST `/products/:productId/reviews`
Add a review for a product. Requires authentication and a completed purchase.

### GET `/products/:productId/reviews`
Retrieve reviews for a product with filtering and summary statistics.

### POST `/stores/:storeId/reviews`
Add a review for a store. Requires authentication and a completed purchase.

## Search & Discovery Endpoints

### GET `/products`
Retrieve public products with advanced filtering and pagination. Supports query parameters:
`search`, `category`, `store`, `minPrice`, `maxPrice`, `brand`, `rating`, `hasDiscount`, `inStock`, `freeDelivery`, `expressDelivery`, `sort`, `page` and `limit`.

### GET `/stores`
List public stores with filters. Query parameters include `search`, `category`, `rating`, `verified`, `hasProducts`, `deliveryAreas`, `sort`, `page` and `limit`.

### GET `/categories`
Return product/store categories with statistics including product and store counts and average prices.
