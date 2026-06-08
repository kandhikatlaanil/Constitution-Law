import json, urllib.request

BASE = "https://cwwqnmnnpkyowxkfvruc.supabase.co/rest/v1/"
SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3d3FubW5ucGt5b3d4a2Z2cnVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDcyOTc1OCwiZXhwIjoyMDk2MzA1NzU4fQ.RikQjz-EqNMGO4qXVt5JU2Pt5bpcUpUZ5OR-zOLykRM"

def req(path):
    h = {"apikey": SERVICE, "Authorization": f"Bearer {SERVICE}"}
    r = urllib.request.Request(BASE + path, headers=h)
    with urllib.request.urlopen(r, timeout=30) as resp:
        return json.loads(resp.read().decode())

print("===== ALL articles (number, title, lang, part_id, has_explanation, key_points_len) =====")
for a in req("articles?select=article_number,title,language,part_id,explanation,key_points,sequence_order&order=sequence_order.asc"):
    print(f"  {a['language']:6} | {a['article_number']:12} | seq={a['sequence_order']} | exp_len={len(a.get('explanation') or '')} | kp={len(a.get('key_points') or [])} | {a['title'][:40]}")

print("\n===== ALL law_books =====")
for b in req("law_books?select=*"):
    print(f"  {b['id']} | {b['title']} | {b['default_language']}")

print("\n===== ALL law_chapters =====")
for c in req("law_chapters?select=*&order=sequence_order.asc"):
    print(f"  book={c['book_id'][:8]} | {c['chapter_number']} | {c['title'][:50]}")

print("\n===== ALL law_sections (number,title,lang via chapter? ,exp,kp) =====")
for s in req("law_sections?select=section_number,title,explanation,key_points,language,sequence_order,chapter_id&order=sequence_order.asc"):
    print(f"  {s.get('language')} | {s['section_number']:12} | seq={s['sequence_order']} | exp_len={len(s.get('explanation') or '')} | kp={len(s.get('key_points') or [])} | ch={s['chapter_id'][:8]} | {s['title'][:35]}")

print("\n===== law_sections sample explanation + key_points (first row full) =====")
s0 = req("law_sections?select=*&limit=1&order=sequence_order.asc")[0]
print("explanation:", repr((s0.get('explanation') or '')[:400]))
print("key_points:", s0.get('key_points'))

print("\n===== Telugu article content sample (first 600 chars) =====")
ta = req("articles?select=content,title&language=eq.te-IN&limit=1")
if ta:
    print("title:", ta[0]['title'])
    print(ta[0]['content'][:600])

print("\n===== parts count per book =====")
parts = req("parts?select=part_number,title,book_id,sequence_order&order=sequence_order.asc")
print(f"total parts: {len(parts)}")
for p in parts:
    print(f"  book={p['book_id'][:8]} | {p['part_number']} | {p['title'][:40]}")
