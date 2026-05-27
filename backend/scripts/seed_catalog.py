"""
Seed the Supabase `catalog_items` table with 72 curated clothing items.

Usage (from /backend directory):
    python scripts/seed_catalog.py

The script is idempotent — it deletes existing rows then re-inserts.
Images come from Unsplash (free, no API key needed for display).
"""

import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.database import get_supabase   # noqa: E402

IMG = "https://images.unsplash.com/photo-{}?w=400&h=500&fit=crop&q=80"

CATALOG = [
    # ── TOPS ─────────────────────────────────────────────────────────────
    {
        "name": "White Classic Tee",
        "category": "Top", "color": "Pure White", "season": "All",
        "gender": "Unisex", "occasion": "Casual", "fabric": "Cotton",
        "brand": "Basics Co.", "tags": ["casual", "minimalist", "classic"],
        "description": "A timeless white crew-neck t-shirt — the ultimate wardrobe staple.",
        "image_url": IMG.format("1583743814966-8d4cc5b2a2bc"),
    },
    {
        "name": "Black Essential Tee",
        "category": "Top", "color": "Jet Black", "season": "All",
        "gender": "Unisex", "occasion": "Casual", "fabric": "Cotton",
        "brand": "Basics Co.", "tags": ["casual", "minimalist", "classic"],
        "description": "Versatile black t-shirt that pairs with everything.",
        "image_url": IMG.format("1527719327631-d174d753b6e2"),
    },
    {
        "name": "Navy Crew-Neck Sweater",
        "category": "Top", "color": "Navy Blue", "season": "Fall",
        "gender": "Unisex", "occasion": "Casual", "fabric": "Wool",
        "brand": "Heritage Knits", "tags": ["classic", "preppy", "casual"],
        "description": "Soft merino wool sweater in classic navy — perfect for layering.",
        "image_url": IMG.format("1571945153237-4929e783af4a"),
    },
    {
        "name": "Grey Pullover Hoodie",
        "category": "Top", "color": "Mid Grey", "season": "Fall",
        "gender": "Unisex", "occasion": "Casual", "fabric": "Fleece",
        "brand": "Comfort Zone", "tags": ["casual", "streetwear", "sporty"],
        "description": "Relaxed-fit fleece hoodie for everyday comfort.",
        "image_url": IMG.format("1556821840-3a63f15732ce"),
    },
    {
        "name": "White Oxford Dress Shirt",
        "category": "Top", "color": "Pure White", "season": "All",
        "gender": "Men", "occasion": "Business", "fabric": "Cotton",
        "brand": "Shirt Society", "tags": ["formal", "classic", "business"],
        "description": "Crisp Oxford cloth button-down — boardroom ready.",
        "image_url": IMG.format("1521572163474-6864f9cf17ab"),
    },
    {
        "name": "Light Blue Oxford Shirt",
        "category": "Top", "color": "Sky Blue", "season": "All",
        "gender": "Men", "occasion": "Business", "fabric": "Cotton",
        "brand": "Shirt Society", "tags": ["business-casual", "classic", "preppy"],
        "description": "The quintessential smart-casual shirt in soft sky blue.",
        "image_url": IMG.format("1598300042247-d088f8ab3a91"),
    },
    {
        "name": "Charcoal Turtleneck",
        "category": "Top", "color": "Charcoal Grey", "season": "Winter",
        "gender": "Unisex", "occasion": "Casual", "fabric": "Wool",
        "brand": "Nordic Knit", "tags": ["minimalist", "classic", "smart-casual"],
        "description": "Slim-fit wool turtleneck for a refined casual look.",
        "image_url": IMG.format("1615218323754-0b5ba1a61f07"),
    },
    {
        "name": "Navy & White Breton Top",
        "category": "Top", "color": "Navy Blue & White Stripes", "season": "Spring",
        "gender": "Women", "occasion": "Casual", "fabric": "Cotton",
        "brand": "La Marine", "tags": ["casual", "classic", "bohemian"],
        "description": "Classic French sailor stripe — eternally chic.",
        "image_url": IMG.format("1515372181985-8a5e82e40a37"),
    },
    {
        "name": "Blush Silk Blouse",
        "category": "Top", "color": "Blush Pink", "season": "Spring",
        "gender": "Women", "occasion": "Business", "fabric": "Silk",
        "brand": "Élégance Paris", "tags": ["romantic", "formal", "luxury"],
        "description": "Lightweight silk blouse in a flattering blush tone.",
        "image_url": IMG.format("1596755094514-f87e34085b2c"),
    },
    {
        "name": "Mustard Oversized Knit",
        "category": "Top", "color": "Mustard Yellow", "season": "Fall",
        "gender": "Women", "occasion": "Casual", "fabric": "Knit",
        "brand": "Studio Yarn", "tags": ["casual", "bohemian", "vintage"],
        "description": "Chunky knit sweater in warm mustard — autumn perfection.",
        "image_url": IMG.format("1511499767772-6d1e19e14e8f"),
    },
    {
        "name": "Olive Linen Shirt",
        "category": "Top", "color": "Olive Green", "season": "Summer",
        "gender": "Men", "occasion": "Casual", "fabric": "Linen",
        "brand": "Easy Linen", "tags": ["casual", "bohemian", "vacation"],
        "description": "Breathable linen shirt — ideal for warm weather.",
        "image_url": IMG.format("1583743814966-8d4cc5b2a2bc"),
    },
    {
        "name": "Burgundy Velvet Blazer Top",
        "category": "Top", "color": "Burgundy", "season": "Winter",
        "gender": "Women", "occasion": "Party", "fabric": "Velvet",
        "brand": "Night Scene", "tags": ["luxury", "formal", "edgy"],
        "description": "Statement velvet top with a structured blazer silhouette.",
        "image_url": IMG.format("1515886657613-9f3515b0c78f"),
    },

    # ── BOTTOMS ──────────────────────────────────────────────────────────
    {
        "name": "Classic Blue Straight Jeans",
        "category": "Bottom", "color": "Denim Blue", "season": "All",
        "gender": "Unisex", "occasion": "Casual", "fabric": "Denim",
        "brand": "Denim Republic", "tags": ["casual", "classic", "streetwear"],
        "description": "Straight-leg jeans in medium wash — the everyday essential.",
        "image_url": IMG.format("1542272604-787c3835535d"),
    },
    {
        "name": "Black Slim Jeans",
        "category": "Bottom", "color": "Jet Black", "season": "All",
        "gender": "Unisex", "occasion": "Casual", "fabric": "Denim",
        "brand": "Denim Republic", "tags": ["casual", "minimalist", "edgy"],
        "description": "Slim-fit black jeans — effortlessly stylish.",
        "image_url": IMG.format("1604591622-4b41a6a94dbd"),
    },
    {
        "name": "Khaki Slim Chinos",
        "category": "Bottom", "color": "Khaki", "season": "All",
        "gender": "Men", "occasion": "Business", "fabric": "Cotton",
        "brand": "City Trousers", "tags": ["business-casual", "preppy", "classic"],
        "description": "Versatile slim chinos that go from office to weekend.",
        "image_url": IMG.format("1473966968600-fa4226488d5d"),
    },
    {
        "name": "White Wide-Leg Trousers",
        "category": "Bottom", "color": "Pure White", "season": "Summer",
        "gender": "Women", "occasion": "Casual", "fabric": "Linen",
        "brand": "Easy Linen", "tags": ["bohemian", "casual", "minimalist"],
        "description": "Flowy wide-leg trousers in crisp white linen.",
        "image_url": IMG.format("1558618047-3d09ed4ccdfe"),
    },
    {
        "name": "Charcoal Tailored Trousers",
        "category": "Bottom", "color": "Charcoal Grey", "season": "All",
        "gender": "Unisex", "occasion": "Formal", "fabric": "Wool",
        "brand": "Sartorial", "tags": ["formal", "classic", "business"],
        "description": "Sharp wool-blend trousers for formal occasions.",
        "image_url": IMG.format("1490481651871-ab68de25d43d"),
    },
    {
        "name": "Black Mini Skirt",
        "category": "Bottom", "color": "Jet Black", "season": "All",
        "gender": "Women", "occasion": "Party", "fabric": "Polyester",
        "brand": "Night Scene", "tags": ["edgy", "party", "casual"],
        "description": "Classic black mini — from day to night in seconds.",
        "image_url": IMG.format("1518531933922-1363843f7b30"),
    },
    {
        "name": "Floral Midi Skirt",
        "category": "Bottom", "color": "Floral Print on White", "season": "Spring",
        "gender": "Women", "occasion": "Casual", "fabric": "Chiffon",
        "brand": "Garden Style", "tags": ["romantic", "bohemian", "casual"],
        "description": "Billowing floral print midi skirt — spring in a skirt.",
        "image_url": IMG.format("1583496661116-c7e8c4dd87d0"),
    },
    {
        "name": "Olive Cargo Pants",
        "category": "Bottom", "color": "Olive Green", "season": "Fall",
        "gender": "Men", "occasion": "Casual", "fabric": "Cotton",
        "brand": "Urban Utility", "tags": ["streetwear", "casual", "sporty"],
        "description": "Relaxed-fit cargo pants with utility pockets.",
        "image_url": IMG.format("1602192509154-0b900ee1f851"),
    },
    {
        "name": "Navy Tailored Shorts",
        "category": "Bottom", "color": "Navy Blue", "season": "Summer",
        "gender": "Men", "occasion": "Casual", "fabric": "Cotton",
        "brand": "Coastal Co.", "tags": ["casual", "preppy", "vacation"],
        "description": "Tailored mid-length shorts — smart and summer-ready.",
        "image_url": IMG.format("1555361677-3f981f756141"),
    },
    {
        "name": "Camel Corduroy Trousers",
        "category": "Bottom", "color": "Camel", "season": "Fall",
        "gender": "Unisex", "occasion": "Casual", "fabric": "Cotton",
        "brand": "Heritage Stitch", "tags": ["vintage", "casual", "classic"],
        "description": "Wide-wale corduroy trousers in warm camel.",
        "image_url": IMG.format("1490481651871-ab68de25d43d"),
    },
    {
        "name": "Dark Wash Bootcut Jeans",
        "category": "Bottom", "color": "Denim Blue", "season": "All",
        "gender": "Women", "occasion": "Casual", "fabric": "Denim",
        "brand": "Denim Republic", "tags": ["classic", "casual", "vintage"],
        "description": "Flattering bootcut silhouette in dark indigo wash.",
        "image_url": IMG.format("1542272604-787c3835535d"),
    },

    # ── DRESSES ──────────────────────────────────────────────────────────
    {
        "name": "Black Midi Dress",
        "category": "Dress", "color": "Jet Black", "season": "All",
        "gender": "Women", "occasion": "Formal", "fabric": "Polyester",
        "brand": "Noir Mode", "tags": ["classic", "formal", "minimalist"],
        "description": "The ultimate little black dress — works for every occasion.",
        "image_url": IMG.format("1539006865927-6059abd4da85"),
    },
    {
        "name": "Red Bodycon Dress",
        "category": "Dress", "color": "Scarlet", "season": "All",
        "gender": "Women", "occasion": "Party", "fabric": "Polyester",
        "brand": "Night Scene", "tags": ["edgy", "party", "glamorous"],
        "description": "Figure-hugging red dress that commands the room.",
        "image_url": IMG.format("1566479894285-eba4c3a748bf"),
    },
    {
        "name": "Floral Wrap Sundress",
        "category": "Dress", "color": "Floral Print on White", "season": "Summer",
        "gender": "Women", "occasion": "Casual", "fabric": "Rayon",
        "brand": "Garden Style", "tags": ["romantic", "bohemian", "casual"],
        "description": "Breezy wrap dress with a bold floral print.",
        "image_url": IMG.format("1572804013427-4d7ca7268217"),
    },
    {
        "name": "White Linen Mini Dress",
        "category": "Dress", "color": "Pure White", "season": "Summer",
        "gender": "Women", "occasion": "Casual", "fabric": "Linen",
        "brand": "Easy Linen", "tags": ["minimalist", "casual", "vacation"],
        "description": "Simple, cool, and effortless — summer in dress form.",
        "image_url": IMG.format("1515886657613-9f3515b0c78f"),
    },
    {
        "name": "Navy Wrap Dress",
        "category": "Dress", "color": "Navy Blue", "season": "Spring",
        "gender": "Women", "occasion": "Business", "fabric": "Polyester",
        "brand": "Office Chic", "tags": ["business-casual", "classic", "romantic"],
        "description": "Universally flattering navy wrap dress.",
        "image_url": IMG.format("1490578474895-399ad4ea485e"),
    },
    {
        "name": "Sage Green Slip Dress",
        "category": "Dress", "color": "Sage Green", "season": "Summer",
        "gender": "Women", "occasion": "Casual", "fabric": "Silk",
        "brand": "Mellow Studio", "tags": ["minimalist", "romantic", "bohemian"],
        "description": "Lightweight silk-feel slip dress in calming sage.",
        "image_url": IMG.format("1515372181985-8a5e82e40a37"),
    },
    {
        "name": "Burnt Orange Maxi Dress",
        "category": "Dress", "color": "Burnt Orange", "season": "Summer",
        "gender": "Women", "occasion": "Vacation", "fabric": "Chiffon",
        "brand": "Coastal Boho", "tags": ["bohemian", "vacation", "romantic"],
        "description": "Floor-length maxi in sunset orange — holiday vibes.",
        "image_url": IMG.format("1572804013427-4d7ca7268217"),
    },
    {
        "name": "Emerald Cocktail Dress",
        "category": "Dress", "color": "Emerald", "season": "All",
        "gender": "Women", "occasion": "Party", "fabric": "Silk",
        "brand": "Soirée", "tags": ["luxury", "party", "formal"],
        "description": "Jewel-toned emerald dress perfect for cocktail events.",
        "image_url": IMG.format("1539006865927-6059abd4da85"),
    },

    # ── OUTERWEAR ────────────────────────────────────────────────────────
    {
        "name": "Black Leather Moto Jacket",
        "category": "Outerwear", "color": "Jet Black", "season": "Fall",
        "gender": "Unisex", "occasion": "Casual", "fabric": "Leather",
        "brand": "Edge Label", "tags": ["edgy", "streetwear", "classic"],
        "description": "Classic biker jacket with asymmetric zip closure.",
        "image_url": IMG.format("1551028719-00167b16eac5"),
    },
    {
        "name": "Blue Denim Jacket",
        "category": "Outerwear", "color": "Denim Blue", "season": "Spring",
        "gender": "Unisex", "occasion": "Casual", "fabric": "Denim",
        "brand": "Denim Republic", "tags": ["casual", "streetwear", "vintage"],
        "description": "Timeless denim jacket — the perfect layering piece.",
        "image_url": IMG.format("1576566588028-4147f3842f27"),
    },
    {
        "name": "Camel Trench Coat",
        "category": "Outerwear", "color": "Camel", "season": "Spring",
        "gender": "Unisex", "occasion": "Business", "fabric": "Cotton",
        "brand": "British Standard", "tags": ["classic", "business", "formal"],
        "description": "Iconic double-breasted trench coat in warm camel.",
        "image_url": IMG.format("1548449010-1e35ab14c3f8"),
    },
    {
        "name": "Charcoal Wool Blazer",
        "category": "Outerwear", "color": "Charcoal Grey", "season": "All",
        "gender": "Unisex", "occasion": "Business", "fabric": "Wool",
        "brand": "Sartorial", "tags": ["formal", "business", "classic"],
        "description": "Single-breasted wool blazer — the cornerstone of any wardrobe.",
        "image_url": IMG.format("1555069519-127aadecd462"),
    },
    {
        "name": "Navy Wool Overcoat",
        "category": "Outerwear", "color": "Navy Blue", "season": "Winter",
        "gender": "Unisex", "occasion": "Formal", "fabric": "Wool",
        "brand": "Heritage Wool", "tags": ["classic", "formal", "luxury"],
        "description": "Long wool overcoat in deep navy — warm and sophisticated.",
        "image_url": IMG.format("1608838454524-e5a27e34f16e"),
    },
    {
        "name": "Olive Bomber Jacket",
        "category": "Outerwear", "color": "Olive Green", "season": "Fall",
        "gender": "Men", "occasion": "Casual", "fabric": "Nylon",
        "brand": "Urban Utility", "tags": ["streetwear", "casual", "sporty"],
        "description": "Lightweight nylon bomber with ribbed cuffs and collar.",
        "image_url": IMG.format("1483791836-4e72af25e9b0"),
    },
    {
        "name": "Cream Teddy Coat",
        "category": "Outerwear", "color": "Cream", "season": "Winter",
        "gender": "Women", "occasion": "Casual", "fabric": "Fleece",
        "brand": "Cozy Outerwear", "tags": ["romantic", "casual", "luxury"],
        "description": "Plush faux-shearling teddy coat for ultimate winter warmth.",
        "image_url": IMG.format("1608838454524-e5a27e34f16e"),
    },
    {
        "name": "Beige Linen Blazer",
        "category": "Outerwear", "color": "Sand", "season": "Summer",
        "gender": "Unisex", "occasion": "Business", "fabric": "Linen",
        "brand": "Resort Tailoring", "tags": ["business-casual", "minimalist", "vacation"],
        "description": "Unstructured linen blazer — relaxed tailoring for warm days.",
        "image_url": IMG.format("1555069519-127aadecd462"),
    },

    # ── SHOES ────────────────────────────────────────────────────────────
    {
        "name": "White Leather Sneakers",
        "category": "Shoes", "color": "Pure White", "season": "All",
        "gender": "Unisex", "occasion": "Casual", "fabric": "Leather",
        "brand": "Clean Steps", "tags": ["casual", "minimalist", "classic"],
        "description": "Clean white leather sneakers — wear with anything.",
        "image_url": IMG.format("1542291026-7eec264c27ff"),
    },
    {
        "name": "Classic Black Oxford",
        "category": "Shoes", "color": "Jet Black", "season": "All",
        "gender": "Men", "occasion": "Formal", "fabric": "Leather",
        "brand": "Cordwainers", "tags": ["formal", "classic", "business"],
        "description": "Polished black Oxford — the benchmark of formal footwear.",
        "image_url": IMG.format("1614252235316-8c857546f1f1"),
    },
    {
        "name": "Brown Leather Ankle Boots",
        "category": "Shoes", "color": "Cognac Brown", "season": "Fall",
        "gender": "Unisex", "occasion": "Casual", "fabric": "Leather",
        "brand": "Heritage Boot", "tags": ["classic", "casual", "vintage"],
        "description": "Versatile cognac ankle boots with a subtle block heel.",
        "image_url": IMG.format("1608253035959-f15393f55c07"),
    },
    {
        "name": "Nude Block Heels",
        "category": "Shoes", "color": "Sand", "season": "Spring",
        "gender": "Women", "occasion": "Formal", "fabric": "Suede",
        "brand": "Elevated Soles", "tags": ["formal", "classic", "romantic"],
        "description": "Nude block-heeled pumps that elongate the silhouette.",
        "image_url": IMG.format("1515347850792-e57fbb6b1b64"),
    },
    {
        "name": "White Running Sneakers",
        "category": "Shoes", "color": "Pure White", "season": "All",
        "gender": "Unisex", "occasion": "Sport", "fabric": "Canvas",
        "brand": "Pace", "tags": ["athletic", "sporty", "casual"],
        "description": "High-performance running shoe in sleek white.",
        "image_url": IMG.format("1595950653106-bde9a3f489ce"),
    },
    {
        "name": "Black Chelsea Boots",
        "category": "Shoes", "color": "Jet Black", "season": "Fall",
        "gender": "Unisex", "occasion": "Casual", "fabric": "Leather",
        "brand": "Heritage Boot", "tags": ["classic", "edgy", "smart-casual"],
        "description": "Sleek elastic-sided Chelsea boots in polished black.",
        "image_url": IMG.format("1543163521-1bf539c55dd2"),
    },
    {
        "name": "Tan Leather Loafers",
        "category": "Shoes", "color": "Tan", "season": "All",
        "gender": "Unisex", "occasion": "Business", "fabric": "Leather",
        "brand": "Cordwainers", "tags": ["business-casual", "classic", "preppy"],
        "description": "Penny loafers in supple tan leather — effortlessly smart.",
        "image_url": IMG.format("1534215962-9f9c0d2feff8"),
    },
    {
        "name": "Beige Espadrilles",
        "category": "Shoes", "color": "Sand", "season": "Summer",
        "gender": "Unisex", "occasion": "Casual", "fabric": "Canvas",
        "brand": "Coastal Co.", "tags": ["casual", "vacation", "bohemian"],
        "description": "Canvas espadrilles with jute sole — summer holiday essential.",
        "image_url": IMG.format("1542291026-7eec264c27ff"),
    },
    {
        "name": "Burgundy Heeled Ankle Boot",
        "category": "Shoes", "color": "Burgundy", "season": "Fall",
        "gender": "Women", "occasion": "Casual", "fabric": "Suede",
        "brand": "Elevated Soles", "tags": ["vintage", "edgy", "casual"],
        "description": "Rich burgundy suede boot with a stacked mid-heel.",
        "image_url": IMG.format("1543163521-1bf539c55dd2"),
    },
    {
        "name": "Black High-Top Sneakers",
        "category": "Shoes", "color": "Jet Black", "season": "All",
        "gender": "Unisex", "occasion": "Casual", "fabric": "Canvas",
        "brand": "Street Canvas", "tags": ["streetwear", "casual", "classic"],
        "description": "Iconic high-top canvas sneakers in all-black.",
        "image_url": IMG.format("1595950653106-bde9a3f489ce"),
    },

    # ── ACCESSORIES ──────────────────────────────────────────────────────
    {
        "name": "Cognac Leather Belt",
        "category": "Accessories", "color": "Cognac Brown", "season": "All",
        "gender": "Unisex", "occasion": "Casual", "fabric": "Leather",
        "brand": "Belts & Co.", "tags": ["classic", "casual", "minimalist"],
        "description": "Full-grain leather belt with a polished silver buckle.",
        "image_url": IMG.format("1553062407-98eeb64c6a62"),
    },
    {
        "name": "Black Leather Tote",
        "category": "Accessories", "color": "Jet Black", "season": "All",
        "gender": "Women", "occasion": "Business", "fabric": "Leather",
        "brand": "Carry Well", "tags": ["minimalist", "business", "classic"],
        "description": "Structured leather tote — holds your world, looks good doing it.",
        "image_url": IMG.format("1548036328-c9fa89d128fa"),
    },
    {
        "name": "Gold Minimalist Watch",
        "category": "Accessories", "color": "Gold", "season": "All",
        "gender": "Unisex", "occasion": "Formal", "fabric": "Leather",
        "brand": "Tempus Fine", "tags": ["luxury", "classic", "formal"],
        "description": "Slim gold-tone watch with a clean white dial.",
        "image_url": IMG.format("1523275335684-37898b6baf30"),
    },
    {
        "name": "Classic Tortoise Sunglasses",
        "category": "Accessories", "color": "Cognac Brown", "season": "Summer",
        "gender": "Unisex", "occasion": "Casual", "fabric": "Unknown",
        "brand": "Sun Studio", "tags": ["classic", "vintage", "casual"],
        "description": "Timeless tortoiseshell wayfarers — sun protection with attitude.",
        "image_url": IMG.format("1511499767772-6d1e19e14e8f"),
    },
    {
        "name": "Camel Cashmere Scarf",
        "category": "Accessories", "color": "Camel", "season": "Winter",
        "gender": "Unisex", "occasion": "Casual", "fabric": "Cashmere",
        "brand": "Nordic Knit", "tags": ["luxury", "classic", "minimalist"],
        "description": "Luxuriously soft cashmere scarf in warm camel.",
        "image_url": IMG.format("1513245813347-9f5af3e35634"),
    },
    {
        "name": "Navy Canvas Backpack",
        "category": "Accessories", "color": "Navy Blue", "season": "All",
        "gender": "Unisex", "occasion": "Casual", "fabric": "Canvas",
        "brand": "Pack & Go", "tags": ["casual", "streetwear", "sporty"],
        "description": "Clean canvas backpack with leather accents.",
        "image_url": IMG.format("1553062407-98eeb64c6a62"),
    },
    {
        "name": "Black Bucket Hat",
        "category": "Accessories", "color": "Jet Black", "season": "Summer",
        "gender": "Unisex", "occasion": "Casual", "fabric": "Cotton",
        "brand": "Head Space", "tags": ["streetwear", "sporty", "casual"],
        "description": "Classic cotton bucket hat — Y2K cool, endlessly versatile.",
        "image_url": IMG.format("1511499767772-6d1e19e14e8f"),
    },
    {
        "name": "Silk Neckerchief",
        "category": "Accessories", "color": "Navy Blue & White Stripes", "season": "Spring",
        "gender": "Women", "occasion": "Casual", "fabric": "Silk",
        "brand": "La Marine", "tags": ["classic", "romantic", "vintage"],
        "description": "Lightweight silk scarf — wear as a neck tie or in the hair.",
        "image_url": IMG.format("1513245813347-9f5af3e35634"),
    },
    {
        "name": "Tan Structured Handbag",
        "category": "Accessories", "color": "Tan", "season": "All",
        "gender": "Women", "occasion": "Business", "fabric": "Leather",
        "brand": "Carry Well", "tags": ["classic", "business-casual", "luxury"],
        "description": "Compact structured bag in warm tan leather.",
        "image_url": IMG.format("1548036328-c9fa89d128fa"),
    },
    {
        "name": "Olive Beanie Hat",
        "category": "Accessories", "color": "Olive Green", "season": "Winter",
        "gender": "Unisex", "occasion": "Casual", "fabric": "Wool",
        "brand": "Head Space", "tags": ["casual", "streetwear", "sporty"],
        "description": "Ribbed wool beanie — cosy and surprisingly stylish.",
        "image_url": IMG.format("1511499767772-6d1e19e14e8f"),
    },
]


def seed():
    db = get_supabase()
    print(f"Deleting existing catalog items…")
    db.table("catalog_items").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

    print(f"Inserting {len(CATALOG)} catalog items…")
    # Insert in batches of 20 to avoid Supabase payload limits
    batch_size = 20
    for start in range(0, len(CATALOG), batch_size):
        batch = CATALOG[start:start + batch_size]
        db.table("catalog_items").insert(batch).execute()
        print(f"  ✓ Inserted rows {start + 1}–{start + len(batch)}")

    print("✅ Catalog seeded successfully!")


if __name__ == "__main__":
    seed()
