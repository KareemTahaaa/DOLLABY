"""
Classify all catalog items using Groq vision AI (Llama 4 Scout).
Handles Supabase pagination and Groq rate-limit retries.

Run from /app inside the container:
    python3 scripts/classify_catalog.py
"""
import os, sys, base64, json, time
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from groq import Groq
from core.database import get_supabase
from dotenv import load_dotenv
load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
db     = get_supabase()

MODEL  = "meta-llama/llama-4-scout-17b-16e-instruct"
PROMPT = (
    "Analyze this clothing garment image and return ONLY a raw JSON object with these fields:\n"
    "\"category\": exactly one of: Top, Bottom, Dress, Outerwear, Shoes, Accessories\n"
    "\"color\": specific color name (e.g. Forest Green, Navy Blue, Ivory White, Burgundy)\n"
    "\"season\": exactly one of: Summer, Winter, Spring, Fall, All\n"
    "\"gender\": exactly one of: Men, Women, Unisex\n"
    "\"occasion\": exactly one of: Casual, Formal, Business, Party, Sport, Vacation\n"
    "\"name\": short descriptive product name (e.g. Forest Green Lace-Up Bodysuit)\n"
    "\"tags\": array of exactly 3 style tags from: casual, formal, business, streetwear, "
    "athletic, bohemian, minimalist, vintage, luxury, preppy, romantic, edgy, classic, smart-casual, sporty\n"
    "Respond ONLY with raw JSON. No markdown, no explanation."
)

VALID_CATS    = {"Top", "Bottom", "Dress", "Outerwear", "Shoes", "Accessories"}
VALID_SEASONS = {"Summer", "Winter", "Spring", "Fall", "All"}
VALID_GENDERS = {"Men", "Women", "Unisex"}
VALID_OCC     = {"Casual", "Formal", "Business", "Party", "Sport", "Vacation"}


def fetch_all_items():
    """Fetch all catalog items using Supabase pagination."""
    all_items = []
    page_size = 1000
    offset    = 0
    while True:
        page = db.table("catalog_items").select("id,image_url").range(offset, offset + page_size - 1).execute()
        if not page.data:
            break
        all_items.extend(page.data)
        if len(page.data) < page_size:
            break
        offset += page_size
    return all_items


def classify_image(image_path: str) -> dict | None:
    max_retries = 3
    for attempt in range(max_retries):
        try:
            with open(image_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()

            resp = client.chat.completions.create(
                model=MODEL,
                messages=[{"role": "user", "content": [
                    {"type": "text",      "text": PROMPT},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                ]}],
                temperature=0.1,
                max_tokens=250,
            )
            raw  = resp.choices[0].message.content.strip()
            raw  = raw.replace("```json", "").replace("```", "").strip()
            data = json.loads(raw)

            cat    = data.get("category", "Top");    cat    = cat    if cat    in VALID_CATS    else "Top"
            season = data.get("season",   "All");    season = season if season in VALID_SEASONS else "All"
            gender = data.get("gender",   "Unisex"); gender = gender if gender in VALID_GENDERS else "Unisex"
            occ    = data.get("occasion", "Casual"); occ    = occ    if occ    in VALID_OCC     else "Casual"
            tags   = data.get("tags", []);           tags   = (tags if isinstance(tags, list) else [])[:3]

            return {
                "category": cat,
                "color":    data.get("color", "Unknown"),
                "season":   season,
                "gender":   gender,
                "occasion": occ,
                "name":     data.get("name", "Garment"),
                "tags":     tags,
            }

        except Exception as e:
            err = str(e)
            if "rate_limit" in err.lower() or "429" in err:
                wait = 30 * (attempt + 1)
                print(f"    Rate limited — waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"    Error ({attempt+1}/{max_retries}): {err[:80]}")
                if attempt < max_retries - 1:
                    time.sleep(3)
                else:
                    return None
    return None


def main():
    items = fetch_all_items()
    print(f"Found {len(items)} catalog items to classify\n")

    success = 0
    failed  = 0

    for i, item in enumerate(items):
        image_url = item.get("image_url", "")
        if not image_url.startswith("/uploads/catalog/"):
            failed += 1
            continue

        fname = image_url.replace("/uploads/catalog/", "")
        fpath = os.path.join("uploads/catalog", fname)

        if not os.path.exists(fpath):
            print(f"  [{i+1}] MISSING: {fpath}")
            failed += 1
            continue

        result = classify_image(fpath)

        if result:
            db.table("catalog_items").update(result).eq("id", item["id"]).execute()
            success += 1
            if success % 50 == 0:
                print(f"  [{i+1}/{len(items)}] {success} done — {result['name']}")
        else:
            failed += 1

        time.sleep(1.2)   # stay under Groq rate limit

    print(f"\nDone: {success} classified, {failed} failed")


if __name__ == "__main__":
    main()
