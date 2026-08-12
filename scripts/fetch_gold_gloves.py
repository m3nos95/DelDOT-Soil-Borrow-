#!/usr/bin/env python3
"""
Build Gold Glove counts from Wikipedia award-winner lists (1957–present).

Pre-1957 careers correctly get 0 — the award did not exist.
"""

from __future__ import annotations

import json
import re
import time
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "gold_gloves.json"

UA = {"User-Agent": "HardballPrivateLeague/1.0 (friends fantasy; educational)"}

PAGES = [
    "List_of_Gold_Glove_Award_winners_at_pitcher",
    "List_of_Gold_Glove_Award_winners_at_catcher",
    "List_of_Gold_Glove_Award_winners_at_first_base",
    "List_of_Gold_Glove_Award_winners_at_second_base",
    "List_of_Gold_Glove_Award_winners_at_third_base",
    "List_of_Gold_Glove_Award_winners_at_shortstop",
    # Historical OF award (3 per league for many years)
    "List_of_Gold_Glove_Award_winners_at_outfield",
]

SORTNAME_RE = re.compile(
    r"\{\{sortname\|([^}|]+)\|([^}|]+)(?:\|([^}]*))?\}\}",
    re.I,
)
LINK_RE = re.compile(r"\[\[([^\]|#]+)(?:\|[^\]]+)?\]\]")
YEARISH_RE = re.compile(r"(?:19|20)\d\d\}\}")


def fetch(title: str) -> str:
    url = (
        "https://en.wikipedia.org/w/api.php"
        f"?action=parse&page={title}&prop=wikitext&format=json"
    )
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.loads(r.read())
    if "error" in data:
        raise RuntimeError(data["error"])
    return data["parse"]["wikitext"]["*"]


def normalize(name: str) -> str:
    name = name.replace("_", " ").strip()
    name = re.sub(r"\s+", " ", name)
    name = re.sub(r"\s*\(.*?\)\s*$", "", name)
    return name


def main():
    counts: Counter[str] = Counter()
    pages_ok: list[str] = []

    for title in PAGES:
        text = fetch(title)
        pages_ok.append(title)
        for line in text.splitlines():
            if not YEARISH_RE.search(line):
                continue
            names: list[str] = []
            for first, last, *_ in SORTNAME_RE.findall(line):
                names.append(normalize(f"{first} {last}"))
            if not names:
                for n in LINK_RE.findall(line):
                    n = normalize(n)
                    if any(
                        x in n
                        for x in (
                            "League",
                            "Series",
                            "Gold Glove",
                            "File:",
                            "Image:",
                            "Category:",
                        )
                    ):
                        continue
                    if " " in n:
                        names.append(n)
            for n in set(names):
                counts[n] += 1
        print(f"  {title}: running total {sum(counts.values())} awards / {len(counts)} players")
        time.sleep(0.35)

    players = [
        {"name": name, "goldGloves": int(n)} for name, n in counts.most_common()
    ]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "source": "Wikipedia Gold Glove award winner lists",
                "awardStartYear": 1957,
                "note": "Award began 1957. Pre-1957 careers get 0 by definition.",
                "pages": pages_ok,
                "players": players,
            },
            indent=2,
        )
    )
    print(f"Wrote {OUT} ({len(players)} players)")
    for sample in (
        "Brooks Robinson",
        "Ron Santo",
        "Ozzie Smith",
        "Greg Maddux",
        "Iván Rodríguez",
    ):
        print(f"  {sample}: {counts.get(sample, 0)}")


if __name__ == "__main__":
    main()
