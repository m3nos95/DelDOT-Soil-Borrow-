#!/usr/bin/env python3
"""Merge Gold Glove counts into data/career_players.json by folded name match."""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAYERS = ROOT / "data" / "career_players.json"
GG = ROOT / "data" / "gold_gloves.json"


def fold(name: str) -> str:
    decomposed = unicodedata.normalize("NFKD", name)
    return "".join(c for c in decomposed if not unicodedata.combining(c)).casefold()


def main():
    if not GG.exists():
        raise SystemExit(f"Missing {GG}. Run: python3 scripts/fetch_gold_gloves.py")
    if not PLAYERS.exists():
        raise SystemExit(f"Missing {PLAYERS}")

    gg_doc = json.loads(GG.read_text())
    gg_map = {fold(p["name"]): int(p["goldGloves"]) for p in gg_doc["players"]}

    players = json.loads(PLAYERS.read_text())
    matched = 0
    total_gg = 0
    for p in players:
        n = gg_map.get(fold(p["name"]), 0)
        p["goldGloves"] = n
        if n:
            matched += 1
            total_gg += n
            desc = p.get("description", "")
            desc = re.sub(r"(?:\s*·\s*)?\d+× GG", "", desc).rstrip(" ·")
            p["description"] = f"{desc} · {n}× GG" if desc else f"{n}× GG"

    PLAYERS.write_text(json.dumps(players, separators=(",", ":")))
    print(f"Matched {matched} players ({total_gg} total Gold Gloves) → {PLAYERS}")

    # Sanity
    by_name = {fold(p["name"]): p for p in players}
    for sample in ("Brooks Robinson", "Ron Santo", "Ozzie Smith", "Ivan Rodriguez"):
        p = by_name.get(fold(sample))
        print(f"  {sample}: {p['goldGloves'] if p else 'MISSING'} GG")


if __name__ == "__main__":
    main()
