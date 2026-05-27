from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from core.database import get_supabase
from api.v1.auth import get_current_user

router = APIRouter(prefix="/calendar", tags=["Calendar"])


class CalendarEntryCreate(BaseModel):
    date: str                      # ISO: "2026-10-18"
    outfit_id: Optional[str] = None
    outfit_name: Optional[str] = None
    note: Optional[str] = None


def serialize_entry(entry: dict) -> dict:
    return {
        "id":          entry["id"],
        "date":        entry.get("date", ""),
        "outfit_id":   entry.get("outfit_id"),
        "outfit_name": entry.get("outfit_name"),
        "note":        entry.get("note"),
    }


@router.get("")
def get_calendar(current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    res = db.table("calendar_entries").select("*").eq("user_id", current_user["id"]).execute()
    return [serialize_entry(e) for e in (res.data or [])]


@router.post("")
def create_calendar_entry(data: CalendarEntryCreate, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    user_id = current_user["id"]

    # Upsert: replace existing entry for the same date
    res = db.table("calendar_entries").upsert({
        "user_id":     user_id,
        "date":        data.date,
        "outfit_id":   data.outfit_id,
        "outfit_name": data.outfit_name,
        "note":        data.note,
    }, on_conflict="user_id,date").execute()

    return serialize_entry(res.data[0])


@router.delete("/{entry_id}")
def delete_calendar_entry(entry_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    res = db.table("calendar_entries").delete().eq("id", entry_id).eq("user_id", current_user["id"]).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Entry removed"}
