"""
Clothing Catalog API
--------------------
Read-only catalog of ~70 curated clothing items users can browse and
add to their own closet without needing to take a photo.

Endpoints
---------
GET  /catalog                   — list (with optional filters)
POST /catalog/{item_id}/add     — copy item into the current user's closet
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from core.database import get_supabase
from api.v1.auth import get_current_user
from api.v1.closet import serialize_item

router = APIRouter(prefix="/catalog", tags=["Catalog"])


def _serialize_catalog(row: dict) -> dict:
    return {
        "id":          row["id"],
        "name":        row.get("name", ""),
        "category":    row.get("category", ""),
        "color":       row.get("color", ""),
        "season":      row.get("season", "All"),
        "gender":      row.get("gender", "Unisex"),
        "occasion":    row.get("occasion", "Casual"),
        "brand":       row.get("brand"),
        "fabric":      row.get("fabric"),
        "description": row.get("description"),
        "tags":        row.get("tags") or [],
        "image_url":   row.get("image_url"),
    }


@router.get("")
def list_catalog(
    category: Optional[str] = Query(None),
    gender:   Optional[str] = Query(None),
    occasion: Optional[str] = Query(None),
    season:   Optional[str] = Query(None),
    search:   Optional[str] = Query(None),
    limit:    int            = Query(200, le=500),
    offset:   int            = Query(0),
):
    db    = get_supabase()
    query = db.table("catalog_items").select("*")

    if category:
        query = query.eq("category", category)
    if gender and gender != "All":
        query = query.in_("gender", [gender, "Unisex"])
    if occasion:
        query = query.eq("occasion", occasion)
    if season and season != "All":
        query = query.in_("season", [season, "All"])
    if search:
        query = query.ilike("name", f"%{search}%")

    query = query.range(offset, offset + limit - 1)
    res   = query.execute()
    return [_serialize_catalog(r) for r in (res.data or [])]


@router.post("/{item_id}/add")
def add_catalog_item_to_closet(
    item_id:      str,
    current_user: dict = Depends(get_current_user),
):
    """Copy a catalog item into the authenticated user's closet."""
    db = get_supabase()

    # Fetch the catalog item
    res = db.table("catalog_items").select("*").eq("id", item_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Catalog item not found")

    cat = res.data

    # Insert into the user's clothing_items
    insert_res = db.table("clothing_items").insert({
        "user_id":   current_user["id"],
        "name":      cat["name"],
        "category":  cat["category"],
        "color":     cat["color"],
        "season":    cat.get("season", "All"),
        "brand":     cat.get("brand"),
        "fabric":    cat.get("fabric"),
        "tags":      cat.get("tags") or [],
        "image_url": cat.get("image_url"),  # external Unsplash URL stored as-is
    }).execute()

    if not insert_res.data:
        raise HTTPException(status_code=500, detail="Failed to add item to closet")

    return serialize_item(insert_res.data[0])
