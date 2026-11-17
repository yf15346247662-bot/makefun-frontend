// Ledger's data layer: read-only GETs against make.fun's public API.
// Answers are cached in memory with their ETag; a stale copy is served
// at once and revalidated behind the reader, then the views are told.

const ORIGIN = 'https://make.fun';
const API = ORIGIN + '/api';
const FRESH_MS = 60 * 1000;

const store = new Map(); // path -> { etag, data, at }
const listeners = new Set();

export function onRefresh(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function tell(path) {
  for (const fn of listeners) fn(path);
}

async function fetchJson(path, signal) {
  const hit = store.get(path);
  const headers = { Accept: 'application/json' };
  if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
  const res = await fetch(API + path, { headers, signal });
  if (res.status === 304 && hit) {
    hit.at = Date.now();
    return hit.data;
  }
  if (!res.ok) {
    const err = new Error('make.fun answered ' + res.status + ' for ' + path);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const before = hit ? JSON.stringify(hit.data) : null;
  store.set(path, { etag: res.headers.get('etag'), data, at: Date.now() });
  if (before !== null && before !== JSON.stringify(data)) tell(path);
  return data;
}

// Read a path. A copy younger than a minute is returned as-is. An older
// copy is returned at once and refreshed in the background; the views
// re-render when the refresh actually changes something.
export async function get(path, opts = {}) {
  const hit = store.get(path);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.data;
  if (hit && !opts.background) {
    fetchJson(path).catch(() => {});
    return hit.data;
  }
  return fetchJson(path, opts.signal);
}

export function listCompetitions() {
  return get('/competitions').then((d) => (Array.isArray(d) ? d : d.items || []));
}

export function getCompetition(slug) {
  return get('/competitions/' + encodeURIComponent(slug));
}

export function listSubmissions(slug, limit = 10) {
  return get('/competitions/' + encodeURIComponent(slug) + '/submissions?limit=' + limit)
    .then((d) => d.items || []);
}

export function getLeaderboard(slug, view = 'performance') {
  return get('/competitions/' + encodeURIComponent(slug) + '/leaderboard?view=' + encodeURIComponent(view));
}

export function getProfile(handle) {
  return get('/profiles/' + encodeURIComponent(handle));
}

export function avatarUrl(path) {
  return path ? ORIGIN + path : null;
}

export function profilePicture(handle) {
  return API + '/profiles/' + encodeURIComponent(handle) + '/picture.png';
}

export function bountyUrl(slug) {
  return ORIGIN + '/bounty/' + slug;
}
