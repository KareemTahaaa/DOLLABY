import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

_client: Client | None = None


def get_supabase() -> Client:
    """Return the singleton Supabase client."""
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client


# Legacy alias so any remaining imports don't crash during migration
def get_database():
    return get_supabase()
