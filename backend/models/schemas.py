from pydantic import BaseModel
from typing import Optional, List


# --- User Models ---
class UserModel(BaseModel):
    id: Optional[str] = None
    name: str
    email: str
    hashed_password: str


class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


# --- Clothing Item Models ---
class ClothingItemCreate(BaseModel):
    name: str
    category: str  # Top, Bottom, Shoes, Accessories, Outerwear, Dress
    color: str
    season: str    # Summer, Winter, Spring, Fall, All
    brand: Optional[str] = None
    fabric: Optional[str] = None
    tags: Optional[List[str]] = []


class ClothingItemResponse(BaseModel):
    id: str
    user_id: str
    name: str
    category: str
    color: str
    season: str
    brand: Optional[str] = None
    fabric: Optional[str] = None
    tags: Optional[List[str]] = []
    image_url: Optional[str] = None


# --- Outfit Models ---
class OutfitCreate(BaseModel):
    name: str
    occasion: Optional[str] = None
    items: List[str]  # List of ClothingItem IDs (UUIDs)
    ai_score: Optional[int] = None
    ai_reasoning: Optional[str] = None


class OutfitResponse(BaseModel):
    id: str
    user_id: str
    name: str
    occasion: Optional[str] = None
    items: List[ClothingItemResponse]
    ai_score: Optional[int] = None
    ai_reasoning: Optional[str] = None


# --- AI Outfit Generation Request ---
class OutfitGenerationRequest(BaseModel):
    occasion: Optional[str] = "Casual"
    season: Optional[str] = "All"


# --- AI Chat Models ---
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
