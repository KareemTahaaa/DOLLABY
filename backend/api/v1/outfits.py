"""
Outfit generation with a real, rule-based compatibility scoring engine.

Score is computed from four pillars:
  1. Color harmony   (35 %) — warm/cool/neutral theory
  2. Completeness    (25 %) — required slots filled for the chosen mode
  3. Season match    (20 %) — items appropriate for the requested season
  4. Occasion fit    (20 %) — style tags align with the occasion

The AI (Groq) picks the items; Python computes the score independently,
so the number is always meaningful and never invented.
"""

import json
from fastapi import APIRouter, Depends, HTTPException
from groq import Groq

from core.database import get_supabase
from api.v1.auth import get_current_user
from api.v1.closet import serialize_item
from models.schemas import OutfitGenerationRequest, OutfitCreate
from core.config import GROQ_API_KEY

router = APIRouter(prefix="/outfits", tags=["Outfit Generator"])


# ── 1. Color harmony engine ───────────────────────────────────────────────────

NEUTRAL_WORDS = {
    "black", "white", "grey", "gray", "beige", "cream", "ivory", "nude",
    "brown", "tan", "khaki", "charcoal", "off-white", "camel", "stone",
    "sand", "ecru", "navy", "natural", "clear", "transparent",
}
WARM_WORDS = {
    "red", "orange", "yellow", "gold", "coral", "pink", "burgundy", "wine",
    "rust", "terracotta", "peach", "salmon", "maroon", "rose", "blush",
    "amber", "copper", "magenta", "fuchsia", "tomato", "scarlet", "crimson",
    "brick", "mustard", "saffron", "vermillion",
}
COOL_WORDS = {
    "blue", "green", "purple", "violet", "teal", "mint", "lavender", "cobalt",
    "indigo", "turquoise", "emerald", "sage", "olive", "cyan", "aqua", "lilac",
    "periwinkle", "seafoam", "forest", "hunter", "royal", "powder", "sky",
    "cerulean", "jade", "lime",
}


def _color_family(color: str) -> str:
    c = color.lower()
    # Check neutrals first — many colors contain neutral words (e.g. "light blue")
    for w in NEUTRAL_WORDS:
        if w == c or c.startswith(w + " ") or c.endswith(" " + w):
            return "neutral"
    for w in WARM_WORDS:
        if w in c:
            return "warm"
    for w in COOL_WORDS:
        if w in c:
            return "cool"
    return "neutral"   # unknown colours are treated as neutral


def _score_colors(items: list[dict]) -> tuple[int, str]:
    colors = [
        i.get("color", "")
        for i in items
        if i.get("color") and i["color"].lower() not in ("unknown", "")
    ]
    if len(colors) < 2:
        return 90, "monochromatic palette — always cohesive"

    families = [_color_family(c) for c in colors]
    neutrals     = families.count("neutral")
    warms        = families.count("warm")
    cools        = families.count("cool")
    non_neutral  = warms + cools

    if non_neutral == 0:
        return 95, "all neutrals — effortlessly versatile"
    if warms > 0 and cools > 0:
        # Check if only 1 non-neutral vs. many of the opposite — less clash
        if min(warms, cools) == 1 and neutrals >= 2:
            return 72, "warm and cool tones together — bold contrast, handled by neutrals"
        return 55, "warm and cool tones clash — consider swapping one item for a neutral"
    if non_neutral == 1:
        return 92, f"one accent colour anchored by neutrals — classic, intentional"
    if non_neutral == 2:
        family = "warm" if warms == 2 else "cool"
        return 83, f"analogous {family}-toned palette — cohesive and deliberate"
    return 70, "multiple accent colours — works best when textures and silhouettes vary"


# ── 2. Season match engine ───────────────────────────────────────────────────

# Seasons that are compatible with a target season (including "All" always matches)
_SEASON_COMPAT: dict[str, set[str]] = {
    "Summer": {"Summer", "All"},
    "Winter": {"Winter", "All"},
    "Spring": {"Spring", "Fall", "All"},   # transitional seasons share items
    "Fall":   {"Fall", "Spring", "All"},
    "All":    {"Summer", "Winter", "Spring", "Fall", "All"},
}


def _score_season(items: list[dict], target: str) -> tuple[int, str]:
    if target == "All":
        return 100, ""
    compatible = _SEASON_COMPAT.get(target, {"All", target})
    seasons    = [i.get("season", "All") for i in items]
    mismatches = sum(1 for s in seasons if s not in compatible)
    if mismatches == 0:
        return 100, ""
    if mismatches == 1:
        return 78, f"one item is off-season for {target}"
    return 58, f"{mismatches} items are off-season for {target}"


# ── 3. Completeness engine ───────────────────────────────────────────────────

def _score_completeness(items: list[dict]) -> tuple[int, str]:
    cats    = {i.get("category", "") for i in items}
    is_dress_mode = "Dress" in cats and "Top" not in cats

    notes = []
    score = 100

    if not {"Shoes"} & cats:
        score -= 18
        notes.append("no shoes")

    if is_dress_mode:
        if "Dress" not in cats:
            score -= 30
            notes.append("no dress")
    else:
        if "Top" not in cats:
            score -= 22
            notes.append("no top")
        if "Bottom" not in cats:
            score -= 16
            notes.append("no bottom")

    label = "; ".join(notes) if notes else "outfit is complete"
    return max(38, score), label


# ── 4. Occasion fitness engine ───────────────────────────────────────────────

_OCCASION_KEYWORDS: dict[str, set[str]] = {
    "Casual":   {"casual", "everyday", "relaxed", "streetwear", "comfy", "denim", "t-shirt", "sneaker", "hoodie"},
    "Formal":   {"formal", "elegant", "tailored", "dress", "suit", "blazer", "classic", "shirt", "oxford"},
    "Business": {"business", "formal", "classic", "tailored", "smart", "blazer", "trousers", "loafer"},
    "Party":    {"party", "cocktail", "evening", "glamorous", "statement", "bold", "sequin", "mini", "heel"},
    "Sport":    {"sport", "athletic", "activewear", "gym", "workout", "performance", "running", "track"},
    "Vacation": {"vacation", "resort", "summer", "travel", "light", "breezy", "linen", "floral", "sandal"},
}


def _score_occasion(items: list[dict], occasion: str) -> tuple[int, str]:
    if occasion not in _OCCASION_KEYWORDS:
        return 80, ""
    keywords = _OCCASION_KEYWORDS[occasion]

    bag: list[str] = []
    for item in items:
        bag.extend(t.lower() for t in (item.get("tags") or []))
        bag.append(item.get("name", "").lower())
        bag.append(item.get("category", "").lower())

    matches = sum(1 for token in bag if any(kw in token for kw in keywords))
    if matches >= 4:
        return 95, f"perfectly suited for {occasion.lower()}"
    if matches >= 2:
        return 82, f"fits a {occasion.lower()} setting well"
    if matches >= 1:
        return 70, f"could work for {occasion.lower()} with the right styling"
    return 60, f"consider swapping some items for a better {occasion.lower()} vibe"


# ── 5. Master scorer ─────────────────────────────────────────────────────────

def compute_compatibility(
    items: list[dict], occasion: str, season: str
) -> tuple[int, str]:
    """
    Returns (score 0-99, human-readable reasoning string).
    Score is fully computed from rules — never random.
    """
    if not items:
        return 0, "No items selected."

    c_score, c_note = _score_colors(items)
    s_score, s_note = _score_season(items, season)
    k_score, k_note = _score_completeness(items)
    o_score, o_note = _score_occasion(items, occasion)

    total = int(
        c_score * 0.35 +
        s_score * 0.20 +
        k_score * 0.25 +
        o_score * 0.20
    )
    total = min(99, max(40, total))

    # Build a readable summary
    parts = [p for p in [c_note, k_note, s_note, o_note] if p]
    reasoning = ". ".join(p.capitalize() for p in parts) + "." if parts else "Solid combination."

    return total, reasoning


# ── Serialization helper ──────────────────────────────────────────────────────

def serialize_outfit(outfit: dict, items_map: dict) -> dict:
    return {
        "id":           outfit["id"],
        "user_id":      outfit.get("user_id", ""),
        "name":         outfit.get("name", ""),
        "occasion":     outfit.get("occasion"),
        "items":        [serialize_item(items_map[iid]) for iid in (outfit.get("items") or []) if iid in items_map],
        "ai_score":     outfit.get("ai_score"),
        "ai_reasoning": outfit.get("ai_reasoning"),
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/generate")
def generate_outfit(
    request: OutfitGenerationRequest,
    current_user: dict = Depends(get_current_user),
):
    db      = get_supabase()
    user_id = current_user["id"]

    raw_items = db.table("clothing_items").select("*").eq("user_id", user_id).execute().data or []
    if not raw_items:
        raise HTTPException(
            status_code=404,
            detail="Your closet is empty. Please upload some clothing items first."
        )

    # Build wardrobe context for the LLM
    wardrobe_lines = "\n".join(
        f"- ID:{i['id']} | {i['name']} | category:{i['category']} "
        f"| color:{i.get('color','?')} | season:{i.get('season','All')} "
        f"| tags:{','.join(i.get('tags') or [])}"
        for i in raw_items
    )

    system_prompt = (
        "You are an expert fashion stylist. Your ONLY job is to select items from the user's "
        "wardrobe that create a visually cohesive, colour-harmonious outfit for the given occasion "
        "and season.\n\n"
        "COLOUR RULES (strictly follow):\n"
        "  • Neutral colours (black, white, grey, beige, navy, brown, tan, cream) pair with anything.\n"
        "  • Warm colours (red, orange, yellow, gold, coral, burgundy, rust, pink) harmonise together.\n"
        "  • Cool colours (blue, green, purple, teal, olive, emerald, lavender) harmonise together.\n"
        "  • NEVER mix warm accent colours with cool accent colours — they clash.\n"
        "  • Prefer: 1 accent + 2 neutrals, or all neutrals, or analogous palette.\n\n"
        "OUTFIT MODES:\n"
        "  • Normal outfit: pick Top + Bottom + Shoes. Optionally Outerwear, Accessories.\n"
        "  • Dress outfit: pick Dress + Shoes. Optionally Outerwear, Accessories. NO Top or Bottom.\n\n"
        "Respond ONLY with valid JSON (no markdown, no comments):\n"
        '{"selected_ids":["id1","id2",...],"outfit_name":"<creative name>","reasoning":"<why these items work together colour-wise and for the occasion>"}'
    )
    user_prompt = (
        f"Occasion: {request.occasion}\n"
        f"Season:   {request.season}\n\n"
        f"Wardrobe:\n{wardrobe_lines}\n\n"
        "Select the best colour-compatible outfit. Return ONLY the JSON."
    )

    if not GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY not configured.")

    client   = Groq(api_key=GROQ_API_KEY)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.4,   # lower temp → more consistent colour picks
    )

    result       = json.loads(response.choices[0].message.content)
    selected_ids = result.get("selected_ids", [])
    ai_reasoning = result.get("reasoning", "")
    outfit_name  = result.get("outfit_name", f"{request.occasion} Look")

    items_map = {i["id"]: i for i in raw_items}
    selected  = [items_map[sid] for sid in selected_ids if sid in items_map]

    if not selected:
        raise HTTPException(
            status_code=422,
            detail="AI could not find matching items for this occasion. Try adding more items to your closet."
        )

    # ── Compute score with our rule engine (independent of the LLM) ──────────
    score, score_reasoning = compute_compatibility(selected, request.occasion, request.season)

    # Merge LLM's reasoning with our computed notes
    final_reasoning = ai_reasoning
    if score_reasoning and score_reasoning != "Solid combination.":
        final_reasoning = f"{ai_reasoning} ({score_reasoning})" if ai_reasoning else score_reasoning

    return {
        "outfit_name":  outfit_name,
        "occasion":     request.occasion,
        "items":        [serialize_item(i) for i in selected],
        "ai_score":     score,
        "ai_reasoning": final_reasoning,
    }


@router.get("")
def get_outfits(current_user: dict = Depends(get_current_user)):
    db      = get_supabase()
    user_id = current_user["id"]

    outfits = db.table("outfits").select("*").eq("user_id", user_id).execute().data or []
    all_ids = list({iid for o in outfits for iid in (o.get("items") or [])})

    items_map: dict = {}
    if all_ids:
        items    = db.table("clothing_items").select("*").in_("id", all_ids).execute().data or []
        items_map = {i["id"]: i for i in items}

    return [serialize_outfit(o, items_map) for o in outfits]


@router.post("/save")
def save_outfit(outfit_data: OutfitCreate, current_user: dict = Depends(get_current_user)):
    db  = get_supabase()
    res = db.table("outfits").insert({
        "user_id":      current_user["id"],
        "name":         outfit_data.name,
        "occasion":     outfit_data.occasion,
        "items":        outfit_data.items,
        "ai_score":     outfit_data.ai_score,
        "ai_reasoning": outfit_data.ai_reasoning,
    }).execute()
    return {"id": res.data[0]["id"], "message": "Outfit saved successfully"}


@router.delete("/{outfit_id}")
def delete_outfit(outfit_id: str, current_user: dict = Depends(get_current_user)):
    db  = get_supabase()
    res = db.table("outfits").delete().eq("id", outfit_id).eq("user_id", current_user["id"]).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Outfit not found")
    return {"message": "Outfit deleted"}
