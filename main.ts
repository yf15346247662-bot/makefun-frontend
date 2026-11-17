// Ledger, a makefun-frontend-01 entry (Node 22, standard library only):
// a fast, read-only client for make.fun in the shape of a paper ledger —
// white paper, dark ink, one red for the figures that matter. Its app/
// folder holds plain static files a browser opens at app/index.html (ES
// modules, CSS, no build step, no framework), reading make.fun's public
// API at https://make.fun/api: the live bounty board with each pot as it
// stands, a page for every bounty with its rules and rewards, every
// leaderboard, and every account's public profile — each reachable by a
// link and by its own URL. The program hands it in: it copies app/ and
// screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads (your screenshots,
// the first load's files and bytes, and your source), with the vendored
// make.fun library. Leave vendor/makefun-frontend.ts as it is: the scorer
// requires dossier.json to be byte for byte what its own copy writes.
//
// Put 3 PNG or JPEG screenshots of the app running on live data in
// screenshots/ (the first by name is the cover; shots.json says which
// views they were taken of), and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for
// /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 3 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 16 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 3, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 16777216 }),
);
