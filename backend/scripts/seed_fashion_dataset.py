"""
Import the Kaggle Fashion Product Images (small) dataset into the catalog.

Steps:
1. Reads /tmp/fashion/styles.csv for metadata
2. Copies images into uploads/catalog/
3. Runs rembg background removal on each image
4. Upserts rows into catalog_items in Supabase

Run from /app inside the container:
    python3 scripts/seed_fashion_dataset.py
"""

import os, sys, shutil, csv, uuid, json
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.database import get_supabase
from dotenv import load_dotenv
load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
DATASET_DIR  = "/tmp/fashion"
IMAGES_DIR   = os.path.join(DATASET_DIR, "images")
STYLES_CSV   = os.path.join(DATASET_DIR, "styles.csv")
CATALOG_DIR  = "uploads/catalog"
MAX_ITEMS    = 500          # limit for demo — increase if you want more
REMOVE_BG    = True         # set False to skip rembg (faster, white bg kept)

# ── Category mapping from dataset labels to app categories ───────────────────
CATEGORY_MAP = {
    "Topwear": "Top", "Tshirts": "Top", "Shirts": "Top", "Tops": "Top",
    "Kurtas": "Top", "Blouses": "Top", "Sweatshirts": "Top", "Jackets": "Outerwear",
    "Sweaters": "Top", "Innerwear": "Top", "Tank Tops": "Top", "Tunics": "Top",
    "Rompers": "Dress",
    "Bottomwear": "Bottom", "Jeans": "Bottom", "Track Pants": "Bottom",
    "Shorts": "Bottom", "Skirts": "Bottom", "Trousers": "Bottom",
    "Capris": "Bottom", "Leggings": "Bottom", "Joggers": "Bottom",
    "Dresses": "Dress", "Dress": "Dress", "Jumpsuits": "Dress",
    "Jackets": "Outerwear", "Coats": "Outerwear", "Blazers": "Outerwear",
    "Waistcoat": "Outerwear", "Windcheater": "Outerwear",
    "Shoes": "Shoes", "Casual Shoes": "Shoes", "Sports Shoes": "Shoes",
    "Formal Shoes": "Shoes", "Heels": "Shoes", "Flats": "Shoes",
    "Sandals": "Shoes", "Flip Flops": "Shoes", "Boots": "Shoes",
    "Bags": "Accessories", "Handbags": "Accessories", "Belts": "Accessories",
    "Watches": "Accessories", "Sunglasses": "Accessories", "Caps": "Accessories",
    "Scarves": "Accessories", "Jewellery": "Accessories", "Wallets": "Accessories",
    "Backpacks": "Accessories", "Clutches": "Accessories",
}

SEASON_MAP = {
    "Summer": "Summer", "Winter": "Winter", "Spring": "Spring",
    "Fall": "Fall", "Autumn": "Fall",
}

GENDER_MAP = {
    "Men": "Men", "Women": "Women", "Boys": "Men", "Girls": "Women",
    "Unisex": "Unisex",
}

OCCASION_MAP = {
    "Casual": "Casual", "Formal": "Formal", "Sports": "Sport",
    "Ethnic": "Casual", "Smart Casual": "Casual", "Party": "Party",
    "Travel": "Casual", "Home": "Casual", "NA": "Casual",
}

os.makedirs(CATALOG_DIR, exist_ok=True)

def remove_background(data: bytes) -> bytes:
    try:
        from rembg import remove
        return remove(data)
    except Exception as e:
        print(f"    rembg failed: {e}")
        return data


def main():
    db = get_supabase()

    if not os.path.exists(STYLES_CSV):
        print(f"ERROR: {STYLES_CSV} not found. Is the dataset downloaded?")
        sys.exit(1)

    print("Reading styles.csv …")
    rows = []
    with open(STYLES_CSV, encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    print(f"  {len(rows)} rows in CSV")

    # Filter to rows that have an image file
    valid = []
    for row in rows:
        img_path = os.path.join(IMAGES_DIR, f"{row['id']}.jpg")
        if os.path.exists(img_path):
            valid.append(row)
        if len(valid) >= MAX_ITEMS:
            break

    print(f"  {len(valid)} items have images → processing up to {MAX_ITEMS}")

    # Clear existing catalog
    print("Clearing existing catalog_items …")
    db.table("catalog_items").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

    inserted = 0
    batch = []

    for i, row in enumerate(valid):
        item_id  = row.get("id", "").strip()
        name     = row.get("productDisplayName", f"Item {item_id}").strip()
        sub_cat  = row.get("subCategory", "").strip()
        category = CATEGORY_MAP.get(sub_cat, CATEGORY_MAP.get(row.get("articleType",""), "Top"))
        color    = row.get("baseColour", "Unknown").strip()
        season   = SEASON_MAP.get(row.get("season",""), "All")
        gender   = GENDER_MAP.get(row.get("gender",""), "Unisex")
        occasion = OCCASION_MAP.get(row.get("usage",""), "Casual")

        src_path = os.path.join(IMAGES_DIR, f"{item_id}.jpg")
        dst_name = f"catalog_{item_id}.jpg"
        dst_path = os.path.join(CATALOG_DIR, dst_name)

        # Process image
        try:
            with open(src_path, "rb") as f:
                img_bytes = f.read()

            if REMOVE_BG:
                processed = remove_background(img_bytes)
                ext = "png"
                dst_name = f"catalog_{item_id}.png"
                dst_path = os.path.join(CATALOG_DIR, dst_name)
            else:
                processed = img_bytes
                ext = "jpg"

            with open(dst_path, "wb") as f:
                f.write(processed)

            image_url = f"/uploads/catalog/{dst_name}"

        except Exception as e:
            print(f"  [{i+1}] SKIP {item_id}: {e}")
            continue

        batch.append({
            "name":        name[:100],
            "category":    category,
            "color":       color,
            "season":      season,
            "gender":      gender,
            "occasion":    occasion,
            "fabric":      "Unknown",
            "brand":       None,
            "tags":        [],
            "description": f"{color} {sub_cat} for {gender.lower()}",
            "image_url":   image_url,
        })

        if len(batch) >= 20:
            db.table("catalog_items").insert(batch).execute()
            inserted += len(batch)
            print(f"  [{i+1}/{len(valid)}] Inserted {inserted} items …")
            batch = []

    if batch:
        db.table("catalog_items").insert(batch).execute()
        inserted += len(batch)

    print(f"\n✅ Done — {inserted} catalog items seeded with real fashion images!")
    if REMOVE_BG:
        print("   Background removed on all images (rembg).")
    else:
        print("   White backgrounds kept (rembg skipped).")


if __name__ == "__main__":
    main()
