"""
Crawl a public Drive folder tree from a given root, and report what is NOT
already in data/drive-crawl-full.json.

Written because the client pointed at "1. Biohack Yourself Events Master"
(1WGdb9EmyivunPmXNkzNZoQjZ_nRiXqTn) and that folder id appears nowhere in the
20,269 folders we indexed. No credentials involved: Drive's embeddedfolderview
endpoint serves any link-shared folder anonymously, which is what the original
crawl used too.

RETRIES TO EXHAUSTION, deliberately. The documented failure on this project is
that Google throttles silently — the first crawl reported 99,142 files when the
true count was 135,611, and nothing errored. A folder that fails is retried in
later rounds until a whole round adds nothing, so "finished" means "stopped
finding things", not "stopped asking".

    python3 scripts/crawl_master.py <folder_id> [out.json]
"""
import concurrent.futures as cf
import json
import os
import re
import socket
import ssl
import sys
import threading
import time
import urllib.request as ur
from html import unescape as html_unescape

socket.setdefaulttimeout(25)
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/126 Safari/537.36"}

TITLE = re.compile(r"<title>(.*?)</title>", re.S)
ENTRY = re.compile(
    r'<div class="flip-entry" id="entry-([A-Za-z0-9_-]+)".*?'
    r'(?:<img[^>]*alt="([^"]*)"[^>]*>)?.*?'
    r'<div class="flip-entry-title">(.*?)</div>',
    re.S,
)
FOLD = re.compile(r"/drive/folders/([A-Za-z0-9_-]+)")
FILE = re.compile(r"/file/d/([A-Za-z0-9_-]+)")

ROOT = sys.argv[1] if len(sys.argv) > 1 else "1WGdb9EmyivunPmXNkzNZoQjZ_nRiXqTn"
OUT = sys.argv[2] if len(sys.argv) > 2 else "data/master-crawl.json"

folders, files, parent = {}, {}, {}
lock = threading.Lock()


def fetch(fid, tries=3):
    for _ in range(tries):
        try:
            req = ur.Request(
                f"https://drive.google.com/embeddedfolderview?id={fid}#list", headers=UA
            )
            return ur.urlopen(req, timeout=25, context=CTX).read().decode("utf-8", "replace")
        except Exception:
            time.sleep(0.6)
    return None


def process(fid):
    """Returns (child_folder_ids, ok). ok=False means the fetch failed.

    Parsed by SPLITTING on the entry marker rather than matching a balanced
    block. The real markup nests four divs deep and closes irregularly, so a
    `(.*?)</div></div></div>` pattern silently matched nothing — every file
    came through the bare-link fallback with an empty name, and the media type
    was only picked up by accident. Note the type lives in `aria-label`
    ("Folder", "Video", "JPEG Image"), not in `alt`.
    """
    html = fetch(fid)
    if html is None:
        return [], False
    t = TITLE.search(html)
    with lock:
        folders[fid] = (t.group(1).strip() if t else "").replace(" – Google Drive", "")

    kids = []
    chunks = html.split('<div class="flip-entry" id="entry-')[1:]
    for chunk in chunks:
        m = re.match(r"([A-Za-z0-9_-]+)", chunk)
        if not m:
            continue
        eid = m.group(1)
        name_m = re.search(r'<div class="flip-entry-title">(.*?)</div>', chunk, re.S)
        name = html_unescape(name_m.group(1).strip()) if name_m else ""
        kind_m = re.search(r'aria-label="([^"]*)"', chunk)
        kind = kind_m.group(1) if kind_m else ""
        if f"/drive/folders/{eid}" in chunk or kind == "Folder":
            kids.append(eid)
            with lock:
                parent[eid] = fid
        else:
            with lock:
                files[eid] = [name, kind, fid]

    # Fallback only if the split found nothing at all.
    if not chunks:
        for cid in set(FOLD.findall(html)):
            if cid != fid:
                kids.append(cid)
                with lock:
                    parent.setdefault(cid, fid)
        for did in set(FILE.findall(html)):
            with lock:
                files.setdefault(did, ["", "", fid])
    return kids, True


seen = {ROOT}
frontier = [ROOT]
pending_retry = set()
round_no = 0

while frontier or pending_retry:
    round_no += 1
    batch = list(frontier) + list(pending_retry)
    pending_retry.clear()
    frontier = []
    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        for kids, ok in ex.map(process, batch):
            if not ok:
                continue
            for k in kids:
                if k not in seen:
                    seen.add(k)
                    frontier.append(k)
    # Anything we asked for but never recorded is a silent failure — ask again.
    missing = [b for b in batch if b not in folders]
    pending_retry.update(missing)
    print(
        f"round {round_no}: folders={len(folders)} files={len(files)} "
        f"queued={len(frontier)} retry={len(pending_retry)}",
        flush=True,
    )
    if not frontier and missing and round_no > 12:
        print(f"giving up on {len(missing)} folders after {round_no} rounds")
        break

os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)
json.dump({"root": ROOT, "folders": folders, "files": files, "parents": parent}, open(OUT, "w"))
print(f"\nwrote {OUT}: {len(folders)} folders, {len(files)} files")
