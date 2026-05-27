#!/usr/bin/env python3
"""
Extract garment-only images from catalog photos.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Uses rembg's u2net_cloth_seg model which is specifically trained
to isolate clothing items — removing both the background AND the
model, leaving only the garment on a clean white background.

RUN (from /backend directory):
    python scripts/process_catalog_images.py

Options:
    --limit 100     Process only the first N images (for testing)
    --workers 2     Parallel workers (default 1, increase if you have RAM)
"""

import argparse
import io
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
CATALOG_DIR = ROOT / "uploads" / "catalog"


def process_one(img_path: Path, session) -> bool:
    try:
        from PIL import Image
        from rembg import remove

        with open(img_path, "rb") as f:
            img_data = f.read()

        # u2net_cloth_seg isolates garment only (no model, no background)
        result = remove(img_data, session=session)

        # Composite the transparent result onto a pure white background
        garment = Image.open(io.BytesIO(result)).convert("RGBA")
        white   = Image.new("RGBA", garment.size, (255, 255, 255, 255))
        white.paste(garment, mask=garment.split()[3])      # alpha mask
        white.convert("RGB").save(img_path, "JPEG", quality=92, optimize=True)
        return True
    except Exception as e:
        print(f"\n  ⚠ Failed {img_path.name}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit",   type=int, default=0,
                        help="Max images to process (0 = all)")
    parser.add_argument("--skip-done", action="store_true",
                        help="Skip images that are already pure-white (already processed)")
    args = parser.parse_args()

    try:
        from rembg import new_session
        from PIL import Image
        from tqdm import tqdm
    except ImportError as e:
        print(f"Missing dependency: {e}")
        print("Run: pip install rembg[cpu] pillow tqdm")
        sys.exit(1)

    images = sorted(
        list(CATALOG_DIR.glob("*.jpg")) +
        list(CATALOG_DIR.glob("*.jpeg")) +
        list(CATALOG_DIR.glob("*.png"))
    )

    if not images:
        print(f"No images found in {CATALOG_DIR}")
        sys.exit(1)

    if args.limit:
        images = images[: args.limit]

    print(f"\n Catalog Image Processor")
    print(f"=" * 50)
    print(f"  Images found : {len(images)}")
    print(f"  Model        : u2net_cloth_seg (garment-only extraction)")
    print(f"  Output       : white background, JPEG q92")
    print()
    print("  Loading model (downloads ~170 MB on first run)…")

    session = new_session("u2net_cloth_seg")
    print("  Model ready.\n")

    success = 0
    failed  = 0

    for img_path in tqdm(images, desc="Extracting garments", unit="img"):
        ok = process_one(img_path, session)
        if ok:
            success += 1
        else:
            failed += 1

    print(f"\n  Done!")
    print(f"  Processed : {success}")
    print(f"  Failed    : {failed}")
    print()
    print("  Restart the backend — images are served from uploads/catalog/")


if __name__ == "__main__":
    main()
