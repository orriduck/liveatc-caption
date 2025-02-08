from .database import Database

def init_database():
    """Initialize database connection and verify tables"""
    db = Database()
    try:
        # Test database connection with a simpler query
        result = db.supabase.table("airports").select("*").limit(1).execute()
        print("Database connection successful")
        return db
    except Exception as e:
        print(f"Database initialization failed: {e}")
        raise 