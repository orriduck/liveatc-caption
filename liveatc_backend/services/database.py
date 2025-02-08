from typing import Optional
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

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

    def get_airports(self):
        """Get all airports"""
        return self.supabase.table("airports").select("*").execute()

    def upsert_airport(self, airport_data: dict):
        """Insert or update airport"""
        # Remove None values to prevent column not found errors
        cleaned_data = {k: v for k, v in airport_data.items() if v is not None}
        return self.supabase.table("airports")\
            .upsert(cleaned_data, on_conflict="icao")\
            .execute()

    def upsert_audio_channel(self, channel_data: dict):
        """Insert or update audio channel"""
        # Convert frequencies list to JSONB
        if 'frequencies' in channel_data:
            channel_data['frequencies'] = [freq.dict() for freq in channel_data['frequencies']]
        
        # Only include essential fields
        valid_fields = {
            'name', 'airport_icao', 'feed_status', 'frequencies', 'mp3_url'
        }
        cleaned_data = {k: v for k, v in channel_data.items() 
                       if k in valid_fields and v is not None}
        
        try:
            # First try to update existing record
            result = self.supabase.table("audio_channels")\
                .update(cleaned_data)\
                .eq("airport_icao", cleaned_data["airport_icao"])\
                .eq("name", cleaned_data["name"])\
                .execute()
            
            if not result.data:
                # If no record was updated, insert new record
                result = self.supabase.table("audio_channels")\
                    .insert(cleaned_data)\
                    .execute()
            
            return result
        except Exception as e:
            print(f"Error upserting audio channel: {e}")
            raise

    def get_audio_channels(self, icao: str):
        """Get audio channels for an airport"""
        return self.supabase.table("audio_channels")\
            .select("*")\
            .eq("airport_icao", icao.upper())\
            .execute()

    def get_airport_by_icao(self, icao: str):
        """Get airport by ICAO code"""
        return self.supabase.table("airports")\
            .select("*")\
            .eq("icao", icao.upper())\
            .execute() 