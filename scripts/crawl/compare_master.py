"""
What did the master-folder crawl find that the catalog has never seen?

Compares data/master-crawl.json against data/drive-crawl-full.json and reports
folders and files present in the former and absent from the latter. Prints the
new top-level subtrees so the gap is legible as content, not as an id count.
"""
import json
import os
from collections import Counter, defaultdict

master = json.load(open("data/master-crawl.json"))
have = json.load(open("data/drive-crawl-full.json"))

mf, mfiles, parents = master["folders"], master["files"], master.get("parents", {})
hf, hfiles = have["folders"], have["files"]

new_folders = {k: v for k, v in mf.items() if k not in hf}
new_files = {k: v for k, v in mfiles.items() if k not in hfiles}

print(f"master crawl : {len(mf):,} folders, {len(mfiles):,} files")
print(f"already known: {len(mf) - len(new_folders):,} folders, {len(mfiles) - len(new_files):,} files")
print(f"NEW          : {len(new_folders):,} folders, {len(new_files):,} files\n")


def chain(fid):
    """Path from root down to fid, as names."""
    out, seen = [], set()
    cur = fid
    while cur and cur not in seen:
        seen.add(cur)
        out.append(mf.get(cur, "?"))
        cur = parents.get(cur)
    return list(reversed(out))


# Which second-level subtree does each new file sit under?
bucket = Counter()
for fid, (_name, _alt, par) in new_files.items():
    c = chain(par)
    bucket[" / ".join(c[1:3]) if len(c) > 1 else (c[0] if c else "?")] += 1

print("NEW files by subtree (top 25):")
for k, v in bucket.most_common(25):
    print(f"  {v:6,}  {k}")

EXT = {}
for _name, (n, _a, _p) in zip(new_files, new_files.values()):
    ext = os.path.splitext(n)[1].lower()
    EXT[ext] = EXT.get(ext, 0) + 1
print("\nNEW files by type (top 12):")
for k, v in sorted(EXT.items(), key=lambda x: -x[1])[:12]:
    print(f"  {v:6,}  {k or '(none)'}")

json.dump(
    {"new_folders": new_folders, "new_files": new_files},
    open("data/master-crawl-new.json", "w"),
)
print("\nwrote data/master-crawl-new.json")
