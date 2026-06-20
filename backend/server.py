from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import uuid
import bcrypt
import jwt
import httpx
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from supabase_client import sb_get, sb_get_one, sb_post, sb_patch
from content_parser import parse_html_to_segments, plain_text_from_segments

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
EMERGENT_AUTH_BASE = os.environ.get('EMERGENT_AUTH_BASE', 'https://demobackend.emergentagent.com')

app = FastAPI(title="Constitution & Law API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logging.getLogger("httpx").setLevel(logging.WARNING)
logger = logging.getLogger("constlaw")

# ----------------------------------------------------------------------------
# Languages
# ----------------------------------------------------------------------------
LANGUAGES = [
    {"code": "en-IN", "label": "English", "native": "English", "glyph": "EN"},
    {"code": "hi-IN", "label": "Hindi", "native": "हिंदी", "glyph": "हिं"},
    {"code": "te-IN", "label": "Telugu", "native": "తెలుగు", "glyph": "తె"},
    {"code": "ta-IN", "label": "Tamil", "native": "தமிழ்", "glyph": "త"},
    {"code": "kn-IN", "label": "Kannada", "native": "ಕನ್ನಡ", "glyph": "ಕ"},
    {"code": "ml-IN", "label": "Malayalam", "native": "മലയാളം", "glyph": "మ"},
]
DEFAULT_LANG = "en-IN"


# ----------------------------------------------------------------------------
# Auth helpers
# ----------------------------------------------------------------------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8")[:72], hashed.encode("utf-8"))
    except Exception:
        return False


def create_jwt(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def _public_user(u: dict) -> dict:
    return {
        "user_id": u["user_id"],
        "email": u.get("email"),
        "name": u.get("name"),
        "picture": u.get("picture"),
        "provider": u.get("provider"),
        "language": u.get("language", DEFAULT_LANG),
        "theme": u.get("theme", "dark"),
        "notifications": u.get("notifications", True),
        "subscription_plan": u.get("subscription_plan", "basic"),
    }


async def get_supabase_user(token: str) -> Optional[dict]:
    url = f"{os.environ['SUPABASE_URL'].rstrip('/')}/auth/v1/user"
    headers = {
        "apikey": os.environ["SUPABASE_SERVICE_KEY"],
        "Authorization": f"Bearer {token}"
    }
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get(url, headers=headers)
            if r.status_code == 200:
                sb_user = r.json()
                uid = sb_user["id"]
                
                profile = None
                try:
                    profile = await sb_get_one("mobile_users", {"id": f"eq.{uid}"})
                except Exception as e:
                    logger.warning("Supabase mobile_users query failed, falling back to MongoDB: %s", e)
                    db_profile = await db.users.find_one({"user_id": uid}, {"_id": 0})
                    if db_profile:
                        profile = {
                            "id": db_profile["user_id"],
                            "email": db_profile.get("email"),
                            "name": db_profile.get("name"),
                            "picture": db_profile.get("picture"),
                            "provider": db_profile.get("provider", "google"),
                            "language": db_profile.get("language", DEFAULT_LANG),
                            "theme": db_profile.get("theme", "dark"),
                            "notifications": db_profile.get("notifications", True),
                            "subscription_plan": db_profile.get("subscription_plan", "basic")
                        }

                if not profile:
                    # Auto-create profile
                    email = sb_user.get("email")
                    meta = sb_user.get("user_metadata") or {}
                    name = meta.get("name") or meta.get("full_name") or (email.split("@")[0] if email else "Google User")
                    picture = meta.get("avatar_url") or meta.get("picture")
                    profile = {
                        "id": uid,
                        "email": email,
                        "name": name,
                        "picture": picture,
                        "provider": sb_user.get("app_metadata", {}).get("provider") or "google",
                        "language": DEFAULT_LANG,
                        "theme": "dark",
                        "notifications": True,
                        "subscription_plan": "basic"
                    }
                    try:
                        await sb_post("mobile_users", profile)
                    except Exception as e:
                        logger.warning("Supabase profile insert failed, saving to MongoDB: %s", e)
                        mongo_user = {
                            "user_id": uid,
                            "email": email,
                            "name": name,
                            "picture": picture,
                            "provider": profile["provider"],
                            "language": DEFAULT_LANG,
                            "theme": "dark",
                            "notifications": True,
                            "subscription_plan": "basic",
                            "created_at": datetime.now(timezone.utc)
                        }
                        try:
                            await db.users.update_one({"user_id": uid}, {"$set": mongo_user}, upsert=True)
                        except Exception as mongo_err:
                            logger.warning("MongoDB upsert by user_id failed: %s", mongo_err)
                            if email:
                                logger.info("Attempting fallback update by email: %s", email)
                                await db.users.update_one(
                                    {"email": email},
                                    {"$set": {
                                        "user_id": uid,
                                        "name": name,
                                        "picture": picture,
                                        "provider": profile["provider"]
                                    }},
                                    upsert=True
                                )
                            else:
                                raise mongo_err
                
                return {
                    "user_id": profile["id"] or profile.get("user_id"),
                    "email": profile.get("email"),
                    "name": profile.get("name"),
                    "picture": profile.get("picture"),
                    "provider": profile.get("provider"),
                    "language": profile.get("language"),
                    "theme": profile.get("theme"),
                    "notifications": profile.get("notifications"),
                    "subscription_plan": profile.get("subscription_plan") or "basic"
                }
            else:
                logger.error("Supabase /auth/v1/user verification call failed (HTTP %d): %s", r.status_code, r.text)
        except Exception as e:
            logger.error("Error verifying Supabase token: %s", e)
    return None


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1].strip()
    
    # 1) Try local guest JWT
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
        if user:
            return user
    except jwt.PyJWTError:
        pass
        
    # 2) Try Supabase Token
    sb_user = await get_supabase_user(token)
    if sb_user:
        return sb_user
        
    # 3) Try Emergent/Google session token (fallback)
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        exp = session.get("expires_at")
        if exp and exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp and exp < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
        if user:
            return user
            
    raise HTTPException(status_code=401, detail="Invalid token")


# ----------------------------------------------------------------------------
# Auth models & routes
# ----------------------------------------------------------------------------
class RegisterReq(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class GuestReq(BaseModel):
    name: Optional[str] = "Guest"


class GoogleSessionReq(BaseModel):
    session_id: str


async def _create_user(email, name, provider, password_hash=None, picture=None):
    user = {
        "user_id": f"user_{uuid.uuid4().hex[:12]}",
        "name": name,
        "picture": picture,
        "provider": provider,
        "password_hash": password_hash,
        "language": DEFAULT_LANG,
        "theme": "dark",
        "notifications": True,
        "subscription_plan": "basic",
        "created_at": datetime.now(timezone.utc),
    }
    if email is not None:
        user["email"] = email
    await db.users.insert_one(dict(user))
    return user


@api_router.post("/auth/register")
async def register(req: RegisterReq):
    # Register user via Supabase Auth Admin API
    url = f"{os.environ['SUPABASE_URL'].rstrip('/')}/auth/v1/admin/users"
    headers = {
        "apikey": os.environ["SUPABASE_SERVICE_KEY"],
        "Authorization": f"Bearer {os.environ['SUPABASE_SERVICE_KEY']}"
    }
    payload = {
        "email": req.email.lower(),
        "password": req.password,
        "email_confirm": True,
        "user_metadata": {
            "name": req.name
        }
    }
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            r = await client.post(url, headers=headers, json=payload)
            if r.status_code != 201 and r.status_code != 200:
                detail = r.json().get("msg") or "Registration failed in Supabase"
                raise HTTPException(status_code=400, detail=detail)
            sb_user = r.json()
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            logger.error("Supabase Admin signup error: %s", e)
            raise HTTPException(status_code=400, detail="Registration service unavailable")

    uid = sb_user["id"]
    profile = {
        "id": uid,
        "email": req.email.lower(),
        "name": req.name,
        "provider": "email",
        "language": DEFAULT_LANG,
        "theme": "dark",
        "notifications": True,
        "subscription_plan": "basic"
    }
    
    try:
        await sb_post("mobile_users", profile)
    except Exception as e:
        logger.error("Supabase profile insert error: %s", e)
        # Continue anyway, it will auto-create on /me if missing

    # Authenticate user to get access token
    login_url = f"{os.environ['SUPABASE_URL'].rstrip('/')}/auth/v1/token?grant_type=password"
    login_headers = {"apikey": os.environ["SUPABASE_SERVICE_KEY"]}
    login_payload = {"email": req.email.lower(), "password": req.password}
    
    async with httpx.AsyncClient(timeout=10) as client:
        lr = await client.post(login_url, headers=login_headers, json=login_payload)
        if lr.status_code != 200:
            raise HTTPException(status_code=400, detail="Auto-login failed after registration")
        auth_data = lr.json()

    return {
        "token": auth_data["access_token"],
        "token_type": "bearer",
        "user": {
            "user_id": uid,
            "email": profile["email"],
            "name": profile["name"],
            "picture": None,
            "provider": "email",
            "language": DEFAULT_LANG,
            "theme": "dark",
            "notifications": True,
            "subscription_plan": "basic"
        }
    }


@api_router.post("/auth/login")
async def login(req: LoginReq):
    url = f"{os.environ['SUPABASE_URL'].rstrip('/')}/auth/v1/token?grant_type=password"
    headers = {"apikey": os.environ["SUPABASE_SERVICE_KEY"]}
    payload = {"email": req.email.lower(), "password": req.password}
    
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(url, headers=headers, json=payload)
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        auth_data = r.json()
        
    uid = auth_data["user"]["id"]
    profile = await sb_get_one("mobile_users", {"id": f"eq.{uid}"})
    if not profile:
        profile = {
            "id": uid,
            "email": req.email.lower(),
            "name": auth_data["user"].get("user_metadata", {}).get("name") or req.email.split("@")[0],
            "provider": "email",
            "language": DEFAULT_LANG,
            "theme": "dark",
            "notifications": True,
            "subscription_plan": "basic"
        }
        try:
            await sb_post("mobile_users", profile)
        except Exception as e:
            logger.error("Supabase profile insert error: %s", e)

    return {
        "token": auth_data["access_token"],
        "token_type": "bearer",
        "user": {
            "user_id": profile["id"],
            "email": profile.get("email"),
            "name": profile.get("name"),
            "picture": profile.get("picture"),
            "provider": profile.get("provider"),
            "language": profile.get("language"),
            "theme": profile.get("theme"),
            "notifications": profile.get("notifications"),
            "subscription_plan": profile.get("subscription_plan") or "basic"
        }
    }


@api_router.post("/auth/guest")
async def guest(req: GuestReq):
    # Track guest activity in Supabase guest_login_activity
    try:
        await sb_post("guest_login_activity", {"guest_name": req.name or "Guest"})
    except Exception as e:
        logger.error("Failed to log guest activity in Supabase: %s", e)

    user = await _create_user(None, req.name or "Guest", "guest")
    token = create_jwt(user["user_id"])
    return {"token": token, "token_type": "jwt", "user": _public_user(user)}


@api_router.post("/auth/google/session")
async def google_session(req: GoogleSessionReq):
    # Keep legacy Google session endpoint as fallback, but convert users to Supabase if needed
    async with httpx.AsyncClient(timeout=30) as c:
        resp = await c.get(
            f"{EMERGENT_AUTH_BASE}/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": req.session_id},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Google sign-in failed. Please try again.")
    data = resp.json()
    email = (data.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=401, detail="Could not retrieve Google account email")
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user = await _create_user(email, data.get("name") or email.split("@")[0],
                                  "google", picture=data.get("picture"))
    else:
        await db.users.update_one({"user_id": user["user_id"]},
                                  {"$set": {"picture": data.get("picture") or user.get("picture"),
                                            "name": user.get("name") or data.get("name")}})
        user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    session_token = data.get("session_token")
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {
            "session_token": session_token,
            "user_id": user["user_id"],
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return {"token": session_token, "token_type": "session", "user": _public_user(user)}


@api_router.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    return {"user": user}


@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


class SubscriptionReq(BaseModel):
    plan: str


@api_router.post("/auth/subscription")
async def update_subscription(req: SubscriptionReq, user: dict = Depends(get_current_user)):
    plan = req.plan.lower()
    if plan not in ["basic", "pro", "plus"]:
        raise HTTPException(status_code=400, detail="Invalid subscription plan")
        
    uid = user.get("user_id") or user.get("id")
    is_guest = user.get("provider") == "guest"
    
    if is_guest:
        await db.users.update_one({"user_id": uid}, {"$set": {"subscription_plan": plan}})
    else:
        # 1) Try to update in Supabase mobile_users table
        try:
            profile = await sb_get_one("mobile_users", {"id": f"eq.{uid}"})
            if profile:
                await sb_patch("mobile_users", {"id": f"eq.{uid}"}, {"subscription_plan": plan})
            else:
                await sb_post("mobile_users", {
                    "id": uid,
                    "email": user.get("email"),
                    "name": user.get("name"),
                    "picture": user.get("picture"),
                    "provider": user.get("provider", "google"),
                    "language": user.get("language", DEFAULT_LANG),
                    "theme": user.get("theme", "dark"),
                    "notifications": user.get("notifications", True),
                    "subscription_plan": plan
                })
        except Exception as e:
            logger.warning("Failed to update subscription in Supabase, falling back to MongoDB: %s", e)
            
        # 2) Sync to MongoDB fallback as well
        await db.users.update_one(
            {"user_id": uid},
            {"$set": {
                "user_id": uid,
                "email": user.get("email"),
                "name": user.get("name"),
                "picture": user.get("picture"),
                "provider": user.get("provider", "google"),
                "language": user.get("language", DEFAULT_LANG),
                "theme": user.get("theme", "dark"),
                "notifications": user.get("notifications", True),
                "subscription_plan": plan
            }},
            upsert=True
        )
        
    updated_user = {
        "user_id": uid,
        "email": user.get("email"),
        "name": user.get("name"),
        "picture": user.get("picture"),
        "provider": user.get("provider"),
        "language": user.get("language"),
        "theme": user.get("theme"),
        "notifications": user.get("notifications"),
        "subscription_plan": plan
    }
        
    return {"user": updated_user}


# ----------------------------------------------------------------------------
# Meta
# ----------------------------------------------------------------------------
@api_router.get("/meta/languages")
async def meta_languages():
    const_langs, law_langs = set(), set()
    try:
        for b in await sb_get("books", {"select": "default_language", "is_active": "eq.true"}):
            if b.get("default_language"):
                const_langs.add(b["default_language"])
        for b in await sb_get("law_books", {"select": "default_language", "is_active": "eq.true"}):
            if b.get("default_language"):
                law_langs.add(b["default_language"])
    except Exception as e:
        logger.warning("meta_languages supabase error: %s", e)
    available = const_langs | law_langs
    langs = []
    for lang_def in LANGUAGES:
        langs.append({**lang_def,
                      "constitution_available": lang_def["code"] in const_langs,
                      "law_available": lang_def["code"] in law_langs,
                      "available": lang_def["code"] in available})
    return {"languages": langs, "default": DEFAULT_LANG}


# ----------------------------------------------------------------------------
# Content helpers
# ----------------------------------------------------------------------------
async def _constitution_book(lang: str):
    """Return the Constitution book row for a language, falling back to default."""
    book = await sb_get_one("books", {"select": "*", "default_language": f"eq.{lang}",
                                       "is_active": "eq.true",
                                       "order": "created_at.asc"})
    if not book and lang != DEFAULT_LANG:
        book = await sb_get_one("books", {"select": "*", "default_language": f"eq.{DEFAULT_LANG}",
                                          "is_active": "eq.true", "order": "created_at.asc"})
    return book


def _build_content(row: dict):
    """Build segments + key_points from a content row (article/section)."""
    segments, next_id = parse_html_to_segments(row.get("content") or "")
    # Optional dedicated explanation field
    explanation = (row.get("explanation") or "").strip()
    if explanation:
        head_id = next_id
        segments.append({"seg_id": head_id, "block_id": 9000, "type": "heading",
                         "marker": None, "text": "Explanation",
                         "runs": [{"text": "Explanation", "bold": True, "italic": False}],
                         "speak": False})
        exp_segs, next_id = parse_html_to_segments(explanation, start_seg_id=head_id + 1)
        # shift block ids to avoid collision
        for s in exp_segs:
            s["block_id"] += 9001
        segments += exp_segs
    # Optional key_points array
    kps = row.get("key_points") or []
    if isinstance(kps, list) and kps:
        bid = 9500
        segments.append({"seg_id": next_id, "block_id": bid, "type": "heading", "marker": None,
                         "text": "Key Points",
                         "runs": [{"text": "Key Points", "bold": True, "italic": False}],
                         "speak": False})
        next_id += 1
        bid += 1
        for kp in kps:
            segments.append({"seg_id": next_id, "block_id": bid, "type": "list_item",
                             "marker": "•", "text": str(kp),
                             "runs": [{"text": str(kp), "bold": False, "italic": False}],
                             "speak": True})
            next_id += 1
            bid += 1
    return segments


def _related(siblings: List[dict], current_seq: int, number_key: str, n: int = 4):
    """Pick up to n related siblings, forward-biased like the design."""
    after = [s for s in siblings if s["sequence_order"] > current_seq]
    before = [s for s in siblings if s["sequence_order"] < current_seq]
    after.sort(key=lambda s: s["sequence_order"])
    before.sort(key=lambda s: s["sequence_order"], reverse=True)
    chosen = after[:n]
    if len(chosen) < n:
        chosen = chosen + before[: (n - len(chosen))]
    chosen.sort(key=lambda s: s["sequence_order"])
    return [{"id": s["id"], "number": s[number_key], "title": s.get("title")} for s in chosen]


def _neighbors(siblings: List[dict], current_seq: int, number_key: str):
    prev_s = max([s for s in siblings if s["sequence_order"] < current_seq],
                 key=lambda s: s["sequence_order"], default=None)
    next_s = min([s for s in siblings if s["sequence_order"] > current_seq],
                 key=lambda s: s["sequence_order"], default=None)

    def fmt(s):
        return {"id": s["id"], "number": s[number_key]} if s else None
    return fmt(prev_s), fmt(next_s)


# ----------------------------------------------------------------------------
# Constitution routes
# ----------------------------------------------------------------------------
@api_router.get("/constitution/parts")
async def constitution_parts(lang: str = Query(DEFAULT_LANG)):
    book = await _constitution_book(lang)
    if not book:
        return {"book": None, "language": lang, "parts": []}
    parts = await sb_get("parts", {"select": "id,part_number,title,sequence_order",
                                    "book_id": f"eq.{book['id']}", "order": "sequence_order.asc"})
    part_ids = [p["id"] for p in parts]
    articles = []
    if part_ids:
        ids = ",".join(part_ids)
        articles = await sb_get("articles", {
            "select": "id,article_number,title,sequence_order,part_id",
            "part_id": f"in.({ids})", "order": "sequence_order.asc"})
    by_part = {}
    for a in articles:
        by_part.setdefault(a["part_id"], []).append({
            "id": a["id"], "article_number": a["article_number"],
            "title": a["title"], "sequence_order": a["sequence_order"]})
    out_parts = [{
        "id": p["id"], "part_number": p["part_number"], "title": p["title"],
        "sequence_order": p["sequence_order"], "articles": by_part.get(p["id"], [])
    } for p in parts]
    return {"book": {"id": book["id"], "title": book["title"]},
            "language": book["default_language"], "parts": out_parts}


@api_router.get("/constitution/articles/{article_id}")
async def constitution_article(article_id: str):
    row = await sb_get_one("articles", {"select": "*", "id": f"eq.{article_id}"})
    if not row:
        raise HTTPException(status_code=404, detail="Article not found")
    segments = _build_content(row)
    siblings = await sb_get("articles", {
        "select": "id,article_number,title,sequence_order",
        "part_id": f"eq.{row['part_id']}", "order": "sequence_order.asc"})
    prev_s, next_s = _neighbors(siblings, row["sequence_order"], "article_number")
    related = _related([s for s in siblings if s["id"] != article_id],
                       row["sequence_order"], "article_number")
    part = await sb_get_one("parts", {"select": "id,part_number,title", "id": f"eq.{row['part_id']}"})
    return {
        "id": row["id"], "article_number": row["article_number"], "title": row["title"],
        "language": row.get("language"), "voice_id": row.get("voice_id"),
        "audio_url": row.get("audio_url"), "book_id": part and part.get("id"),
        "part": part, "segments": segments,
        "tts_text": plain_text_from_segments(segments),
        "related": related, "prev": prev_s, "next": next_s,
    }


@api_router.get("/constitution/search")
async def constitution_search(q: str = Query(...), lang: str = Query(DEFAULT_LANG)):
    book = await _constitution_book(lang)
    if not book or not q.strip():
        return {"results": []}
    parts = await sb_get("parts", {"select": "id", "book_id": f"eq.{book['id']}"})
    part_ids = [p["id"] for p in parts]
    if not part_ids:
        return {"results": []}
    ids = ",".join(part_ids)
    term = q.strip().replace(",", " ")
    rows = await sb_get("articles", {
        "select": "id,article_number,title,sequence_order",
        "part_id": f"in.({ids})",
        "or": f"(article_number.ilike.*{term}*,title.ilike.*{term}*,content.ilike.*{term}*)",
        "order": "sequence_order.asc", "limit": 40})
    return {"results": [{"id": r["id"], "number": r["article_number"], "title": r["title"]}
                        for r in rows]}


# ----------------------------------------------------------------------------
# Law routes
# ----------------------------------------------------------------------------
@api_router.get("/law/books")
async def law_books(lang: str = Query(DEFAULT_LANG)):
    rows = await sb_get("law_books", {"select": "id,title,default_language",
                                      "default_language": f"eq.{lang}", "is_active": "eq.true",
                                      "order": "created_at.asc"})
    if not rows and lang != DEFAULT_LANG:
        rows = await sb_get("law_books", {"select": "id,title,default_language",
                                          "default_language": f"eq.{DEFAULT_LANG}",
                                          "is_active": "eq.true", "order": "created_at.asc"})
    return {"books": rows, "language": rows[0]["default_language"] if rows else lang}


@api_router.get("/law/chapters")
async def law_chapters(book_id: str = Query(...)):
    rows = await sb_get("law_chapters", {"select": "id,chapter_number,title,sequence_order",
                                         "book_id": f"eq.{book_id}", "order": "sequence_order.asc"})
    return {"chapters": rows}


@api_router.get("/law/chapters/{chapter_id}/sections")
async def law_chapter_sections(chapter_id: str):
    rows = await sb_get("law_sections", {"select": "id,section_number,title,sequence_order",
                                         "chapter_id": f"eq.{chapter_id}",
                                         "order": "sequence_order.asc"})
    return {"sections": rows}


@api_router.get("/law/sections/{section_id}")
async def law_section(section_id: str):
    row = await sb_get_one("law_sections", {"select": "*", "id": f"eq.{section_id}"})
    if not row:
        raise HTTPException(status_code=404, detail="Section not found")
    segments = _build_content(row)
    siblings = await sb_get("law_sections", {
        "select": "id,section_number,title,sequence_order",
        "chapter_id": f"eq.{row['chapter_id']}", "order": "sequence_order.asc"})
    prev_s, next_s = _neighbors(siblings, row["sequence_order"], "section_number")
    related = _related([s for s in siblings if s["id"] != section_id],
                       row["sequence_order"], "section_number")
    chapter = await sb_get_one("law_chapters", {"select": "id,chapter_number,title,book_id",
                                                "id": f"eq.{row['chapter_id']}"})
    book = None
    if chapter:
        book = await sb_get_one("law_books", {"select": "id,title,default_language",
                                              "id": f"eq.{chapter['book_id']}"})
    return {
        "id": row["id"], "section_number": row["section_number"], "title": row["title"],
        "language": row.get("language") or (book and book.get("default_language")),
        "voice_id": row.get("voice_id"), "audio_url": row.get("audio_url"),
        "chapter": chapter, "book": book, "segments": segments,
        "tts_text": plain_text_from_segments(segments),
        "related": related, "prev": prev_s, "next": next_s,
    }


@api_router.get("/law/search")
async def law_search(q: str = Query(...), lang: str = Query(DEFAULT_LANG),
                     book_id: Optional[str] = Query(None)):
    if not q.strip():
        return {"results": []}
    if book_id:
        book_ids = [book_id]
    else:
        books = await sb_get("law_books", {"select": "id", "default_language": f"eq.{lang}",
                                           "is_active": "eq.true"})
        if not books and lang != DEFAULT_LANG:
            books = await sb_get("law_books", {"select": "id",
                                               "default_language": f"eq.{DEFAULT_LANG}",
                                               "is_active": "eq.true"})
        book_ids = [b["id"] for b in books]
    if not book_ids:
        return {"results": []}
    chapters = await sb_get("law_chapters", {"select": "id",
                                             "book_id": f"in.({','.join(book_ids)})"})
    chapter_ids = [c["id"] for c in chapters]
    if not chapter_ids:
        return {"results": []}
    term = q.strip().replace(",", " ")
    rows = await sb_get("law_sections", {
        "select": "id,section_number,title,sequence_order",
        "chapter_id": f"in.({','.join(chapter_ids)})",
        "or": f"(section_number.ilike.*{term}*,title.ilike.*{term}*,content.ilike.*{term}*)",
        "order": "sequence_order.asc", "limit": 40})
    return {"results": [{"id": r["id"], "number": r["section_number"], "title": r["title"]}
                        for r in rows]}


# ----------------------------------------------------------------------------
# User: bookmarks, recents, profile/settings
# ----------------------------------------------------------------------------
class BookmarkReq(BaseModel):
    kind: str  # 'article' | 'section'
    ref_id: str
    number: str
    title: Optional[str] = None
    subtitle: Optional[str] = None
    lang: Optional[str] = None
    book_id: Optional[str] = None


class RecentReq(BookmarkReq):
    pass


class SettingsReq(BaseModel):
    language: Optional[str] = None
    theme: Optional[str] = None
    notifications: Optional[bool] = None


class ProfileReq(BaseModel):
    name: Optional[str] = None
    picture: Optional[str] = None


@api_router.get("/bookmarks")
async def get_bookmarks(kind: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"user_id": user["user_id"]}
    if kind:
        q["kind"] = kind
    rows = await db.bookmarks.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"bookmarks": rows}


@api_router.get("/bookmarks/ids")
async def get_bookmark_ids(user: dict = Depends(get_current_user)):
    rows = await db.bookmarks.find({"user_id": user["user_id"]}, {"_id": 0, "ref_id": 1}).to_list(500)
    return {"ids": [r["ref_id"] for r in rows]}


@api_router.post("/bookmarks")
async def add_bookmark(req: BookmarkReq, user: dict = Depends(get_current_user)):
    doc = {**req.dict(), "user_id": user["user_id"], "created_at": datetime.now(timezone.utc)}
    await db.bookmarks.update_one(
        {"user_id": user["user_id"], "ref_id": req.ref_id},
        {"$set": doc}, upsert=True)
    return {"bookmarked": True, "ref_id": req.ref_id}


@api_router.delete("/bookmarks/{ref_id}")
async def remove_bookmark(ref_id: str, user: dict = Depends(get_current_user)):
    await db.bookmarks.delete_one({"user_id": user["user_id"], "ref_id": ref_id})
    return {"bookmarked": False, "ref_id": ref_id}


@api_router.post("/recents")
async def add_recent(req: RecentReq, user: dict = Depends(get_current_user)):
    doc = {**req.dict(), "user_id": user["user_id"], "updated_at": datetime.now(timezone.utc)}
    await db.recents.update_one(
        {"user_id": user["user_id"], "ref_id": req.ref_id},
        {"$set": doc}, upsert=True)
    # keep only the latest 50
    extra = await db.recents.find({"user_id": user["user_id"]}, {"_id": 1}) \
        .sort("updated_at", -1).skip(50).to_list(200)
    if extra:
        await db.recents.delete_many({"_id": {"$in": [e["_id"] for e in extra]}})
    return {"ok": True}


@api_router.get("/recents")
async def get_recents(kind: Optional[str] = None, limit: int = 20,
                      user: dict = Depends(get_current_user)):
    q = {"user_id": user["user_id"]}
    if kind:
        q["kind"] = kind
    rows = await db.recents.find(q, {"_id": 0}).sort("updated_at", -1).to_list(limit)
    return {"recents": rows}


@api_router.get("/home")
async def home(user: dict = Depends(get_current_user)):
    uid = user["user_id"]
    recents = await db.recents.find({"user_id": uid}, {"_id": 0}).sort("updated_at", -1).to_list(20)
    continue_reading = recents[0] if recents else None
    const_recents = [r for r in recents if r.get("kind") == "article"][:10]
    law_recents = [r for r in recents if r.get("kind") == "section"][:10]
    bookmark_count = await db.bookmarks.count_documents({"user_id": uid})
    articles_read = await db.recents.count_documents({"user_id": uid, "kind": "article"})
    goal = min(100, int((articles_read / 50) * 100)) if articles_read else 0
    return {
        "continue_reading": continue_reading,
        "constitution_recents": const_recents,
        "law_recents": law_recents,
        "stats": {"articles_read": articles_read, "bookmarks": bookmark_count,
                  "streak_days": 1 if recents else 0, "goal_progress": goal},
    }


@api_router.get("/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    if user.get("provider") == "guest":
        return {"user": _public_user(user)}
    return {"user": user}


@api_router.put("/settings")
async def update_settings(req: SettingsReq, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    if updates:
        if user.get("provider") == "guest":
            await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
            fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
            return {"user": _public_user(fresh)}
        else:
            await sb_patch("mobile_users", {"id": f"eq.{user['user_id']}"}, updates)
            fresh = await sb_get_one("mobile_users", {"id": f"eq.{user['user_id']}"})
            return {"user": {
                "user_id": fresh["id"],
                "email": fresh.get("email"),
                "name": fresh.get("name"),
                "picture": fresh.get("picture"),
                "provider": fresh.get("provider"),
                "language": fresh.get("language"),
                "theme": fresh.get("theme"),
                "notifications": fresh.get("notifications")
            }}
    return {"user": user}


@api_router.put("/profile")
async def update_profile(req: ProfileReq, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    if updates:
        if user.get("provider") == "guest":
            await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
            fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
            return {"user": _public_user(fresh)}
        else:
            await sb_patch("mobile_users", {"id": f"eq.{user['user_id']}"}, updates)
            fresh = await sb_get_one("mobile_users", {"id": f"eq.{user['user_id']}"})
            return {"user": {
                "user_id": fresh["id"],
                "email": fresh.get("email"),
                "name": fresh.get("name"),
                "picture": fresh.get("picture"),
                "provider": fresh.get("provider"),
                "language": fresh.get("language"),
                "theme": fresh.get("theme"),
                "notifications": fresh.get("notifications")
            }}
    return {"user": user}


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatReq(BaseModel):
    messages: List[ChatMessage]


@api_router.post("/ai/chat")
async def ai_chat(req: ChatReq, user: dict = Depends(get_current_user)):
    # 1. Extract the last user message
    user_msgs = [m for m in req.messages if m.role == "user"]
    if not user_msgs:
        raise HTTPException(status_code=400, detail="No user message found")
    
    last_query = user_msgs[-1].content
    
    # 2. Base clean query for simple keyword matching
    clean_q = "".join(c for c in last_query if c.isalnum() or c.isspace()).strip()
    
    # 3. Retrieve relevant context from DB (RAG)
    context_parts = []
    
    if len(clean_q) >= 3:
        try:
            # Query articles (Constitution)
            articles = await sb_get("articles", {
                "select": "article_number,title,content,explanation,key_points",
                "or": f'(title.ilike."*{clean_q}*",content.ilike."*{clean_q}*")',
                "limit": 3
            })
            for a in articles:
                text = f"Constitution Article {a.get('article_number')}: {a.get('title')}\nContent: {a.get('content')}"
                if a.get('explanation'):
                    text += f"\nExplanation: {a.get('explanation')}"
                context_parts.append(text)
        except Exception as e:
            logger.warning("RAG: Error fetching articles: %s", e)
            
        try:
            # Query judgments (Civic Stories / Caselaws)
            judgments = await sb_get("judgments", {
                "select": "judgment_title,judgment_date,facts_of_the_case,issues,analysis_of_the_case,conclusion",
                "or": f'(judgment_title.ilike."*{clean_q}*",facts_of_the_case.ilike."*{clean_q}*")',
                "limit": 2
            })
            for j in judgments:
                text = f"Landmark Case Judgment: {j.get('judgment_title')} ({j.get('judgment_date')})\nFacts: {j.get('facts_of_the_case')}\nIssues: {j.get('issues')}\nAnalysis: {j.get('analysis_of_the_case')}\nConclusion: {j.get('conclusion')}"
                context_parts.append(text)
        except Exception as e:
            logger.warning("RAG: Error fetching judgments: %s", e)
            
        try:
            # Query law_sections (Laws - filtered to BNS, BNSS, BSA)
            books = await sb_get("law_books", {})
            allowed_book_ids = []
            for b in books:
                title = b.get("title", "").upper()
                if any(k in title for k in ["BNS", "BNSS", "BSA"]):
                    allowed_book_ids.append(b["id"])
                    
            if allowed_book_ids:
                ids_str = ",".join(allowed_book_ids)
                chapters = await sb_get("law_chapters", {"book_id": f"in.({ids_str})"})
                allowed_chapter_ids = {c["id"] for c in chapters}
                
                if allowed_chapter_ids:
                    sections = await sb_get("law_sections", {
                        "select": "section_number,title,content,explanation,key_points,chapter_id",
                        "or": f'(title.ilike."*{clean_q}*",content.ilike."*{clean_q}*")',
                        "limit": 20
                    })
                    sections_added = 0
                    for s in sections:
                        if s.get("chapter_id") in allowed_chapter_ids:
                            text = f"Law Section {s.get('section_number')}: {s.get('title')}\nContent: {s.get('content')}"
                            if s.get('explanation'):
                                text += f"\nExplanation: {s.get('explanation')}"
                            context_parts.append(text)
                            sections_added += 1
                            if sections_added >= 3:
                                break
        except Exception as e:
            logger.warning("RAG: Error fetching law sections: %s", e)

        try:
            # Query pathway planners
            pathways = await sb_get("pathway_categories", {
                "select": "name,description",
                "or": f'(name.ilike."*{clean_q}*",description.ilike."*{clean_q}*")',
                "limit": 2
            })
            for p in pathways:
                text = f"Learning Pathway: {p.get('name')}\nDescription: {p.get('description')}"
                context_parts.append(text)
        except Exception as e:
            logger.warning("RAG: Error fetching pathways: %s", e)

    # 4. Formulate the LLM Prompt
    context_text = "\n\n".join(context_parts) if context_parts else "No specific database context found."
    
    system_msg = (
        "You are the AI Legal Assistant for the Constitution & Law application.\n"
        "Your scope is STRICTLY limited to answering questions related to:\n"
        "1. The Constitution of India\n"
        "2. Indian Law and legal procedures (specifically using BNS, BNSS, BSA for new laws)\n"
        "3. Education-related questions (e.g. civic literacy, legal education, competitive exam prep, academic curriculum).\n\n"
        "If the user's request is completely unrelated to these topics (e.g., coding, general science, recipes, creative writing, non-legal trivia), you MUST decline to answer. Politely explain that you are only trained to help with Constitution, Indian Laws, and Education.\n\n"
        "Here is the context fetched from our application's database (Preamble, Articles, BNS/BNSS/BSA law sections, landmark case judgments, and learning pathways) relevant to the query:\n"
        f"=== CONTEXT START ===\n{context_text}\n=== CONTEXT END ===\n\n"
        "Instructions:\n"
        "- Base your answer on the provided context if possible. If the context does not contain the answer, you can use your general knowledge of the Indian Constitution, Laws, and Education, but clarify that it is not in the local database.\n"
        "- If the user asks about criminal laws or procedures, refer specifically to the new codes (Bharatiya Nyaya Sanhita - BNS, Bharatiya Nagarik Suraksha Sanhita - BNSS, Bharatiya Sakshya Adhiniyam - BSA) as requested, rather than the old IPC/CrPC/Evidence Act.\n"
        "- Maintain a helpful, educational, and professional tone."
    )
    
    # 5. Build messages array to send to OpenRouter
    llm_messages = [{"role": "system", "content": system_msg}]
    # Append the last few messages for conversation history (limit to last 5 to conserve context token usage)
    for m in req.messages[-5:]:
        llm_messages.append({"role": m.role, "content": m.content})
        
    # 6. Stream from OpenRouter
    async def openrouter_streamer():
        api_key = os.environ.get("OPENROUTER_API_KEY", "")
        if not api_key:
            yield "Error: OPENROUTER_API_KEY is not configured in backend .env file."
            return
            
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://constitutionlaw.app",
            "X-Title": "Constitution & Law App"
        }
        payload = {
            "model": "openrouter/free",
            "messages": llm_messages,
            "stream": True
        }
        
        async with httpx.AsyncClient(timeout=60) as client:
            try:
                async with client.stream("POST", url, headers=headers, json=payload) as response:
                    if response.status_code != 200:
                        err_text = await response.aread()
                        yield f"Error from AI Service (HTTP {response.status_code}): {err_text.decode('utf-8', errors='ignore')}"
                        return
                        
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        line = line.strip()
                        if line.startswith("data:"):
                            data_str = line[5:].strip()
                            if data_str == "[DONE]":
                                break
                            try:
                                data_json = json.loads(data_str)
                                choice = data_json.get("choices", [{}])[0]
                                delta = choice.get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield content
                            except Exception:
                                pass
            except Exception as e:
                yield f"\nConnection Error: {str(e)}"
                
    return StreamingResponse(openrouter_streamer(), media_type="text/plain")


@api_router.get("/")
async def root():
    return {"message": "Constitution & Law API", "status": "ok"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True, sparse=True)
        await db.users.create_index("user_id", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
        await db.bookmarks.create_index([("user_id", 1), ("ref_id", 1)], unique=True)
        await db.recents.create_index([("user_id", 1), ("ref_id", 1)], unique=True)
        logger.info("Indexes ensured")
    except Exception as e:
        logger.warning("Index creation issue: %s", e)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
