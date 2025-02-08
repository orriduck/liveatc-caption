from typing import Optional
import os
from supabase import create_client, Client

class Database:
    def __init__(self):
        self.supabase: Optional[Client] = None
        self.init_client()

    def init_client(self):
        url: str = os.getenv("SUPABASE_URL")
        key: str = os.getenv("SUPABASE_KEY")
        if not url or not key:
            raise ValueError("Missing Supabase credentials in .env file")
        self.supabase = create_client(url, key)

    async def get_airports(self):
        return self.supabase.table("airports").select("*").execute()

    async def insert_airport(self, airport_data: dict):
        return self.supabase.table("airports").insert(airport_data).execute()

    async def get_audio_channels(self, airport_id: int):
        return self.supabase.table("audio_channels")\
            .select("*")\
            .eq("airport_id", airport_id)\
            .execute() 