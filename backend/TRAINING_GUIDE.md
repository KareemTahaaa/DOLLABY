# SimplifiedViton Training Guide

## Quick Start (Testing Phase)

### 1. **Open Colab Notebook**
- Upload `Colab_Train_Simple_VITON.ipynb` to Google Drive
- Open in Google Colab
- **Enable GPU**: Runtime → Change runtime type → T4 GPU

### 2. **Run Training** (5 epochs ≈ 1-2 hours)
- Execute all cells sequentially
- Creates synthetic dataset automatically for quick testing
- Model trains and saves to `/content/models/simple_viton_final.pth`

### 3. **Download & Integrate**
```bash
# Download from Colab
simple_viton_final.pth → 

# Copy to your project
backend/models/simple_viton_final.pth
```

### 4. **Update FastAPI**
Add to `backend/main.py`:
```python
from routers.simple_viton_routes import router as simple_viton_router

app.include_router(simple_viton_router)
```

### 5. **Test**
```bash
# Check status
curl http://localhost:8000/try-on-local/status-local

# Generate try-on
curl -X POST http://localhost:8000/try-on-local/generate-local \
  -F "person_image=@person.jpg" \
  -F "garment_image=@garment.jpg"
```

---

## Full Training (Production Phase)

### Requirements
- **GPU**: Colab Pro T4 or P100 (free tier works but slower)
- **Dataset**: VITON-HD (55K pairs, ~30GB)
- **Time**: 2-5 days for full training

### Steps

#### 1. Download VITON-HD Dataset
```bash
# Option A: Official GitHub
git clone https://github.com/shadow2496/VITON-HD.git
# Follow their setup instructions

# Option B: Hugging Face
# https://huggingface.co/datasets/levihsu/VITON-HD
# Download via web or:
from datasets import load_dataset
dataset = load_dataset("levihsu/VITON-HD")
```

#### 2. Prepare Dataset Structure
```
viton_data/
├── person_images/       (55K images)
├── garment_images/      (55K images)
└── target_images/       (55K images)
```

#### 3. Upload to Colab
```python
# In Colab
from google.colab import drive
drive.mount('/content/drive')

# Copy VITON-HD from Drive
!cp -r '/content/drive/MyDrive/VITON-HD' /content/viton_data
```

#### 4. Modify Notebook
Change in `Colab_Train_Simple_VITON.ipynb`:
```python
# Use real dataset instead of synthetic
num_samples = 55000  # Full VITON-HD

# Increase training epochs
epochs = 20  # Or more for better convergence

# Adjust batch size based on GPU memory
batch_size = 16  # P100, or 8 for T4
```

#### 5. Run Full Training
- Expected time: 2-5 days on Colab
- Save checkpoints every 2 epochs
- Monitor loss curve

#### 6. Download Final Model
```python
# In Colab
files.download("/content/models/simple_viton_final.pth")
```

---

## Model Architecture Details

### SimplifiedVitonUNet
- **Encoder**: 3 levels (32 → 64 → 128 channels)
- **Bottleneck**: 256 channels
- **Decoder**: Symmetric with skip connections
- **Input**: Person (3ch) + Garment (3ch) → 6 channels
- **Output**: RGB image (3 channels)
- **Parameters**: ~7.8M
- **Size**: ~31 MB

### Loss Function
```
Total Loss = L1_Loss + 0.5 * MSE_Loss + 0.1 * Edge_Consistency_Loss
```

- **L1 Loss**: Content preservation
- **MSE Loss**: Perceptual smoothness
- **Edge Loss**: Smooth garment transitions

---

## Training Hyperparameters

```python
Optimizer: Adam (β₁=0.9, β₂=0.999)
Learning Rate: 1e-4
LR Scheduler: StepLR (step=5, gamma=0.5)
Batch Size: 4-16 (depends on GPU)
Epochs: 5-20
Input Size: 256×192 (H×W)
```

---

## Evaluation Metrics

Track in `training_history.json`:
- **Train Loss**: Should decrease over epochs
- **Validation Loss**: Should plateau

For better evaluation:
- Visual quality: Compare person+garment vs result
- FID Score: Inception-based quality metric
- LPIPS: Perceptual similarity (if needed)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Out of Memory | Reduce batch_size (4→2) or input_size (256→224) |
| Model not converging | Increase epochs, lower LR to 5e-5 |
| Poor quality results | Use real VITON-HD dataset, not synthetic |
| Training too slow | Use Colab Pro (T4→P100), increase batch size |
| Model file not found | Ensure `models/simple_viton_final.pth` exists |

---

## Next: Full LaDI-VTON Training

Once SimplifiedViton works, upgrade to **LaDI-VTON**:
- ✅ Same training pipeline
- ✅ Better quality
- ✅ Faster inference
- ✅ Open-source

See: `Full_LaDI_VITON_Training.ipynb` (coming soon)

---

## File Structure

```
backend/
├── simple_viton_model.py          # Model architecture
├── train_simple_viton.py          # Training script
├── Colab_Train_Simple_VITON.ipynb # Colab notebook
├── routers/simple_viton_routes.py # FastAPI endpoints
├── models/
│   └── simple_viton_final.pth     # Trained weights (download here)
└── requirements.txt               # Dependencies
```

---

## Performance Expectations

| Mode | Speed | Quality | Hardware |
|------|-------|---------|----------|
| SimplifiedViton | Fast (1-2s) | Medium | CPU/GPU |
| LaDI-VITON | Medium (3-5s) | Good | GPU |
| HR-VITON | Slow (10-20s) | Best | GPU |

---

## Questions?

- GPU out of memory? → Reduce batch size
- Model not training? → Check dataset paths
- Results too blurry? → Train longer or use VITON-HD
