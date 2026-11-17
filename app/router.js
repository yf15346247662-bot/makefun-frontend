// Ledger's router: hash routes, one per surface. On every navigation the
// view is rendered, the page title follows, and focus moves to the main
// region so keyboard and screen-reader users land on the new page.

import { renderBoard } from './board.js';
import { renderBounty } from './bounty.js';
import { renderLeaderboard, renderProfile } from './people.js';

const view = document.getElementById('view');
const navBoard = document.querySelector('[data-nav="board"]');

function parseHash() {
  const raw = (location.hash || '#/').replace(/^#/, '');
  const parts = raw.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'board' };
  if (parts[0] === 'bounty' && parts[1]) {
    if (parts[2] === 'leaderboard') return { name: 'leaderboard', slug: decodeURIComponent(parts[1]) };
    return { name: 'bounty', slug: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === 'u' && parts[1]) return { name: 'profile', handle: decodeURIComponent(parts[1]) };
  return { name: 'notfound', path: raw };
}

function loading(title) {
  view.innerHTML =
    '<div class="wrap"><p class="loading" role="status">Loading ' + title + '…</p></div>';
}

function failed(title, err) {
  const detail =
    err && err.status === 404
      ? 'make.fun has no page by that name.'
      : 'The live data did not come back. Check the connection and try again.';
  view.innerHTML =
    '<div class="wrap"><div class="error-box" role="alert">' +
    '<h2>' + title + '</h2><p>' + detail + '</p>' +
    '<p><button type="button" class="btn" id="retry">Try again</button> ' +
    '<a class="btn btn-quiet" href="#/">Back to the board</a></p>' +
    '</div></div>';
  const retry = document.getElementById('retry');
  if (retry) retry.addEventListener('click', () => route());
}

export async function route(opts = {}) {
  const r = parseHash();
  if (navBoard) {
    if (r.name === 'board') navBoard.setAttribute('aria-current', 'page');
    else navBoard.removeAttribute('aria-current');
  }
  if (view.childElementCount === 0) {
    loading(
      r.name === 'board'
        ? 'the board'
        : r.name === 'bounty'
          ? 'the bounty'
          : r.name === 'leaderboard'
            ? 'the leaderboard'
            : r.name === 'profile'
              ? 'the profile'
              : 'the page',
    );
  }
  try {
    if (r.name === 'board') {
      document.title = 'Ledger — the make.fun bounty board';
      await renderBoard(view);
    } else if (r.name === 'bounty') {
      await renderBounty(view, r.slug);
    } else if (r.name === 'leaderboard') {
      await renderLeaderboard(view, r.slug);
    } else if (r.name === 'profile') {
      await renderProfile(view, r.handle);
    } else {
      document.title = 'Not found — Ledger';
      view.innerHTML =
        '<div class="wrap"><div class="error-box" role="alert">' +
        '<h2>No such page</h2><p>Ledger has no page at <code>' +
        r.path.replace(/</g, '&lt;') +
        '</code>.</p><p><a class="btn" href="#/">Back to the board</a></p></div></div>';
    }
  } catch (err) {
    document.title = 'Could not load — Ledger';
    failed('Could not load this page', err);
  }
  if (!opts.keepFocus) {
    view.focus();
    window.scrollTo(0, 0);
  }
}

window.addEventListener('hashchange', () => route());
