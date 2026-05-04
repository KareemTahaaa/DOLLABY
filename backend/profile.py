from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import shutil
import uuid
import os
from pydantic import BaseModel
from typing import Optional
from database import get_database
from auth import get_current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Profile"])


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


@router.put("/update-profile")
async def update_profile(
    data: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    from bson import ObjectId
    user_id = current_user["_id"]
    updates = {}

    if data.name and data.name.strip():
        updates["name"] = data.name.strip()

    if data.location and data.location.strip():
        updates["location"] = data.location.strip()

    if data.new_password:
        if not data.current_password:
            raise HTTPException(status_code=400, detail="Current password is required to set a new password.")
        if not verify_password(data.current_password, current_user["hashed_password"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect.")
        updates["hashed_password"] = hash_password(data.new_password)

    if not updates:
        raise HTTPException(status_code=400, detail="No changes provided.")

    await db["users"].update_one({"_id": user_id}, {"$set": updates})
    return {"message": "Profile updated successfully"}


@router.delete("/delete-account")
async def delete_account(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    user_id = str(current_user["_id"])
    # Delete all user data
    await db["clothing_items"].delete_many({"user_id": user_id})
    await db["outfits"].delete_many({"user_id": user_id})
    await db["calendar"].delete_many({"user_id": user_id})
    await db["users"].delete_one({"_id": current_user["_id"]})
    return {"message": "Account and all data deleted successfully"}

@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    os.makedirs("uploads", exist_ok=True)
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"avatar_{current_user['_id']}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join("uploads", filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    image_url = f"/uploads/{filename}"
    await db["users"].update_one(
        {"_id": current_user["_id"]},
        {"$set": {"profile_picture": image_url}}
    )
    return {"message": "Avatar uploaded", "profile_picture": image_url}
