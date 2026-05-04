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
    brand: Optional[str] = Form(None),
    image: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    user_id = str(current_user["_id"])

    # Read the image file
    input_bytes = await image.read()
    
    # Remove Background
    try:
        from rembg import remove
        import asyncio
        loop = asyncio.get_event_loop()
        output_bytes = await loop.run_in_executor(None, remove, input_bytes)
    except Exception as e:
        print("Background removal failed:", e)
        output_bytes = input_bytes
        
    # Save the image file as PNG
    filename = f"{user_id}_{ObjectId()}.png"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as f:
        f.write(output_bytes)

    image_url = f"/uploads/{filename}"

    # AI Vision Classification
    category, color, season, fabric, tags_list = "Top", "Unknown", "All", "Unknown", []
    
    import base64
    from groq import AsyncGroq
    import json

    try:
        with open(file_path, "rb") as f:
            encoded_image = base64.b64encode(f.read()).decode('utf-8')
            
        api_key = os.getenv("GROQ_API_KEY")
        if api_key:
            client = AsyncGroq(api_key=api_key)
            vision_prompt = """You are an expert AI fashion classifier. Look at this clothing item and extract the following metadata:
- category: Pick exactly ONE of ["Top", "Bottom", "Outerwear", "Shoes", "Accessories", "Dress"]. 
- color: The primary color (e.g. Navy Blue, White).
- season: Pick ONE of ["Summer", "Winter", "Spring", "Fall", "All"]. 
- fabric: The main fabric (e.g. Cotton, Denim, Leather). Say "Unknown" if you can't tell.
- tags: An array of 2-3 style tags (e.g. ["Casual", "Vintage"]).
Respond ONLY with a raw JSON object format and nothing else."""

            resp = await client.chat.completions.create(
                model="llama-3.2-90b-vision-preview",
                messages=[
                    {"role": "user", "content": [
                        {"type": "text", "text": vision_prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encoded_image}"}}
                    ]}
                ],
                temperature=0.1
            )
            raw_content = resp.choices[0].message.content
            raw_content = raw_content.replace('```json', '').replace('```', '').strip()
            metadata = json.loads(raw_content)

            category = metadata.get("category", "Top")
            color = metadata.get("color", "Unknown")
            season = metadata.get("season", "All")
            fabric = metadata.get("fabric", "Unknown")
            tags_list = metadata.get("tags", [])
    except Exception as e:
        print("Vision AI Error:", e)

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
