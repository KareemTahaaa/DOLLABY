from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from api.v1 import auth, assistant, calendar, catalog, closet, outfits, profile, tryon, simple_tryon, weather

app = FastAPI(
    title="Dollaby API",
    description="AI-powered fashion-tech SaaS backend — wardrobe management, outfit generation, and personal styling",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CORSStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response


os.makedirs("uploads", exist_ok=True)
os.makedirs("uploads/tryon_results", exist_ok=True)
os.makedirs("uploads/catalog", exist_ok=True)
app.mount("/uploads", CORSStaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(closet.router)
app.include_router(catalog.router)
app.include_router(outfits.router)
app.include_router(assistant.router)
app.include_router(calendar.router)
app.include_router(weather.router)
app.include_router(tryon.router)
app.include_router(simple_tryon.router)


@app.get("/")
def read_root():
    return {
        "message": "Welcome to Dollaby API v2.0",
        "docs": "/docs",
        "features": ["wardrobe management", "AI outfit generation", "AI fashion assistant", "virtual try-on (IDM-VTON via Replicate)"]
    }
