#!/usr/bin/env python3
"""
Build one career card per player from FanGraphs (MLB + historical).

FanGraphs membership limits leaderboard windows to 10 years, so we pull
season-level rows in decade chunks, then aggregate by FanGraphs player id.
Result: every player once — no Babe Ruth 1927 vs Babe Ruth 1930.
"""

from __future__ import annotations

import json
import math
import time
from collections import defaultdict
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT / "data" / "fangraphs"
OUT_JSON = ROOT / "data" / "career_players.json"
OUT_META = ROOT / "data" / "career_players.meta.json"

API = "https://www.fangraphs.com/api/leaders/major-league/data"
HEADERS = {
    "User-Agent": "HardballPrivateLeague/1.0 (+friends fantasy baseball; career cards)",
    "Accept": "application/json",
}

START_YEAR = 1871
END_YEAR = 2025
WINDOW = 10
MIN_PA = 1
MIN_TBF = 1


def windows(start: int, end: int, size: int):
    y = start
    while y <= end:
        yield y, min(y + size - 1, end)
        y += size


def fetch_chunk(stats: str, season1: int, season: int, ind: int = 1) -> list[dict]:
    cache_path = CACHE_DIR / f"{stats}_{season1}_{season}_ind{ind}.json"
    if cache_path.exists():
        return json.loads(cache_path.read_text())

    params = {
        "pos": "all",
        "stats": stats,
        "lg": "all",
        "qual": "1",
        "season": str(season),
        "season1": str(season1),
        "month": "0",
        "team": "0",
        "pageitems": "1000000",
        "pagenum": "1",
        "ind": str(ind),
        "type": "8",
    }

    for attempt in range(5):
        r = requests.get(API, params=params, headers=HEADERS, timeout=180)
        if r.status_code == 429:
            time.sleep(5 * (attempt + 1))
            continue
        r.raise_for_status()
        payload = r.json()
        status = payload.get("status")
        if status:
            raise RuntimeError(f"FanGraphs status={status} for {stats} {season1}-{season}")
        rows = payload.get("data") or []
        cache_path.write_text(json.dumps(rows))
        print(f"  fetched {stats} {season1}-{season}: {len(rows)} rows", flush=True)
        time.sleep(0.75)  # be polite
        return rows

    raise RuntimeError(f"Failed to fetch {stats} {season1}-{season}")


def safe_float(v, default=0.0) -> float:
    try:
        if v is None or v == "":
            return default
        return float(v)
    except (TypeError, ValueError):
        return default


def parse_ip(v) -> float:
    """FanGraphs IP like 1638.2 means 1638 + 2/3."""
    if v is None or v == "":
        return 0.0
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        whole = math.floor(float(v) + 1e-9)
        frac = round((float(v) - whole) * 10)
        if frac in (0, 1, 2):
            return whole + frac / 3.0
        return float(v)
    s = str(v)
    if "." in s:
        whole_s, frac_s = s.split(".", 1)
        whole = int(whole_s or 0)
        frac = int(frac_s[:1] or 0)
        return whole + (frac / 3.0 if frac in (0, 1, 2) else float(f"0.{frac_s}"))
    return float(s)


def blank_batter():
    return {
        "name": "",
        "pa": 0.0,
        "ab": 0.0,
        "h": 0.0,
        "singles": 0.0,
        "doubles": 0.0,
        "triples": 0.0,
        "hr": 0.0,
        "bb": 0.0,
        "so": 0.0,
        "hbp": 0.0,
        "war": 0.0,
        "wrc_plus_weighted": 0.0,
        "bats": "",
        "positions": defaultdict(float),
        "seasons": set(),
    }


def blank_pitcher():
    return {
        "name": "",
        "tbf": 0.0,
        "ip": 0.0,
        "h": 0.0,
        "hr": 0.0,
        "bb": 0.0,
        "so": 0.0,
        "hbp": 0.0,
        "war": 0.0,
        "gs": 0.0,
        "g": 0.0,
        "throws": "",
        "seasons": set(),
    }


def accumulate_batting(store: dict, rows: list[dict]):
    for row in rows:
        pid = row.get("playerid")
        if pid is None:
            continue
        pid = int(pid)
        pa = safe_float(row.get("PA"))
        if pa < MIN_PA:
            continue
        b = store[pid]
        b["name"] = row.get("PlayerName") or b["name"]
        b["pa"] += pa
        b["ab"] += safe_float(row.get("AB"))
        b["h"] += safe_float(row.get("H"))
        singles = row.get("1B")
        if singles is None:
            singles = (
                safe_float(row.get("H"))
                - safe_float(row.get("2B"))
                - safe_float(row.get("3B"))
                - safe_float(row.get("HR"))
            )
        b["singles"] += safe_float(singles)
        b["doubles"] += safe_float(row.get("2B"))
        b["triples"] += safe_float(row.get("3B"))
        b["hr"] += safe_float(row.get("HR"))
        b["bb"] += safe_float(row.get("BB"))
        b["so"] += safe_float(row.get("SO"))
        b["hbp"] += safe_float(row.get("HBP"))
        war = safe_float(row.get("WAR"))
        b["war"] += war
        wrc = safe_float(row.get("wRC+"), 100.0)
        b["wrc_plus_weighted"] += wrc * pa
        bats = (row.get("Bats") or "").strip().upper()
        if bats in {"L", "R", "S", "B"}:
            b["bats"] = "S" if bats == "B" else bats
        pos = (row.get("position") or row.get("positionDB") or "").strip().upper()
        if pos:
            # Normalize
            if pos in {"OF", "LF", "CF", "RF", "C", "1B", "2B", "3B", "SS", "DH", "P", "UTIL"}:
                b["positions"][pos] += pa
            elif pos.startswith("O"):
                b["positions"]["OF"] += pa
        season = row.get("Season")
        if season is not None:
            b["seasons"].add(int(season))


def accumulate_pitching(store: dict, rows: list[dict]):
    for row in rows:
        pid = row.get("playerid")
        if pid is None:
            continue
        pid = int(pid)
        tbf = safe_float(row.get("TBF"))
        if tbf < MIN_TBF:
            # some old rows lack TBF — estimate from IP*4.2
            ip = parse_ip(row.get("IP"))
            tbf = ip * 4.2
        if tbf < MIN_TBF:
            continue
        p = store[pid]
        p["name"] = row.get("PlayerName") or p["name"]
        p["tbf"] += tbf
        p["ip"] += parse_ip(row.get("IP"))
        p["h"] += safe_float(row.get("H"))
        p["hr"] += safe_float(row.get("HR"))
        p["bb"] += safe_float(row.get("BB"))
        p["so"] += safe_float(row.get("SO"))
        p["hbp"] += safe_float(row.get("HBP"))
        p["war"] += safe_float(row.get("WAR"))
        p["gs"] += safe_float(row.get("GS"))
        p["g"] += safe_float(row.get("G"))
        throws = (row.get("Throws") or "").strip().upper()
        if throws in {"L", "R", "S"}:
            p["throws"] = throws
        season = row.get("Season")
        if season is not None:
            p["seasons"].add(int(season))


def clamp(n: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, n))


def salary_from_war(war: float, is_pitcher: bool) -> int:
    """Map career WAR to a draft salary. Floor $500k, ceiling ~$32M."""
    # Soften extreme WAR so Ruth/Young don't make the pool undraftable alone
    effective = max(0.0, war)
    # Diminishing returns above 80 WAR
    if effective > 80:
        effective = 80 + (effective - 80) * 0.45
    if is_pitcher:
        raw = 500_000 + effective * 280_000
    else:
        raw = 500_000 + effective * 300_000
    # Small playing-time bump already baked into WAR; keep round millions-ish
    salary = int(round(raw / 100_000) * 100_000)
    return int(clamp(salary, 500_000, 32_000_000))


def primary_position(pos_weights: dict) -> tuple[str, list[str]]:
    if not pos_weights:
        return "UTIL", ["UTIL"]
    # Merge OF corners if present
    ordered = sorted(pos_weights.items(), key=lambda kv: kv[1], reverse=True)
    primary = ordered[0][0]
    if primary == "OF":
        # Prefer a specific OF spot if any
        for specific in ("CF", "LF", "RF"):
            if specific in pos_weights:
                primary = specific
                break
        else:
            primary = "CF"
    positions = []
    for pos, _ in ordered:
        if pos == "OF":
            for specific in ("LF", "CF", "RF"):
                if specific not in positions:
                    positions.append(specific)
        elif pos not in positions:
            positions.append(pos)
    if primary not in positions:
        positions.insert(0, primary)
    return primary, positions[:5]


def batter_card(pid: int, b: dict) -> dict:
    pa = max(b["pa"], 1.0)
    primary, positions = primary_position(b["positions"])
    seasons = sorted(b["seasons"])
    wrc = b["wrc_plus_weighted"] / pa if pa else 100.0
    war = b["war"]
    return {
        "fangraphsId": pid,
        "name": b["name"],
        "yearFrom": seasons[0] if seasons else START_YEAR,
        "yearTo": seasons[-1] if seasons else END_YEAR,
        "primaryPos": primary,
        "positions": positions,
        "bats": b["bats"] or "R",
        "throws": "R",
        "salary": salary_from_war(war, is_pitcher=False),
        "isPitcher": False,
        "kRate": round(1000.0 * b["so"] / pa, 2),
        "bbRate": round(1000.0 * b["bb"] / pa, 2),
        "hbpRate": round(1000.0 * b["hbp"] / pa, 2),
        "singleRate": round(1000.0 * max(b["singles"], 0.0) / pa, 2),
        "doubleRate": round(1000.0 * b["doubles"] / pa, 2),
        "tripleRate": round(1000.0 * b["triples"] / pa, 2),
        "hrRate": round(1000.0 * b["hr"] / pa, 2),
        "stuff": 50.0,
        "control": 50.0,
        "durability": round(clamp(40 + (pa / 8000.0) * 50, 35, 99), 1),
        "description": f"Career {seasons[0] if seasons else '?'}-{seasons[-1] if seasons else '?'} · {pa:.0f} PA · {war:.1f} WAR · {wrc:.0f} wRC+",
        "careerPA": int(round(pa)),
        "careerWAR": round(war, 2),
        "source": "fangraphs",
    }


def pitcher_card(pid: int, p: dict) -> dict:
    tbf = max(p["tbf"], 1.0)
    ip = max(p["ip"], 0.1)
    seasons = sorted(p["seasons"])
    k9 = p["so"] / ip * 9.0
    bb9 = p["bb"] / ip * 9.0
    hr9 = p["hr"] / ip * 9.0
    # Distribute non-HR hits into 1B/2B/3B for the sim
    non_hr_hits = max(p["h"] - p["hr"], 0.0)
    singles = non_hr_hits * 0.72
    doubles = non_hr_hits * 0.25
    triples = non_hr_hits * 0.03
    war = p["war"]
    stuff = clamp(35 + (k9 - 5.0) * 8.5, 25, 99)
    control = clamp(90 - (bb9 - 1.5) * 10.0, 25, 99)
    role = "SP" if p["gs"] >= max(10.0, p["g"] * 0.4) else "RP"
    return {
        "fangraphsId": pid,
        "name": p["name"],
        "yearFrom": seasons[0] if seasons else START_YEAR,
        "yearTo": seasons[-1] if seasons else END_YEAR,
        "primaryPos": "P",
        "positions": ["P"],
        "bats": "R",
        "throws": p["throws"] or "R",
        "salary": salary_from_war(war, is_pitcher=True),
        "isPitcher": True,
        "kRate": round(1000.0 * p["so"] / tbf, 2),
        "bbRate": round(1000.0 * p["bb"] / tbf, 2),
        "hbpRate": round(1000.0 * p["hbp"] / tbf, 2),
        "singleRate": round(1000.0 * singles / tbf, 2),
        "doubleRate": round(1000.0 * doubles / tbf, 2),
        "tripleRate": round(1000.0 * triples / tbf, 2),
        "hrRate": round(1000.0 * p["hr"] / tbf, 2),
        "stuff": round(stuff, 1),
        "control": round(control, 1),
        "durability": round(clamp(35 + (ip / 3500.0) * 55, 30, 99), 1),
        "description": f"Career {seasons[0] if seasons else '?'}-{seasons[-1] if seasons else '?'} · {ip:.0f} IP · {war:.1f} WAR · {role}",
        "careerIP": round(ip, 1),
        "careerWAR": round(war, 2),
        "source": "fangraphs",
    }


def main():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    batters: dict[int, dict] = defaultdict(blank_batter)
    pitchers: dict[int, dict] = defaultdict(blank_pitcher)

    print("Downloading FanGraphs season rows in 10-year windows…", flush=True)
    for season1, season in windows(START_YEAR, END_YEAR, WINDOW):
        print(f"Window {season1}-{season}", flush=True)
        accumulate_batting(batters, fetch_chunk("bat", season1, season, ind=1))
        accumulate_pitching(pitchers, fetch_chunk("pit", season1, season, ind=1))

    print(f"Unique batters: {len(batters)}, pitchers: {len(pitchers)}", flush=True)

    # One card per player id. If both, keep the higher-WAR role.
    cards: dict[int, dict] = {}
    for pid, b in batters.items():
        if b["pa"] < MIN_PA or not b["name"]:
            continue
        cards[pid] = batter_card(pid, b)

    for pid, p in pitchers.items():
        if p["tbf"] < MIN_TBF or not p["name"]:
            continue
        pit = pitcher_card(pid, p)
        if pid not in cards:
            cards[pid] = pit
            continue
        # Two-way: pick better career WAR role (Ohtani etc. stay one player)
        if pit["careerWAR"] > cards[pid]["careerWAR"]:
            # Keep bat hand if we had it
            bats = cards[pid].get("bats") or "R"
            pit["bats"] = bats
            pit["description"] += " · two-way (pitcher card)"
            cards[pid] = pit
        else:
            cards[pid]["description"] += " · two-way (hitter card)"
            if p.get("throws"):
                cards[pid]["throws"] = p["throws"]

    players = sorted(
        cards.values(),
        key=lambda x: (-x["salary"], -x.get("careerWAR", 0), x["name"]),
    )

    # Enforce unique display names for draft UX: if duplicates, append years
    seen = {}
    for p in players:
        key = p["name"].lower()
        if key not in seen:
            seen[key] = p
            continue
        other = seen[key]
        # Disambiguate both
        other["name"] = f"{other['name']} ({other['yearFrom']}-{other['yearTo']})"
        p["name"] = f"{p['name']} ({p['yearFrom']}-{p['yearTo']})"
        seen[key + str(p["fangraphsId"])] = p

    OUT_JSON.write_text(json.dumps(players))
    meta = {
        "source": "FanGraphs leaders API (season rows aggregated to career)",
        "startYear": START_YEAR,
        "endYear": END_YEAR,
        "playerCount": len(players),
        "hitters": sum(1 for p in players if not p["isPitcher"]),
        "pitchers": sum(1 for p in players if p["isPitcher"]),
        "note": "One card per FanGraphs player id. No single-season variants.",
    }
    OUT_META.write_text(json.dumps(meta, indent=2))
    print(json.dumps(meta, indent=2))
    print(f"Wrote {OUT_JSON}")


if __name__ == "__main__":
    main()
