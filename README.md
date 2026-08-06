# Hardball

Private historical fantasy baseball for you and your friends — inspired by Imagine Sports / Diamond Mind Online, built for a small group.

## What you get

- Account login / registration
- Private leagues with invite codes
- Salary-cap draft from ~120 historical legends
- Lineup + pitching staff management
- Day-by-day season simulation with box scores and play-by-play

## Quick start

```bash
npm install
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo account (created by seed): `aaron` / `hardball`

## How to play with friends

1. Create accounts
2. One person creates a league and shares the invite code
3. Everyone drafts under the $120M salary cap
4. Lock rosters → commissioner starts the season
5. Hit **Sim next day**, check box scores, argue in the group chat

## Stack

- Next.js (App Router)
- Prisma + SQLite
- Cookie sessions (JWT)
