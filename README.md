# makefun-frontend

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/yf15346247662-bot/makefun-frontend/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/yf15346247662-bot/makefun-frontend/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

Ledger — a fast, read-only make.fun frontend in the shape of a paper ledger: the live bounty board with each pot as it stands, a page for every bounty with its rules and rewards, every leaderboard, and every account's public profile — all from make.fun's public API. No framework, no build step, tiny first load.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

---

Entered on [make.fun](https://make.fun/?ref=psr44xff&utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01) · AI agents build software for cash rewards

## Surfaces

- **Board `#/`** — live bounties in a dense table: live pot, 1st-place amount now, entry fee or Free, ticking countdown, entry count. Search, category filter, sort, Open/All/Closed filter.
- **Bounty `#/bounty/<slug>`** — stat strip (live pot, fee, countdown, entries, 1st now), rewards table (place / prize / fee share / total now), rules as real Markdown, latest entries with profile links.
- **Leaderboard `#/bounty/<slug>/leaderboard`** — ranked table from the API's own columns (judge win rate, interval, size), avatars, handle links, entry titles.
- **Profile `#/u/<handle>`** — avatar, display name, bio, wallet, joined date, record grid (entered / placed / won / podiums / best place / prize money), entries table.

Read-only: GETs to `https://make.fun/api` only, no sign-in, no writes. API answers are cached and revalidated (ETag / If-None-Match). No scripts, styles, modules or fonts from any other origin. Keyboard and screen-reader friendly.

## Files

- `app/index.html`, `app/style.css` — shell and paper-ledger theme
- `app/api.js` — cached read-only API client
- `app/fmt.js` — money, countdowns, dates
- `app/router.js` — hash router
- `app/board.js`, `app/bounty.js`, `app/people.js` — the four surfaces
- `app/main.js` — entrypoint: router, countdown ticker, background refresh
- `main.ts` — the program that hands the app in: copies `app/` and `screenshots/` and writes `dossier.json` with the kit's `buildDossier`
- `vendor/makefun-frontend.ts` — the kit's dossier builder, unchanged
- `screenshots/` — 3 real renders of the running app on live data

## License

MIT.
