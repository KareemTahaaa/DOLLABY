"""
Simplified virtual try-on model (lightweight UNet) for quick prototyping.
Trainable in hours on Colab free tier.
"""

from PIL import Image
import numpy as np
from pathlib import Path

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    from torchvision import transforms
    _TORCH_AVAILABLE = True
except ImportError:
    _TORCH_AVAILABLE = False


def _require_torch():
    if not _TORCH_AVAILABLE:
        raise RuntimeError(
            "PyTorch is not installed. The simple try-on model requires: "
            "pip install torch torchvision"
        )


if _TORCH_AVAILABLE:
    class SimplifiedVitonUNet(nn.Module):
        """Lightweight UNet for try-on image generation."""

        def __init__(self, in_channels=6, out_channels=3, base_features=32):
            super().__init__()
            self.base = base_features

            self.enc1 = self._conv_block(in_channels, self.base)
            self.pool1 = nn.MaxPool2d(2)

            self.enc2 = self._conv_block(self.base, self.base * 2)
            self.pool2 = nn.MaxPool2d(2)

            self.enc3 = self._conv_block(self.base * 2, self.base * 4)
            self.pool3 = nn.MaxPool2d(2)

            self.bottleneck = self._conv_block(self.base * 4, self.base * 8)

            self.upconv3 = nn.ConvTranspose2d(self.base * 8, self.base * 4, 4, 2, 1)
            self.dec3 = self._conv_block(self.base * 8, self.base * 4)

            self.upconv2 = nn.ConvTranspose2d(self.base * 4, self.base * 2, 4, 2, 1)
            self.dec2 = self._conv_block(self.base * 4, self.base * 2)

            self.upconv1 = nn.ConvTranspose2d(self.base * 2, self.base, 4, 2, 1)
            self.dec1 = self._conv_block(self.base * 2, self.base)

            self.final = nn.Conv2d(self.base, out_channels, 1)

        def _conv_block(self, in_ch, out_ch):
            return nn.Sequential(
                nn.Conv2d(in_ch, out_ch, 3, padding=1),
                nn.BatchNorm2d(out_ch),
                nn.ReLU(inplace=True),
                nn.Conv2d(out_ch, out_ch, 3, padding=1),
                nn.BatchNorm2d(out_ch),
                nn.ReLU(inplace=True),
            )

        def forward(self, person, garment):
            x = torch.cat([person, garment], dim=1)

            e1 = self.enc1(x)
            e2 = self.enc2(self.pool1(e1))
            e3 = self.enc3(self.pool2(e2))

            b = self.bottleneck(self.pool3(e3))

            d3 = self.dec3(torch.cat([self.upconv3(b), e3], dim=1))
            d2 = self.dec2(torch.cat([self.upconv2(d3), e2], dim=1))
            d1 = self.dec1(torch.cat([self.upconv1(d2), e1], dim=1))

            return torch.tanh(self.final(d1))


class SimpleVitonTrainer:
    """Trainer/inference wrapper for the simplified VITON model."""

    def __init__(self, model_path="models/simple_viton.pth", device="cuda"):
        _require_torch()
        self.device = device
        self.model_path = Path(model_path)
        self.model_path.parent.mkdir(exist_ok=True)

        self.model = SimplifiedVitonUNet().to(device)
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr=1e-4)
        self.loss_fn = nn.L1Loss()
        self.mse_loss = nn.MSELoss()

        self.transform = transforms.Compose([
            transforms.Resize((256, 192)),
            transforms.ToTensor(),
            transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
        ])

    def load_model(self):
        if self.model_path.exists():
            self.model.load_state_dict(torch.load(self.model_path, map_location=self.device))
            print(f"Loaded model from {self.model_path}")
        else:
            print(f"Model not found at {self.model_path}, using fresh model")

    def save_model(self):
        torch.save(self.model.state_dict(), self.model_path)
        print(f"Model saved to {self.model_path}")

    def process_image_pair(self, person_img, garment_img):
        person_tensor = self.transform(person_img).unsqueeze(0).to(self.device)
        garment_tensor = self.transform(garment_img).unsqueeze(0).to(self.device)
        return person_tensor, garment_tensor

    def infer(self, person_img, garment_img):
        self.model.eval()
        with torch.no_grad():
            person_t, garment_t = self.process_image_pair(person_img, garment_img)
            output = self.model(person_t, garment_t)

        output = output.squeeze(0).cpu()
        output = (output + 1) / 2
        output = (output * 255).byte().permute(1, 2, 0).numpy()
        return Image.fromarray(output)

    def train_step(self, person_tensor, garment_tensor, target_tensor):
        self.model.train()
        output = self.model(person_tensor, garment_tensor)
        l1_loss = self.loss_fn(output, target_tensor)
        mse_loss = self.mse_loss(output, target_tensor)
        total_loss = l1_loss + 0.5 * mse_loss
        self.optimizer.zero_grad()
        total_loss.backward()
        self.optimizer.step()
        return total_loss.item()


def get_trainer(model_path="models/simple_viton.pth"):
    """Singleton trainer instance for FastAPI integration."""
    _require_torch()
    if not hasattr(get_trainer, "_instance"):
        device = "cuda" if torch.cuda.is_available() else "cpu"
        trainer = SimpleVitonTrainer(model_path=model_path, device=device)
        trainer.load_model()
        get_trainer._instance = trainer
    return get_trainer._instance
