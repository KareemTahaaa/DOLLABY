from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_database
from auth import get_current_user

router = APIRouter(prefix="/calendar", tags=["Calendar"])


class CalendarEntryCreate(BaseModel):
    date: str          # ISO format: "2026-10-18"
    outfit_id: Optional[str] = None
    outfit_name: Optional[str] = None
    note: Optional[str] = None


def serialize_entry(entry: dict) -> dict:
    return {
        "id": str(entry["_id"]),
        "date": entry.get("date", ""),
        "outfit_id": entry.get("outfit_id"),
        "outfit_name": entry.get("outfit_name"),
        "note": entry.get("note"),
    }


@router.get("")
async def get_calendar(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    user_id = str(current_user["_id"])
    entries = await db["calendar"].find({"user_id": user_id}).to_list(length=500)
    return [serialize_entry(e) for e in entries]


@router.post("")
async def create_calendar_entry(
    data: CalendarEntryCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    user_id = str(current_user["_id"])
    # Upsert: replace any existing entry for the same date
    doc = {
        "user_id": user_id,
        "date": data.date,
        "outfit_id": data.outfit_id,
        "outfit_name": data.outfit_name,
        "note": data.note,
    }
    result = await db["calendar"].find_one_and_replace(
        {"user_id": user_id, "date": data.date},
        doc,
        upsert=True,
        return_document=True
    )
    if result is None:
        # It was a fresh insert — fetch it
        result = await db["calendar"].find_one({"user_id": user_id, "date": data.date})
    return serialize_entry(result)


@router.delete("/{entry_id}")
async def delete_calendar_entry(
    entry_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    user_id = str(current_user["_id"])
    if not ObjectId.is_valid(entry_id):
        raise HTTPException(status_code=400, detail="Invalid entry ID")
    result = await db["calendar"].delete_one({"_id": ObjectId(entry_id), "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Entry removed"}
