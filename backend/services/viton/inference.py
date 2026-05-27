"""
Local HR-VITON inference for VITON_MODE=local.

Requires (one-time setup):
  1. git clone https://github.com/sangyun884/HR-VITON.git backend/viton/HR-VITON
  2. Download checkpoints into backend/viton/HR-VITON/checkpoints/
       tocg_checkpoint.pth  → https://drive.google.com/file/d/1XJTCdRBOPVgVTmqzhVGFAgMm2NLkw5uQ
       gen_checkpoint.pth   → https://drive.google.com/file/d/1T5_YDUhYSSKPC_nZMk2NeC-XXUFoYeNy
  3. pip install mediapipe rembg transformers torch torchvision
  4. Set VITON_MODE=local in backend/.env
"""

import os
import sys
import asyncio
import argparse
from pathlib import Path
from typing import Tuple

import numpy as np
from PIL import Image

# Path resolves to backend/viton/HR-VITON regardless of where this file lives
VITON_MODELS_DIR = os.getenv(
    "VITON_MODELS_DIR",
    str(Path(__file__).parent.parent.parent / "viton" / "HR-VITON"),
)
TOCG_CHECKPOINT = os.getenv(
    "VITON_TOCG_CHECKPOINT",
    str(Path(VITON_MODELS_DIR) / "checkpoints" / "tocg_checkpoint.pth"),
)
GEN_CHECKPOINT = os.getenv(
    "VITON_GEN_CHECKPOINT",
    str(Path(VITON_MODELS_DIR) / "checkpoints" / "gen_checkpoint.pth"),
)

IMG_H, IMG_W = 256, 192


def is_available() -> Tuple[bool, str]:
    missing = []

    try:
        import torch  # noqa
    except ImportError:
        missing.append("PyTorch not installed — pip install torch torchvision")

    try:
        import mediapipe  # noqa
    except ImportError:
        missing.append("mediapipe not installed — pip install mediapipe")

    try:
        import rembg  # noqa
    except ImportError:
        missing.append("rembg not installed — pip install rembg")

    try:
        from transformers import SegformerForSemanticSegmentation  # noqa
    except ImportError:
        missing.append("transformers not installed — pip install transformers")

    if not Path(VITON_MODELS_DIR).exists():
        missing.append(
            f"HR-VITON repo not found at {VITON_MODELS_DIR}. "
            "Run: git clone https://github.com/sangyun884/HR-VITON.git backend/viton/HR-VITON"
        )

    if not Path(TOCG_CHECKPOINT).exists():
        missing.append(f"TOCG checkpoint missing: {TOCG_CHECKPOINT}")

    if not Path(GEN_CHECKPOINT).exists():
        missing.append(f"Generator checkpoint missing: {GEN_CHECKPOINT}")

    if missing:
        return False, " | ".join(missing)
    return True, "HR-VITON local inference ready."


_tocg = None
_gen = None
_pose = None
_parse_processor = None
_parse_model = None


def _load_models():
    global _tocg, _gen, _pose, _parse_processor, _parse_model
    if _tocg is not None:
        return

    import torch
    import mediapipe as mp
    from transformers import SegformerForSemanticSegmentation, SegformerImageProcessor

    if VITON_MODELS_DIR not in sys.path:
        sys.path.insert(0, VITON_MODELS_DIR)

    from networks import ConditionGenerator, load_checkpoint          # type: ignore
    from network_generator import SPADEGenerator                      # type: ignore

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[HR-VITON] Loading models on {device}…")

    opt = argparse.Namespace(
        fine_width=IMG_W, fine_height=IMG_H,
        semantic_nc=13, output_nc=13, ngf=96,
        num_D=2, spectral=True,
        norm_G="spectralaliasinstance",
        Ddownx2=True, Ddropout=True,
        occlusion=True, warp_feature="T1",
        out_layer="relu",
        gen_semantic_nc=7,
        gpu_ids=[0] if device == "cuda" else [],
        norm_type="instance", upsample="bilinear",
        num_upsampling_layers="most",
        no_ganFeat_loss=False, no_vgg_loss=False,
        use_vae=False, contain_dontcare_label=False,
        crop_size=IMG_H,
        ndf=64, norm_D="spectralinstance", n_layers_D=3,
        cuda=(device == "cuda"),
    )

    tocg = ConditionGenerator(opt, input1_nc=4, input2_nc=16, output_nc=13, ngf=opt.ngf)
    load_checkpoint(tocg, TOCG_CHECKPOINT, opt)
    tocg.to(device).eval()
    _tocg = (tocg, device)

    gen = SPADEGenerator(opt, 3 + 3 + 3)
    load_checkpoint(gen, GEN_CHECKPOINT, opt)
    gen.to(device).eval()
    _gen = gen

    print("[HR-VITON] Loading human parser…")
    _parse_processor = SegformerImageProcessor.from_pretrained("mattmdjaga/segformer_b2_clothes")
    _parse_model = SegformerForSemanticSegmentation.from_pretrained("mattmdjaga/segformer_b2_clothes")
    _parse_model.to(device).eval()

    _pose = mp.solutions.pose.Pose(
        static_image_mode=True, model_complexity=2,
        enable_segmentation=True, min_detection_confidence=0.5,
    )

    print("[HR-VITON] All models loaded.")


_SEG_REMAP = {
    0: 0, 2: 1, 11: 2, 15: 3, 14: 4, 4: 5, 7: 5,
    12: 6, 13: 7, 9: 8, 10: 9, 6: 11, 5: 11,
    1: 12, 3: 12, 8: 12, 16: 12, 17: 12,
}


def _preprocess_cloth(cloth_pil: Image.Image):
    from rembg import remove
    cloth_rgba = remove(cloth_pil.convert("RGB"))
    arr = np.array(cloth_rgba)
    cloth_rgb = Image.fromarray(arr[:, :, :3]).resize((IMG_W, IMG_H), Image.LANCZOS)
    mask_np = (arr[:, :, 3] > 10).astype(np.uint8) * 255
    cloth_mask = Image.fromarray(mask_np).resize((IMG_W, IMG_H), Image.NEAREST)
    return cloth_rgb, cloth_mask


def _parse_human(person_pil: Image.Image) -> np.ndarray:
    import torch
    import torch.nn.functional as F

    _, device = _tocg
    resized = person_pil.resize((IMG_W, IMG_H))
    inputs = _parse_processor(images=resized, return_tensors="pt").to(device)
    with torch.no_grad():
        logits = _parse_model(**inputs).logits
    pred = F.interpolate(logits, size=(IMG_H, IMG_W), mode="bilinear", align_corners=False)
    parse_raw = pred.argmax(dim=1).squeeze().cpu().numpy().astype(np.uint8)

    parse_13 = np.zeros_like(parse_raw)
    for src, dst in _SEG_REMAP.items():
        parse_13[parse_raw == src] = dst
    return parse_13


def _make_agnostic(person_pil: Image.Image, parse_np: np.ndarray) -> Image.Image:
    arr = np.array(person_pil.resize((IMG_W, IMG_H)))
    agnostic = arr.copy()
    agnostic[parse_np == 5] = [128, 128, 128]
    return Image.fromarray(agnostic)


def _make_densepose_approx(person_pil: Image.Image) -> np.ndarray:
    person_np = np.array(person_pil.resize((IMG_W, IMG_H)))
    results = _pose.process(person_np)
    dp = np.zeros((IMG_H, IMG_W, 3), dtype=np.float32)

    if results.segmentation_mask is not None:
        seg = np.array(Image.fromarray(results.segmentation_mask).resize((IMG_W, IMG_H)))
        body = (seg > 0.5)
        yy, xx = np.mgrid[0:IMG_H, 0:IMG_W]
        dp[:, :, 0] = (xx / IMG_W) * body
        dp[:, :, 1] = (yy / IMG_H) * body
        dp[:, :, 2] = body.astype(float)
    return dp


def _to_tensor(img: Image.Image, device: str, normalize: bool = True):
    import torch
    arr = np.array(img).astype(np.float32)
    if arr.ndim == 2:
        arr = arr[:, :, np.newaxis]
    t = torch.from_numpy(arr.transpose(2, 0, 1))
    t = (t / 127.5 - 1.0) if normalize else (t / 255.0)
    return t.unsqueeze(0).to(device)


def _run_inference_sync(person_img: Image.Image, garment_img: Image.Image) -> Image.Image:
    import torch

    tocg_model, device = _tocg

    person_img = person_img.convert("RGB").resize((IMG_W, IMG_H), Image.LANCZOS)
    garment_img = garment_img.convert("RGB").resize((IMG_W, IMG_H), Image.LANCZOS)

    cloth_rgb, cloth_mask = _preprocess_cloth(garment_img)
    parse_np = _parse_human(person_img)
    agnostic_pil = _make_agnostic(person_img, parse_np)
    dense_approx = _make_densepose_approx(person_img)

    with torch.no_grad():
        cloth_t = _to_tensor(cloth_rgb, device)
        mask_np = np.array(cloth_mask)[:, :, np.newaxis].astype(np.float32) / 255.0
        mask_t = torch.from_numpy(mask_np.transpose(2, 0, 1)).unsqueeze(0).to(device)
        input1 = torch.cat([cloth_t, mask_t], dim=1)

        parse_oh = torch.zeros(1, 13, IMG_H, IMG_W, device=device)
        for c in range(13):
            parse_oh[0, c] = torch.from_numpy((parse_np == c).astype(np.float32)).to(device)
        dense_t = torch.from_numpy(dense_approx.transpose(2, 0, 1)).unsqueeze(0).to(device)
        input2 = torch.cat([parse_oh, dense_t], dim=1)

        tocg_out = tocg_model(input1, input2)
        if isinstance(tocg_out, (list, tuple)):
            warped_cloth = tocg_out[-1]
        else:
            warped_cloth = tocg_out
        if warped_cloth.shape[1] > 3:
            warped_cloth = warped_cloth[:, :3]

        agnostic_t = _to_tensor(agnostic_pil, device)
        gen_input = torch.cat([agnostic_t, dense_t, warped_cloth], dim=1)

        try:
            result_t = _gen(gen_input)
            if isinstance(result_t, (list, tuple)):
                result_t = result_t[0]
        except Exception:
            blend_mask = mask_t.expand_as(warped_cloth)
            result_t = warped_cloth * blend_mask + agnostic_t * (1 - blend_mask)

    out = result_t.squeeze(0).cpu()
    out = ((out + 1.0) / 2.0).clamp(0.0, 1.0)
    out_np = (out.permute(1, 2, 0).numpy() * 255).astype(np.uint8)
    return Image.fromarray(out_np)


async def run_tryon(person_img: Image.Image, garment_img: Image.Image) -> Image.Image:
    ready, reason = is_available()
    if not ready:
        raise RuntimeError(f"HR-VITON not ready: {reason}")

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _load_models)
    return await loop.run_in_executor(None, _run_inference_sync, person_img, garment_img)
