import json, urllib.request

BASE = "https://cwwqnmnnpkyowxkfvruc.supabase.co/rest/v1/"
SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3d3FubW5ucGt5b3d4a2Z2cnVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDcyOTc1OCwiZXhwIjoyMDk2MzA1NzU4fQ.RikQjz-EqNMGO4qXVt5JU2Pt5bpcUpUZ5OR-zOLykRM"

def req(path, headers=None, method="GET"):
    h = {"apikey": SERVICE, "Authorization": f"Bearer {SERVICE}"}
    if headers:
        h.update(headers)
    r = urllib.request.Request(BASE + path, headers=h, method=method)
    with urllib.request.urlopen(r, timeout=30) as resp:
        return resp.read().decode(), dict(resp.headers)

# 1. Get OpenAPI spec -> list tables + columns
spec_raw, _ = req("")
spec = json.loads(spec_raw)
defs = spec.get("definitions", {})
print("===== TABLES & COLUMNS =====")
for tname, tdef in defs.items():
    props = tdef.get("properties", {})
    cols = []
    for cname, cdef in props.items():
        typ = cdef.get("type", "?")
        fmt = cdef.get("format", "")
        desc = cdef.get("description", "")
        pk = "PK" if "Primary Key" in desc or "<pk/>" in desc else ""
        fk = ""
        if "fk" in desc.lower() or "foreign" in desc.lower():
            fk = desc
        cols.append(f"{cname}:{fmt or typ}{(' '+pk) if pk else ''}{(' FK->'+fk) if fk else ''}")
    print(f"\n## {tname}")
    print("   " + ", ".join(cols))
