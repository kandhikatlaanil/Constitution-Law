import json, urllib.request, urllib.parse

BASE = "https://cwwqnmnnpkyowxkfvruc.supabase.co/rest/v1/"
SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3d3FubW5ucGt5b3d4a2Z2cnVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDcyOTc1OCwiZXhwIjoyMDk2MzA1NzU4fQ.RikQjz-EqNMGO4qXVt5JU2Pt5bpcUpUZ5OR-zOLykRM"

def req(path, headers=None):
    h = {"apikey": SERVICE, "Authorization": f"Bearer {SERVICE}"}
    if headers:
        h.update(headers)
    r = urllib.request.Request(BASE + path, headers=h)
    with urllib.request.urlopen(r, timeout=30) as resp:
        return resp.read().decode(), dict(resp.headers)

def count(table):
    _, hdrs = req(f"{table}?select=id", {"Prefer": "count=exact", "Range-Unit": "items", "Range": "0-0"})
    cr = hdrs.get("Content-Range", "?")
    return cr

tables = ["books","parts","chapters","articles","law_books","law_chapters","law_subchapters","law_sections"]
print("===== ROW COUNTS (Content-Range) =====")
for t in tables:
    try:
        print(f"{t}: {count(t)}")
    except Exception as e:
        print(f"{t}: ERR {e}")

print("\n===== SAMPLE: books =====")
print(req("books?select=*")[0][:2000])

print("\n===== SAMPLE: parts (first 5, ordered) =====")
print(req("parts?select=*&order=sequence_order.asc&limit=5")[0][:2000])

print("\n===== SAMPLE: articles (first 2) =====")
print(req("articles?select=*&limit=2")[0][:3000])

print("\n===== DISTINCT languages in articles =====")
print(req("articles?select=language")[0][:1500])

print("\n===== SAMPLE: law_books =====")
print(req("law_books?select=*")[0][:2000])

print("\n===== SAMPLE: law_chapters (first 3) =====")
print(req("law_chapters?select=*&limit=3")[0][:1500])

print("\n===== SAMPLE: law_sections (first 2) =====")
print(req("law_sections?select=*&limit=2")[0][:3000])
