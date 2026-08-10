# Hardball

Private historical fantasy baseball for you and your friends — inspired by Imagine Sports / Diamond Mind Online, built for a small group.

## What you get

- Account login / registration
- Private leagues with invite codes
- Salary-cap draft from **every MLB career** (FanGraphs, 1871–2025)
- **One card per player** — no Babe Ruth 1927 vs Babe Ruth 1930
- Lineup + pitching staff management
- Construction-aware sim: L/R platoon, SP stamina → bullpen, lineup sequencing
- Day-by-day season simulation with box scores and play-by-play

## Local HTML demo (no server / no DB)

Try the sim in the browser first — pick two city clubs, auto-build lineups, sim a game with box score + play-by-play:

```bash
npm run demo
```

Open [http://localhost:4173](http://localhost:4173). Or open `demo/index.html` directly (keep the three files in `demo/` together).

Hit **Watch game** for a Gamecast-style diamond replay (bases, outs, score, play feed — pause / step / speed). Not pitch-by-pitch yet; each PA and baserunning event animates.

Sim climate: home **park factors**, optional **era** leagues (default neutral so career rates aren’t double-counted), **defense → BABIP**, and **speed-based** first-to-third / score-from-first-on-double.

Rebuild assets after sim changes: `npm run demo:build`.

This uses a ~75-player star subset. The full app below loads every career card for drafts with friends.

## Quick start (full app)

```bash
npm install
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo account (created by seed): `aaron` / `hardball`

Draft salaries blend career WAR with a peak-rate term, but the peak is
credibility-weighted by playing time (cup-of-coffee careers stay near the
$500k floor). After pulling salary formula changes:

```bash
npm run db:salaries -- --apply
```

## Deploy for free (Vercel + Turso)

Host the full app at $0 on Vercel (Next.js) with a Turso (hosted libSQL)
database. The app auto-detects Turso when `TURSO_DATABASE_URL` is set and
otherwise uses the local SQLite file. See **[DEPLOY.md](DEPLOY.md)** for the
step-by-step guide.

Player pool ships as `data/career_players.json` (built from FanGraphs). To refresh:

```bash
npm run db:ingest   # pulls FanGraphs season rows, aggregates to career cards
npm run db:reseed   # clears leagues and reloads the player table
```

## How to play with friends

1. Create accounts
2. One person creates a league, picks a **dynasty era**, and shares the invite code
3. Draft only that era’s career cards (Pre-1950 / 1950–79 / 1980–99 / 2000–now, or All-time chaos)
4. Lock rosters → commissioner starts the season
5. Hit **Sim next day**, check box scores, argue in the group chat

Era locks keep rates apples-to-apples — Hunter Greene doesn’t get a free K party against Babe Ruth unless you choose All-time.

## Stack

- Next.js (App Router)
- Prisma + SQLite locally, Turso (libSQL) in production
- FanGraphs leaders API → career cards
- Cookie sessions (JWT)
