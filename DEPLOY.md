# Deploying HARDBALL for free

HARDBALL runs on **Vercel (Hobby, free)** for the Next.js app and **Turso
(free)** for the database. Total cost: **$0**.

The app stores everything in SQLite. In production that SQLite lives in Turso
(hosted libSQL) so your leagues, drafts, and season stats survive deploys —
Vercel's filesystem is ephemeral and would otherwise reset on every push.

The code auto-detects the target:

- **`TURSO_DATABASE_URL` set** → uses Turso/libSQL (production)
- **not set** → uses the local `prisma/dev.db` file (dev, seeds, tests)

> Note: Vercel's Hobby plan is for **non-commercial, personal** use. A private
> friends league qualifies.

---

## 1. Create the Turso database

Install the CLI and sign up (GitHub login, no card):

```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth signup      # or: turso auth login
```

Create a database and grab its credentials:

```bash
turso db create hardball
turso db show hardball --url          # → TURSO_DATABASE_URL (libsql://…)
turso db tokens create hardball       # → TURSO_AUTH_TOKEN
```

## 2. Apply the schema + seed the player pool to Turso

From the project root, point the CLI env at Turso and run the setup script.
This replays the Prisma migrations against Turso and seeds ~23k career cards
(plus the demo `aaron` / `hardball` login).

```bash
export TURSO_DATABASE_URL="libsql://hardball-you.turso.io"
export TURSO_AUTH_TOKEN="…"

npm install
npm run db:turso:setup     # = turso migrate + seed
```

You can re-run `npm run db:turso:migrate` any time you add a new migration.

> Don't have `data/career_players.json`? It's committed in the repo. If you want
> to regenerate it, run `python3 scripts/ingest_fangraphs_careers.py`.

## 3. Deploy the app to Vercel

1. Push this branch to GitHub (already done if you're reading this in the PR).
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Framework preset: **Next.js** (auto-detected). Build command and output are
   default — the repo's `build` script runs `prisma generate && next build`.
4. Add **Environment Variables** (Production + Preview):

   | Name                 | Value                                   |
   | -------------------- | --------------------------------------- |
   | `TURSO_DATABASE_URL` | `libsql://hardball-you.turso.io`        |
   | `TURSO_AUTH_TOKEN`   | your Turso token                        |
   | `AUTH_SECRET`        | `openssl rand -hex 32`                  |

5. Click **Deploy**. First build takes ~1–2 min.

Your app will be live at `https://<project>.vercel.app`. Log in with
`aaron` / `hardball`, or register a new account and start a league.

---

## Local development (unchanged)

Local dev keeps using the SQLite file — no Turso needed:

```bash
npm install
npm run db:setup     # migrate + seed local prisma/dev.db
npm run dev          # http://localhost:3000
```

## The static demo (optional, also free)

`demo/index.html` is a fully client-side sim with no backend. Host it anywhere
static for free (Vercel, GitHub Pages, Cloudflare Pages) or just open the file:

```bash
npm run demo         # builds + serves at http://localhost:4173
```

---

## Notes & limits

- **Turso free tier:** 5 GB storage, 500M row reads + 10M writes/month, no
  sleeping. Far beyond what a friends league needs.
- **Vercel Hobby:** 1M function invocations, 100 GB transfer/month, 300s max
  function duration. Day/week season stepping keeps each request short and well
  under the limit.
- **Env precedence:** if `TURSO_DATABASE_URL` is present the app ignores
  `DATABASE_URL`. Leave Turso vars unset locally to use the file DB.
