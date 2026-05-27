# Dollaby Catalog Setup Guide

The catalog lets users browse **44,000+ real clothing items** and add them to their closet without taking a photo.

---

## Step 1 — Create the Supabase table (once)

Open your Supabase dashboard → **SQL Editor** and run `catalog_schema.sql`.

---

## Step 2 — Get a Kaggle API key (once)

1. Go to **https://www.kaggle.com/settings**
2. Scroll to **API** section → click **"Create New Token"**
3. This downloads a `kaggle.json` file
4. Move it to:
   - **Windows**: `C:\Users\<your-name>\.kaggle\kaggle.json`
   - **Mac/Linux**: `~/.kaggle/kaggle.json`

The file looks like this:
```json
{"username":"yourname","key":"abc123..."}
```

---

## Step 3 — Install dependencies

```bash
pip install kaggle pillow tqdm
```

---

## Step 4 — Run the seed script

```bash
cd backend
python scripts/seed_catalog_kaggle.py
```

**What it does:**
1. Downloads `paramaggarwal/fashion-product-images-small` from Kaggle (~900 MB)
2. Parses `styles.csv` (44,000+ items)
3. Selects **2,000 balanced items** across all 6 categories:
   - Top: 400 items
   - Bottom: 350 items  
   - Dress: 200 items
   - Outerwear: 250 items
   - Shoes: 400 items
   - Accessories: 400 items
4. Resizes images to 300×400px and copies them to `uploads/catalog/`
5. Seeds the `catalog_items` table in Supabase

**Options:**
```bash
# Seed 3000 items instead of 2000
python scripts/seed_catalog_kaggle.py --limit 3000

# Clear existing catalog first
python scripts/seed_catalog_kaggle.py --clear

# Skip images (metadata only — catalog will show icons instead of photos)
python scripts/seed_catalog_kaggle.py --no-images

# Seed ALL 44,000 items (takes longer, more disk space)
python scripts/seed_catalog_kaggle.py --limit 44000
```

---

## Dataset info

| Field          | Source in Kaggle CSV     | Maps to            |
|---------------|--------------------------|-------------------|
| Product name  | `productDisplayName`     | `name`            |
| Category      | `articleType`            | `category`        |
| Color         | `baseColour`             | `color`           |
| Season        | `season`                 | `season`          |
| Gender        | `gender`                 | `gender`          |
| Occasion      | `usage`                  | `occasion`        |
| Image         | `images/{id}.jpg`        | `/uploads/catalog/{id}.jpg` |

**Kaggle dataset:** `paramaggarwal/fashion-product-images-small`  
**License:** Database Contents License (DbCL) v1.0

---

## After seeding

1. Restart the FastAPI backend
2. Open the app → **My Closet** → click **Catalog** tab
3. Browse 2,000 items, filter by category/gender/occasion/season
4. Click **+** on any item to add it to your closet

---

## Troubleshooting

**"kaggle: command not found"**
```bash
pip install kaggle
```

**"403 – Forbidden" from Kaggle**
- Make sure you accepted the dataset terms on Kaggle.com first
- Visit: https://www.kaggle.com/datasets/paramaggarwal/fashion-product-images-small
- Click "Download" once to accept terms, then re-run the script

**Images not showing**
- Make sure the backend is running (images are served by FastAPI)
- Check that `uploads/catalog/` contains `.jpg` files
- The frontend falls back gracefully if an image fails to load

**Script runs again from scratch every time**
- The script caches the downloaded dataset at `scripts/_kaggle_cache/`
- Subsequent runs skip the download and start from Step 3 directly
