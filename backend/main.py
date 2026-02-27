from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import db, MONGODB_URL
from motor.motor_asyncio import AsyncIOMotorClient
import os

# Import all routers
import auth
import closet
import outfit_generator
import assistant

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB
    print("Connecting to MongoDB...")
    db.client = AsyncIOMotorClient(MONGODB_URL)
    # Ping to confirm connection
    try:
        await db.client.admin.command("ping")
        print("✅ Successfully connected to MongoDB Atlas!")
    except Exception as e:
        print(f"❌ MongoDB connection error: {e}")
    yield
    # Shutdown: Close MongoDB connection
    print("Closing MongoDB connection...")
    db.client.close()

app = FastAPI(
    title="Dollaby API",
    description="AI-powered fashion-tech SaaS backend — wardrobe management, outfit generation, and personal styling",
    version="2.0.0",
    lifespan=lifespan
)

# Allow CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images as static files
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Register all routers
app.include_router(auth.router)
app.include_router(closet.router)
app.include_router(outfit_generator.router)
app.include_router(assistant.router)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to Dollaby API v2.0",
        "docs": "/docs",
        "features": ["wardrobe management", "AI outfit generation", "AI fashion assistant", "virtual try-on"]
    }
