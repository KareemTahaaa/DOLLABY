"""
simple_viton_routes.py
======================
FastAPI routes for simplified trained VITON model.
Add this to your FastAPI app to use the trained model.
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import JSONResponse
import uuid
import os
from pathlib import Path
from PIL import Image
from io import BytesIO

from auth import get_current_user
from simple_viton_model import get_trainer

router = APIRouter(prefix="/try-on-local", tags=["Virtual Try-On Local"])

UPLOAD_DIR = "uploads"
TRYON_DIR = os.path.join(UPLOAD_DIR, "tryon_results")
os.makedirs(TRYON_DIR, exist_ok=True)


def _save_result(result_img: Image.Image, request_id: str) -> str:
    """Save PIL image to disk and return URL."""
    filename = f"{request_id}_result.jpg"
    path = os.path.join(TRYON_DIR, filename)
    result_img.save(path, "JPEG", quality=92)
    return f"/uploads/tryon_results/{filename}"


@router.post("/generate-local")
async def generate_tryon_local(
    person_image: UploadFile = File(..., description="Full-body person photo"),
    garment_image: UploadFile = File(..., description="Clothing item image"),
    current_user: dict = Depends(get_current_user),
):
    """
    Virtual Try-On using locally trained model.
    No API keys required - runs entirely on server.

    Returns JSON: { success, result_url, mode, message }
    """
    request_id = uuid.uuid4().hex[:12]

    try:
        # Read image files
        person_bytes = await person_image.read()
        garment_bytes = await garment_image.read()

        # Convert to PIL
        person_img = Image.open(BytesIO(person_bytes)).convert("RGB")
        garment_img = Image.open(BytesIO(garment_bytes)).convert("RGB")

        # Get trainer (loads model on first call)
        trainer = get_trainer()

        # Run inference
        result_img = trainer.infer(person_img, garment_img)

        # Save result
        result_url = _save_result(result_img, request_id)

        return JSONResponse({
            "success": True,
            "result_url": result_url,
            "mode": "local-trained",
            "model": "SimplifiedViton (Trained Locally)",
            "message": "Virtual try-on generated successfully · Local Model",
        })

    except Exception as e:
        raise HTTPException(status_code=503, detail={
            "error": "Local model inference failed",
            "message": str(e),
        })


@router.get("/status-local")
async def tryon_status_local(current_user: dict = Depends(get_current_user)):
    """Returns status of local trained model."""
    model_path = Path("models/simple_viton_final.pth")

    status = {
        "mode": "local-trained",
        "model": "SimplifiedViton",
        "model_exists": model_path.exists(),
        "model_path": str(model_path),
    }

    if model_path.exists():
        status["available"] = True
        status["message"] = "Local trained model ready for inference"
        status["file_size_mb"] = model_path.stat().st_size / 1e6
    else:
        status["available"] = False
        status["message"] = "Model file not found. Run training in Colab first."
        status["instructions"] = {
            "step1": "Run: Colab_Train_Simple_VITON.ipynb",
            "step2": "Download simple_viton_final.pth",
            "step3": "Place in: backend/models/simple_viton_final.pth",
        }

    return status
