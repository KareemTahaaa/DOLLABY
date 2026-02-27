import os
import shutil
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from database import get_database
from auth import get_current_user
from models import ClothingItemCreate, ClothingItemResponse

router = APIRouter(prefix="/closet", tags=["Closet"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def serialize_item(item: dict) -> dict:
    return {
        "id": str(item["_id"]),
        "user_id": item.get("user_id", ""),
        "name": item.get("name", ""),
        "category": item.get("category", ""),
        "color": item.get("color", ""),
        "season": item.get("season", "All"),
        "brand": item.get("brand"),
        "fabric": item.get("fabric"),
        "tags": item.get("tags", []),
        "image_url": item.get("image_url"),
    }


@router.get("", response_model=list[ClothingItemResponse])
async def get_closet(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    user_id = str(current_user["_id"])
    items = await db["clothing_items"].find({"user_id": user_id}).to_list(length=500)
    return [serialize_item(i) for i in items]


@router.post("/upload", response_model=ClothingItemResponse)
async def upload_clothing_item(
    name: str = Form(...),
    category: str = Form(...),
    color: str = Form(...),
    season: str = Form(...),
    brand: Optional[str] = Form(None),
    fabric: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),  # comma-separated
    image: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    user_id = str(current_user["_id"])

    # Save the image file
    ext = os.path.splitext(image.filename)[1]
    filename = f"{user_id}_{ObjectId()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(image.file, f)

    image_url = f"/uploads/{filename}"

    # Parse tags
    tags_list = [t.strip() for t in tags.split(",")] if tags else []

    item_doc = {
        "user_id": user_id,
        "name": name,
        "category": category,
        "color": color,
        "season": season,
        "brand": brand,
        "fabric": fabric,
        "tags": tags_list,
        "image_url": image_url,
    }

    result = await db["clothing_items"].insert_one(item_doc)
    item_doc["_id"] = result.inserted_id
    return serialize_item(item_doc)


@router.delete("/{item_id}")
async def delete_clothing_item(
    item_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    user_id = str(current_user["_id"])

    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID")

    result = await db["clothing_items"].delete_one({
        "_id": ObjectId(item_id),
        "user_id": user_id
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")

    return {"message": "Item deleted successfully"}
