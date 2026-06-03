import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional

from core.database import get_supabase
from api.v1.auth import get_current_user
from models.schemas import ClothingItemCreate, ClothingItemResponse

# Try importing rembg once at startup — it calls sys.exit(1) (SystemExit) if
# onnxruntime is missing, so we must catch BaseException, not just Exception.
try:
    from rembg import remove as _rembg_remove
    _REMBG_AVAILABLE = True
except BaseException:
    _rembg_remove = None
    _REMBG_AVAILABLE = False

router = APIRouter(prefix="/closet", tags=["Closet"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

VISION_PROMPT = """You are an elite AI fashion classifier. Analyze this clothing image with EXTREME PRECISION.

Return ONLY a raw JSON object with these exact fields:

"category": Classify as EXACTLY ONE of these (read the distinctions carefully):
  - "Top" = T-shirts, polo shirts, dress shirts, blouses, sweaters, hoodies, sweatshirts, tank tops, crop tops — worn on the UPPER body ONLY
  - "Bottom" = Jeans, trousers, pants, chinos, cargo pants, shorts, skirts, leggings, joggers — worn on the LOWER body ONLY
  - "Dress" = Dresses, jumpsuits, rompers, overalls — ONE-PIECE garments covering BOTH torso AND legs/hips simultaneously
  - "Outerwear" = Jackets, coats, blazers, parkas, windbreakers, anoraks, cardigans — worn OVER other clothing, usually with full-length front opening
  - "Shoes" = Any footwear: sneakers, boots, heels, sandals, loafers, oxfords, slippers, espadrilles
  - "Accessories" = Bags, purses, belts, scarves, hats, caps, berets, jewelry, watches, sunglasses, ties, gloves

"color": Specific precise color name — DO NOT use generic names like "Blue" or "Red". Use specific names:
  Blues: "Navy Blue", "Royal Blue", "Cobalt Blue", "Sky Blue", "Baby Blue", "Denim Blue", "Teal", "Cerulean"
  Greens: "Forest Green", "Olive Green", "Sage Green", "Mint Green", "Emerald", "Army Green", "Khaki"
  Reds: "Burgundy", "Wine Red", "Crimson", "Scarlet", "Tomato Red", "Coral", "Rust"
  Pinks: "Dusty Rose", "Blush Pink", "Hot Pink", "Fuchsia", "Mauve", "Salmon"
  Yellows/Oranges: "Mustard Yellow", "Butter Yellow", "Amber", "Burnt Orange", "Terracotta", "Peach"
  Neutrals: "Pure White", "Off-White", "Ivory", "Cream", "Ecru", "Light Grey", "Mid Grey", "Charcoal Grey", "Slate", "Jet Black"
  Browns: "Camel", "Sand", "Tan", "Cognac Brown", "Chocolate Brown", "Espresso"
  Purples: "Lavender", "Lilac", "Plum", "Violet", "Indigo"
  Patterns: "Navy Blue & White Stripes", "Black & White Check", "Floral Print on White", "Camouflage Green", "Leopard Print"

"season": Based on fabric weight, thickness, and style:
  - "Summer" = Lightweight fabrics (linen, thin cotton, chiffon, rayon), shorts, sleeveless, open-toe footwear, swimwear
  - "Winter" = Heavy fabrics (wool, cashmere, fleece, thick cable-knit, down, faux fur, heavy denim), warm boots, coats
  - "Spring" = Light-to-medium weight (chambray, light denim, light knit, cotton blend), trench coats, light layers
  - "Fall" = Medium-to-heavy (flannel, corduroy, mid-weight wool, suede, leather), ankle boots, cardigans, layering
  - "All" = Versatile year-round pieces: classic plain t-shirts, standard jeans, basic accessories, classic white sneakers, simple loafers

"fabric": Identify from: "Cotton", "Denim", "Polyester", "Wool", "Cashmere", "Linen", "Silk", "Leather", "Faux Leather", "Fleece", "Knit", "Chiffon", "Velvet", "Suede", "Nylon", "Rayon", "Canvas", "Unknown"

"tags": Exactly 3 style descriptors from: ["casual", "formal", "business", "business-casual", "streetwear", "athletic", "bohemian", "minimalist", "vintage", "retro", "luxury", "preppy", "romantic", "edgy", "classic", "smart-casual", "sporty", "gothic", "cottagecore"]

Respond ONLY with raw JSON. No markdown. No explanation. No code fences."""


def serialize_item(item: dict) -> dict:
    return {
        "id":        item["id"],
        "user_id":   item.get("user_id", ""),
        "name":      item.get("name", ""),
        "category":  item.get("category", ""),
        "color":     item.get("color", ""),
        "season":    item.get("season", "All"),
        "brand":     item.get("brand"),
        "fabric":    item.get("fabric"),
        "tags":      item.get("tags") or [],
        "image_url": item.get("image_url"),
    }


@router.get("", response_model=list[ClothingItemResponse])
def get_closet(current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    res = db.table("clothing_items").select("*").eq("user_id", current_user["id"]).execute()
    return [serialize_item(i) for i in (res.data or [])]


@router.post("/upload", response_model=ClothingItemResponse)
async def upload_clothing_item(
    name:    str            = Form(...),
    brand:   Optional[str] = Form(None),
    image:   UploadFile     = File(...),
    current_user: dict      = Depends(get_current_user),
):
    user_id = current_user["id"]
    input_bytes = await image.read()

    # ── Background removal ────────────────────────────────────────────
    if _REMBG_AVAILABLE and _rembg_remove is not None:
        try:
            import asyncio
            loop = asyncio.get_running_loop()
            output_bytes = await loop.run_in_executor(None, _rembg_remove, input_bytes)
        except Exception as e:
            print("Background removal failed:", e)
            output_bytes = input_bytes
    else:
        output_bytes = input_bytes

    filename  = f"{user_id}_{uuid.uuid4().hex[:8]}.png"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(output_bytes)

    image_url = f"/uploads/{filename}"
    category, color, season, fabric, tags_list = "Top", "Unknown", "All", "Unknown", []

    # ── AI vision classification ──────────────────────────────────────
    import base64, json
    from groq import Groq
    from core.config import GROQ_API_KEY

    try:
        with open(file_path, "rb") as f:
            encoded_image = base64.b64encode(f.read()).decode("utf-8")

        if GROQ_API_KEY:
            client = Groq(api_key=GROQ_API_KEY)
            resp = client.chat.completions.create(
                model="meta-llama/llama-4-scout-17b-16e-instruct",
                messages=[{"role": "user", "content": [
                    {"type": "text",      "text": VISION_PROMPT},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{encoded_image}"}},
                ]}],
                temperature=0.05,   # very low for deterministic classification
                max_tokens=300,
            )
            raw  = resp.choices[0].message.content
            # Strip markdown fences if model adds them despite instructions
            raw  = raw.replace("```json", "").replace("```", "").strip()
            meta = json.loads(raw)

            category  = meta.get("category", "Top")
            color     = meta.get("color",    "Unknown")
            season    = meta.get("season",   "All")
            fabric    = meta.get("fabric",   "Unknown")
            tags_list = meta.get("tags",     [])

            # Validate category is one of the allowed values
            valid_cats = {"Top", "Bottom", "Dress", "Outerwear", "Shoes", "Accessories"}
            if category not in valid_cats:
                category = "Top"

            valid_seasons = {"Summer", "Winter", "Spring", "Fall", "All"}
            if season not in valid_seasons:
                season = "All"

    except Exception as e:
        print("Vision AI Error:", e)

    try:
        db  = get_supabase()
        res = db.table("clothing_items").insert({
            "user_id":   user_id,
            "name":      name,
            "category":  category,
            "color":     color,
            "season":    season,
            "brand":     brand,
            "fabric":    fabric,
            "tags":      tags_list,
            "image_url": image_url,
        }).execute()
        return serialize_item(res.data[0])
    except Exception as e:
        print("Database insert failed:", e)
        raise HTTPException(status_code=500, detail=f"Failed to save item: {str(e)}")


@router.delete("/{item_id}")
def delete_clothing_item(item_id: str, current_user: dict = Depends(get_current_user)):
    db  = get_supabase()
    res = db.table("clothing_items").delete() \
            .eq("id", item_id).eq("user_id", current_user["id"]).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}
