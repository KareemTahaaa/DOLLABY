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
import profile
import calendar_routes
import weather
import viton_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB
    print("Connecting to MongoDB...")
    db.client = AsyncIOMotorClient(
        MONGODB_URL,
        serverSelectionTimeoutMS=10000,  # 10 seconds
        connectTimeoutMS=10000,
        socketTimeoutMS=10000,
    )
    # Ping to confirm connection
    try:
        await db.client.admin.command("ping")
        print("[SUCCESS] Successfully connected to MongoDB Atlas!")
    except Exception as e:
        print(f"[ERROR] MongoDB connection error: {e}")
        print("[WARNING] The app will still start but DB operations will fail.")
        print("   -> Fix: Go to MongoDB Atlas -> Network Access -> Add IP Address -> Allow Access from Anywhere (0.0.0.0/0)")
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

# Custom StaticFiles to inject CORS headers
class CORSStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response

# Serve uploaded images as static files
os.makedirs("uploads", exist_ok=True)
os.makedirs("uploads/tryon_results", exist_ok=True)
app.mount("/uploads", CORSStaticFiles(directory="uploads"), name="uploads")

# Register all routers
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(closet.router)
app.include_router(outfit_generator.router)
app.include_router(assistant.router)
app.include_router(calendar_routes.router)
app.include_router(weather.router)
app.include_router(viton_service.router)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to Dollaby API v2.0",
        "docs": "/docs",
        "features": ["wardrobe management", "AI outfit generation", "AI fashion assistant", "virtual try-on (HR-VITON / IDM-VTON)"]
    }
