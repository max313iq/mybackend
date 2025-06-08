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

