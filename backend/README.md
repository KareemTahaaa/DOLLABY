# Dollaby Backend API

FastAPI-based backend for the Dollaby fashion AI platform.

## 🚀 Quick Start

### Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Run server
uvicorn main:app --reload
```

Server runs on `http://localhost:8000`

### With Docker

```bash
docker build -t dollaby-backend .
docker run -p 8000:8000 --env-file .env dollaby-backend
```

## 📚 API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **API Routes**: See [../API_ROUTES.md](../API_ROUTES.md)

## 📁 Project Structure

```
backend/
├── main.py                  # Application entry point
├── auth.py                  # Authentication & JWT
├── models.py                # Pydantic data models
├── database.py              # MongoDB connection
├── closet.py                # Wardrobe management
├── outfit_generator.py      # AI outfit recommendations
├── assistant.py             # AI fashion assistant
├── calendar_routes.py       # Event calendar
├── weather.py               # Weather integration
├── profile.py               # User profile management
├── viton_service.py         # Virtual try-on orchestration
├── viton_inference.py       # VITON model inference
├── requirements.txt         # Python dependencies
├── Dockerfile               # Container configuration
├── .env.example             # Environment variables template
├── uploads/                 # User uploaded files
│   ├── avatars/            # Profile pictures
│   ├── closet_items/       # Clothing photos
│   └── tryon_results/      # Try-on outputs
└── tests/                  # Unit & integration tests
```

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/dollaby

# AI APIs
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...

# Virtual Try-On
VITON_MODE=huggingface  # or replicate, local
REPLICATE_API_TOKEN=r8_...

# Security
JWT_SECRET_KEY=your-secret-key
JWT_EXPIRE_MINUTES=60

# Server
ENVIRONMENT=development
HOST=0.0.0.0
PORT=8000

# CORS
CORS_ORIGINS=http://localhost:3000
```

See [.env.example](./.env.example) for complete configuration.

## 🔌 Dependencies

### Core Framework
- **FastAPI** — Modern async web framework
- **Uvicorn** — ASGI application server
- **Pydantic** — Data validation

### Database
- **Motor** — Async MongoDB driver
- **PyMongo** — MongoDB adapter

### Authentication
- **python-jose** — JWT token handling
- **passlib** — Password hashing
- **bcrypt** — Bcrypt hashing algorithm

### AI/ML
- **OpenAI** — GPT models for fashion recommendations
- **Groq** — Fast LLM inference
- **Replicate** — Virtual try-on model serving
- **gradio_client** — HuggingFace Space integration

### Utilities
- **httpx** — Async HTTP client
- **aiofiles** — Async file operations
- **python-multipart** — File upload handling
- **python-dotenv** — Environment configuration
- **Pillow** — Image processing

See [requirements.txt](./requirements.txt) for full list.

## 🧪 Testing

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio pytest-cov

# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_auth.py

# Run in watch mode
pytest-watch
```

### Test Structure

```
tests/
├── test_auth.py          # Authentication endpoints
├── test_closet.py        # Wardrobe management
├── test_outfit_gen.py    # Outfit recommendations
├── test_assistant.py     # AI assistant
└── conftest.py           # Fixtures and configuration
```

### Writing Tests

```python
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

@pytest.mark.asyncio
async def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert "Dollaby API" in response.json()["message"]

@pytest.mark.asyncio
async def test_register_user():
    response = client.post("/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "securepass123"
    })
    assert response.status_code == 201
    assert response.json()["username"] == "testuser"
```

## 🔐 Security

### Password Security
- Passwords hashed with bcrypt
- Salt rounds: 12 (configurable)
- Never stored in plain text

### Authentication
- JWT tokens with HS256
- Token expiration (default: 60 minutes)
- Secure secret key in `.env`

### Input Validation
- Pydantic models validate all inputs
- File upload validation
- CORS protection

### Database
- MongoDB connection pooling
- IP whitelist configured in Atlas
- Encrypted connections (SSL/TLS)

## 📊 API Endpoints

### Health & Status
- `GET /` — API info and health status

### Authentication
- `POST /auth/register` — Register new user
- `POST /auth/login` — Login and get JWT token
- `POST /auth/logout` — Logout user

### Profile
- `GET /profile/me` — Get current user profile
- `PUT /profile/update` — Update profile
- `POST /profile/upload-avatar` — Upload avatar

### Wardrobe
- `GET /closet` — List wardrobe items
- `POST /closet/add` — Add clothing item
- `DELETE /closet/{item_id}` — Delete item
- `PUT /closet/{item_id}` — Update item

### Outfits
- `POST /outfits/generate` — Generate AI recommendations
- `GET /outfits` — List saved outfits
- `POST /outfits/save` — Save outfit
- `DELETE /outfits/{outfit_id}` — Delete outfit

### AI Assistant
- `POST /assistant/chat` — Chat with AI
- `GET /assistant/history` — Get chat history

### Calendar
- `POST /calendar/events` — Create event
- `GET /calendar/events` — List events
- `DELETE /calendar/events/{event_id}` — Delete event

### Weather
- `GET /weather` — Get weather recommendations

### Virtual Try-On
- `POST /viton/tryon` — Generate virtual try-on
- `GET /viton/tryon/{result_id}` — Get try-on result

Full documentation: [../API_ROUTES.md](../API_ROUTES.md)

## 🚀 Deployment

### Docker Build

```bash
docker build -t dollaby-backend:2.0.0 .
docker tag dollaby-backend:2.0.0 your-registry/dollaby-backend:2.0.0
docker push your-registry/dollaby-backend:2.0.0
```

### Docker Compose

See [../docker-compose.yml](../docker-compose.yml)

### Production Deployment

See [../DEPLOYMENT.md](../DEPLOYMENT.md)

## 🐛 Troubleshooting

### MongoDB Connection Error

```
Error: MongoDB connection error
```

**Solution:**
1. Verify connection string in `.env`
2. Check MongoDB Atlas network access (allow 0.0.0.0/0)
3. Ensure credentials are correct

### API Key Issues

```
Error: Invalid API key
```

**Solutions:**
- Verify API key format in `.env`
- Check key quotas in provider dashboards
- Ensure key has appropriate permissions

### CORS Errors

```
Error: CORS policy
```

**Solution:**
- Update `CORS_ORIGINS` in `.env`
- Include frontend URL correctly (http://localhost:3000, not localhost:3000)

### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>
```

## 📈 Performance Tips

1. **Database Indexing** — Ensure indexes on frequently queried fields
2. **Pagination** — Implement pagination for large result sets
3. **Caching** — Cache AI responses when appropriate
4. **Image Optimization** — Compress uploads before storing
5. **Async Operations** — Use async/await for non-blocking I/O

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [MongoDB Async Driver](https://motor.readthedocs.io/)
- [JWT Authentication](https://python-jose.readthedocs.io/)
- [Pydantic Validation](https://docs.pydantic.dev/)

## 📧 Support

For backend-specific issues:
1. Check logs: Review application output
2. Enable debug mode: Set `ENVIRONMENT=development`
3. Test endpoints: Use Swagger UI at `/docs`
4. Check database: Verify MongoDB connection

---

**Version:** 2.0.0 | **Last Updated:** May 2026
