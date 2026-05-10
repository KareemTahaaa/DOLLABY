"""
viton_service.py
================
FastAPI router for the Dollaby Virtual Try-On feature.

Supports four inference modes, controlled by VITON_MODE in .env:

  VITON_MODE=huggingface → Calls the official OOTDiffusion HuggingFace Space
                           FREE, no GPU, no Colab, works immediately.
                           Best for demos and graduation projects.

  VITON_MODE=colab      → Calls OOTDiffusion running on Google Colab T4 GPU
                          via ngrok tunnel (FREE, best quality)
                          Requires: COLAB_VITON_URL in .env

  VITON_MODE=replicate  → Calls IDM-VTON on Replicate.com via HTTP API
                          (requires REPLICATE_API_TOKEN)

  VITON_MODE=local      → Runs HR-VITON entirely in-process using PyTorch
                          (requires checkpoints + mediapipe, no internet)

Default: huggingface
"""

import os
import uuid
import httpx
import base64
import asyncio
import tempfile
from pathlib import Path
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from PIL import Image

from auth import get_current_user

router = APIRouter(prefix="/try-on", tags=["Virtual Try-On"])

UPLOAD_DIR = "uploads"
TRYON_DIR = os.path.join(UPLOAD_DIR, "tryon_results")
os.makedirs(TRYON_DIR, exist_ok=True)

# ── Configuration ──────────────────────────────────────────────────────────────
VITON_MODE            = os.getenv("VITON_MODE", "huggingface").lower()
REPLICATE_API_TOKEN   = os.getenv("REPLICATE_API_TOKEN", "")
COLAB_VITON_URL       = os.getenv("COLAB_VITON_URL", "").rstrip("/")

# Replicate model: IDM-VTON
REPLICATE_MODEL_VERSION = "906425dbca90663ff5427624839572cc56ea7d380343d13e2a4c4b09d3f0c30f"

# HuggingFace Space: official OOTDiffusion by levihsu
HF_SPACE_ID = "levihsu/OOTDiffusion"


# ── Helper: save PIL image to disk ─────────────────────────────────────────────
def _save_result(result_img: Image.Image, request_id: str) -> str:
    filename = f"{request_id}_result.jpg"
    path = os.path.join(TRYON_DIR, filename)
    result_img.save(path, "JPEG", quality=92)
    return f"/uploads/tryon_results/{filename}"


# ── Mode: HuggingFace Space (OOTDiffusion) ─────────────────────────────────────
async def _infer_huggingface(person_bytes: bytes, garment_bytes: bytes) -> Image.Image:
    """
    Calls the official OOTDiffusion HuggingFace Space via gradio_client.
    Completely free — no GPU, no API key, no Colab needed.
    Space URL: https://huggingface.co/spaces/levihsu/OOTDiffusion
    """
    try:
        from gradio_client import Client, handle_file
    except ImportError:
        raise RuntimeError(
            "gradio_client is not installed. Run: pip install gradio_client"
        )

    # Save images to temp files (gradio_client needs file paths)
    with tempfile.TemporaryDirectory() as tmpdir:
        person_path  = os.path.join(tmpdir, "person.jpg")
        garment_path = os.path.join(tmpdir, "garment.jpg")

        Image.open(BytesIO(person_bytes)).convert("RGB").save(person_path,  "JPEG")
        Image.open(BytesIO(garment_bytes)).convert("RGB").save(garment_path, "JPEG")

        def _run_sync():
            client = Client(HF_SPACE_ID)
            result = client.predict(
                vton_img=handle_file(person_path),
                garm_img=handle_file(garment_path),
                n_samples=1,
                n_steps=20,
                image_scale=2.0,
                seed=-1,
                api_name="/process_hd",
            )
            # result is a list of dicts; extract the filepath
            if isinstance(result, tuple):
                result = result[0]
            
            out_path = result[0] if isinstance(result, list) and len(result) > 0 else result
            if isinstance(out_path, dict):
                out_path = out_path.get("image", out_path)
                
            return Image.open(out_path).convert("RGB")

        # Run blocking gradio call in thread pool to not block FastAPI
        loop = asyncio.get_event_loop()
        result_img = await loop.run_in_executor(None, _run_sync)

    return result_img


# ── Mode: Google Colab + OOTDiffusion ─────────────────────────────────────────
async def _infer_colab(person_bytes: bytes, garment_bytes: bytes) -> Image.Image:
    """
    Calls OOTDiffusion running on Google Colab via ngrok tunnel.
    Start the server using: dollaby_viton_colab.ipynb
    Set COLAB_VITON_URL in backend/.env to the ngrok URL.
    """
    if not COLAB_VITON_URL:
        raise RuntimeError(
            "COLAB_VITON_URL is not set in backend/.env. "
            "Open dollaby_viton_colab.ipynb in Google Colab, run all cells, "
            "and paste the ngrok URL into your .env file."
        )

    async with httpx.AsyncClient(timeout=180.0) as client:
        try:
            health = await client.get(f"{COLAB_VITON_URL}/health", timeout=10.0)
            if health.status_code != 200:
                raise RuntimeError(f"Colab server unhealthy: {health.text}")
        except httpx.ConnectError:
            raise RuntimeError(
                f"Cannot connect to Colab server at {COLAB_VITON_URL}. "
                "Make sure the Colab notebook is running and the ngrok URL is correct."
            )

        response = await client.post(
            f"{COLAB_VITON_URL}/tryon",
            files={
                "person_image":  ("person.jpg",  person_bytes,  "image/jpeg"),
                "garment_image": ("garment.jpg", garment_bytes, "image/jpeg"),
            },
            data={"category": "upperbody", "num_steps": "20"},
        )

        if response.status_code != 200:
            raise RuntimeError(f"Colab VTON error {response.status_code}: {response.text}")

        data = response.json()
        if not data.get("success"):
            raise RuntimeError(f"Colab VTON failed: {data}")

        img_bytes = base64.b64decode(data["image_base64"])
        return Image.open(BytesIO(img_bytes)).convert("RGB")


# ── Mode: Local HR-VITON ──────────────────────────────────────────────────────
async def _infer_local(person_bytes: bytes, garment_bytes: bytes) -> Image.Image:
    """Loads models once and runs local HR-VITON inference."""
    from viton_inference import run_tryon, is_available

    ready, reason = is_available()
    if not ready:
        raise RuntimeError(reason)

    person_img  = Image.open(BytesIO(person_bytes)).convert("RGB")
    garment_img = Image.open(BytesIO(garment_bytes)).convert("RGB")

    return await run_tryon(person_img, garment_img)


# ── Mode: Replicate Cloud API ─────────────────────────────────────────────────
async def _infer_replicate(person_bytes: bytes, garment_bytes: bytes) -> Image.Image:
    """Calls IDM-VTON on Replicate.com and returns the result as a PIL image."""
    if not REPLICATE_API_TOKEN:
        raise RuntimeError(
            "REPLICATE_API_TOKEN not set in .env. "
            "Get a free key at https://replicate.com/account/api-tokens"
        )

    def _to_data_uri(data: bytes, mime: str = "image/jpeg") -> str:
        return f"data:{mime};base64," + base64.b64encode(data).decode()

    headers = {
        "Authorization": f"Token {REPLICATE_API_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "version": REPLICATE_MODEL_VERSION,
        "input": {
            "human_img":    _to_data_uri(person_bytes),
            "garm_img":     _to_data_uri(garment_bytes),
            "garment_des":  "clothing item",
            "is_checked":   True,
            "is_checked_crop": False,
            "denoise_steps": 30,
            "seed": 42,
        },
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        rsp = await client.post(
            "https://api.replicate.com/v1/predictions",
            json=payload,
            headers=headers,
        )
        if rsp.status_code not in (200, 201):
            raise RuntimeError(f"Replicate error: {rsp.text}")

        pred = rsp.json()
        poll = pred.get("urls", {}).get("get")
        if not poll:
            raise RuntimeError("Replicate: no poll URL in response")

        for _ in range(50):
            await asyncio.sleep(2)
            pr = await client.get(poll, headers=headers)
            d  = pr.json()
            status = d.get("status")

            if status == "succeeded":
                output = d.get("output")
                url = output[0] if isinstance(output, list) else output
                img_rsp = await client.get(url, timeout=60.0)
                return Image.open(BytesIO(img_rsp.content)).convert("RGB")

            if status in ("failed", "canceled"):
                raise RuntimeError(f"Replicate prediction failed: {d.get('error')}")

    raise RuntimeError("Replicate prediction timed out.")


# ── Endpoint: POST /try-on/generate ──────────────────────────────────────────
@router.post("/generate")
async def generate_tryon(
    person_image:  UploadFile = File(..., description="Full-body person photo"),
    garment_image: UploadFile = File(..., description="Clothing item image"),
    current_user:  dict = Depends(get_current_user),
):
    """
    Virtual Try-On endpoint.
    Mode is controlled by VITON_MODE in backend/.env.
    Returns JSON: { success, result_url, mode, model }
    """
    request_id = uuid.uuid4().hex[:12]
    person_bytes  = await person_image.read()
    garment_bytes = await garment_image.read()

    MODEL_NAMES = {
        "huggingface": "OOTDiffusion (HuggingFace Space — Free)",
        "colab":       "OOTDiffusion (Google Colab T4 GPU)",
        "local":       "HR-VITON (local PyTorch)",
        "replicate":   "IDM-VTON via Replicate",
    }

    INFER_FUNCS = {
        "huggingface": _infer_huggingface,
        "colab":       _infer_colab,
        "local":       _infer_local,
        "replicate":   _infer_replicate,
    }

    infer_fn = INFER_FUNCS.get(VITON_MODE)
    if infer_fn is None:
        raise HTTPException(status_code=400, detail=f"Unknown VITON_MODE: {VITON_MODE}")

    try:
        result_img = await infer_fn(person_bytes, garment_bytes)
    except Exception as e:
        raise HTTPException(status_code=503, detail={
            "error": f"{VITON_MODE} inference failed",
            "message": str(e),
        })

    result_url = _save_result(result_img, request_id)
    model_name = MODEL_NAMES.get(VITON_MODE, VITON_MODE)

    return JSONResponse({
        "success":    True,
        "result_url": result_url,
        "mode":       VITON_MODE,
        "model":      model_name,
        "message":    f"Virtual try-on generated successfully · {model_name}",
    })


# ── Endpoint: GET /try-on/status ─────────────────────────────────────────────
@router.get("/status")
async def tryon_status(current_user: dict = Depends(get_current_user)):
    """Returns the configuration and readiness status of the try-on service."""
    status: dict = {"configured_mode": VITON_MODE}

    if VITON_MODE == "huggingface":
        status["model"]   = "OOTDiffusion (HuggingFace Space)"
        status["space"]   = f"https://huggingface.co/spaces/{HF_SPACE_ID}"
        status["message"] = "Free HuggingFace Space — no setup required."
        try:
            from gradio_client import Client
            status["available"] = True
        except ImportError:
            status["available"] = False
            status["message"]   = "gradio_client not installed. Run: pip install gradio_client"

    elif VITON_MODE == "colab":
        status["model"]         = "OOTDiffusion (Google Colab T4 GPU)"
        status["colab_url"]     = COLAB_VITON_URL or "NOT SET"
        status["colab_url_set"] = bool(COLAB_VITON_URL)
        if not COLAB_VITON_URL:
            status["available"] = False
            status["message"]   = "COLAB_VITON_URL not set in backend/.env"
        else:
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    r      = await client.get(f"{COLAB_VITON_URL}/health")
                    health = r.json()
                    status["available"] = True
                    status["message"]   = f"Colab online — GPU: {health.get('gpu', 'unknown')}"
                    status["gpu"]       = health.get("gpu")
                    status["vram_gb"]   = health.get("vram_gb")
            except Exception as e:
                status["available"] = False
                status["message"]   = f"Cannot reach Colab server: {e}"

    elif VITON_MODE == "local":
        try:
            from viton_inference import is_available
            ready, reason        = is_available()
            status["available"]  = ready
            status["model"]      = "HR-VITON (local PyTorch)"
            status["message"]    = reason
        except ImportError as e:
            status["available"] = False
            status["message"]   = f"viton_inference.py import error: {e}"

    else:  # replicate
        has_token            = bool(REPLICATE_API_TOKEN)
        status["available"]  = has_token
        status["model"]      = "IDM-VTON via Replicate"
        status["message"]    = (
            "Replicate API configured and ready." if has_token
            else "REPLICATE_API_TOKEN not set in backend/.env"
        )
        if not has_token:
            status["setup_url"] = "https://replicate.com/account/api-tokens"

    return status
