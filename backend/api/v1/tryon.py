"""
Virtual Try-On router for Dollaby.

Supports four inference modes, controlled by VITON_MODE in .env:
  huggingface → OOTDiffusion HuggingFace Space (free, no GPU needed)
  colab       → OOTDiffusion on Google Colab T4 via ngrok
  replicate   → IDM-VTON on Replicate.com
  local       → HR-VITON in-process via PyTorch
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

from api.v1.auth import get_current_user
from core.config import VITON_MODE, REPLICATE_API_TOKEN, COLAB_VITON_URL, VITONHD_COLAB_URL

router = APIRouter(prefix="/try-on", tags=["Virtual Try-On"])

UPLOAD_DIR = "uploads"
TRYON_DIR = os.path.join(UPLOAD_DIR, "tryon_results")
os.makedirs(TRYON_DIR, exist_ok=True)

# IDM-VTON on Replicate — best open-source virtual try-on model
REPLICATE_MODEL_VERSION = "c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4"
HF_SPACE_ID = "levihsu/OOTDiffusion"


def _save_result(result_img: Image.Image, request_id: str) -> str:
    filename = f"{request_id}_result.jpg"
    path = os.path.join(TRYON_DIR, filename)
    result_img.save(path, "JPEG", quality=92)
    return f"/uploads/tryon_results/{filename}"


async def _infer_huggingface(person_bytes: bytes, garment_bytes: bytes) -> Image.Image:
    try:
        from gradio_client import Client, handle_file
    except ImportError:
        raise RuntimeError("gradio_client is not installed. Run: pip install gradio_client")

    with tempfile.TemporaryDirectory() as tmpdir:
        person_path = os.path.join(tmpdir, "person.jpg")
        garment_path = os.path.join(tmpdir, "garment.jpg")

        Image.open(BytesIO(person_bytes)).convert("RGB").save(person_path, "JPEG")
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
            if isinstance(result, tuple):
                result = result[0]
            out_path = result[0] if isinstance(result, list) and len(result) > 0 else result
            if isinstance(out_path, dict):
                out_path = out_path.get("image", out_path)
            return Image.open(out_path).convert("RGB")

        loop = asyncio.get_event_loop()
        result_img = await loop.run_in_executor(None, _run_sync)

    return result_img


async def _infer_colab(person_bytes: bytes, garment_bytes: bytes) -> Image.Image:
    if not COLAB_VITON_URL:
        raise RuntimeError(
            "COLAB_VITON_URL is not set in backend/.env. "
            "Open the Colab notebook, run all cells, and paste the ngrok URL into your .env file."
        )

    async with httpx.AsyncClient(timeout=180.0) as client:
        try:
            health = await client.get(f"{COLAB_VITON_URL}/health", timeout=10.0)
            if health.status_code != 200:
                raise RuntimeError(f"Colab server unhealthy: {health.text}")
        except httpx.ConnectError:
            raise RuntimeError(f"Cannot connect to Colab server at {COLAB_VITON_URL}.")

        response = await client.post(
            f"{COLAB_VITON_URL}/tryon",
            files={
                "person_image": ("person.jpg", person_bytes, "image/jpeg"),
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


async def _infer_local(person_bytes: bytes, garment_bytes: bytes) -> Image.Image:
    from services.viton.inference import run_tryon, is_available

    ready, reason = is_available()
    if not ready:
        raise RuntimeError(reason)

    person_img = Image.open(BytesIO(person_bytes)).convert("RGB")
    garment_img = Image.open(BytesIO(garment_bytes)).convert("RGB")
    return await run_tryon(person_img, garment_img)


async def _infer_replicate(person_bytes: bytes, garment_bytes: bytes) -> Image.Image:
    if not REPLICATE_API_TOKEN:
        raise RuntimeError("REPLICATE_API_TOKEN not set in .env.")

    def _to_data_uri(data: bytes, mime: str = "image/jpeg") -> str:
        return f"data:{mime};base64," + base64.b64encode(data).decode()

    headers = {
        "Authorization": f"Token {REPLICATE_API_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "version": REPLICATE_MODEL_VERSION,
        "input": {
            "human_img":      _to_data_uri(person_bytes),
            "garm_img":       _to_data_uri(garment_bytes),
            "garment_des":    "clothing item",
            "is_checked":     True,   # auto-mask garment
            "is_checked_crop": False,
            "denoise_steps":  40,     # higher = better quality
            "seed":           42,
        },
    }

    async with httpx.AsyncClient(timeout=300.0) as client:
        rsp = await client.post(
            "https://api.replicate.com/v1/predictions",
            json=payload,
            headers=headers,
        )
        if rsp.status_code not in (200, 201):
            raise RuntimeError(f"Replicate error {rsp.status_code}: {rsp.text}")

        pred = rsp.json()
        poll = pred.get("urls", {}).get("get")
        if not poll:
            raise RuntimeError("Replicate: no poll URL in response")

        # Poll up to 5 minutes (150 × 2s)
        for _ in range(150):
            await asyncio.sleep(2)
            pr  = await client.get(poll, headers=headers)
            d   = pr.json()
            status = d.get("status")

            if status == "succeeded":
                output  = d.get("output")
                url     = output[0] if isinstance(output, list) else output
                img_rsp = await client.get(url, timeout=60.0)
                return Image.open(BytesIO(img_rsp.content)).convert("RGB")

            if status in ("failed", "canceled"):
                raise RuntimeError(f"Replicate prediction {status}: {d.get('error')}")

    raise RuntimeError("Replicate prediction timed out after 5 minutes.")


async def _infer_catvton(person_bytes: bytes, garment_bytes: bytes) -> Image.Image:
    """CatVTON via HuggingFace Space — mask-free SD1.5 tab (no local GPU needed)."""
    try:
        from gradio_client import Client, handle_file
    except ImportError:
        raise RuntimeError("gradio_client is not installed. Run: pip install gradio_client")

    with tempfile.TemporaryDirectory() as tmpdir:
        person_path = os.path.join(tmpdir, "person.jpg")
        garment_path = os.path.join(tmpdir, "garment.jpg")

        Image.open(BytesIO(person_bytes)).convert("RGB").save(person_path, "JPEG")
        Image.open(BytesIO(garment_bytes)).convert("RGB").save(garment_path, "JPEG")

        def _run_sync():
            client = Client("zhengchong/CatVTON")
            # Mask-free SD1.5 tab — person_image is gr.ImageEditor, pass as background dict
            result = client.predict(
                person_image={"background": handle_file(person_path), "layers": [], "composite": None},
                cloth_image=handle_file(garment_path),
                num_inference_steps=50,
                guidance_scale=2.5,
                seed=42,
                api_name="/submit_function_p2p",
            )
            if isinstance(result, str):
                return Image.open(result).convert("RGB")
            if isinstance(result, dict) and "image" in result:
                return Image.open(result["image"]).convert("RGB")
            return result if isinstance(result, Image.Image) else Image.open(str(result)).convert("RGB")

        loop = asyncio.get_event_loop()
        result_img = await loop.run_in_executor(None, _run_sync)

    return result_img


async def _infer_vitonhd(person_bytes: bytes, garment_bytes: bytes) -> Image.Image:
    """VITON-HD via Colab-hosted inference server exposed through ngrok."""
    if not VITONHD_COLAB_URL:
        raise RuntimeError(
            "VITONHD_COLAB_URL is not set in backend/.env. "
            "Open the Colab_VITONHD_Server notebook, run all cells, and paste the ngrok URL."
        )

    async with httpx.AsyncClient(timeout=180.0) as client:
        try:
            health = await client.get(f"{VITONHD_COLAB_URL}/health", timeout=10.0)
            if health.status_code != 200:
                raise RuntimeError(f"VITON-HD server unhealthy: {health.text}")
        except httpx.ConnectError:
            raise RuntimeError(f"Cannot connect to VITON-HD server at {VITONHD_COLAB_URL}.")

        response = await client.post(
            f"{VITONHD_COLAB_URL}/tryon",
            files={
                "person_image": ("person.jpg", person_bytes, "image/jpeg"),
                "garment_image": ("garment.jpg", garment_bytes, "image/jpeg"),
            },
        )

        if response.status_code != 200:
            raise RuntimeError(f"VITON-HD error {response.status_code}: {response.text}")

        data = response.json()
        if not data.get("success"):
            raise RuntimeError(f"VITON-HD inference failed: {data.get('error', data)}")

        img_bytes = base64.b64decode(data["image_base64"])
        return Image.open(BytesIO(img_bytes)).convert("RGB")


@router.post("/generate")
async def generate_tryon(
    person_image: UploadFile = File(..., description="Full-body person photo"),
    garment_image: UploadFile = File(..., description="Clothing item image"),
    current_user: dict = Depends(get_current_user),
):
    request_id = uuid.uuid4().hex[:12]
    person_bytes = await person_image.read()
    garment_bytes = await garment_image.read()

    MODEL_NAMES = {
        "huggingface": "OOTDiffusion (HuggingFace Space — Free)",
        "colab": "OOTDiffusion (Google Colab T4 GPU)",
        "local": "HR-VITON (local PyTorch)",
        "replicate": "IDM-VTON via Replicate",
        "catvton": "CatVTON (HuggingFace Space — Free)",
        "vitonhd": "VITON-HD (Google Colab T4 GPU)",
    }

    INFER_FUNCS = {
        "huggingface": _infer_huggingface,
        "colab": _infer_colab,
        "local": _infer_local,
        "replicate": _infer_replicate,
        "catvton": _infer_catvton,
        "vitonhd": _infer_vitonhd,
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
        "success": True,
        "result_url": result_url,
        "mode": VITON_MODE,
        "model": model_name,
        "message": f"Virtual try-on generated successfully · {model_name}",
    })


@router.get("/status")
async def tryon_status(current_user: dict = Depends(get_current_user)):
    status: dict = {"configured_mode": VITON_MODE}

    if VITON_MODE == "huggingface":
        status["model"] = "OOTDiffusion (HuggingFace Space)"
        status["space"] = f"https://huggingface.co/spaces/{HF_SPACE_ID}"
        status["message"] = "Free HuggingFace Space — no setup required."
        try:
            from gradio_client import Client
            status["available"] = True
        except ImportError:
            status["available"] = False
            status["message"] = "gradio_client not installed. Run: pip install gradio_client"

    elif VITON_MODE == "colab":
        status["model"] = "OOTDiffusion (Google Colab T4 GPU)"
        status["colab_url"] = COLAB_VITON_URL or "NOT SET"
        status["colab_url_set"] = bool(COLAB_VITON_URL)
        if not COLAB_VITON_URL:
            status["available"] = False
            status["message"] = "COLAB_VITON_URL not set in backend/.env"
        else:
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    r = await client.get(f"{COLAB_VITON_URL}/health")
                    health = r.json()
                    status["available"] = True
                    status["message"] = f"Colab online — GPU: {health.get('gpu', 'unknown')}"
                    status["gpu"] = health.get("gpu")
                    status["vram_gb"] = health.get("vram_gb")
            except Exception as e:
                status["available"] = False
                status["message"] = f"Cannot reach Colab server: {e}"

    elif VITON_MODE == "local":
        try:
            from services.viton.inference import is_available
            ready, reason = is_available()
            status["available"] = ready
            status["model"] = "HR-VITON (local PyTorch)"
            status["message"] = reason
        except ImportError as e:
            status["available"] = False
            status["message"] = f"inference.py import error: {e}"

    elif VITON_MODE == "catvton":
        status["model"] = "CatVTON (HuggingFace Space — Free)"
        status["space"] = "https://huggingface.co/spaces/zhengchong/CatVTON"
        status["message"] = "Free HuggingFace Space — no setup required."
        try:
            from gradio_client import Client  # noqa
            status["available"] = True
        except ImportError:
            status["available"] = False
            status["message"] = "gradio_client not installed. Run: pip install gradio_client"

    elif VITON_MODE == "vitonhd":
        status["model"] = "VITON-HD (Google Colab T4 GPU)"
        status["colab_url"] = VITONHD_COLAB_URL or "NOT SET"
        status["colab_url_set"] = bool(VITONHD_COLAB_URL)
        if not VITONHD_COLAB_URL:
            status["available"] = False
            status["message"] = "VITONHD_COLAB_URL not set in backend/.env"
        else:
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    r = await client.get(f"{VITONHD_COLAB_URL}/health")
                    health = r.json()
                    status["available"] = True
                    status["message"] = f"VITON-HD Colab online — GPU: {health.get('gpu', 'unknown')}"
                    status["gpu"] = health.get("gpu")
                    status["vram_gb"] = health.get("vram_gb")
            except Exception as e:
                status["available"] = False
                status["message"] = f"Cannot reach VITON-HD Colab server: {e}"

    else:  # replicate
        has_token = bool(REPLICATE_API_TOKEN)
        status["available"] = has_token
        status["model"] = "IDM-VTON via Replicate"
        status["message"] = (
            "Replicate API configured and ready." if has_token
            else "REPLICATE_API_TOKEN not set in backend/.env"
        )
        if not has_token:
            status["setup_url"] = "https://replicate.com/account/api-tokens"

    return status


# ── Try-On Room ───────────────────────────────────────────────────────────────

AVATAR_DIR = os.path.join(UPLOAD_DIR, "avatars")
os.makedirs(AVATAR_DIR, exist_ok=True)


@router.post("/avatar")
async def upload_tryon_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Save a full-body photo as the user's try-on avatar."""
    from core.database import get_supabase

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Avatar file too large (max 10 MB).")

    raw_ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    ext = raw_ext if raw_ext in {"jpg", "jpeg", "png", "webp"} else "jpg"
    filename = f"tryon_avatar_{current_user['id']}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(AVATAR_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    avatar_url = f"/uploads/avatars/{filename}"
    db = get_supabase()
    db.table("users").update({"tryon_avatar_url": avatar_url}).eq("id", current_user["id"]).execute()
    return {"avatar_url": avatar_url}


@router.get("/room")
async def get_tryon_room(current_user: dict = Depends(get_current_user)):
    """Return the user's avatar URL + all cached try-on results."""
    from core.database import get_supabase
    db = get_supabase()

    user = db.table("users").select("tryon_avatar_url").eq("id", current_user["id"]).single().execute()
    avatar_url = user.data.get("tryon_avatar_url") if user.data else None

    results_res = db.table("try_on_results").select("item_id, result_url").eq("user_id", current_user["id"]).execute()
    cached = {r["item_id"]: r["result_url"] for r in (results_res.data or [])}

    return {"avatar_url": avatar_url, "cached_results": cached}


@router.post("/room/generate/{item_id}")
async def generate_room_tryon(
    item_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Generate try-on for one closet item using the user's saved avatar photo."""
    from core.database import get_supabase
    db = get_supabase()

    # 1. Get avatar photo
    user = db.table("users").select("tryon_avatar_url").eq("id", current_user["id"]).single().execute()
    avatar_url: str | None = user.data.get("tryon_avatar_url") if user.data else None
    if not avatar_url:
        raise HTTPException(status_code=400, detail="No try-on avatar set. Upload one first via POST /try-on/avatar.")

    # 2. Get closet item image
    item_res = db.table("clothing_items").select("image_url, name").eq("id", item_id).eq("user_id", current_user["id"]).single().execute()
    if not item_res.data:
        raise HTTPException(status_code=404, detail="Clothing item not found.")
    item_image_url: str | None = item_res.data.get("image_url")
    if not item_image_url:
        raise HTTPException(status_code=400, detail="This item has no image.")

    # 3. Read files from disk — resolve paths and confine to UPLOAD_DIR
    from pathlib import Path as _Path
    _upload_base = _Path(UPLOAD_DIR).resolve()

    avatar_path = avatar_url.lstrip("/")
    item_path   = item_image_url.lstrip("/")

    _avatar_resolved = _Path(avatar_path).resolve()
    _item_resolved   = _Path(item_path).resolve()

    if not str(_avatar_resolved).startswith(str(_upload_base)):
        raise HTTPException(status_code=400, detail="Invalid avatar path.")
    if not str(_item_resolved).startswith(str(_upload_base)):
        raise HTTPException(status_code=400, detail="Invalid item image path.")

    try:
        with open(_avatar_resolved, "rb") as f:
            person_bytes = f.read()
        with open(_item_resolved, "rb") as f:
            garment_bytes = f.read()
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=f"Image file not found on disk: {e}")

    # 4. Run inference using the configured VITON mode
    INFER_FUNCS = {
        "huggingface": _infer_huggingface,
        "colab":       _infer_colab,
        "local":       _infer_local,
        "replicate":   _infer_replicate,
        "catvton":     _infer_catvton,
        "vitonhd":     _infer_vitonhd,
    }
    infer_fn = INFER_FUNCS.get(VITON_MODE)
    if not infer_fn:
        raise HTTPException(status_code=400, detail=f"Unknown VITON_MODE: {VITON_MODE}")

    try:
        result_img = await infer_fn(person_bytes, garment_bytes)
    except Exception as e:
        raise HTTPException(status_code=503, detail={"error": "Try-on inference failed", "message": str(e)})

    # 5. Save result
    result_url = _save_result(result_img, f"room_{current_user['id'][:8]}_{item_id[:8]}")

    # 6. Upsert into cache table
    db.table("try_on_results").upsert({
        "user_id":    current_user["id"],
        "item_id":    item_id,
        "result_url": result_url,
    }, on_conflict="user_id,item_id").execute()

    return {"success": True, "result_url": result_url, "item_id": item_id}
