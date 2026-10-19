// 學習進度：存在這台裝置的瀏覽器裡
const KEY = 'linlin-zhuyin-v1';

const empty = () => ({ profiles: [], settings: { dailyLimitMin: 15 }, currentId: null });

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...empty(), ...JSON.parse(raw) };
  } catch {}
  return empty();
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

export const getState = () => state;

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function currentProfile() {
  return state.profiles.find((p) => p.id === state.currentId) || null;
}

export function addProfile(avatar, name) {
  const p = {
    id: Date.now().toString(36),
    avatar,
    name: name || '',
    stats: {},
    stickers: [],
    stars: {},
    usage: { date: today(), ms: 0 },
  };
  state.profiles.push(p);
  save();
  return p;
}

export function removeProfile(id) {
  state.profiles = state.profiles.filter((p) => p.id !== id);
  if (state.currentId === id) state.currentId = null;
  save();
}

export function selectProfile(id) {
  state.currentId = id;
  save();
}

// 記錄某個項目（符號或音節）答對或答錯
export function record(key, correct) {
  const p = currentProfile();
  if (!p) return;
  const s = (p.stats[key] ||= { c: 0, w: 0 });
  correct ? s.c++ : s.w++;
  save();
}

// 間隔複習：常錯的出現機率高，已經很熟的出現機率低
export function weightOf(key) {
  const s = currentProfile()?.stats[key];
  if (!s) return 1.5;
  return (1 + s.w * 2) / (1 + s.c * 0.4);
}

export function weightedPick(items, keyFn) {
  const ws = items.map((it) => weightOf(keyFn(it)));
  let r = Math.random() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) {
    r -= ws[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function usedMsToday(p = currentProfile()) {
  if (!p) return 0;
  if (p.usage.date !== today()) p.usage = { date: today(), ms: 0 };
  return p.usage.ms;
}

export function addUsage(ms) {
  const p = currentProfile();
  if (!p) return;
  usedMsToday(p);
  p.usage.ms += ms;
  save();
}

export function overLimit() {
  return usedMsToday() >= state.settings.dailyLimitMin * 60 * 1000;
}

export function setLimit(min) {
  state.settings.dailyLimitMin = min;
  save();
}

export function finishSession(activityId, stars) {
  const p = currentProfile();
  if (!p) return null;
  p.stars[activityId] = Math.max(p.stars[activityId] || 0, stars);
  save();
  return p;
}

export function addSticker(sticker) {
  const p = currentProfile();
  if (!p) return;
  p.stickers.push(sticker);
  save();
}

export function exportData() {
  return JSON.stringify(state, null, 2);
}

export function importData(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data.profiles)) throw new Error('格式不對');
  state = { ...empty(), ...data };
  save();
}
