import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional

from core.database import get_supabase
from api.v1.auth import get_current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Profile"])


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


@router.put("/update-profile")
def update_profile(data: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    updates: dict = {}

    if data.name and data.name.strip():
        updates["name"] = data.name.strip()

    if data.location and data.location.strip():
        updates["location"] = data.location.strip()

    if data.new_password:
        if not data.current_password:
            raise HTTPException(status_code=400, detail="Current password is required.")
        if not verify_password(data.current_password, current_user["hashed_password"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect.")
        updates["hashed_password"] = hash_password(data.new_password)

    if not updates:
        raise HTTPException(status_code=400, detail="No changes provided.")

    db = get_supabase()
    db.table("users").update(updates).eq("id", current_user["id"]).execute()
    return {"message": "Profile updated successfully"}


@router.delete("/delete-account")
def delete_account(current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    user_id = current_user["id"]
    # CASCADE on users table handles clothing_items, outfits, calendar_entries
    db.table("users").delete().eq("id", user_id).execute()
    return {"message": "Account and all data deleted successfully"}


@router.post("/upload-avatar")
async def upload_avatar(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    os.makedirs("uploads", exist_ok=True)
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"avatar_{current_user['id']}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join("uploads", filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    image_url = f"/uploads/{filename}"
    db = get_supabase()
    db.table("users").update({"profile_picture": image_url}).eq("id", current_user["id"]).execute()
    return {"message": "Avatar uploaded", "profile_picture": image_url}
