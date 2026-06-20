import os
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from supabase_client import sb_get

load_dotenv(Path(__file__).parent / ".env")

async def main():
    print("--- LAW BOOKS ---")
    try:
        books = await sb_get("law_books", {"select": "id,title,default_language"})
        for b in books:
            print(f"Book ID: {b.get('id')} | Title: {b.get('title')} | Lang: {b.get('default_language')}")
    except Exception as e:
        print("Error fetching law books:", e)

    print("\n--- JUDGMENTS (CASELAWS) ---")
    try:
        judgments = await sb_get("judgments", {"select": "id,judgment_title,court_id", "limit": 5})
        for j in judgments:
            print(f"Judgment ID: {j.get('id')} | Title: {j.get('judgment_title')} | Court: {j.get('court_id')}")
    except Exception as e:
        print("Error fetching judgments:", e)

if __name__ == "__main__":
    asyncio.run(main())
