"""
Training script for simplified VITON model on Colab.
Run with GPU enabled.

Usage:
    python scripts/train_viton.py --data_dir ./viton_data --epochs 10 --batch_size 8
"""

import sys
from pathlib import Path

# Ensure backend root is on sys.path when running as a script
sys.path.insert(0, str(Path(__file__).parent.parent))

import argparse
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image
import os
from tqdm import tqdm
import json

from services.viton.simple_model import SimplifiedVitonUNet


class SimpleVitonDataset(Dataset):
    """Dataset for try-on training.

    Expected directory structure:
        data_dir/
            person_images/   — source person photos
            garment_images/  — garment photos
            target_images/   — ground-truth (person wearing garment)
    """

    def __init__(self, data_dir, transform=None, size=(256, 192)):
        self.data_dir = Path(data_dir)
        self.size = size

        self.person_dir = self.data_dir / "person_images"
        self.garment_dir = self.data_dir / "garment_images"
        self.target_dir = self.data_dir / "target_images"

        assert self.person_dir.exists(), f"Person images dir not found: {self.person_dir}"
        assert self.garment_dir.exists(), f"Garment images dir not found: {self.garment_dir}"
        assert self.target_dir.exists(), f"Target images dir not found: {self.target_dir}"

        self.image_files = sorted([f for f in os.listdir(self.person_dir) if f.endswith(('.jpg', '.png'))])

        self.transform = transform or transforms.Compose([
            transforms.Resize(size),
            transforms.ToTensor(),
            transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
        ])

    def __len__(self):
        return len(self.image_files)

    def __getitem__(self, idx):
        img_name = self.image_files[idx]
        stem = img_name.split('.')[0]

        person_path = self.person_dir / img_name
        garment_candidates = list(self.garment_dir.glob(f"{stem}.*"))
        target_candidates = list(self.target_dir.glob(f"{stem}.*"))

        garment_path = garment_candidates[0] if garment_candidates else person_path
        target_path = target_candidates[0] if target_candidates else person_path

        person = self.transform(Image.open(person_path).convert("RGB"))
        garment = self.transform(Image.open(garment_path).convert("RGB"))
        target = self.transform(Image.open(target_path).convert("RGB"))

        return {"person": person, "garment": garment, "target": target, "name": img_name}


class Trainer:
    def __init__(self, model, device, save_dir="models"):
        self.model = model.to(device)
        self.device = device
        self.save_dir = Path(save_dir)
        self.save_dir.mkdir(exist_ok=True)

        self.optimizer = torch.optim.Adam(self.model.parameters(), lr=1e-4, betas=(0.9, 0.999))
        self.scheduler = torch.optim.lr_scheduler.StepLR(self.optimizer, step_size=5, gamma=0.5)
        self.l1_loss = nn.L1Loss()
        self.mse_loss = nn.MSELoss()
        self.history = {"train_loss": []}

    def train_epoch(self, dataloader):
        self.model.train()
        total_loss = 0
        for batch in tqdm(dataloader, desc="Training"):
            person = batch["person"].to(self.device)
            garment = batch["garment"].to(self.device)
            target = batch["target"].to(self.device)

            output = self.model(person, garment)
            loss = self.l1_loss(output, target) + 0.5 * self.mse_loss(output, target)

            self.optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
            self.optimizer.step()
            total_loss += loss.item()

        avg = total_loss / len(dataloader)
        self.history["train_loss"].append(avg)
        return avg

    def save_checkpoint(self, epoch):
        torch.save(self.model.state_dict(), self.save_dir / f"checkpoint_epoch_{epoch}.pth")

    def save_history(self):
        with open(self.save_dir / "training_history.json", "w") as f:
            json.dump(self.history, f, indent=2)


def main():
    parser = argparse.ArgumentParser(description="Train simplified VITON model")
    parser.add_argument("--data_dir", type=str, required=True)
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch_size", type=int, default=8)
    parser.add_argument("--save_dir", type=str, default="models")
    args = parser.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")

    dataset = SimpleVitonDataset(args.data_dir)
    loader = DataLoader(dataset, batch_size=args.batch_size, shuffle=True, num_workers=2)

    model = SimplifiedVitonUNet()
    trainer = Trainer(model, device=device, save_dir=args.save_dir)

    print(f"Training for {args.epochs} epochs…")
    for epoch in range(1, args.epochs + 1):
        loss = trainer.train_epoch(loader)
        print(f"Epoch {epoch}/{args.epochs} — Loss: {loss:.6f}")
        if epoch % 2 == 0:
            trainer.save_checkpoint(epoch)
        trainer.scheduler.step()

    final_path = Path(args.save_dir) / "simple_viton_final.pth"
    torch.save(model.state_dict(), final_path)
    print(f"Training complete! Model saved to {final_path}")
    trainer.save_history()


if __name__ == "__main__":
    main()
