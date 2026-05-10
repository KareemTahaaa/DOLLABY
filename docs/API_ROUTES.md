# Dollaby API Routes Documentation

Base URL: `http://localhost:8000` (development)

## 📚 OpenAPI/Swagger Docs

Interactive API documentation available at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## 🔐 Authentication Routes

### POST `/auth/register`
Register a new user account.

**Request:**
```json
{
  "username": "string",
  "email": "user@example.com",
  "password": "string"
}
```

**Response:** `201 Created`
```json
{
  "id": "user_id",
  "username": "string",
  "email": "string",
  "token": "jwt_token"
}
```

### POST `/auth/login`
Authenticate user and receive JWT token.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "jwt_token",
  "token_type": "bearer",
  "expires_in": 3600
}
```

## 👤 Profile Routes

### GET `/profile/me`
Get current user's profile.

**Auth:** Required (JWT)

**Response:** `200 OK`
```json
{
  "id": "user_id",
  "username": "string",
  "email": "string",
  "avatar_url": "string",
  "preferences": {
    "style": "string",
    "size": "string",
    "colors": ["string"]
  }
}
```

### PUT `/profile/update`
Update user profile information.

**Auth:** Required (JWT)

**Request:**
```json
{
  "full_name": "string",
  "avatar_url": "string",
  "preferences": {
    "style": "string",
    "size": "string",
    "colors": ["string"]
  }
}
```

**Response:** `200 OK`
```json
{
  "message": "Profile updated successfully"
}
```

## 👕 Wardrobe/Closet Routes

### GET `/closet`
List all wardrobe items for the current user.

**Auth:** Required (JWT)

**Query Parameters:**
- `category` (optional): Filter by category (top, bottom, dress, jacket, shoes, accessories)
- `skip` (optional): Pagination skip (default: 0)
- `limit` (optional): Pagination limit (default: 20)

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": "item_id",
      "name": "Blue T-Shirt",
      "category": "top",
      "color": "blue",
      "brand": "Nike",
      "image_url": "/uploads/closet_items/...",
      "size": "M",
      "tags": ["casual", "summer"],
      "created_at": "2025-01-20T10:00:00Z"
    }
  ],
  "total": 42,
  "skip": 0,
  "limit": 20
}
```

### POST `/closet/add`
Add a new item to wardrobe.

**Auth:** Required (JWT)

**Request:** `multipart/form-data`
- `name` (string): Item name
- `category` (enum): top, bottom, dress, jacket, shoes, accessories
- `color` (string): Item color
- `brand` (string): Brand name
- `size` (string): Size (XS, S, M, L, XL)
- `tags` (array): Item tags
- `image` (file): Image file

**Response:** `201 Created`
```json
{
  "id": "new_item_id",
  "message": "Item added successfully"
}
```

### DELETE `/closet/{item_id}`
Remove item from wardrobe.

**Auth:** Required (JWT)

**Response:** `200 OK`
```json
{
  "message": "Item deleted successfully"
}
```

## 🎯 Outfit Generation Routes

### POST `/outfits/generate`
Generate AI outfit recommendations.

**Auth:** Required (JWT)

**Request:**
```json
{
  "occasion": "casual",
  "season": "spring",
  "weather": "sunny",
  "mood": "stylish",
  "preferences": "minimal"
}
```

**Response:** `200 OK`
```json
{
  "outfits": [
    {
      "outfit_id": "outfit_id",
      "items": [
        {
          "id": "item_id",
          "name": "Blue T-Shirt",
          "image_url": "/uploads/closet_items/..."
        }
      ],
      "reasoning": "Perfect for a casual spring day with sunny weather",
      "confidence": 0.95
    }
  ]
}
```

### GET `/outfits`
List all saved outfits.

**Auth:** Required (JWT)

**Response:** `200 OK`
```json
{
  "outfits": [
    {
      "id": "outfit_id",
      "name": "Friday Night Out",
      "items": ["item_id_1", "item_id_2", ...],
      "occasion": "casual",
      "created_at": "2025-01-20T10:00:00Z"
    }
  ]
}
```

### POST `/outfits/save`
Save an outfit.

**Auth:** Required (JWT)

**Request:**
```json
{
  "name": "Friday Night Out",
  "item_ids": ["item_id_1", "item_id_2"],
  "occasion": "casual"
}
```

**Response:** `201 Created`
```json
{
  "outfit_id": "new_outfit_id"
}
```

## 💬 Assistant Routes

### POST `/assistant/chat`
Chat with AI fashion assistant.

**Auth:** Required (JWT)

**Request:**
```json
{
  "message": "What should I wear for a job interview?",
  "context": "professional"
}
```

**Response:** `200 OK`
```json
{
  "response": "For a job interview, I'd recommend...",
  "suggestions": [
    {
      "id": "item_id",
      "name": "Navy Blazer",
      "reason": "Professional and timeless"
    }
  ]
}
```

### GET `/assistant/history`
Get chat history.

**Auth:** Required (JWT)

**Query Parameters:**
- `limit` (optional): Number of messages (default: 50)

**Response:** `200 OK`
```json
{
  "messages": [
    {
      "role": "user",
      "content": "What should I wear?",
      "timestamp": "2025-01-20T10:00:00Z"
    },
    {
      "role": "assistant",
      "content": "Based on your closet...",
      "timestamp": "2025-01-20T10:00:05Z"
    }
  ]
}
```

## 📅 Calendar Routes

### POST `/calendar/events`
Create a calendar event with outfit recommendation.

**Auth:** Required (JWT)

**Request:**
```json
{
  "title": "Job Interview",
  "date": "2025-02-15T10:00:00Z",
  "outfit_id": "outfit_id",
  "description": "Interview at company HQ"
}
```

**Response:** `201 Created`
```json
{
  "event_id": "new_event_id",
  "message": "Event created successfully"
}
```

### GET `/calendar/events`
List upcoming events.

**Auth:** Required (JWT)

**Query Parameters:**
- `start_date` (optional): ISO 8601 date
- `end_date` (optional): ISO 8601 date

**Response:** `200 OK`
```json
{
  "events": [
    {
      "id": "event_id",
      "title": "Job Interview",
      "date": "2025-02-15T10:00:00Z",
      "outfit": {
        "id": "outfit_id",
        "items": [...]
      }
    }
  ]
}
```

## 🌦️ Weather Routes

### GET `/weather`
Get weather recommendations for outfit selection.

**Query Parameters:**
- `city` (string): City name
- `country_code` (string): ISO country code

**Response:** `200 OK`
```json
{
  "city": "New York",
  "temperature": 15,
  "condition": "Cloudy",
  "recommendations": {
    "category": "jacket",
    "colors": ["blue", "gray", "black"]
  }
}
```

## 👗 Virtual Try-On Routes

### POST `/viton/tryon`
Generate virtual try-on image (AI virtual fitting).

**Auth:** Required (JWT)

**Request:** `multipart/form-data`
- `person_image` (file): Person's photo (JPG/PNG)
- `clothing_item_id` (string): ID of clothing item from wardrobe
- OR `clothing_image` (file): Direct clothing image

**Response:** `200 OK`
```json
{
  "result_id": "tryon_result_id",
  "result_url": "/uploads/tryon_results/...",
  "status": "completed",
  "processing_time": 5.2
}
```

### GET `/viton/tryon/{result_id}`
Get try-on result status and image.

**Auth:** Required (JWT)

**Response:** `200 OK`
```json
{
  "result_id": "tryon_result_id",
  "status": "completed",
  "result_url": "/uploads/tryon_results/...",
  "created_at": "2025-01-20T10:00:00Z"
}
```

## Health & Status

### GET `/`
API health check and information.

**Response:** `200 OK`
```json
{
  "message": "Welcome to Dollaby API v2.0",
  "docs": "/docs",
  "features": [
    "wardrobe management",
    "AI outfit generation",
    "AI fashion assistant",
    "virtual try-on"
  ]
}
```

### GET `/health`
Detailed health status (if implemented).

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "database": "connected",
  "external_apis": {
    "openai": "connected",
    "groq": "connected"
  }
}
```

## Error Responses

All errors follow this format:

```json
{
  "detail": "Error description",
  "status_code": 400,
  "timestamp": "2025-01-20T10:00:00Z"
}
```

### Common Status Codes

- `200 OK` — Successful request
- `201 Created` — Resource created successfully
- `400 Bad Request` — Invalid input data
- `401 Unauthorized` — Missing/invalid authentication token
- `403 Forbidden` — Insufficient permissions
- `404 Not Found` — Resource not found
- `500 Internal Server Error` — Server error
- `503 Service Unavailable` — External API unavailable

## Rate Limiting

Current limits (configurable):
- 100 requests per minute per user
- Virtual try-on: 10 requests per hour per user

## Pagination

Endpoints with multiple results support pagination:

**Query Parameters:**
- `skip` (int, default: 0) — Number of items to skip
- `limit` (int, default: 20, max: 100) — Number of items to return

**Response includes:**
```json
{
  "items": [...],
  "total": 100,
  "skip": 0,
  "limit": 20
}
```
