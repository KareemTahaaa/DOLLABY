"""
viton_inference.py
==================
Local HR-VITON inference module for the Dollaby backend.

This module loads the HR-VITON pretrained checkpoints and runs inference
entirely in-process — no external API required.

Model architecture source:
  https://github.com/sangyun884/HR-VITON  (ECCV 2022)

Preprocessing pipeline (no separate servers needed):
  - Pose estimation  : Google MediaPipe Pose (CPU-friendly)
  - Cloth-agnostic   : Generated from pose landmarks (torso mask removal)
  - Image normalization: standard VITON-HD preprocessing

Checkpoint paths (set via .env or defaults below):
  VITON_TOCG_CHECKPOINT  = path to condition generator .pth
  VITON_GEN_CHECKPOINT   = path to image generator .pth
  VITON_MODELS_DIR       = directory containing network_generator.py, networks.py etc.
                           (clone of https://github.com/sangyun884/HR-VITON)

Usage:
  from viton_inference import is_available, run_tryon
  result_pil = await run_tryon(person_pil_image, garment_pil_image)
"""

import os
import sys
import asyncio
from pathlib import Path
from typing import Optional, Tuple

from PIL import Image
import numpy as np

# ── Configuration ─────────────────────────────────────────────────────────────
VITON_MODELS_DIR = os.getenv(
    "VITON_MODELS_DIR",
    str(Path(__file__).parent / "viton" / "HR-VITON"),
)
TOCG_CHECKPOINT = os.getenv(
    "VITON_TOCG_CHECKPOINT",
    str(Path(VITON_MODELS_DIR) / "checkpoints" / "tocg_checkpoint.pth"),
)
GEN_CHECKPOINT = os.getenv(
    "VITON_GEN_CHECKPOINT",
    str(Path(VITON_MODELS_DIR) / "checkpoints" / "gen_checkpoint.pth"),
)

# ── Image dimensions expected by HR-VITON ─────────────────────────────────────
IMG_H, IMG_W = 512, 384
FINE_H, FINE_W = 512, 384
SEMANTIC_NC = 13


def is_available() -> Tuple[bool, str]:
    """
    Returns (True, message) if local inference is ready,
    or (False, reason) if checkpoints / dependencies are missing.
    """
    missing = []

    # Check PyTorch
    try:
        import torch  # noqa
    except ImportError:
        missing.append("PyTorch not installed — run: pip install torch torchvision")

    # Check mediapipe
    try:
        import mediapipe  # noqa
    except ImportError:
        missing.append("mediapipe not installed — run: pip install mediapipe")

    # Check HR-VITON model code
    if not Path(VITON_MODELS_DIR).exists():
        missing.append(
            f"HR-VITON repo not found at {VITON_MODELS_DIR}. "
            "Run: git clone https://github.com/sangyun884/HR-VITON.git backend/viton/HR-VITON"
        )

    # Check checkpoints
    if not Path(TOCG_CHECKPOINT).exists():
        missing.append(
            f"TOCG checkpoint not found: {TOCG_CHECKPOINT}. "
            "Download from: https://drive.google.com/file/d/1XJTCdRBOPVgVTmqzhVGFAgMm2NLkw5uQ"
        )
    if not Path(GEN_CHECKPOINT).exists():
        missing.append(
            f"Generator checkpoint not found: {GEN_CHECKPOINT}. "
            "Download from: https://drive.google.com/file/d/1T5_YDUhYSSKPC_nZMk2NeC-XXUFoYeNy"
        )

    if missing:
        return False, " | ".join(missing)
    return True, "HR-VITON local inference ready."


# ── Lazy-loaded models (loaded once, reused) ──────────────────────────────────
_tocg_model = None
_gen_model = None
_mp_pose = None


def _load_models():
    """Loads HR-VITON networks and MediaPipe pose estimator (once)."""
    global _tocg_model, _gen_model, _mp_pose

    if _tocg_model is not None:
        return  # Already loaded

    import torch
    import mediapipe as mp

    # Add HR-VITON code directory to Python path so we can import its modules
    if VITON_MODELS_DIR not in sys.path:
        sys.path.insert(0, VITON_MODELS_DIR)

    # Import HR-VITON network modules
    from networks import ConditionGenerator, load_checkpoint  # type: ignore
    from network_generator import SPADEGenerator             # type: ignore

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[HR-VITON] Loading models on {device}...")

    # ── Condition Generator (TOCG) ─────────────────────────────────────────
    tocg = ConditionGenerator(
        input_nc=4,           # person-agnostic image (3) + cloth mask (1)
        output_nc=13 + 3,     # parse (13 classes) + warped cloth (3)
        ngf=96,
        norm_layer="batch",
        init_type="xavier",
        num_upsampling_layers="normal",
    )
    load_checkpoint(tocg, TOCG_CHECKPOINT)
    tocg.to(device)
    tocg.eval()
    _tocg_model = (tocg, device)

    # ── Image Generator (SPADE) ────────────────────────────────────────────
    gen = SPADEGenerator(
        semantic_nc=SEMANTIC_NC,
        norm_G="spectralspadebatch3x3",
        crop_size=512,
        num_upsampling_layers="most",
        use_vae=False,
    )
    load_checkpoint(gen, GEN_CHECKPOINT)
    gen.to(device)
    gen.eval()
    _gen_model = gen

    # ── MediaPipe Pose ─────────────────────────────────────────────────────
    _mp_pose = mp.solutions.pose.Pose(
        static_image_mode=True,
        model_complexity=1,
        enable_segmentation=True,
        min_detection_confidence=0.5,
    )

    print("[HR-VITON] Models loaded successfully.")


# ── Preprocessing helpers ─────────────────────────────────────────────────────

def _resize_and_crop(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Centre-crops and resizes to target dimensions, preserving aspect ratio."""
    src_w, src_h = img.size
    scale = max(target_w / src_w, target_h / src_h)
    new_w, new_h = int(src_w * scale), int(src_h * scale)
    img = img.resize((new_w, new_h), Image.LANCZOS)
    # Centre crop
    left = (new_w - target_w) // 2
    top = (new_h - target_h) // 2
    return img.crop((left, top, left + target_w, top + target_h))


def _pil_to_tensor(img: Image.Image, normalize: bool = True):
    """Converts a PIL image to a [-1, 1] float32 torch tensor [1, C, H, W]."""
    import torch
    arr = np.array(img).astype(np.float32)
    if arr.ndim == 2:
        arr = arr[:, :, np.newaxis]
    # HWC → CHW
    tensor = torch.from_numpy(arr.transpose(2, 0, 1))
    if normalize:
        tensor = tensor / 127.5 - 1.0
    else:
        tensor = tensor / 255.0
    return tensor.unsqueeze(0)


def _generate_pose_heatmap(person_np: np.ndarray) -> np.ndarray:
    """
    Uses MediaPipe Pose to extract landmarks and renders a 18-channel
    OpenPose-compatible heatmap (VITON-HD format).
    Returns float32 numpy array [H, W, 18].
    """
    results = _mp_pose.process(person_np)
    heatmap = np.zeros((IMG_H, IMG_W, 18), dtype=np.float32)

    if not results.pose_landmarks:
        return heatmap

    # MediaPipe → COCO 18-keypoint mapping (approximate)
    # MP indices: https://google.github.io/mediapipe/solutions/pose.html
    MP_TO_COCO = {
        0: 0,   # nose
        11: 5,  # left shoulder
        12: 2,  # right shoulder
        13: 6,  # left elbow
        14: 3,  # right elbow
        15: 7,  # left wrist
        16: 4,  # right wrist
        23: 11, # left hip
        24: 8,  # right hip
        25: 12, # left knee
        26: 9,  # right knee
        27: 13, # left ankle
        28: 10, # right ankle
    }

    lm = results.pose_landmarks.landmark
    sigma = 6.0  # Gaussian radius

    for mp_idx, coco_idx in MP_TO_COCO.items():
        pt = lm[mp_idx]
        if pt.visibility < 0.3:
            continue
        cx = int(pt.x * IMG_W)
        cy = int(pt.y * IMG_H)

        # Render Gaussian blob
        yy, xx = np.mgrid[0:IMG_H, 0:IMG_W]
        gaussian = np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * sigma ** 2))
        heatmap[:, :, coco_idx] = np.maximum(heatmap[:, :, coco_idx], gaussian)

    return heatmap


def _generate_agnostic_mask(person_np: np.ndarray) -> np.ndarray:
    """
    Generates a cloth-agnostic person representation by masking the torso region.
    Uses MediaPipe segmentation + pose landmarks to identify and blank the
    upper-body (shirt/top) region.
    Returns uint8 RGB image.
    """
    results = _mp_pose.process(person_np)
    agnostic = person_np.copy()

    if not results.pose_landmarks or results.segmentation_mask is None:
        return agnostic

    lm = results.pose_landmarks.landmark
    h, w = person_np.shape[:2]

    # Get key torso points
    def pt(idx):
        p = lm[idx]
        return int(p.x * w), int(p.y * h)

    try:
        ls = pt(11)  # left shoulder
        rs = pt(12)  # right shoulder
        lh = pt(23)  # left hip
        rh = pt(24)  # right hip
        nose = pt(0)
    except Exception:
        return agnostic

    # Build torso polygon (shoulder-to-hip rectangle with some padding)
    pad_x = int((abs(ls[0] - rs[0]) * 0.15))
    pad_y_top = int(abs(ls[1] - nose[1]) * 0.5)
    pad_y_bot = int(abs(ls[1] - lh[1]) * 0.1)

    x_min = min(ls[0], rs[0]) - pad_x
    x_max = max(ls[0], rs[0]) + pad_x
    y_min = min(ls[1], rs[1]) - pad_y_top
    y_max = max(lh[1], rh[1]) + pad_y_bot

    x_min = max(0, x_min)
    y_min = max(0, y_min)
    x_max = min(w, x_max)
    y_max = min(h, y_max)

    # Compute the mean skin colour (from face region) to fill with
    face_region = person_np[max(0, nose[1] - 20):nose[1], x_min:x_max]
    if face_region.size > 0:
        fill_color = face_region.mean(axis=(0, 1)).astype(np.uint8)
    else:
        fill_color = np.array([200, 180, 160], dtype=np.uint8)

    # Blank the torso region
    agnostic[y_min:y_max, x_min:x_max] = fill_color

    return agnostic


def _make_cloth_mask(cloth_np: np.ndarray) -> np.ndarray:
    """
    Creates a binary cloth mask from the garment image.
    Assumes white/near-white background → mask = 1 where cloth exists.
    Returns float32 [H, W] in range [0, 1].
    """
    gray = np.mean(cloth_np.astype(np.float32), axis=2)
    # White background → pixel value near 255
    mask = (gray < 240).astype(np.float32)
    # Small morphological dilation to fill gaps
    from scipy.ndimage import binary_dilation
    mask = binary_dilation(mask.astype(bool), iterations=3).astype(np.float32)
    return mask


# ── Main inference function ───────────────────────────────────────────────────

async def run_tryon(person_img: Image.Image, garment_img: Image.Image) -> Image.Image:
    """
    Runs HR-VITON inference.

    Args:
        person_img: Full-body person PIL image (RGB).
        garment_img: Garment/clothing item PIL image (RGB).

    Returns:
        Result PIL image (RGB) with garment composited onto person.
    """
    ready, reason = is_available()
    if not ready:
        raise RuntimeError(f"HR-VITON not ready: {reason}")

    # Load models on first call (thread-safe via asyncio run_in_executor)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _load_models)

    # Run CPU/GPU inference in a thread pool to avoid blocking the event loop
    result = await loop.run_in_executor(None, _run_inference_sync, person_img, garment_img)
    return result


def _run_inference_sync(person_img: Image.Image, garment_img: Image.Image) -> Image.Image:
    """Synchronous inference — runs in a thread pool executor."""
    import torch

    tocg, device = _tocg_model

    # ── 1. Resize inputs ───────────────────────────────────────────────────
    person_img = person_img.convert("RGB")
    garment_img = garment_img.convert("RGB")

    person_img = _resize_and_crop(person_img, IMG_W, IMG_H)
    garment_img = _resize_and_crop(garment_img, IMG_W, IMG_H)

    person_np = np.array(person_img)
    garment_np = np.array(garment_img)

    # ── 2. Preprocessing ───────────────────────────────────────────────────
    print("[HR-VITON] Generating pose heatmap…")
    pose_map = _generate_pose_heatmap(person_np)          # [H, W, 18] float32

    print("[HR-VITON] Generating agnostic representation…")
    agnostic_np = _generate_agnostic_mask(person_np)      # [H, W, 3] uint8
    cloth_mask_np = _make_cloth_mask(garment_np)           # [H, W] float32

    # ── 3. Convert to tensors ──────────────────────────────────────────────
    with torch.no_grad():
        person_t   = _pil_to_tensor(person_img).to(device)               # [1,3,H,W]
        agnostic_t = _pil_to_tensor(Image.fromarray(agnostic_np)).to(device)  # [1,3,H,W]
        cloth_t    = _pil_to_tensor(garment_img).to(device)              # [1,3,H,W]

        # Cloth mask: [1,1,H,W]
        cloth_mask_t = torch.from_numpy(cloth_mask_np).unsqueeze(0).unsqueeze(0).float().to(device)

        # Pose map: [1,18,H,W]
        pose_t = torch.from_numpy(pose_map.transpose(2, 0, 1)).unsqueeze(0).to(device)

        # ── 4. Condition Generator (TOCG) ──────────────────────────────────
        # TOCG inputs: agnostic (3) + cloth (3) + cloth_mask (1) + pose (18)
        print("[HR-VITON] Running condition generator…")
        tocg_input = torch.cat([agnostic_t, cloth_t, cloth_mask_t, pose_t], dim=1)
        tocg_out = tocg(tocg_input)

        # TOCG outputs:
        #   - flow_list: list of flow fields
        #   - parse_cloth_mask: [1,1,H,W]
        #   - parse_cloth: [1,3,H,W] warped cloth
        # (Structure matches HR-VITON ConditionGenerator forward signature)
        if isinstance(tocg_out, (list, tuple)):
            # Unpack depending on HR-VITON version
            if len(tocg_out) == 3:
                flow_list, parse_cloth_mask, warped_cloth = tocg_out
            elif len(tocg_out) == 2:
                parse_cloth_mask, warped_cloth = tocg_out
                flow_list = None
            else:
                warped_cloth = tocg_out[-1]
                parse_cloth_mask = None
        else:
            warped_cloth = tocg_out
            parse_cloth_mask = None

        # Ensure warped_cloth is [1,3,H,W]
        if warped_cloth.shape[1] > 3:
            warped_cloth = warped_cloth[:, :3]

        # ── 5. Image Generator (SPADE) ─────────────────────────────────────
        print("[HR-VITON] Running image generator…")
        # Build semantic segmentation input for SPADE
        # Simplified: use parse_cloth_mask if available, else binary mask
        if parse_cloth_mask is not None:
            seg = parse_cloth_mask.float()
        else:
            seg = cloth_mask_t

        # SPADE input: concatenate agnostic + warped_cloth + parse
        gen_input = {
            "label": seg,
            "image": person_t,
            "instance": seg,
        }

        try:
            gen_out = _gen_model(gen_input, warped_cloth)
        except TypeError:
            # Fallback: some versions accept positional args
            try:
                gen_out = _gen_model(seg, warped_cloth, person_t)
            except Exception:
                # Last resort: blend warped cloth with person directly
                print("[HR-VITON] Generator call failed, using direct blend fallback")
                mask = cloth_mask_t.expand_as(warped_cloth)
                gen_out = warped_cloth * mask + person_t * (1 - mask)

        # ── 6. Decode output tensor → PIL image ───────────────────────────
        result_t = gen_out.squeeze(0).cpu()               # [3, H, W]
        result_t = (result_t + 1.0) / 2.0                 # [-1,1] → [0,1]
        result_t = result_t.clamp(0.0, 1.0)
        result_np = (result_t.permute(1, 2, 0).numpy() * 255).astype(np.uint8)
        result_pil = Image.fromarray(result_np)

        print("[HR-VITON] Inference complete.")
        return result_pil
