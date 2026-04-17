@AGENTS.md

# NHL Playoff Bracket App

## Tech Stack
- **Framework**: Next.js 16.2.2 (App Router, Server Components)
- **Language**: TypeScript 5, React 19
- **Database**: Turso (SQLite) via `@libsql/client` + Drizzle ORM
- **Styling**: Tailwind CSS 4 (dark theme, `#0f0f1a` background)
- **Fonts**: Geist / Geist Mono (Google Fonts)
- **Auth**: Custom token-based — `user_token` HTTP-only cookie, no external auth

## Dev Setup
- `npm run dev` — starts Next.js with Webpack (Turbopack has a panic bug)
- `npm run db:init` — seeds database with NHL playoff teams and bracket structure
- Local SQLite file: `nhl-bracket.db`
- Env vars in `.env.local`: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`

## Project Structure
```
app/
  page.tsx                    # Home — join or create league (client component)
  layout.tsx                  # Root layout with fonts & metadata
  globals.css                 # Tailwind imports & CSS variables
  api/
    league/create/route.ts    # POST: create league, set cookie
    league/join/route.ts      # POST: join league via invite code
    bracket/save/route.ts     # POST: save picks for a round
  components/
    BracketPicker.tsx         # Interactive bracket UI
  league/[code]/
    page.tsx                  # Server component: fetches all league data
    LeagueClient.tsx          # Client component: tabs (bracket/leaderboard/league)

lib/
  schema.ts                   # Drizzle table definitions (teams, users, leagues, series, brackets, picks)
  db.ts                       # Database client + auto-migrations
  auth.ts                     # getOrCreateUser, getCurrentUser, generateInviteCode
  nhl-api.ts                  # Fetches playoff teams from NHL standings API
  bracket-data.ts             # Bracket logic: slot resolution, reseeding, pick helpers
  scoring.ts                  # Leaderboard calculation (1pt winner, 3pt exact games)
  seed.ts                     # Playoff structure: R1 matchups, all 15 series slots
  init-db.ts                  # DB seeding script
```

## Conventions
- **Series IDs**: `{Conference}_{Round}_{Index}` — e.g. `W_R1_1`, `E_CF`, `SCF`
- **Conferences**: `"W"` (West), `"E"` (East)
- **Team abbreviations**: 3-letter codes from NHL API (e.g. `WPG`, `DAL`, `VGK`)
- **Team IDs**: W seeds 1–8 → IDs 1–8, E seeds 1–8 → IDs 9–16
- **Server vs Client split**: `page.tsx` is server (data fetching), companion `*Client.tsx` is client (interactivity)
- **Path alias**: `@/*` maps to project root

## How It Works
1. Users create or join a league (6-char invite code, e.g. `BEER26`)
2. Each round opens for picks when the previous round completes
3. Users pick winners + predict series length (4–7 games)
4. Scoring: 1pt correct winner, 3pts total if winner + exact games (not cumulative). Exact-games points only awarded when winner pick is also correct.
5. Division-based fixed bracket: R1 is div 2v3 + div winner vs wild card; R2 pairs within same division side; no reseeding
6. NHL API (`api-web.nhle.com/v1/standings/now`) provides team data, cached 1hr

## Database
- 6 tables: `teams`, `users`, `leagues`, `leagueMembers`, `series`, `brackets`, `picks`
- Schema in `lib/schema.ts`, config in `drizzle.config.ts`
- Series `status`: `"pending"` | `"active"` | `"complete"`
