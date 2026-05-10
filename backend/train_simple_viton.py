"""
train_simple_viton.py
=====================
Training script for simplified VITON model on Colab.
Run this in a Colab notebook with GPU enabled.

Usage:
    python train_simple_viton.py --data_dir ./viton_data --epochs 10 --batch_size 8
"""

import argparse
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from pathlib import Path
from PIL import Image
import os
from tqdm import tqdm
import json

from simple_viton_model import SimplifiedVitonUNet


class SimpleVitonDataset(Dataset):
    """Dataset for try-on training. Expects directory structure:
    data_dir/
        ├── person_images/
        │   ├── img_001.jpg
        │   └── img_002.jpg
        ├── garment_images/
        │   ├── garment_001.jpg
        │   └── garment_002.jpg
        └── target_images/  (person wearing garment)
            ├── result_001.jpg
            └── result_002.jpg
    """

    def __init__(self, data_dir, split="train", transform=None, size=(256, 192)):
        self.data_dir = Path(data_dir)
        self.split = split
        self.size = size

        self.person_dir = self.data_dir / "person_images"
        self.garment_dir = self.data_dir / "garment_images"
        self.target_dir = self.data_dir / "target_images"

        # Validate directories exist
        assert self.person_dir.exists(), f"Person images dir not found: {self.person_dir}"
        assert self.garment_dir.exists(), f"Garment images dir not found: {self.garment_dir}"
        assert self.target_dir.exists(), f"Target images dir not found: {self.target_dir}"

        self.image_files = sorted([f for f in os.listdir(self.person_dir) if f.endswith(('.jpg', '.png'))])

        # Default transform
        if transform is None:
            self.transform = transforms.Compose([
                transforms.Resize(size),
                transforms.ToTensor(),
                transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
            ])
        else:
            self.transform = transform

    def __len__(self):
        return len(self.image_files)

    def __getitem__(self, idx):
        img_name = self.image_files[idx]

        person_path = self.person_dir / img_name
        garment_path = self.garment_dir / img_name
        target_path = self.target_dir / img_name

        # Handle missing files
        if not garment_path.exists():
            garment_path = list(self.garment_dir.glob(f"{img_name.split('.')[0]}.*"))[0] if list(self.garment_dir.glob(f"{img_name.split('.')[0]}.*")) else person_path
        if not target_path.exists():
            target_path = list(self.target_dir.glob(f"{img_name.split('.')[0]}.*"))[0] if list(self.target_dir.glob(f"{img_name.split('.')[0]}.*")) else person_path

        person_img = Image.open(person_path).convert("RGB")
        garment_img = Image.open(garment_path).convert("RGB")
        target_img = Image.open(target_path).convert("RGB")

        person = self.transform(person_img)
        garment = self.transform(garment_img)
        target = self.transform(target_img)

        return {"person": person, "garment": garment, "target": target, "name": img_name}


class SimpleVitonTrainer:
    """Trainer for simplified VITON."""

    def __init__(self, model, device, save_dir="models"):
        self.model = model.to(device)
        self.device = device
        self.save_dir = Path(save_dir)
        self.save_dir.mkdir(exist_ok=True)

        self.optimizer = torch.optim.Adam(self.model.parameters(), lr=1e-4, betas=(0.9, 0.999))
        self.scheduler = torch.optim.lr_scheduler.StepLR(self.optimizer, step_size=5, gamma=0.5)

        self.l1_loss = nn.L1Loss()
        self.mse_loss = nn.MSELoss()

        self.history = {"train_loss": [], "val_loss": []}

    def train_epoch(self, dataloader):
        """Train for one epoch."""
        self.model.train()
        total_loss = 0

        for batch in tqdm(dataloader, desc="Training"):
            person = batch["person"].to(self.device)
            garment = batch["garment"].to(self.device)
            target = batch["target"].to(self.device)

            output = self.model(person, garment)

            # Loss: L1 (content) + MSE (smoothness) + adversarial-like perceptual
            l1_loss = self.l1_loss(output, target)
            mse_loss = self.mse_loss(output, target)

            # Edge consistency loss (encourage smooth transitions)
            edge_loss = self._edge_loss(output, target)

            total = l1_loss + 0.5 * mse_loss + 0.1 * edge_loss

            self.optimizer.zero_grad()
            total.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
            self.optimizer.step()

            total_loss += total.item()

        avg_loss = total_loss / len(dataloader)
        self.history["train_loss"].append(avg_loss)
        return avg_loss

    @torch.no_grad()
    def validate(self, dataloader):
        """Validate model."""
        self.model.eval()
        total_loss = 0

        for batch in tqdm(dataloader, desc="Validating"):
            person = batch["person"].to(self.device)
            garment = batch["garment"].to(self.device)
            target = batch["target"].to(self.device)

            output = self.model(person, garment)
            loss = self.l1_loss(output, target) + 0.5 * self.mse_loss(output, target)
            total_loss += loss.item()

        avg_loss = total_loss / len(dataloader)
        self.history["val_loss"].append(avg_loss)
        return avg_loss

    def _edge_loss(self, output, target, sigma=0.1):
        """Edge consistency loss."""
        sobel_x = torch.tensor([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=torch.float32).to(self.device)
        sobel_y = torch.tensor([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], dtype=torch.float32).to(self.device)

        # Convert to grayscale
        output_gray = 0.299 * output[:, 0] + 0.587 * output[:, 1] + 0.114 * output[:, 2]
        target_gray = 0.299 * target[:, 0] + 0.587 * target[:, 1] + 0.114 * target[:, 2]

        output_edges = torch.sqrt(
            torch.nn.functional.conv2d(output_gray.unsqueeze(1), sobel_x.unsqueeze(0).unsqueeze(0), padding=1) ** 2 +
            torch.nn.functional.conv2d(output_gray.unsqueeze(1), sobel_y.unsqueeze(0).unsqueeze(0), padding=1) ** 2 + 1e-8
        )
        target_edges = torch.sqrt(
            torch.nn.functional.conv2d(target_gray.unsqueeze(1), sobel_x.unsqueeze(0).unsqueeze(0), padding=1) ** 2 +
            torch.nn.functional.conv2d(target_gray.unsqueeze(1), sobel_y.unsqueeze(0).unsqueeze(0), padding=1) ** 2 + 1e-8
        )

        return torch.mean((output_edges - target_edges) ** 2)

    def save_checkpoint(self, epoch, name="checkpoint"):
        """Save model checkpoint."""
        path = self.save_dir / f"{name}_epoch_{epoch}.pth"
        torch.save(self.model.state_dict(), path)
        print(f"Checkpoint saved: {path}")

    def save_history(self):
        """Save training history."""
        path = self.save_dir / "training_history.json"
        with open(path, "w") as f:
            json.dump(self.history, f, indent=2)


def main():
    parser = argparse.ArgumentParser(description="Train simplified VITON model")
    parser.add_argument("--data_dir", type=str, required=True, help="Path to dataset")
    parser.add_argument("--epochs", type=int, default=10, help="Number of epochs")
    parser.add_argument("--batch_size", type=int, default=8, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate")
    parser.add_argument("--save_dir", type=str, default="models", help="Save directory")
    args = parser.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")

    # Load dataset
    print("Loading dataset...")
    train_dataset = SimpleVitonDataset(args.data_dir, split="train")
    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=2)

    # Initialize model
    model = SimplifiedVitonUNet()
    trainer = SimpleVitonTrainer(model, device=device, save_dir=args.save_dir)

    print(f"Starting training for {args.epochs} epochs...")
    for epoch in range(1, args.epochs + 1):
        print(f"\n--- Epoch {epoch}/{args.epochs} ---")

        train_loss = trainer.train_epoch(train_loader)
        print(f"Train Loss: {train_loss:.6f}")

        if epoch % 2 == 0:
            trainer.save_checkpoint(epoch)

        trainer.scheduler.step()

    # Final save
    final_path = Path(args.save_dir) / "simple_viton_final.pth"
    torch.save(model.state_dict(), final_path)
    print(f"\nTraining complete! Model saved to {final_path}")

    trainer.save_history()


if __name__ == "__main__":
    main()
