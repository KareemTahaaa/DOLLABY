from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import bcrypt

from core.database import get_supabase
from models.schemas import UserCreate, UserLogin, Token
from core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
router = APIRouter(prefix="/auth", tags=["Authentication"])


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    db = get_supabase()
    res = db.table("users").select("*").eq("id", user_id).single().execute()
    if not res.data:
        raise credentials_exception
    return res.data


@router.post("/register", response_model=Token)
def register(user_data: UserCreate):
    db = get_supabase()

    existing = db.table("users").select("id").eq("email", user_data.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(user_data.password)
    res = db.table("users").insert({
        "name": user_data.name,
        "email": user_data.email,
        "hashed_password": hashed,
    }).execute()

    user_id = res.data[0]["id"]
    token = create_access_token(data={"sub": user_id, "email": user_data.email, "name": user_data.name})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
def login(user_data: UserLogin):
    db = get_supabase()

    res = db.table("users").select("*").eq("email", user_data.email).execute()
    if not res.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = res.data[0]
    if not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(data={"sub": user["id"], "email": user["email"], "name": user["name"]})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "location": current_user.get("location", "Cairo, Egypt"),
        "profile_picture": current_user.get("profile_picture"),
    }
