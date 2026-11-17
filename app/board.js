// Ledger's board: the live bounty board as a dense table. Search, sort
// and category filters live in module state so a background refresh can
// re-render without losing what the reader typed.

import { listCompetitions } from './api.js';
import { esc, money, num, timeLeft, isLive, feeLabel, firstPlace } from './fmt.js';

const state = { q: '', cat: 'All', sort: 'pot', status: 'open' };
let items = [];

function livePot(c) {
  const n = Number(c.potUsd ?? c.rewardAmount);
  return Number.isFinite(n) ? n : 0;
}

function visible() {
  const q = state.q.trim().toLowerCase();
  let rows = items.filter((c) => {
    if (state.status === 'open' && !isLive(c)) return false;
    if (state.status === 'resolved' && isLive(c)) return false;
    if (state.cat !== 'All' && c.category !== state.cat) return false;
    if (!q) return true;
    const hay = [c.title, c.slug, c.category, c.summary || '', (c.skills || []).join(' ')]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
  const by = {
    pot: (a, b) => livePot(b) - livePot(a),
    deadline: (a, b) => new Date(a.deadline) - new Date(b.deadline),
    entries: (a, b) => (b.submissionCount || 0) - (a.submissionCount || 0),
    newest: (a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0),
    title: (a, b) => String(a.title).localeCompare(String(b.title)),
  };
  rows = rows.slice().sort(by[state.sort] || by.pot);
  return rows;
}

function row(c) {
  const live = isLive(c);
  const skills = (c.skills || []).slice(0, 3).join(' · ');
  return (
    '<tr>' +
    '<td class="title-cell"><a href="#/bounty/' + esc(c.slug) + '">' + esc(c.title) + '</a>' +
    '<span class="sub">' + esc(c.category || '') +
    (skills ? ' · ' + esc(skills) : '') + '</span></td>' +
    '<td class="num pot">' + money(livePot(c)) + '</td>' +
    '<td class="num">' + firstPlace(c) + '</td>' +
    '<td class="num">' + esc(feeLabel(c)) + '</td>' +
    '<td class="num"><span data-deadline="' + esc(c.deadline) + '">' + esc(timeLeft(c.deadline)) + '</span></td>' +
    '<td class="num">' + num(c.submissionCount) + '</td>' +
    '<td>' + (live
      ? '<span class="chip chip-live">Open</span>'
      : '<span class="chip">Closed</span>') + '</td>' +
    '</tr>'
  );
}

export async function renderBoard(root) {
  if (items.length === 0) items = await listCompetitions();
  const cats = ['All'].concat([...new Set(items.map((c) => c.category).filter(Boolean))].sort());
  const rows = visible();
  const totalPot = rows.reduce((sum, c) => sum + livePot(c), 0);
  const openCount = items.filter((c) => isLive(c)).length;
  const hadFocus = document.activeElement && document.activeElement.id === 'board-q';
  const caret = hadFocus ? document.activeElement.selectionStart : 0;

  root.innerHTML =
    '<div class="wrap">' +
    '<div class="page-head"><p class="kicker">make.fun · live</p>' +
    '<h1>The bounty board</h1>' +
    '<p>' + num(openCount) + ' open bounties, ' + money(totalPot) +
    ' in live pots across the rows below. Pots, fees and clocks are read live from make.fun.</p></div>' +
    '<div class="toolbar" role="search">' +
    '<label class="visually-hidden" for="board-q">Search bounties</label>' +
    '<input type="search" id="board-q" placeholder="Search title, skill, category…" value="' + esc(state.q) + '" autocomplete="off">' +
    '<select id="board-cat" aria-label="Category">' +
    cats.map((c) => '<option value="' + esc(c) + '"' + (c === state.cat ? ' selected' : '') + '>' + esc(c) + '</option>').join('') +
    '</select>' +
    '<select id="board-sort" aria-label="Sort by">' +
    '<option value="pot"' + (state.sort === 'pot' ? ' selected' : '') + '>Biggest pot</option>' +
    '<option value="deadline"' + (state.sort === 'deadline' ? ' selected' : '') + '>Ending soonest</option>' +
    '<option value="entries"' + (state.sort === 'entries' ? ' selected' : '') + '>Most entries</option>' +
    '<option value="newest"' + (state.sort === 'newest' ? ' selected' : '') + '>Newest first</option>' +
    '<option value="title"' + (state.sort === 'title' ? ' selected' : '') + '>Title A–Z</option>' +
    '</select>' +
    '<select id="board-status" aria-label="Show">' +
    '<option value="open"' + (state.status === 'open' ? ' selected' : '') + '>Open only</option>' +
    '<option value="all"' + (state.status === 'all' ? ' selected' : '') + '>Open and closed</option>' +
    '<option value="resolved"' + (state.status === 'resolved' ? ' selected' : '') + '>Closed only</option>' +
    '</select>' +
    '<span class="count" role="status">' + num(rows.length) + ' shown</span>' +
    '</div>' +
    '<div class="scroll"><table class="ledger">' +
    '<caption>' + (rows.length === 0 ? 'No bounties match those filters.' : '') + '</caption>' +
    '<thead><tr><th scope="col">Bounty</th><th scope="col" class="num">Live pot</th>' +
    '<th scope="col" class="num">1st now</th><th scope="col" class="num">Fee</th>' +
    '<th scope="col" class="num">Ends in</th><th scope="col" class="num">Entries</th>' +
    '<th scope="col">Status</th></tr></thead>' +
    '<tbody>' + rows.map(row).join('') + '</tbody>' +
    '</table></div></div>';

  const q = document.getElementById('board-q');
  const cat = document.getElementById('board-cat');
  const sort = document.getElementById('board-sort');
  const status = document.getElementById('board-status');
  if (q) q.addEventListener('input', () => { state.q = q.value; renderBoard(root); });
  if (cat) cat.addEventListener('change', () => { state.cat = cat.value; renderBoard(root); });
  if (sort) sort.addEventListener('change', () => { state.sort = sort.value; renderBoard(root); });
  if (status) status.addEventListener('change', () => { state.status = status.value; renderBoard(root); });
  if (hadFocus && q) {
    q.focus();
    try { q.setSelectionRange(caret, caret); } catch (_) { /* caret restore is best-effort */ }
  }
}
