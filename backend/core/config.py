import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "dollaby-super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN", "")
COLAB_VITON_URL = os.getenv("COLAB_VITON_URL", "").rstrip("/")
VITON_MODE = os.getenv("VITON_MODE", "huggingface").lower()
