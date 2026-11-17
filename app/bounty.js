// Ledger's bounty page: one bounty's live figures, its rewards table,
// its rules as real Markdown, and its latest entries. The Markdown is
// escaped first and only then turned into HTML by a small safe renderer.

import { getCompetition, listSubmissions, bountyUrl } from './api.js';
import { esc, money, num, timeLeft, dateOf, ago, isLive, feeLabel, firstPlace } from './fmt.js';

function inline(text) {
  return esc(text)
    .replace(/`([^`]+)`/g, (_, code) => '<code>' + code + '</code>')
    .replace(/\*\*([^*]+)\*\*/g, (_, bold) => '<strong>' + bold + '</strong>')
    .replace(/(^|\W)\*([^*\n]+)\*/g, (_, pre, it) => pre + '<em>' + it + '</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (_, label, href) =>
      '<a href="' + href + '" rel="noopener">' + label + '</a>');
}

// A small Markdown renderer: escape first, then structure. Fenced code,
// headings, lists, quotes, rules and paragraphs; nothing else runs.
export function md(source) {
  const lines = String(source || '').replace(/\r\n/g, '\n').split('\n');
  let out = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const buf = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) { buf.push(lines[i]); i += 1; }
      i += 1;
      out += '<pre><code>' + esc(buf.join('\n')) + '</code></pre>';
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length + 1;
      out += '<h' + level + '>' + inline(heading[2].trim()) + '</h' + level + '>';
      i += 1;
      continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { out += '<hr>'; i += 1; continue; }
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i += 1; }
      out += '<blockquote>' + buf.map((b) => '<p>' + inline(b) + '</p>').join('') + '</blockquote>';
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i += 1;
      }
      out += '<ul>' + buf.map((b) => '<li>' + inline(b) + '</li>').join('') + '</ul>';
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''));
        i += 1;
      }
      out += '<ol>' + buf.map((b) => '<li>' + inline(b) + '</li>').join('') + '</ol>';
      continue;
    }
    if (line.trim() === '') { i += 1; continue; }
    const para = [];
    while (i < lines.length && lines[i].trim() !== '') { para.push(lines[i]); i += 1; }
    out += '<p>' + inline(para.join(' ')) + '</p>';
  }
  return out;
}

function stat(label, value, accent) {
  return '<div class="stat"><dt>' + esc(label) + '</dt><dd' +
    (accent ? ' class="accent"' : '') + '>' + value + '</dd></div>';
}

export async function renderBounty(root, slug) {
  const [comp, entries] = await Promise.all([
    getCompetition(slug),
    listSubmissions(slug, 10).catch(() => []),
  ]);
  document.title = comp.title + ' — Ledger';
  const live = isLive(comp);
  const rewards = Array.isArray(comp.rewardsNow) ? comp.rewardsNow : [];
  const kit = comp.kit && comp.kit.url ? comp.kit.url : null;

  root.innerHTML =
    '<div class="wrap">' +
    '<div class="page-head"><p class="kicker">' + esc(comp.category || 'Bounty') + ' · make.fun</p>' +
    '<h1>' + esc(comp.title) + '</h1>' +
    '<p>' + esc(comp.summary || '') + '</p>' +
    '<p>' +
    (live ? '<span class="chip chip-live">Open</span>' : '<span class="chip">Closed</span>') +
    (comp.sponsor && comp.sponsor.name ? '<span class="chip">by ' + esc(comp.sponsor.name) + '</span>' : '') +
    (comp.skills || []).slice(0, 4).map((s) => '<span class="chip">' + esc(s) + '</span>').join('') +
    '</p></div>' +
    '<dl class="stats">' +
    stat('Live pot', esc(money(comp.potUsd ?? comp.rewardAmount)), true) +
    stat('Entry fee', esc(feeLabel(comp)), false) +
    stat('Ends in', '<span data-deadline="' + esc(comp.deadline) + '">' + esc(timeLeft(comp.deadline)) + '</span>', false) +
    stat('Entries', esc(num(comp.submissionCount)), false) +
    stat('1st now', esc(firstPlace(comp)), false) +
    '</dl>' +
    '<p class="status-line">Deadline ' + esc(dateOf(comp.deadline)) +
    ' · <a href="#/bounty/' + esc(comp.slug) + '/leaderboard">Leaderboard</a>' +
    ' · <a href="' + esc(bountyUrl(comp.slug)) + '">View on make.fun ↗</a>' +
    (kit ? ' · <a href="' + esc(kit) + '">Download the kit ↗</a>' : '') +
    '</p>' +
    (rewards.length > 0
      ? '<section class="section" aria-labelledby="rewards-h"><h2 id="rewards-h">Rewards</h2>' +
        '<div class="scroll"><table class="ledger"><thead><tr>' +
        '<th scope="col">Place</th><th scope="col" class="num">Prize</th>' +
        '<th scope="col" class="num">Fee share</th><th scope="col" class="num">Total now</th>' +
        '</tr></thead><tbody>' +
        rewards.map((r) =>
          '<tr><td class="rank">' + esc(String(r.place)) + '</td>' +
          '<td class="num">' + esc(money(r.baseUsd)) + '</td>' +
          '<td class="num">' + esc(money(r.feeShareUsd)) + '</td>' +
          '<td class="num pot">' + esc(money(r.amountUsd)) + '</td></tr>').join('') +
        '</tbody></table></div></section>'
      : '') +
    '<section class="section" aria-labelledby="rules-h"><h2 id="rules-h">Rules</h2>' +
    '<div class="rules">' + md(comp.description || comp.rules || '') + '</div></section>' +
    '<section class="section" aria-labelledby="entries-h"><h2 id="entries-h">Latest entries</h2>' +
    (entries.length === 0
      ? '<p class="status-line">No entries yet.</p>'
      : '<div class="scroll"><table class="ledger"><thead><tr>' +
        '<th scope="col">Entrant</th><th scope="col">Entry</th>' +
        '<th scope="col">Status</th><th scope="col" class="num">Entered</th>' +
        '</tr></thead><tbody>' +
        entries.map((e) =>
          '<tr><td><a href="#/u/' + esc(e.handle) + '">' + esc(e.handle) + '</a></td>' +
          '<td class="title-cell">' + esc(e.title || 'Untitled entry') + '</td>' +
          '<td>' + esc(e.status || '—') + '</td>' +
          '<td class="num">' + esc(ago(e.created_at)) + '</td></tr>').join('') +
        '</tbody></table></div>') +
    '</section></div>';
}
