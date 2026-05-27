#!/usr/bin/env python3
"""
Seed Dollaby catalog from the Kaggle Fashion Product Images dataset.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This script downloads ~44,000 fashion products (with images), selects 2,000
representative items across all six clothing categories, copies the resized
images to uploads/catalog/, and seeds the Supabase catalog_items table.

SETUP (one-time):
─────────────────
1. Install extras:
      pip install kaggle pillow tqdm

2. Get your Kaggle API key:
      → https://www.kaggle.com/settings  →  API  →  "Create New Token"
      → This downloads kaggle.json

3. Place kaggle.json at:
      Windows : C:\\Users\\<you>\\.kaggle\\kaggle.json
      Mac/Linux: ~/.kaggle/kaggle.json

   Or set environment variables:
      set KAGGLE_USERNAME=your_username
      set KAGGLE_KEY=your_key

RUN (from the /backend directory):
────────────────────────────────────
   python scripts/seed_catalog_kaggle.py

   Options:
      --limit 2000     Total items to seed (default: 2000)
      --no-images      Skip image download (catalog metadata only)
      --clear          Delete existing catalog before seeding
"""

import argparse
import csv
import io
import os
import random
import shutil
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

# ── Add backend root to path ──────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

# ── Constants ─────────────────────────────────────────────────────────────────
DATASET_SLUG   = "paramaggarwal/fashion-product-images-small"
DOWNLOAD_DIR   = ROOT / "scripts" / "_kaggle_cache"
CATALOG_IMG_DIR= ROOT / "uploads" / "catalog"
RANDOM_SEED    = 42

# Items per category
CATEGORY_LIMITS = {
    "Top":          400,
    "Bottom":       350,
    "Dress":        200,
    "Outerwear":    250,
    "Shoes":        400,
    "Accessories":  400,
}

# ── Schema mappings ───────────────────────────────────────────────────────────
ARTICLE_TO_CATEGORY: dict[str, str] = {
    # ── Tops ──
    "Tshirts":       "Top",  "Shirts":        "Top",  "Tops":          "Top",
    "Casual Shirts": "Top",  "Formal Shirts": "Top",  "Sweatshirts":   "Top",
    "Sweaters":      "Top",  "Polo":          "Top",  "Blouses":       "Top",
    "Tank Tops":     "Top",  "Tunics":        "Top",  "Crop Tops":     "Top",
    "Kurtas":        "Top",  "Innerwear Vests":"Top", "Thermal Tops":  "Top",
    # ── Bottoms ──
    "Jeans":       "Bottom","Track Pants":  "Bottom","Shorts":      "Bottom",
    "Trousers":    "Bottom","Skirts":       "Bottom","Leggings":    "Bottom",
    "Capris":      "Bottom","Palazzos":     "Bottom","Salwar":      "Bottom",
    "Churidar":    "Bottom","Tracksuits":   "Bottom",
    # ── Dresses ──
    "Dresses":    "Dress",  "Jumpsuits":   "Dress",  "Rompers":     "Dress",
    "Sarees":     "Dress",
    # ── Outerwear ──
    "Jackets":     "Outerwear","Blazers":  "Outerwear","Coats":      "Outerwear",
    "Windcheaters":"Outerwear","Shrugs":   "Outerwear","Cardigan":   "Outerwear",
    "Waistcoat":   "Outerwear","Ponchos":  "Outerwear",
    # ── Shoes ──
    "Sports Shoes":"Shoes",  "Casual Shoes":"Shoes", "Formal Shoes":"Shoes",
    "Heels":       "Shoes",  "Flats":      "Shoes",  "Sandals":     "Shoes",
    "Boots":       "Shoes",  "Loafers":    "Shoes",  "Flip Flops":  "Shoes",
    "Sports Sandals":"Shoes","Sneakers":   "Shoes",  "Mules":       "Shoes",
    "Ballet Flats":"Shoes",  "Wedges":     "Shoes",
    # ── Accessories ──
    "Handbags":  "Accessories","Backpacks":   "Accessories","Wallets":    "Accessories",
    "Belts":     "Accessories","Watches":     "Accessories","Sunglasses": "Accessories",
    "Scarves":   "Accessories","Hats":        "Accessories","Socks":      "Accessories",
    "Ties":      "Accessories","Caps":        "Accessories","Headbands":  "Accessories",
    "Clutches":  "Accessories","Necklace and Chains":"Accessories",
    "Earrings":  "Accessories","Bracelet":    "Accessories","Ring":       "Accessories",
    "Pendant":   "Accessories","Stoles":      "Accessories","Mufflers":   "Accessories",
    "Gloves":    "Accessories","Suspenders":  "Accessories","Cufflinks":  "Accessories",
}

GENDER_MAP: dict[str, str] = {
    "Men": "Men", "Women": "Women",
    "Boys": "Men", "Girls": "Women",
    "Unisex": "Unisex",
}

USAGE_MAP: dict[str, str] = {
    "Casual":       "Casual",
    "Formal":       "Formal",
    "Sports":       "Sport",
    "Smart Casual": "Business",
    "Party":        "Party",
    "Travel":       "Vacation",
    "Home":         "Casual",
    "Ethnic":       "Casual",
    "NA":           "Casual",
}

VALID_SEASONS = {"Summer", "Winter", "Spring", "Fall"}

# Fabric hints from article type
FABRIC_HINTS: dict[str, str] = {
    "Jeans": "Denim",    "Tshirts": "Cotton",  "Shirts": "Cotton",
    "Formal Shirts": "Cotton", "Sweaters": "Wool", "Sweatshirts": "Fleece",
    "Track Pants": "Polyester", "Jackets": "Unknown", "Blazers": "Wool",
    "Coats": "Wool",  "Sports Shoes": "Canvas", "Casual Shoes": "Leather",
    "Formal Shoes": "Leather", "Boots": "Leather", "Heels": "Leather",
    "Sandals": "Leather", "Backpacks": "Canvas", "Handbags": "Leather",
    "Wallets": "Leather", "Belts": "Leather", "Scarves": "Wool",
    "Dresses": "Polyester", "Skirts": "Cotton", "Shorts": "Cotton",
    "Trousers": "Cotton",
}


# ── Helper ────────────────────────────────────────────────────────────────────

def check_kaggle():
    try:
        import kaggle  # noqa
    except ImportError:
        print("❌ kaggle package not installed. Run: pip install kaggle")
        sys.exit(1)
    # Check credentials — support all three auth methods
    cfg_json        = Path.home() / ".kaggle" / "kaggle.json"
    cfg_token       = Path.home() / ".kaggle" / "access_token"
    has_env_classic = os.getenv("KAGGLE_USERNAME") and os.getenv("KAGGLE_KEY")
    has_env_token   = os.getenv("KAGGLE_API_TOKEN")

    if cfg_token.exists() and not cfg_json.exists():
        # New token format — convert to kaggle.json so the kaggle library can read it
        token = cfg_token.read_text().strip()
        # Extract username from token if possible, else use a placeholder
        # The kaggle library with new tokens sets KAGGLE_API_TOKEN env var
        os.environ["KAGGLE_API_TOKEN"] = token

    if not cfg_json.exists() and not has_env_classic and not has_env_token and not os.getenv("KAGGLE_API_TOKEN"):
        print("❌ Kaggle credentials not found.")
        print("   1. Go to https://www.kaggle.com/settings -> API -> Create New Token")
        print(f"   2. Save the token to {cfg_token}  OR  kaggle.json to {cfg_json}")
        sys.exit(1)


def download_dataset() -> Path:
    """Download and unzip the Kaggle dataset. Returns path to the extracted folder."""
    import kaggle  # noqa

    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    extracted = DOWNLOAD_DIR / "fashion-product-images-small"

    if extracted.exists() and (extracted / "styles.csv").exists():
        print(f"✓ Dataset already downloaded at {extracted}")
        return extracted

    print(f"⬇  Downloading {DATASET_SLUG} from Kaggle…")
    print("   (This may take a few minutes — dataset is ~900 MB)")
    kaggle.api.dataset_download_files(
        DATASET_SLUG,
        path=str(DOWNLOAD_DIR),
        unzip=True,
        quiet=False,
    )

    # The extract path depends on the dataset
    # Try common locations
    candidates = [
        DOWNLOAD_DIR / "fashion-product-images-small",
        DOWNLOAD_DIR,
    ]
    for c in candidates:
        if (c / "styles.csv").exists():
            print(f"✓ Dataset extracted to {c}")
            return c

    print("❌ Could not find styles.csv after extraction. Contents of download dir:")
    for p in DOWNLOAD_DIR.iterdir():
        print(f"   {p}")
    sys.exit(1)


def read_styles(dataset_dir: Path) -> list[dict]:
    """Parse styles.csv. Returns list of clean row dicts."""
    csv_path = dataset_dir / "styles.csv"
    rows = []
    with open(csv_path, encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                item_id      = int(row["id"].strip())
                article_type = (row.get("articleType") or "").strip()
                base_colour  = (row.get("baseColour")  or "").strip()
                season       = (row.get("season")       or "").strip()
                gender       = (row.get("gender")       or "Unisex").strip()
                usage        = (row.get("usage")        or "Casual").strip()
                display_name = (row.get("productDisplayName") or "").strip()

                if not article_type or not display_name:
                    continue
                if article_type not in ARTICLE_TO_CATEGORY:
                    continue

                category = ARTICLE_TO_CATEGORY[article_type]
                rows.append({
                    "id":           item_id,
                    "name":         display_name,
                    "category":     category,
                    "color":        base_colour or "Unknown",
                    "season":       season if season in VALID_SEASONS else "All",
                    "gender":       GENDER_MAP.get(gender, "Unisex"),
                    "occasion":     USAGE_MAP.get(usage, "Casual"),
                    "fabric":       FABRIC_HINTS.get(article_type, "Unknown"),
                    "article_type": article_type,
                    "tags":         [],
                })
            except (ValueError, KeyError):
                continue

    print(f"  Parsed {len(rows)} valid rows from styles.csv")
    return rows


def select_items(rows: list[dict], limit: int) -> list[dict]:
    """Select a balanced, diverse subset across categories."""
    random.seed(RANDOM_SEED)

    # Scale category limits proportionally to the total requested limit
    total_default = sum(CATEGORY_LIMITS.values())
    by_category: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        by_category[row["category"]].append(row)

    selected = []
    for cat, cat_limit_default in CATEGORY_LIMITS.items():
        cat_limit = max(1, int(cat_limit_default / total_default * limit))
        pool = by_category.get(cat, [])
        if not pool:
            print(f"  ⚠ No items found for category: {cat}")
            continue
        # Shuffle and sample
        random.shuffle(pool)
        chosen = pool[:cat_limit]
        selected.extend(chosen)
        print(f"  {cat:<12} {len(chosen):>4} items  (pool size: {len(pool)})")

    return selected


def copy_images(
    dataset_dir: Path,
    items: list[dict],
    skip_images: bool = False,
) -> dict[int, str]:
    """
    Copy (and resize) images from dataset to uploads/catalog/.
    Returns mapping: item_id → image_url (the FastAPI-served path)
    """
    if skip_images:
        return {item["id"]: None for item in items}

    try:
        from PIL import Image as PILImage
        from tqdm import tqdm as _tqdm
        use_tqdm = True
    except ImportError:
        use_tqdm = False
        print("  (install pillow and tqdm for progress bars)")

    CATALOG_IMG_DIR.mkdir(parents=True, exist_ok=True)
    img_dir = dataset_dir / "images"

    id_to_url: dict[int, str] = {}
    iterator  = items
    if use_tqdm:
        iterator = _tqdm(items, desc="  Copying images", unit="img")

    skipped = 0
    for item in iterator:
        item_id = item["id"]
        src     = img_dir / f"{item_id}.jpg"
        dst     = CATALOG_IMG_DIR / f"{item_id}.jpg"

        if not src.exists():
            skipped += 1
            id_to_url[item_id] = None
            continue

        if dst.exists():
            id_to_url[item_id] = f"/uploads/catalog/{item_id}.jpg"
            continue

        try:
            if use_tqdm:
                from PIL import Image as PILImage
            img = PILImage.open(src).convert("RGB")
            # Resize to 300×400 (portrait aspect ratio), keep proportions
            img.thumbnail((300, 400), PILImage.LANCZOS)
            # Pad to exactly 300×400 with white background
            canvas = PILImage.new("RGB", (300, 400), (255, 255, 255))
            offset = ((300 - img.width) // 2, (400 - img.height) // 2)
            canvas.paste(img, offset)
            canvas.save(dst, "JPEG", quality=88, optimize=True)
            id_to_url[item_id] = f"/uploads/catalog/{item_id}.jpg"
        except Exception as e:
            skipped += 1
            id_to_url[item_id] = None

    if skipped:
        print(f"  ⚠ {skipped} images skipped (not found or corrupted)")

    return id_to_url


def seed_database(items: list[dict], id_to_url: dict[int, str], clear: bool = False):
    """Insert selected items into Supabase catalog_items table."""
    from core.database import get_supabase

    db = get_supabase()

    if clear:
        print("  Clearing existing catalog rows…")
        db.table("catalog_items") \
          .delete() \
          .neq("id", "00000000-0000-0000-0000-000000000000") \
          .execute()

    print(f"  Inserting {len(items)} catalog rows…")

    BATCH = 50
    inserted = 0
    for start in range(0, len(items), BATCH):
        batch = items[start : start + BATCH]
        rows  = []
        for item in batch:
            img_url = id_to_url.get(item["id"])
            rows.append({
                "name":        item["name"],
                "category":    item["category"],
                "color":       item["color"],
                "season":      item["season"],
                "gender":      item["gender"],
                "occasion":    item["occasion"],
                "fabric":      item["fabric"],
                "tags":        item.get("tags", []),
                "description": f'{item["article_type"]} — {item["color"]} — {item["season"]}',
                "image_url":   img_url,
            })
        db.table("catalog_items").insert(rows).execute()
        inserted += len(rows)
        print(f"    ✓ Inserted rows {inserted - len(rows) + 1}–{inserted}", end="\r")

    print(f"\n  ✅ {inserted} items seeded into catalog_items.")


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Seed Dollaby catalog from Kaggle Fashion Products dataset"
    )
    parser.add_argument("--limit",     type=int,  default=2000, help="Total items to seed (default: 2000)")
    parser.add_argument("--no-images", action="store_true",     help="Skip image download (metadata only)")
    parser.add_argument("--clear",     action="store_true",     help="Delete existing catalog rows first")
    args = parser.parse_args()

    print("\n🗂  Dollaby Catalog Seeder — Kaggle Fashion Products")
    print("=" * 55)

    # 1. Check Kaggle
    print("\n[1/5] Checking Kaggle credentials…")
    check_kaggle()
    print("  ✓ Kaggle credentials found")

    # 2. Download dataset
    print("\n[2/5] Downloading dataset…")
    dataset_dir = download_dataset()

    # 3. Parse CSV
    print("\n[3/5] Parsing styles.csv…")
    all_rows = read_styles(dataset_dir)

    # 4. Select balanced items
    print(f"\n[4/5] Selecting {args.limit} representative items…")
    selected = select_items(all_rows, args.limit)
    print(f"  ✓ Selected {len(selected)} items total")

    # 5. Copy images
    print("\n[4.5/5] Copying and resizing images…")
    id_to_url = copy_images(dataset_dir, selected, skip_images=args.no_images)
    found     = sum(1 for v in id_to_url.values() if v)
    print(f"  ✓ {found}/{len(selected)} images copied to uploads/catalog/")

    # 6. Seed database
    print("\n[5/5] Seeding database…")
    seed_database(selected, id_to_url, clear=args.clear)

    print("\n✅ Done! Your catalog is ready.")
    print(f"   Items: {len(selected)}")
    print(f"   Images served at: /uploads/catalog/<id>.jpg")
    print("\n   Restart your FastAPI server and open the Catalog tab to browse.\n")


if __name__ == "__main__":
    main()
