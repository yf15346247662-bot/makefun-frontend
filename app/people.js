// Ledger's people surfaces: a competition's leaderboard and an account's
// public profile. Both read only public endpoints and render plain tables.

import { getLeaderboard, getProfile, avatarUrl, profilePicture, bountyUrl } from './api.js';
import { esc, money, num, pct, size, dateOf, ago, shortWallet, initials } from './fmt.js';

const PAGE = 50;
const shown = new Map(); // "slug|view" -> how many rows are on screen

function entrantCell(entry) {
  const img = avatarUrl(entry.image);
  const face = img
    ? '<img class="avatar-sm" src="' + esc(img) + '" alt="" loading="lazy" decoding="async">'
    : '<span class="avatar-fallback sm" aria-hidden="true">' + esc(initials(entry.handle)) + '</span>';
  return face + '<a href="#/u/' + esc(entry.handle) + '">' + esc(entry.handle) + '</a>';
}

function metricCell(entry, key) {
  const v = entry.values ? entry.values[key] : undefined;
  if (v === null || v === undefined) return '—';
  if (key === 'valid') return v ? '✓' : '—';
  if (key === 'bytes') return size(v);
  if (key === 'judge' || key === 'judge_low' || key === 'judge_high') return pct(v);
  return num(v);
}

export async function renderLeaderboard(root, slug, view = 'performance') {
  const data = await getLeaderboard(slug, view);
  const comp = data.competition || {};
  document.title = 'Leaderboard — ' + (comp.title || slug) + ' — Ledger';
  const key = slug + '|' + view;
  const count = shown.get(key) || PAGE;
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const columns = (data.columns || []).filter((c) => !c.hidden);
  const views = Array.isArray(data.views) && data.views.length > 1 ? data.views : null;
  const phase = data.phase || {};

  root.innerHTML =
    '<div class="wrap">' +
    '<div class="page-head"><p class="kicker"><a href="#/bounty/' + esc(slug) + '">' +
    esc(comp.title || slug) + '</a> · leaderboard</p>' +
    '<h1>' + esc(data.title || 'Leaderboard') + '</h1>' +
    '<p>' + esc(phase.title || '') + ' · ranked by ' + esc(data.rank_key || 'judge') +
    ' · ' + num(entries.length) + ' ranked entries' +
    (phase.scores_visible === false ? ' · scores hidden until the round closes' : '') + '</p></div>' +
    (views
      ? '<div class="toolbar" role="group" aria-label="Leaderboard view">' +
        views.map((v) =>
          '<button type="button" class="btn' + (v === view ? '" aria-pressed="true' : '" aria-pressed="false') +
          '" data-view="' + esc(v) + '">' + esc(v === 'overall' ? 'Overall' : 'Performance') + '</button>').join('') +
        '</div>'
      : '') +
    '<div class="scroll"><table class="ledger">' +
    '<thead><tr><th scope="col">Rank</th><th scope="col">Entrant</th><th scope="col">Entry</th>' +
    columns.map((c) => '<th scope="col" class="num">' + esc(c.title) + '</th>').join('') +
    '</tr></thead><tbody>' +
    entries.slice(0, count).map((e) =>
      '<tr><td class="rank">' + esc(num(e.rank)) + '</td>' +
      '<td>' + entrantCell(e) + '</td>' +
      '<td class="title-cell">' + esc(e.title || 'Untitled entry') + '</td>' +
      columns.map((c) => '<td class="num">' + esc(metricCell(e, c.key)) + '</td>').join('') +
      '</tr>').join('') +
    '</tbody></table></div>' +
    (entries.length > count
      ? '<p class="more-row"><button type="button" class="btn" id="more-rows">Show ' +
        num(Math.min(PAGE, entries.length - count)) + ' more</button></p>'
      : '') +
    '<p class="status-line">Source: <a href="' + esc(bountyUrl(slug)) + '">make.fun leaderboard ↗</a></p>' +
    '</div>';

  const more = document.getElementById('more-rows');
  if (more) {
    more.addEventListener('click', () => {
      shown.set(key, count + PAGE);
      renderLeaderboard(root, slug, view);
    });
  }
  root.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      shown.delete(slug + '|' + btn.dataset.view);
      renderLeaderboard(root, slug, btn.dataset.view);
    });
  });
}

function recordCell(label, value) {
  return '<div class="stat"><dt>' + esc(label) + '</dt><dd>' + value + '</dd></div>';
}

export async function renderProfile(root, handle) {
  const p = await getProfile(handle);
  document.title = (p.display_name || p.handle) + ' — Ledger';
  const name = p.display_name || p.handle;
  const record = p.record || {};
  const sols = Array.isArray(p.solutions) ? p.solutions : [];
  const wallet = p.wallet || {};
  const joined = p.joined_at ? dateOf(p.joined_at) : '—';
  const best = record.best_placement === null || record.best_placement === undefined
    ? '—' : '#' + num(record.best_placement);

  root.innerHTML =
    '<div class="wrap">' +
    '<article class="profile-card">' +
    '<span id="avatar-slot" aria-hidden="true"><span class="avatar-fallback">' +
    esc(initials(name)) + '</span></span>' +
    '<div class="who"><h1>' + esc(name) + '</h1>' +
    '<p class="handle-line">@' + esc(p.handle) +
    (p.github_login ? ' · GitHub ' + esc(p.github_login) : '') +
    (p.x ? ' · X ' + esc(p.x) : '') + '</p>' +
    '<p class="bio">' + esc(p.bio || 'No bio yet.') + '</p>' +
    '<p class="meta">Joined ' + esc(joined) +
    (wallet.address
      ? ' · Wallet <a href="' + esc(wallet.explorer_url || ('https://solscan.io/account/' + wallet.address)) + '">' +
        esc(shortWallet(wallet.address)) + ' ↗</a>'
      : '') + '</p></div></article>' +
    '<dl class="stats">' +
    recordCell('Entered', esc(num(record.competitions_entered))) +
    recordCell('Placed', esc(num(record.competitions_placed))) +
    recordCell('Won', esc(num(record.competitions_won))) +
    recordCell('Podiums', esc(num(record.podium_finishes))) +
    recordCell('Best place', esc(best)) +
    '</dl>' +
    '<dl class="stats" style="grid-template-columns:repeat(2,1fr)">' +
    recordCell('Prize money', esc(money(record.prize_usd))) +
    recordCell('Other placements', esc(num(record.other_placements))) +
    '</dl>' +
    '<section class="section" aria-labelledby="entries-h"><h2 id="entries-h">Entries</h2>' +
    (sols.length === 0
      ? '<p class="status-line">No entries yet.</p>'
      : '<div class="scroll"><table class="ledger"><thead><tr>' +
        '<th scope="col">Bounty</th><th scope="col">Entry</th>' +
        '<th scope="col" class="num">Place</th><th scope="col" class="num">Prize</th>' +
        '<th scope="col" class="num">Entered</th>' +
        '</tr></thead><tbody>' +
        sols.map((s) => {
          const c = s.competition || {};
          return '<tr><td class="title-cell"><a href="#/bounty/' + esc(c.slug || '') + '">' +
            esc(c.title || c.slug || '—') + '</a></td>' +
            '<td>' + esc(s.title || 'Untitled entry') + '</td>' +
            '<td class="num">' + (s.placement === null || s.placement === undefined ? '—' : '#' + esc(num(s.placement))) + '</td>' +
            '<td class="num">' + (s.prize_usd ? esc(money(s.prize_usd)) : '—') + '</td>' +
            '<td class="num">' + esc(ago(s.entered_at)) + '</td></tr>';
        }).join('') +
        '</tbody></table></div>') +
    '</section></div>';

  // Swap the initials for the real picture when it loads; a failed load
  // simply keeps the initials. No inline handlers are used anywhere.
  const slot = document.getElementById('avatar-slot');
  const img = new Image();
  img.className = 'avatar';
  img.alt = name + "'s avatar";
  img.addEventListener('load', () => {
    if (slot) slot.replaceChildren(img);
  });
  img.src = profilePicture(p.handle);
}
