from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from groq import AsyncGroq
import os
from database import get_database
from auth import get_current_user
from models import OutfitGenerationRequest, OutfitCreate
from closet import serialize_item

router = APIRouter(prefix="/outfits", tags=["Outfit Generator"])


def serialize_outfit(outfit: dict, items_map: dict) -> dict:
    return {
        "id": str(outfit["_id"]),
        "user_id": outfit.get("user_id", ""),
        "name": outfit.get("name", ""),
        "occasion": outfit.get("occasion"),
        "items": [serialize_item(items_map[iid]) for iid in outfit.get("items", []) if iid in items_map],
        "ai_score": outfit.get("ai_score"),
        "ai_reasoning": outfit.get("ai_reasoning"),
    }


@router.post("/generate")
async def generate_outfit(
    request: OutfitGenerationRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Generate an AI outfit recommendation based on:
    - The user's actual wardrobe from MongoDB
    - The requested occasion and season
    - GPT-4o's fashion compatibility logic
    """
    user_id = str(current_user["_id"])

    # Fetch user's wardrobe
    raw_items = await db["clothing_items"].find({"user_id": user_id}).to_list(length=500)

    if not raw_items:
        raise HTTPException(status_code=404, detail="Your closet is empty. Please upload some clothing items first.")

    # Build a structured summary of the wardrobe for the AI prompt
    wardrobe_lines = []
    for item in raw_items:
        line = f"- ID: {str(item['_id'])} | {item['name']} | Category: {item['category']} | Color: {item['color']} | Season: {item.get('season','All')}"
        wardrobe_lines.append(line)
    wardrobe_text = "\n".join(wardrobe_lines)

    system_prompt = (
        "You are an expert fashion stylist AI. Your job is to pick clothing items from a user's wardrobe "
        "and assemble a cohesive, stylish outfit. Focus on color harmony, occasion-appropriateness, and seasonal suitability. "
        "You MUST ONLY choose items from the provided wardrobe list using their exact IDs. "
        "Respond ONLY with valid JSON in this format:\n"
        '{"selected_ids": ["id1", "id2", ...], "outfit_name": "...", "ai_score": 92, "reasoning": "..."}'
    )

    user_prompt = (
        f"Occasion: {request.occasion}\n"
        f"Season: {request.season}\n\n"
        f"My wardrobe:\n{wardrobe_text}\n\n"
        "Please create a coordinated outfit using items from the list above. "
        "Pick one item per category (Top, Bottom, Shoes) and optionally one Accessory. "
        "Return the IDs of the selected items, a stylish outfit name, an AI compatibility score (0-100), and reasoning."
    )

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY is not set in the backend .env file.")
    client = AsyncGroq(api_key=api_key)

    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        response_format={"type": "json_object"},
        temperature=0.7,
    )

    import json
    result = json.loads(response.choices[0].message.content)

    selected_ids = result.get("selected_ids", [])
    ai_score = result.get("ai_score", 85)
    reasoning = result.get("reasoning", "")
    outfit_name = result.get("outfit_name", f"{request.occasion} Look")

    # Fetch full item details for selected IDs
    valid_ids = [ObjectId(oid) for oid in selected_ids if ObjectId.is_valid(oid)]
    selected_items = await db["clothing_items"].find({"_id": {"$in": valid_ids}}).to_list(length=20)

    return {
        "outfit_name": outfit_name,
        "occasion": request.occasion,
        "items": [serialize_item(i) for i in selected_items],
        "ai_score": ai_score,
        "ai_reasoning": reasoning,
    }


@router.get("")
async def get_outfits(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    user_id = str(current_user["_id"])
    outfits = await db["outfits"].find({"user_id": user_id}).to_list(length=100)

    result = []
    for outfit in outfits:
        item_ids = [ObjectId(iid) for iid in outfit.get("items", []) if ObjectId.is_valid(iid)]
        items = await db["clothing_items"].find({"_id": {"$in": item_ids}}).to_list(length=20)
        items_map = {str(i["_id"]): i for i in items}
        result.append(serialize_outfit(outfit, items_map))
    return result


@router.post("/save")
async def save_outfit(
    outfit_data: OutfitCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    user_id = str(current_user["_id"])
    doc = {
        "user_id": user_id,
        "name": outfit_data.name,
        "occasion": outfit_data.occasion,
        "items": outfit_data.items,
        "ai_score": outfit_data.ai_score,
        "ai_reasoning": outfit_data.ai_reasoning,
    }
    result = await db["outfits"].insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Outfit saved successfully"}


@router.delete("/{outfit_id}")
async def delete_outfit(
    outfit_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    user_id = str(current_user["_id"])
    if not ObjectId.is_valid(outfit_id):
        raise HTTPException(status_code=400, detail="Invalid outfit ID")

    result = await db["outfits"].delete_one({"_id": ObjectId(outfit_id), "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Outfit not found")
    return {"message": "Outfit deleted"}
