import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Get the MongoDB URL from environment variables
MONGODB_URL = os.getenv("DATABASE_URL")
DB_NAME = "dollaby"

class Database:
    client: AsyncIOMotorClient = None

db = Database()

async def get_database():
    """Dependency to get the Dollaby MongoDB database."""
    return db.client[DB_NAME]
