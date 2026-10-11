# Sunday Schools

An NFL trivia game. You get 10 players, one at a time, and type the college each one was drafted out of. Built with Next.js (App Router), TypeScript and Tailwind CSS v4.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build
npm run lint
npm run typecheck
npm test           # game logic and data tests (vitest)
npm run players    # rebuild data/players.json from nflverse (needs internet)
```

## Difficulty

Pick a mode on the start screen.

| Mode | What you get | Clues shown | Points |
| --- | --- | --- | --- |
| Blended | 3 easy, 3 medium, 2 hard, 2 sicko, in that order | Depends on each player's tier | 10 to 30 |
| Easy | Stars you see every Sunday | Position, team, draft year | 10 |
| Medium | Starters and fan favorites | Position, team, draft year | 15 |
| Hard | Role players and tricky schools | Position, team | 20 |
| Sicko | Deep cuts | Position only | 30 |

## How it works

- **Questions** come from `data/players.json` (about 3,800 players drafted 2011 to 2026). There is no database.
- **Game rules** live in `lib/game/` as plain functions with no React in them:
  - `selectPlayer.ts`: pick a random player, skipping ones already used, from a tier (falls back to the nearest tier if one runs out)
  - `plan.ts`: which tier each question aims for
  - `answers.ts` and `colleges.ts`: check a typed answer (case, punctuation, `State`/`St`, nicknames such as `LSU` or `Ole Miss`, transfer schools, and one typo on longer names)
  - `scoring.ts`: points by tier, streak and best streak
  - `hints.ts`: which clues each tier shows
  - `gameState.ts`: start a game, submit an answer, move to the next question
- `hooks/useGame.ts` holds the state and calls those functions.
- `components/` is presentation only.

## Where the players come from

`npm run players` runs `scripts/build-players.mjs`, which downloads the public [nflverse](https://github.com/nflverse/nflverse-data) player file and writes `data/players.json`. Please credit nflverse when you share the game, and check their license terms.

What the script does:

- Keeps players drafted 2011 to 2026 who have a college and a current or last team.
- Drops one-year players who were not high picks, so the hard tiers stay fair.
- Uses the first school listed as the answer. Any other schools (transfers) become `alternateColleges` and also count as correct. Junior colleges are left out.
- Gives every player a difficulty score from draft position, years in the league, how recognizable the position is, and how obscure the school is. The scores are split into tiers (6% easy, 20% medium, 34% hard, 40% sicko).
- Applies hand-picked tiers from `scripts/difficulty-overrides.json` on top.

Run `node scripts/build-players.mjs --report` to see how the tiers came out without writing anything.

### Fixing a tier

Open `scripts/difficulty-overrides.json`, add a line like `"travis-hunter-2025": "easy"`, and run `npm run players`. The id is the player's name in lowercase with hyphens, then the draft year.

### Data notes

- Team and position come straight from nflverse, so they can lag a trade or look odd for hybrid players.
- The data has no awards or stats, so the middle tiers are an estimate. That is what the overrides are for.
- `data/players.json` is about 600 KB and ships to the browser. If it gets much bigger, split it by tier and load the chosen tier on demand.

## Editing tiers in a spreadsheet

```bash
npm run tiers:export                                   # writes players-tiers.csv
# open it in Excel / Numbers / Sheets, change the Tier column, Save As CSV
npm run tiers:import -- players-tiers.csv --dry-run    # preview the changes
npm run tiers:import -- players-tiers.csv              # apply them
```

Only the `id` and `Tier` columns are read on import. Changes are written to `data/players.json` and
`scripts/difficulty-overrides.json`, so `npm run players` keeps them when you regenerate the data.

## Putting it online for free

The game has no server or database, so any free static host works. The easiest is Vercel:

1. Put the project folder in a GitHub repository (github.com/new, then upload the files, leaving out `node_modules` and `.next`).
2. Go to vercel.com, sign in with GitHub, choose "Add New Project", pick the repository and press Deploy. The defaults are right.
3. Vercel gives you a link like `sunday-schools.vercel.app` to share. Every push to GitHub redeploys it.

The free Vercel plan is meant for personal, non-commercial projects. Netlify and Cloudflare Pages also have free plans that work the same way.

## Player tiers (hand-checked)

Every player's tier was checked by hand. `master-list.csv` is the master list and `data/players.json` is what the game reads.

To change tiers: edit the `Tier` column in `master-list.csv` (easy, medium, hard or sicko; keep the `id` column), then run

```bash
npm run tiers:import -- master-list.csv --dry-run   # preview
npm run tiers:import -- master-list.csv             # apply
```

`npm run tiers:export` writes a fresh CSV from the current list.

## How the list was built (archived)

The sections below describe the pipeline that produced the first draft of the list and tiers. The game no longer uses the formula or the ratings. They are kept in case you want to rebuild or extend the list, but re-running `scripts/trim-players.mjs` replaces the hand-checked `data/players.json`, so it refuses to run without `--force`.

## Building the player pool

The pool is every NFL player who started the majority of at least two seasons from 2015 to 2026, drafted or not. The current season counts once he has started more than half of his team's games so far.

```bash
node scripts/find-starters.mjs <players.csv> <snap_counts/>   # -> scripts/qualifying-starters.json
node scripts/build-players.mjs <players.csv>                  # full candidate pool -> scripts/players-full.json
node scripts/trim-players.mjs <players.csv>                   # keeps the starters -> data/players.json (+ scripts/removed-players.csv)
node scripts/build-ratings.mjs <players.csv> --report         # factor ratings -> data/player-ratings.json
```

A game counts as a start when the player took the starter share of snaps for his position (50% for QB, WR, TE, OL and defensive backs; 45% for defensive linemen and linebackers; 40% for running backs; 25% for fullbacks; special-teams snaps for kickers, punters and long snappers). A season counts when he had at least 9 start games (more than half of the current season so far). The snap counts come from nflverse (`snap_counts_<year>.csv`, 2013 onward).

Offensive and defensive linemen (T, G, C, OT, OG, OL, DE, DT, DL, NT), kickers and punters stay only if they have at least one All-Pro (first or second team) or Pro Bowl selection. Honors come from Pro-Football-Reference (2011-2025, plus Wikipedia for the 2016 and 2017 Pro Bowl linemen, kickers and punters); linemen with honors only before 2011 are not recognized.

Undrafted players are included with `undrafted: true`, and their `draftYear` is their rookie season. Two qualifying starters are left out because the data lists no four-year college: Jordan Mailata and David Moore (WR).

## Difficulty scoring (archived, not used by the game)

`lib/difficulty/score.ts` is a pure function: four 1-5 ratings in, an integer score and a tier out.

```
score = 7*(5-playerNotoriety) + 8*(5-collegeRecognition) + 3*(5-collegeAssociation) + 2*(5-collegePathComplexity)
easy 0-24, medium 25-44, hard 45-64, sicko 65-100
```

The formula tops out at 80 with ratings 1-5, so the original cutoffs (24 / 49 / 74) made sicko nearly unreachable. The cutoffs are 24 / 44 / 64; the formula itself is unchanged.

- `data/college-recognition.json`: one reusable 1-5 rating per school (all 260), with a confidence flag.
- `data/player-ratings.json`: per-player notoriety, association, path complexity, rationale and confidence. Built by `node scripts/build-ratings.mjs <players.csv> --report` from `scripts/manual-ratings.json`, `scripts/curated-ratings.json` and Pro-Football-Reference honors in `scripts/pfr/` (All-Pro, Pro Bowl, and wAV for the first ~105 picks of each draft; see `scripts/pfr/README.md` for the gaps).
- `lib/difficulty/evaluate.ts` builds the full record. `needsReview` is true when anything is unsure, missing or ambiguous (including multi-school players whose canonical answer is unconfirmed). Invalid ratings are never classified.
- School ratings are model judgment with no independent source. Player notoriety comes from Pro-Football-Reference honors, apart from about 130 well-known players rated by hand. Anything marked unsure should be checked by a person.
