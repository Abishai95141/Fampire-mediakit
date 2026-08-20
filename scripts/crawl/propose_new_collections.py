"""
Turn the never-indexed part of the master tree into a PROPOSAL — what
collections it would add to the library — without writing anything.

Uses the same shape as the existing catalog: files roll up to their nearest
ancestor whose name is a subject rather than a production stage, so a folder
called "Day_03_Organized/09. Extras" belongs to its event, not to itself.
Kind and dominant media come from file extensions, as they do today.

    python3 scripts/propose_new_collections.py
"""
import json
import os
import re
from collections import Counter, defaultdict

master = json.load(open("data/master-crawl.json"))
have = json.load(open("data/drive-crawl-full.json"))
folders, files, parents = master["folders"], master["files"], master["parents"]
known_files = have["files"]

STAGE = {
    "dcim","msdcf","lrdata","lrcat","organized","organised","preview","previews","proxy","proxies",
    "cache","temp","tmp","backup","backups","duplicate","duplicates","untitled","sequence","render",
    "renders","output","outputs","working","wip","test","tests","old","raw","edited","edit","colored",
    "color","coloured","general","bts","behind","the","scenes","photo","photos","video","videos","vid",
    "vids","clip","clips","footage","content","dump","card","station","day","part","final","select",
    "selects","export","exports","image","images","asset","assets","file","files","master","masters",
    "folder","misc","new","all","b","roll","broll","and","of","for","with","in","on","at","to","a","an",
    "shots","shot","pics","pic","pictures","picture","thumbnail","thumbnails","thumb","wm","copy",
    "copies","use","used","ready","full","set","sets","original","originals","hi","res","hires","lo",
    "web","print","social","post","posts","story","stories","deliverables","productions","production",
}
TOKEN = re.compile(r"[A-Za-z']+")

VID = {".mp4",".mov",".avi",".mxf",".m4v",".mts",".wmv",".mkv",".r3d",".braw"}
IMG = {".jpg",".jpeg",".png",".tif",".tiff",".heic",".webp",".cr2",".cr3",".arw",".nef",".dng",".raf"}
RAWX = {".arw",".cr2",".cr3",".nef",".dng",".raf"}
DOC = {".pdf",".docx",".doc",".rtf",".txt",".pptx",".key"}
AUD = {".wav",".mp3",".aif",".aiff"}
JUNK = {".xml",".plist",".lrdata",".lrcat",".DS_Store",""}


def subject_of(name):
    n = re.sub(r"\d{1,4}[/:.\-]\d{1,2}([/:.\-]\d{2,4})?", " ", name)
    n = re.sub(r"'\d{2}", " ", n)
    n = re.sub(r"\b\d+\b", " ", n)
    toks = [t for t in TOKEN.findall(n) if t.lower() not in STAGE]
    return " ".join(toks).strip()


def is_collection(name):
    return len(re.sub(r"[^A-Za-z]", "", subject_of(name))) >= 4


def anchor(fid):
    seen, cur = set(), fid
    while cur and cur not in seen:
        seen.add(cur)
        if is_collection(folders.get(cur, "")):
            return cur
        p = parents.get(cur)
        if not p:
            return cur
        cur = p
    return fid


def chain(fid):
    out, seen, cur = [], set(), fid
    while cur and cur not in seen:
        seen.add(cur)
        out.append(folders.get(cur, "?"))
        cur = parents.get(cur)
    return " / ".join(reversed(out))


roll = defaultdict(Counter)
for fid, (name, _kind, par) in files.items():
    if fid in known_files:
        continue  # already in the catalog
    ext = os.path.splitext(name)[1].lower()
    roll[anchor(par)][ext] += 1

rows = []
for aid, exts in roll.items():
    total = sum(exts.values())
    usable = sum(v for k, v in exts.items() if k not in JUNK)
    if usable == 0:
        continue
    img = sum(v for k, v in exts.items() if k in IMG)
    vid = sum(v for k, v in exts.items() if k in VID)
    raw = sum(v for k, v in exts.items() if k in RAWX)
    doc = sum(v for k, v in exts.items() if k in DOC)
    aud = sum(v for k, v in exts.items() if k in AUD)
    dominant = max([("image", img), ("video", vid), ("document", doc), ("audio", aud)], key=lambda x: x[1])[0]
    rows.append({
        "folder_id": aid,
        "name": folders.get(aid, ""),
        "path": chain(aid),
        "url": f"https://drive.google.com/drive/folders/{aid}",
        "files": usable, "image": img, "video": vid, "raw": raw, "doc": doc, "audio": aud,
        "dominant": dominant,
        "press_ready": img - raw + vid,   # deliverable stills + video, RAW excluded
    })

rows.sort(key=lambda r: -r["files"])
json.dump(rows, open("data/proposed-new-collections.json", "w"), indent=2)

press = [r for r in rows if r["press_ready"] >= 5]
print(f"proposed NEW collections: {len(rows):,}")
print(f"  of those, press-usable (>=5 deliverable stills/videos): {len(press):,}")
print(f"  total new files rolled up: {sum(r['files'] for r in rows):,}")
print(f"  of which camera RAW: {sum(r['raw'] for r in rows):,}\n")
print("TOP 22 PROPOSED COLLECTIONS")
for r in rows[:22]:
    print(f"  {r['files']:6,} files  [{r['dominant']:8}] {r['name'][:58]}")
print("\nwrote data/proposed-new-collections.json")
