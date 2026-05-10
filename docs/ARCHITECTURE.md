# Dollaby Architecture Overview

## System Design

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser / Client                        │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/REST
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               Next.js Frontend (Port 3000)                   │
│  ┌──────────────┬──────────────┬──────────────────────────┐  │
│  │ Auth Pages   │ Closet Mgmt  │ Outfit Generation UI     │  │
│  │ Calendar     │ Try-On View  │ AI Chat Interface        │  │
│  └──────────────┴──────────────┴──────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ API Calls (http://localhost:8000)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               FastAPI Backend (Port 8000)                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Router Layer                                            │ │
│  │ ├─ Auth Router (registration, login, JWT)              │ │
│  │ ├─ Closet Router (CRUD operations on wardrobe)         │ │
│  │ ├─ Outfit Generator (AI recommendations)               │ │
│  │ ├─ Assistant Router (chat with AI)                     │ │
│  │ ├─ Calendar Router (event management)                  │ │
│  │ ├─ Weather Router (weather data)                       │ │
│  │ └─ VITON Router (virtual try-on)                       │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Service Layer                                           │ │
│  │ ├─ Database Service (MongoDB operations)               │ │
│  │ ├─ AI Service (OpenAI/Groq API calls)                  │ │
│  │ ├─ VITON Service (virtual try-on inference)            │ │
│  │ └─ File Service (image upload/processing)              │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Models & Validation (Pydantic)                          │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   ┌─────────────┐   ┌──────────────┐  ┌──────────────┐
   │ MongoDB     │   │ OpenAI API   │  │ Replicate API│
   │ Atlas       │   │ (GPT models) │  │ (VITON)      │
   └─────────────┘   └──────────────┘  └──────────────┘
        │                  │
        └──────────────────┴──────────────┐
                                          │
                                    ┌─────────────┐
                                    │ Groq API    │
                                    │ (faster LLM)│
                                    └─────────────┘
```

## Data Model

### User Collection
```
{
  _id: ObjectId,
  username: string,
  email: string,
  password_hash: string (bcrypt),
  profile: {
    full_name: string,
    avatar_url: string,
    preferences: {
      style: string,
      size: string,
      colors: [string]
    }
  },
  created_at: datetime,
  updated_at: datetime
}
```

### Wardrobe/Closet Collection
```
{
  _id: ObjectId,
  user_id: ObjectId,
  item: {
    name: string,
    category: enum (top, bottom, dress, jacket, shoes, accessories),
    color: string,
    brand: string,
    image_url: string,
    size: string,
    tags: [string]
  },
  created_at: datetime,
  updated_at: datetime
}
```

### Outfit Collection
```
{
  _id: ObjectId,
  user_id: ObjectId,
  name: string,
  items: [ObjectId],  // References to closet items
  occasion: string,
  season: enum (spring, summer, fall, winter),
  weather: string,
  rating: number,
  created_at: datetime,
  updated_at: datetime
}
```

### Events Collection
```
{
  _id: ObjectId,
  user_id: ObjectId,
  title: string,
  date: datetime,
  outfit_id: ObjectId,
  description: string,
  created_at: datetime
}
```

## API Architecture

### Request Flow
1. **Frontend sends request** → Next.js client
2. **Middleware validation** → Check authentication
3. **Route handling** → FastAPI router
4. **Business logic** → Service layer processes
5. **Database operations** → MongoDB async queries
6. **External APIs** → OpenAI/Groq/Replicate calls
7. **Response transformation** → Pydantic models serialize
8. **CORS headers** → Response sent to frontend

### Authentication Flow
```
┌─────────────┐
│   Login     │
│   Endpoint  │
└──────┬──────┘
       │ Username + Password
       ▼
┌─────────────────────────┐
│ Verify against DB       │
│ (bcrypt.verify)         │
└──────┬──────────────────┘
       │ Valid credentials
       ▼
┌──────────────────────────┐
│ Generate JWT Token       │
│ (HS256 algorithm)        │
└──────┬───────────────────┘
       │ Return token
       ▼
┌──────────────────────────┐
│ Frontend stores token    │
│ (localStorage/cookies)   │
└──────────────────────────┘
```

Protected routes include JWT in `Authorization: Bearer <token>` header.

## Virtual Try-On (VITON) Architecture

Three modes supported:

### Mode 1: HuggingFace Spaces (DEFAULT - FREE)
- Uses `levihsu/OOTDiffusion` HuggingFace Space
- No GPU required on our side
- Community-run inference
- **Pros**: Free, simple setup
- **Cons**: May be slower, depends on HF availability

### Mode 2: Replicate API
- Commercial service for model inference
- Supports HR-VITON and IDM-VTON models
- **Pros**: Reliable, fast, professional
- **Cons**: Requires paid API key

### Mode 3: Local Inference
- Run HR-VITON locally (requires GPU)
- Full control over processing
- **Pros**: Private, no external dependencies
- **Cons**: Requires NVIDIA GPU, long inference time

## File Storage

### Local File System Structure
```
backend/
├── uploads/
│   ├── avatars/           # User profile pictures
│   ├── closet_items/      # Wardrobe item photos
│   ├── outfit_photos/     # Generated outfit previews
│   └── tryon_results/     # Virtual try-on outputs
└── ...
```

### CORS Static File Serving
- Images served via `/uploads` endpoint
- Custom CORS headers injected for cross-origin access
- Persistent Docker volumes for data persistence

## Performance Considerations

1. **Database Indexing**
   - `user_id` indexed on all user-related collections
   - `created_at` indexed for sorting operations

2. **Caching Strategy**
   - Frontend: React Context for state management
   - Backend: Could add Redis for AI response caching

3. **Image Optimization**
   - Compress uploads before storing
   - Generate thumbnails for preview

4. **API Rate Limiting**
   - Consider implementing per-user rate limits
   - Monitor OpenAI/Groq API usage

## Security Architecture

1. **API Security**
   - CORS validation against frontend origin
   - HTTPS required in production
   - Rate limiting on auth endpoints

2. **Database Security**
   - MongoDB Atlas IP whitelist
   - User isolation via `user_id` field
   - Password hashing with bcrypt

3. **API Key Management**
   - Never commit `.env` files
   - Use environment variables
   - Rotate keys periodically

4. **JWT Security**
   - Short expiration time (15-60 minutes)
   - Refresh token mechanism
   - HS256 with strong secret

## Scaling Considerations

### Horizontal Scaling
- Stateless backend allows multiple instances
- Load balancer distribution
- Docker container orchestration (Kubernetes)

### Vertical Scaling
- Optimize MongoDB queries
- Cache frequently accessed data
- Use async/await for non-blocking operations

### Database Scaling
- MongoDB replica set for redundancy
- Read replicas for read-heavy operations
- Proper indexing strategy

## Error Handling

- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Missing/invalid authentication
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource doesn't exist
- **500 Internal Server Error**: Server-side failures
- **503 Service Unavailable**: External API failures

All errors include descriptive messages for debugging.

## Deployment Architecture

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment patterns.
