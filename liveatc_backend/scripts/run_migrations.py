import subprocess
import os
from pathlib import Path

def run_migrations():
    """Run Supabase database migrations"""
    supabase_dir = Path(__file__).parent.parent / "supabase"
    
    try:
        result = subprocess.run(
            ["supabase", "db", "push"],
            cwd=supabase_dir,
            check=True,
            capture_output=True,
            text=True
        )
        print("Migration successful!")
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print("Migration failed!")
        print(e.stderr)
        raise

if __name__ == "__main__":
    run_migrations() 