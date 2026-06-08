import json, urllib.request, sys
sys.path.insert(0, "/app/backend")
from content_parser import parse_html_to_segments, plain_text_from_segments

BASE = "https://cwwqnmnnpkyowxkfvruc.supabase.co/rest/v1/"
SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3d3FubW5ucGt5b3d4a2Z2cnVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDcyOTc1OCwiZXhwIjoyMDk2MzA1NzU4fQ.RikQjz-EqNMGO4qXVt5JU2Pt5bpcUpUZ5OR-zOLykRM"

def req(path):
    r = urllib.request.Request(BASE + path, headers={"apikey": SERVICE, "Authorization": f"Bearer {SERVICE}"})
    return json.loads(urllib.request.urlopen(r, timeout=30).read().decode())

print("########## ARTICLE 1 (en) ##########")
a = req("articles?select=content&article_number=eq.Article%201&language=eq.en-IN")[0]
segs, _ = parse_html_to_segments(a["content"])
for s in segs:
    mk = (s["marker"] + " ") if s["marker"] else ""
    tag = s["type"][:4].upper()
    print(f"[{s['seg_id']:>2}|b{s['block_id']}|{tag}] {mk}{s['text'][:90]}")
print("\nTTS TEXT (first 200):", plain_text_from_segments(segs)[:200])

print("\n\n########## LAW SECTION 1 (en BNS) ##########")
s1 = req("law_sections?select=content&section_number=eq.Section%201&language=eq.en-IN")[0]
segs2, _ = parse_html_to_segments(s1["content"])
for s in segs2:
    mk = (s["marker"] + " ") if s["marker"] else ""
    tag = s["type"][:4].upper()
    bold = "".join("*" if r["bold"] else "" for r in s["runs"])
    print(f"[{s['seg_id']:>2}|b{s['block_id']}|{tag}] {mk}{s['text'][:90]}")

print("\n\n########## TELUGU ARTICLE 1 ##########")
t = req("articles?select=content&article_number=eq.Article%201&language=eq.te-IN")[0]
segs3, _ = parse_html_to_segments(t["content"])
for s in segs3[:8]:
    mk = (s["marker"] + " ") if s["marker"] else ""
    print(f"[{s['seg_id']:>2}|b{s['block_id']}|{s['type'][:4]}] {mk}{s['text'][:70]}")
