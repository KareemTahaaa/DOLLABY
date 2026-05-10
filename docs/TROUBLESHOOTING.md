# Troubleshooting Guide

Common issues and solutions for Dollaby development and deployment.

## 🚀 Installation Issues

### Python Virtual Environment Issues

**Problem:** `python: command not found` or version mismatch

```bash
# Solution: Check Python version
python3 --version  # Should be 3.11+

# Use python3 explicitly if available
python3 -m venv venv
source venv/bin/activate
```

**Problem:** `venv` activation doesn't work

```bash
# Windows
venv\Scripts\activate.bat

# macOS/Linux
source venv/bin/activate

# PowerShell
venv\Scripts\Activate.ps1
```

### Dependency Installation Errors

**Problem:** `pip install` fails with SSL error

```bash
# Solution: Upgrade pip first
pip install --upgrade pip

# Then retry install
pip install -r requirements.txt
```

**Problem:** `No module named 'motorengine'` or similar

```bash
# Reinstall dependencies
pip install --force-reinstall -r requirements.txt

# Clear pip cache
pip cache purge
```

## 🗄️ Database Issues

### MongoDB Connection Failed

```
Error: MongoDB connection error
```

**Solution 1: Check Connection String**
```bash
# Verify DATABASE_URL in .env
# Format: mongodb+srv://user:pass@cluster.mongodb.net/?appName=Dollaby

# Test connection locally
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/dollaby"
```

**Solution 2: MongoDB Atlas Network Access**
- Go to MongoDB Atlas → Cluster → Network Access
- Click "Add IP Address"
- Select "Allow access from anywhere" (0.0.0.0/0) for development
- For production, whitelist specific IPs

**Solution 3: Credentials**
- Verify username and password don't have special characters (URL encode if needed)
- Check credentials in MongoDB Atlas → Database Access

### Database Slow Queries

```python
# Enable query logging
mongosh
> db.setProfilingLevel(1)  # Log slow queries (> 100ms)
> db.system.profile.find().limit(10).sort({ts: -1}).pretty()
```

**Solution:** Add database indexes
```python
# In backend code
await db.closet.create_index("user_id")
await db.outfits.create_index("user_id")
```

## 🔑 Authentication Issues

### JWT Token Errors

**Problem:** `"Invalid token"` or `"Token expired"`

```python
# Check JWT_SECRET_KEY and JWT_EXPIRE_MINUTES in .env
# Token expiration is per endpoint request

# Solution: Extend token expiration
JWT_EXPIRE_MINUTES=1440  # 24 hours (use carefully)
```

**Problem:** Tokens not being included in requests

```typescript
// Frontend: Verify token in localStorage
localStorage.getItem('token')

// Verify Authorization header
headers: {
  'Authorization': `Bearer ${token}`
}
```

### Password Hashing Issues

**Problem:** `bcrypt` fails on Windows

```bash
# Solution: Install binary dependencies
pip install --upgrade bcrypt

# Or use different hasher
# pip install argon2-cffi
```

## 🌐 CORS Issues

### CORS Policy Error in Browser

```
Error: Access to XMLHttpRequest blocked by CORS policy
```

**Solution: Check Frontend URL**

```python
# backend/.env
# ✅ Correct (with protocol and port)
CORS_ORIGINS=http://localhost:3000

# ❌ Wrong (missing protocol)
CORS_ORIGINS=localhost:3000
```

**Production CORS:**
```python
# Use environment variable for flexibility
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

## 🖼️ File Upload Issues

### File Upload Size Limit

**Problem:** `"File too large"` error

```python
# backend/.env
MAX_UPLOAD_SIZE_MB=50  # Increase limit

# In FastAPI app
app = FastAPI()
# FastAPI has a default 2.5MB body size limit

# Solution: Increase in config
# Or split large uploads
```

### Image Processing Errors

**Problem:** `PIL` library not found

```bash
pip install Pillow
```

**Problem:** Invalid image format

```python
# Solution: Validate image before processing
from PIL import Image
from io import BytesIO

async def validate_image(file: UploadFile):
    contents = await file.read()
    try:
        img = Image.open(BytesIO(contents))
        img.verify()
    except Exception as e:
        raise ValueError(f"Invalid image: {e}")
```

## 🤖 AI/LLM API Issues

### OpenAI API Errors

**Problem:** `"Invalid API key"`

```python
# Check .env
OPENAI_API_KEY=sk-...

# Verify key is active
# https://platform.openai.com/account/api-keys

# Check usage/billing
# https://platform.openai.com/account/billing/overview
```

**Problem:** `"Rate limit exceeded"`

```python
# Implement exponential backoff
import asyncio

async def call_with_retry(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return await func()
        except RateLimitError:
            wait_time = 2 ** attempt
            await asyncio.sleep(wait_time)
    raise Exception("Max retries exceeded")
```

### Groq API Issues

**Problem:** `"Invalid Groq API key"`

```bash
# Regenerate at https://console.groq.com/keys
GROQ_API_KEY=gsk_...
```

## 🔴 Common Runtime Errors

### "Port already in use"

```bash
# Find process using port
lsof -i :8000      # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Kill the process
kill -9 <PID>      # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### "Module not found" errors

```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Or specify version
pip install FastAPI==0.104.1
```

### "Async context issues"

**Problem:** `asyncio` event loop errors

```python
# Solution: Ensure async/await used correctly
async def my_route():
    data = await db.collection.find_one()
    return data
```

## 🐳 Docker Issues

### Docker build fails

```bash
# Check Dockerfile syntax
docker build --no-cache .

# View build output
docker build -t dollaby:latest . --progress=plain
```

### Container won't start

```bash
# Check logs
docker logs <container_id>

# Run interactively
docker run -it dollaby:latest /bin/bash

# Check environment
docker run -e DEBUG=true dollaby:latest
```

### Docker compose network issues

```bash
# Restart services
docker-compose restart

# Rebuild with fresh network
docker-compose down -v
docker-compose up --build

# Check network
docker network ls
docker network inspect dollaby-network
```

## 🧪 Testing Issues

### Tests hang or timeout

```bash
# Run with timeout
pytest --timeout=10

# Run in verbose mode
pytest -vv

# Run specific test
pytest tests/test_auth.py::test_login -v
```

### Database tests fail

```python
# Use test database
@pytest.fixture
async def test_db():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["dollaby_test"]
    yield db
    await client.drop_database("dollaby_test")
```

## 📊 Performance Issues

### Slow API responses

```python
# Add request timing middleware
from time import time

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time()
    response = await call_next(request)
    process_time = time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Monitor with:
curl -i http://localhost:8000/
```

### High memory usage

```python
# Check for memory leaks
import tracemalloc

tracemalloc.start()
# ... run operations ...
snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')
for stat in top_stats[:10]:
    print(stat)
```

## 🔍 Debug Mode

### Enable debugging

**Backend:**
```python
# main.py
import logging
logging.basicConfig(level=logging.DEBUG)

# Or in .env
ENVIRONMENT=development
```

**Frontend:**
```bash
# .env.local
NEXT_PUBLIC_DEBUG=true
```

**Docker:**
```bash
docker-compose up -d
docker-compose logs -f --tail=100
```

## 💡 Getting Help

1. **Check logs** — Always check error messages first
2. **Google the error** — Most issues have known solutions
3. **Stack Overflow** — Search your specific error
4. **GitHub Issues** — Check if issue exists
5. **Documentation** — Review framework documentation
6. **Ask maintainers** — Open an issue with details:
   - Error message (full traceback)
   - Steps to reproduce
   - Environment (Python version, OS, etc.)
   - What you've already tried

## 🔗 Useful Commands

```bash
# Backend debugging
uvicorn main:app --reload --log-level debug

# Database shell
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/dollaby"

# Test API
curl -X GET http://localhost:8000/
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass"}'

# Docker info
docker ps -a
docker logs -f container_name
docker exec -it container_name /bin/bash

# Git troubleshooting
git status
git log --oneline -10
git diff
```

---

**Last Updated:** May 2026 | **Version:** 1.0
