// trip-app.js — state + interactivity for the Singapore postcard journal.
// State is persisted in localStorage under a single key. Anyone with the
// file open can tick activities, scribble notes, mark bookings paid.

(() => {
  const KEY = 'sg2026_trip_state_v1';
  const TRIP_START_ISO = '2026-05-29';
  const TRIP_END_ISO   = '2026-06-04';

  // ── State ────────────────────────────────────────────────
  const empty = () => ({ done:{}, bookings:{}, packing:{}, paid:{}, journals:{}, faked:null });
  let state;
  try { state = Object.assign(empty(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch(e){ state = empty(); }
  for (const k of ['done','bookings','packing','paid','journals']) state[k] ||= {};

  const save = () => localStorage.setItem(KEY, JSON.stringify(state));

  // ── Dates ────────────────────────────────────────────────
  const ymd = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = () => state.faked ? ymd(new Date(state.faked)) : ymd(new Date());
  const dayDate = (n) => {
    const d = new Date(TRIP_START_ISO);
    d.setDate(d.getDate() + (n - 1));
    return ymd(d);
  };
  const tripStart = () => ymd(new Date(TRIP_START_ISO));
  const tripEnd   = () => ymd(new Date(TRIP_END_ISO));

  const dayStatus = (n) => {
    const t = today().getTime();
    const d = dayDate(n).getTime();
    if (d < t) return 'past';
    if (d === t) return 'today';
    return 'upcoming';
  };

  const countdown = () => {
    const t = today().getTime();
    const s = tripStart().getTime();
    const e = tripEnd().getTime();
    const DAY = 86400000;
    if (t < s) return { phase:'pre', daysToGo: Math.round((s-t)/DAY) };
    if (t > e) return { phase:'post', daysSince: Math.round((t-e)/DAY) };
    return { phase:'during', dayN: Math.round((t-s)/DAY) + 1, of: 7 };
  };

  // ── Toggle / read ────────────────────────────────────────
  const toggle = (group, id) => {
    if (!state[group]) state[group] = {};
    state[group][id] = !state[group][id];
    if (!state[group][id]) delete state[group][id];
    save();
    emit();
  };
  const isDone = (group, id) => !!(state[group] && state[group][id]);

  const setJournal = (n, text) => {
    if (text && text.trim()) state.journals[n] = text;
    else delete state.journals[n];
    save();
  };
  const getJournal = (n) => state.journals[n] || '';

  const setFakedDate = (iso) => { state.faked = iso || null; save(); emit(); };
  const getFakedDate = () => state.faked;

  const resetAll = () => {
    if (!confirm('Clear every tick, note, and paid mark? This cannot be undone.')) return;
    state = empty();
    save();
    emit();
  };

  // ── Events ───────────────────────────────────────────────
  const listeners = new Set();
  const emit = () => listeners.forEach(fn => { try { fn(); } catch(e){} });
  const on = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

  // ── Progress counts ──────────────────────────────────────
  const tripStats = () => {
    const T = window.TRIP;
    let total = 0, done = 0;
    T.days.forEach(d => {
      d.blocks.forEach((_, idx) => {
        total++;
        if (isDone('done', `d${d.n}-${idx}`)) done++;
      });
    });
    const pack = { total: T.pack.length, done: T.pack.filter((_,i)=>isDone('packing', `pk-${i}`)).length };
    const book = { total: T.bookings.length, done: T.bookings.filter((_,i)=>isDone('bookings', `bk-${i}`)).length };
    return { stops:{total, done}, pack, book };
  };

  const dayStats = (n) => {
    const T = window.TRIP;
    const day = T.days.find(d => d.n === n);
    const total = day.blocks.length;
    const done = day.blocks.filter((_,i)=>isDone('done', `d${n}-${i}`)).length;
    return { total, done, pct: total ? Math.round(done/total*100) : 0 };
  };

  window.TripApp = {
    toggle, isDone,
    setJournal, getJournal,
    dayStatus, dayDate, countdown, tripStats, dayStats,
    setFakedDate, getFakedDate, today,
    resetAll, on, state,
  };
})();
