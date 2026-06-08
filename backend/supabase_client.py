"""Thin async client over Supabase PostgREST using the service-role key.
Used server-side ONLY (key never leaves the backend)."""

import os
from pathlib import Path
import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")


def _base():
    return os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1"


def _headers():
    key = os.environ["SUPABASE_SERVICE_KEY"]
    return {"apikey": key, "Authorization": f"Bearer {key}", "Accept": "application/json"}


async def sb_get(table: str, params: dict):
    """GET rows from a table. `params` are PostgREST query params."""
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{_base()}/{table}", headers=_headers(), params=params)
        r.raise_for_status()
        return r.json()


async def sb_get_one(table: str, params: dict):
    rows = await sb_get(table, {**params, "limit": 1})
    return rows[0] if rows else None
