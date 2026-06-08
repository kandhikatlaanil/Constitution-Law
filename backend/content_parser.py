"""
Converts CMS rich-text HTML (from Supabase) into a structured, render-friendly
shape that supports BOTH faithful rich rendering AND text-to-speech sentence
synchronization on the mobile client.

Output: a flat ordered list of `segments`. Each segment is one sentence
(or one heading / one short label) and carries:
    seg_id      : global ordered index (also the TTS reading order)
    block_id    : id of the visual block it belongs to (group segments by this)
    type        : "heading" | "paragraph" | "list_item"
    marker      : bullet/number marker for list items ("1.", "2.", "•") or None
    text        : plain sentence text (used for TTS)
    runs        : [{ "text": str, "bold": bool, "italic": bool }] for rich render
    speak       : bool — whether TTS should read this segment aloud
"""

import re
from bs4 import BeautifulSoup, NavigableString, Tag

# Sentence boundary finder. We locate "[.?!।] + whitespace" candidates and then
# reject false positives such as single-letter initials ("B.R.") and common
# abbreviations ("Dr.", "vs.", "etc.").
_BOUNDARY_RE = re.compile(r"[.?!।]+[\"')\]]?\s+")
_ABBREV = {
    "dr", "mr", "mrs", "ms", "vs", "etc", "no", "art", "sec", "fig", "pp",
    "viz", "i.e", "e.g", "cf", "ch", "cl",
}
# initialisms like "b.r", "u.s", "a.b.c"
_INITIALS_RE = re.compile(r"^([a-z]\.)+[a-z]?$")


def _split_sentences(text):
    """Return list of sentence strings, avoiding splits on initials/abbreviations."""
    spans = []
    last = 0
    for m in _BOUNDARY_RE.finditer(text):
        end = m.start() + 1  # include the first punctuation char
        # word immediately preceding the boundary
        preceding = text[last:m.start()]
        word = re.split(r"[\s(]", preceding)[-1].rstrip(".?!।\"')]").lower()
        # single uppercase initial like "B" in "B.R." -> the char before the dot
        prev_char = text[m.start() - 1] if m.start() > 0 else ""
        is_initial = len(word) <= 1 and (prev_char.isupper() or prev_char.isalpha() is False)
        if word in _ABBREV or _INITIALS_RE.match(word) or is_initial:
            continue
        spans.append(text[last:end].strip())
        last = m.end()
    tail = text[last:].strip()
    if tail:
        spans.append(tail)
    return [s for s in spans if s]


def _merge_runs(runs):
    """Merge adjacent runs sharing the same formatting."""
    merged = []
    for r in runs:
        if r["text"] == "":
            continue
        if merged and merged[-1]["bold"] == r["bold"] and merged[-1]["italic"] == r["italic"]:
            merged[-1]["text"] += r["text"]
        else:
            merged.append(dict(r))
    return merged


def _inline_runs(node, bold=False, italic=False):
    """Recursively collect inline text runs with bold/italic flags."""
    runs = []
    for child in node.children:
        if isinstance(child, NavigableString):
            text = str(child)
            # collapse internal whitespace/newlines to single spaces
            text = re.sub(r"\s+", " ", text)
            if text:
                runs.append({"text": text, "bold": bold, "italic": italic})
        elif isinstance(child, Tag):
            name = (child.name or "").lower()
            if name in ("b", "strong"):
                runs += _inline_runs(child, True, italic)
            elif name in ("i", "em"):
                runs += _inline_runs(child, bold, True)
            elif name == "br":
                runs.append({"text": " ", "bold": bold, "italic": italic})
            else:
                # span, a, font, etc. — check font-weight in style for "bold"
                style = (child.get("style") or "") if hasattr(child, "get") else ""
                is_bold = bold
                if "font-weight" in style:
                    m = re.search(r"font-weight:\s*(\d{3}|bold)", style)
                    if m:
                        val = m.group(1)
                        if val == "bold" or (val.isdigit() and int(val) >= 600):
                            is_bold = True
                runs += _inline_runs(child, is_bold, italic)
    return runs


def _walk(node, blocks, marker=None):
    """Walk block-level structure producing visual blocks with runs."""
    for child in node.children:
        if isinstance(child, NavigableString):
            text = re.sub(r"\s+", " ", str(child)).strip()
            if text:
                blocks.append({
                    "type": "list_item" if marker else "paragraph",
                    "marker": marker,
                    "runs": [{"text": text, "bold": False, "italic": False}],
                })
                marker = None
            continue
        if not isinstance(child, Tag):
            continue
        name = (child.name or "").lower()
        if name == "p":
            runs = _merge_runs(_inline_runs(child))
            if runs and any(r["text"].strip() for r in runs):
                blocks.append({
                    "type": "list_item" if marker else "paragraph",
                    "marker": marker,
                    "runs": runs,
                })
                marker = None
        elif name in ("ul", "ol"):
            ordered = name == "ol"
            try:
                start = int(child.get("start", 1))
            except (TypeError, ValueError):
                start = 1
            idx = start
            for li in child.find_all("li", recursive=False):
                m = f"{idx}." if ordered else "•"
                _walk(li, blocks, marker=m)
                idx += 1
        elif name == "li":
            _walk(child, blocks, marker=marker)
            marker = None
        elif name in ("b", "strong", "span", "i", "em", "a", "font"):
            runs = _merge_runs(_inline_runs(child))
            if runs and any(r["text"].strip() for r in runs):
                blocks.append({
                    "type": "list_item" if marker else "paragraph",
                    "marker": marker,
                    "runs": runs,
                })
                marker = None
        elif name in ("div", "section", "article", "body", "html"):
            _walk(child, blocks, marker=marker)
        # ignore other tags (head, style, etc.)


def _promote_headings(blocks):
    """
    Turn 'paragraph' blocks that begin with a short bold 'Label:' run into an
    amber heading block, splitting any trailing body text into its own block.
    Matches CMS labels like 'Deep Explanation:', 'Key Points:', localized too.
    """
    out = []
    for b in blocks:
        if b["type"] != "paragraph" or not b["runs"]:
            out.append(b)
            continue
        first = b["runs"][0]
        ft = first["text"].strip()
        if first["bold"] and ft.endswith(":") and len(ft) <= 60:
            label = ft[:-1].strip()
            out.append({"type": "heading", "marker": None,
                        "runs": [{"text": label, "bold": True, "italic": False}]})
            rest = _merge_runs(b["runs"][1:])
            # strip leading whitespace of remaining body
            while rest and rest[0]["text"].strip() == "":
                rest.pop(0)
            if rest:
                rest[0]["text"] = rest[0]["text"].lstrip()
                out.append({"type": "paragraph", "marker": None, "runs": rest})
        else:
            out.append(b)
    return out


def _split_runs_into_sentences(runs):
    """Split a block's runs into sentences, preserving run formatting per sentence."""
    full = "".join(r["text"] for r in runs)
    if not full.strip():
        return []
    parts = _split_sentences(full)
    sentences = []
    cursor = 0
    for p in parts:
        if p == "":
            continue
        start = full.find(p, cursor)
        if start < 0:
            start = cursor
        end = start + len(p)
        cursor = end
        # gather runs overlapping [start, end)
        s_runs = []
        pos = 0
        for r in runs:
            r_start, r_end = pos, pos + len(r["text"])
            pos = r_end
            ov_s, ov_e = max(start, r_start), min(end, r_end)
            if ov_s < ov_e:
                s_runs.append({
                    "text": r["text"][ov_s - r_start: ov_e - r_start],
                    "bold": r["bold"], "italic": r["italic"],
                })
        s_runs = _merge_runs(s_runs)
        text = "".join(r["text"] for r in s_runs).strip()
        if text:
            sentences.append({"text": text, "runs": s_runs})
    if not sentences:
        text = full.strip()
        sentences = [{"text": text, "runs": _merge_runs(runs)}]
    return sentences


def parse_html_to_segments(html: str, start_seg_id: int = 0):
    """Main entry: HTML string -> (segments, next_seg_id)."""
    if not html or not html.strip():
        return [], start_seg_id
    soup = BeautifulSoup(html, "html.parser")
    blocks = []
    _walk(soup, blocks, marker=None)
    blocks = _promote_headings(blocks)

    segments = []
    seg_id = start_seg_id
    block_id = 0
    for b in blocks:
        if b["type"] == "heading":
            text = "".join(r["text"] for r in b["runs"]).strip()
            if not text:
                continue
            segments.append({
                "seg_id": seg_id, "block_id": block_id, "type": "heading",
                "marker": None, "text": text,
                "runs": [{"text": text, "bold": True, "italic": False}],
                "speak": False,
            })
            seg_id += 1
            block_id += 1
        else:
            sentences = _split_runs_into_sentences(b["runs"])
            if not sentences:
                continue
            for i, s in enumerate(sentences):
                segments.append({
                    "seg_id": seg_id, "block_id": block_id, "type": b["type"],
                    # marker only on the first sentence of a list item
                    "marker": b["marker"] if i == 0 else None,
                    "text": s["text"], "runs": s["runs"], "speak": True,
                })
                seg_id += 1
            block_id += 1
    return segments, seg_id


def plain_text_from_segments(segments) -> str:
    return " ".join(s["text"] for s in segments if s.get("speak"))
