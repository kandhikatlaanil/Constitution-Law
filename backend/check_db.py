import os
import asyncio
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

async def main():
    # 1. Check Supabase PostgREST OpenAPI schema to see all available tables
    print("--- SUPABASE TABLES (via OpenAPI schema) ---")
    url = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1/"
    headers = {
        "apikey": os.environ["SUPABASE_SERVICE_KEY"],
        "Authorization": f"Bearer {os.environ['SUPABASE_SERVICE_KEY']}",
        "Accept": "application/json"
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url, headers=headers)
            if r.status_code == 200:
                schema = r.json()
                paths = schema.get("paths", {})
                tables = []
                for p in paths:
                    if p.startswith("/") and len(p) > 1:
                        table_name = p.split("/")[1]
                        if table_name not in tables:
                            tables.append(table_name)
                print("Found Supabase tables:", sorted(tables))
            else:
                print(f"Failed to get Supabase schema: HTTP {r.status_code} - {r.text}")
    except Exception as e:
        print("Error checking Supabase:", e)

    # 2. Check MongoDB Collections
    print("\n--- MONGO COLLECTIONS ---")
    try:
        mongo_url = os.environ["MONGO_URL"]
        db_name = os.environ["DB_NAME"]
        client = AsyncIOMotorClient(mongo_url)
        # print all database names
        dbs = await client.list_database_names()
        print("All MongoDB databases:", dbs)
        
        db = client[db_name]
        collections = await db.list_collection_names()
        print(f"Collections in database '{db_name}':", sorted(collections))
    except Exception as e:
        print("Error checking MongoDB:", e)

if __name__ == "__main__":
    asyncio.run(main())
