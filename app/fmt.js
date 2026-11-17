// Ledger's formatters: money, times, counts. Everything here is pure
// and safe to call from any view; nothing touches the network or the DOM
// except the countdown ticker, which rewrites [data-deadline] elements.

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const cents = Math.abs(n) >= 100 ? 0 : 2;
  return '$' + n.toLocaleString('en-US', {
    minimumFractionDigits: cents,
    maximumFractionDigits: cents,
  });
}

export function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

export function pct(micro) {
  const n = Number(micro);
  if (!Number.isFinite(n)) return '—';
  return (n / 10000).toFixed(1) + '%';
}

export function size(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n)) return '—';
  if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
  if (n >= 1024) return Math.round(n / 1024) + ' KB';
  return n + ' B';
}

export function dateOf(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ago(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return secs + 's ago';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return mins + 'm ago';
  const hours = Math.floor(mins / 60);
  if (hours < 48) return hours + 'h ago';
  const days = Math.floor(hours / 24);
  if (days < 30) return days + 'd ago';
  return dateOf(iso);
}

// "2d 4h", "4h 12m", "12m 05s", or "Ended" once the deadline passes.
// Seconds show only inside the last hour, so the board stays calm.
export function timeLeft(iso, now = Date.now()) {
  const ms = new Date(iso).getTime() - now;
  if (Number.isNaN(ms)) return '—';
  if (ms <= 0) return 'Ended';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return days + 'd ' + hours + 'h';
  if (hours > 0) return hours + 'h ' + String(minutes).padStart(2, '0') + 'm';
  if (minutes > 0) return minutes + 'm ' + String(seconds).padStart(2, '0') + 's';
  return seconds + 's';
}

// Rewrites every live countdown on the page. Called once a second.
export function tickCountdowns() {
  const now = Date.now();
  document.querySelectorAll('[data-deadline]').forEach((el) => {
    el.textContent = timeLeft(el.dataset.deadline, now);
  });
}

export function shortWallet(address) {
  const a = String(address || '');
  if (a.length <= 12) return a || '—';
  return a.slice(0, 4) + '…' + a.slice(-4);
}

export function initials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function isLive(comp, now = Date.now()) {
  return comp && comp.status === 'open' && new Date(comp.deadline).getTime() > now;
}

export function feeLabel(comp) {
  const fee = comp && comp.entryFeeUsd;
  if (fee === null || fee === undefined || fee === '') return 'Free';
  return money(fee);
}

export function firstPlace(comp) {
  const now = comp && comp.rewardsNow;
  if (Array.isArray(now) && now.length > 0) return money(now[0].amountUsd);
  const base = comp && comp.rewards;
  if (base && base['1'] !== undefined) return money(base['1']);
  return '—';
}
