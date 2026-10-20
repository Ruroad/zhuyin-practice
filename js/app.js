import { SYMBOLS, SYLLABLES, TONE_MARKS, TONE_NAMES, LEVELS, AVATARS, STICKERS } from './data.js';
import {
  unlockAudio, playSymbol, playSyllable, syllableText, say, stop,
  playUrl, playKey, hasBuiltin, symbolKey, syllableKey,
} from './audio.js';
import * as store from './store.js';
import * as recordings from './recordings.js';
import { LINLIN_SVG } from './linlin.js';

const app = document.getElementById('app');
const level = LEVELS[0];
const initials = level.symbols.filter((s) => SYMBOLS[s].kind === 'initial');
const finals = level.symbols.filter((s) => SYMBOLS[s].kind === 'final');
const syllables = SYLLABLES.filter(
  (s) => level.symbols.includes(s.initial) && level.symbols.includes(s.final)
);

const ACTIVITIES = [
  { id: 'learn', icon: '👀', name: '認識', start: startLearn },
  { id: 'listen', icon: '👂', name: '聽一聽', start: startListen },
  { id: 'tone', icon: '🎵', name: '四聲', start: startTone },
  { id: 'spell', icon: '🧩', name: '拼一拼', start: startSpell },
];

let inActivity = false;
let timers = [];
// 每次換畫面就加一；非同步流程用它判斷畫面是否已經換掉
let screenId = 0;

// ---------- 小工具 ----------

const wait = (ms) =>
  new Promise((r) => {
    timers.push(setTimeout(r, ms));
  });

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const pickOthers = (pool, exclude, n) => shuffle(pool.filter((x) => x !== exclude)).slice(0, n);

function render(html, handlers = {}) {
  clearTimers();
  stop();
  screenId++;
  app.innerHTML = html;
  app.querySelectorAll('[data-act]').forEach((el) => {
    const [name, arg] = el.dataset.act.split(':');
    const fn = handlers[name];
    if (fn) el.addEventListener('click', (e) => fn(arg, el, e));
  });
}

function linlin(text = '', extraClass = '') {
  return `<div class="linlin ${extraClass}" id="linlin">
    ${LINLIN_SVG}
    <div class="bubble" id="bubble" ${text ? '' : 'hidden'}>${text}</div>
  </div>`;
}

// 潾潾說話並做表情：happy / sad / 不填
function linlinSay(text, mood = '') {
  const ll = document.getElementById('linlin');
  const bubble = document.getElementById('bubble');
  if (bubble) {
    bubble.hidden = false;
    bubble.textContent = text;
  }
  if (ll) {
    ll.classList.remove('happy', 'sad');
    void ll.offsetWidth;
    if (mood) ll.classList.add(mood);
  }
  return say(text);
}

function topBar(title) {
  const p = store.currentProfile();
  return `<header class="topbar">
    <button class="icon-btn" data-act="home" aria-label="回首頁">🏠</button>
    <div class="topbar-title">${title}</div>
    <div class="avatar-small">${p ? p.avatar : ''}</div>
  </header>`;
}

function progressDots(done, total) {
  let s = '';
  for (let i = 0; i < total; i++) s += `<span class="dot ${i < done ? 'on' : ''}"></span>`;
  return `<div class="dots">${s}</div>`;
}

// 練習中每 5 秒累計一次使用時間
setInterval(() => {
  if (inActivity && document.visibilityState === 'visible') store.addUsage(5000);
}, 5000);

// ---------- 開始畫面 & 選人 ----------

function showStart() {
  inActivity = false;
  render(
    `<main class="screen start">
      ${linlin()}
      <h1 class="title">潾潾學注音</h1>
      <button class="big-btn primary" data-act="go">▶ 開始</button>
    </main>`,
    {
      go: () => {
        unlockAudio();
        showProfiles();
      },
    }
  );
}

function showProfiles() {
  inActivity = false;
  const { profiles } = store.getState();
  const list = profiles
    .map(
      (p) => `<button class="profile-btn" data-act="pick:${p.id}">
        <span class="avatar">${p.avatar}</span><span class="pname">${p.name}</span>
      </button>`
    )
    .join('');
  render(
    `<main class="screen">
      <button class="parent-corner" data-act="parent">家長</button>
      ${linlin(profiles.length ? '你是誰呢？' : '哈囉！請爸爸媽媽幫你選一個頭像')}
      <div class="profiles">
        ${list}
        <button class="profile-btn add" data-act="add" aria-label="新增"><span class="avatar">＋</span></button>
      </div>
    </main>`,
    {
      pick: (id) => {
        store.selectProfile(id);
        showHome();
      },
      add: () => showAddProfile(),
      parent: () => showParentLock(),
    }
  );
  linlinSay(profiles.length ? '你是誰呢？' : '哈囉！我是潾潾小牛');
}

function showAddProfile() {
  let chosen = null;
  render(
    `<main class="screen">
      ${topBarSimple('選一個頭像', 'back')}
      <div class="avatar-grid">
        ${AVATARS.map((a) => `<button class="avatar-choice" data-act="choose:${a}">${a}</button>`).join('')}
      </div>
      <input id="pname" class="name-input" maxlength="8" placeholder="名字（可以不填）">
      <button class="big-btn primary" data-act="ok" disabled id="okbtn">好了</button>
    </main>`,
    {
      back: () => showProfiles(),
      choose: (a, el) => {
        chosen = a;
        app.querySelectorAll('.avatar-choice').forEach((b) => b.classList.remove('sel'));
        el.classList.add('sel');
        document.getElementById('okbtn').disabled = false;
      },
      ok: () => {
        if (!chosen) return;
        const p = store.addProfile(chosen, document.getElementById('pname').value.trim());
        store.selectProfile(p.id);
        showHome();
      },
    }
  );
}

function topBarSimple(title, backAct) {
  return `<header class="topbar">
    <button class="icon-btn" data-act="${backAct}" aria-label="返回">⬅️</button>
    <div class="topbar-title">${title}</div>
    <div class="avatar-small"></div>
  </header>`;
}

// ---------- 首頁 ----------

function showHome() {
  inActivity = false;
  const p = store.currentProfile();
  if (!p) return showProfiles();
  const cards = ACTIVITIES.map((a) => {
    const stars = p.stars[`${level.id}-${a.id}`] || 0;
    return `<button class="activity" data-act="start:${a.id}">
      <span class="act-icon">${a.icon}</span>
      <span class="act-name">${a.name}</span>
      <span class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>
    </button>`;
  }).join('');
  render(
    `<main class="screen home">
      <header class="topbar">
        <button class="avatar-btn" data-act="switch" aria-label="換人">${p.avatar}</button>
        <div class="topbar-title">${level.title}　<span class="level-syms">${level.symbols.join(' ')}</span></div>
        <button class="icon-btn" data-act="book" aria-label="貼紙本">📒</button>
      </header>
      <div class="home-body">
        ${linlin('今天要玩什麼呢？')}
        <div class="activities">${cards}</div>
      </div>
    </main>`,
    {
      switch: () => showProfiles(),
      book: () => showStickerBook(),
      start: (id) => {
        if (store.overLimit()) return showLimit();
        ACTIVITIES.find((a) => a.id === id).start();
      },
    }
  );
  linlinSay('今天要玩什麼呢？');
}

function showLimit() {
  inActivity = false;
  render(
    `<main class="screen start">
      ${linlin('今天練習完囉！明天再來找潾潾玩！', 'happy')}
      <button class="big-btn" data-act="out">👋 掰掰</button>
    </main>`,
    { out: () => showProfiles() }
  );
  linlinSay('今天練習完囉！明天再來找潾潾玩！', 'happy');
}

// ---------- 獎勵 ----------

async function finishActivity(activityId, firstTryCorrect, total) {
  inActivity = false;
  const ratio = total ? firstTryCorrect / total : 1;
  const stars = ratio >= 0.85 ? 3 : ratio >= 0.6 ? 2 : 1;
  store.finishSession(`${level.id}-${activityId}`, stars);
  const sticker = STICKERS[Math.floor(Math.random() * STICKERS.length)];
  store.addSticker(sticker);
  render(
    `<main class="screen start reward">
      <div class="reward-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <div class="sticker-pop">${sticker}</div>
      ${linlin('你好棒！送你一張貼紙！', 'happy')}
      <button class="big-btn primary" data-act="next">好耶！</button>
    </main>`,
    { next: () => (store.overLimit() ? showLimit() : showHome()) }
  );
  linlinSay('你好棒！送你一張貼紙！', 'happy');
}

function showStickerBook() {
  const p = store.currentProfile();
  const counts = {};
  p.stickers.forEach((s) => (counts[s] = (counts[s] || 0) + 1));
  const cells = STICKERS.map(
    (s) => `<div class="sticker-cell ${counts[s] ? 'got' : ''}">
      ${counts[s] ? s : '？'}${counts[s] > 1 ? `<span class="count">×${counts[s]}</span>` : ''}
    </div>`
  ).join('');
  render(
    `<main class="screen">
      ${topBar('我的貼紙本')}
      <div class="sticker-grid">${cells}</div>
    </main>`,
    { home: () => showHome() }
  );
}

// ---------- 題型 1：認識 ----------

function startLearn() {
  inActivity = true;
  const seen = new Set();
  render(
    `<main class="screen">
      ${topBar('認識注音')}
      <div class="learn-body">
        <div class="learn-grid">
          ${level.symbols.map((s) => `<button class="sym-tile" data-act="tap:${s}">${s}</button>`).join('')}
        </div>
        <div class="learn-card" id="card">
          ${linlin('點一個注音符號，聽聽看！')}
        </div>
      </div>
    </main>`,
    {
      home: () => showHome(),
      tap: async (sym, el) => {
        const info = SYMBOLS[sym];
        el.classList.add('seen');
        seen.add(sym);
        document.getElementById('card').innerHTML = `
          <div class="card-sym">${sym}</div>
          <div class="card-emoji">${info.emoji}</div>
          <div class="card-word">${info.word}</div>
          <button class="icon-btn big" id="again" aria-label="再聽一次">🔊</button>`;
        const playIt = async () => {
          await playSymbol(sym);
          await wait(300);
          await say(info.word);
        };
        document.getElementById('again').onclick = playIt;
        const me = screenId;
        await playIt();
        if (seen.size === level.symbols.length && me === screenId) {
          await wait(800);
          if (me === screenId) finishActivity('learn', 1, 1);
        }
      },
    }
  );
  linlinSay('點一個注音符號，聽聽看！');
}

// ---------- 選擇題引擎（聽一聽、四聲共用） ----------

// q = { key, play(), board, options: [{ id, html }], answer }
async function runChoiceQuiz({ activityId, title, rounds, makeQuestion }) {
  inActivity = true;
  let round = 0;
  let firstTry = 0;

  const next = () => {
    if (round >= rounds) return finishActivity(activityId, firstTry, rounds);
    const q = makeQuestion();
    let attempts = 0;
    let locked = false;
    let me = -1;
    const advance = () => {
      if (me !== screenId) return; // 已經離開這個畫面
      round++;
      next();
    };

    render(
      `<main class="screen">
        ${topBar(title)}
        ${progressDots(round, rounds)}
        <div class="quiz-body">
          <div class="quiz-left">
            ${linlin()}
            <button class="icon-btn big" data-act="replay" aria-label="再聽一次">🔊</button>
          </div>
          <div class="quiz-right">
            ${q.board || ''}
            <div class="options">
              ${q.options.map((o) => `<button class="option" data-act="pick:${o.id}">${o.html}</button>`).join('')}
            </div>
          </div>
        </div>
      </main>`,
      {
        home: () => showHome(),
        replay: () => q.play(),
        pick: async (id, el) => {
          if (locked || el.disabled) return;
          if (id === q.answer) {
            locked = true;
            el.classList.add('correct');
            store.record(q.key, attempts === 0);
            if (attempts === 0) firstTry++;
            await linlinSay(pickPraise(), 'happy');
            await wait(400);
            advance();
            return;
          }
          attempts++;
          el.disabled = true;
          el.classList.add('wrong');
          if (attempts === 1) {
            locked = true;
            await linlinSay('沒關係，再聽一次喔！', 'sad');
            await q.play();
            locked = false;
          } else {
            locked = true;
            store.record(q.key, false);
            const right = app.querySelector(`[data-act="pick:${q.answer}"]`);
            right.classList.add('hint');
            await linlinSay('答案是這個喔！', 'sad');
            await q.play();
            await wait(1200);
            advance();
          }
        },
      }
    );
    me = screenId;
    wait(300).then(() => q.play());
  };
  next();
}

const PRAISES = ['答對了！', '好棒喔！', '你真厲害！', '太好了！', '哇，答對了！'];
const pickPraise = () => PRAISES[Math.floor(Math.random() * PRAISES.length)];

// ---------- 題型 2：聽音選符號 ----------

function startListen() {
  runChoiceQuiz({
    activityId: 'listen',
    title: '聽一聽，是哪一個？',
    rounds: 8,
    makeQuestion: () => {
      const target = store.weightedPick(level.symbols, (s) => `sym:${s}`);
      const opts = shuffle([target, ...pickOthers(level.symbols, target, 2)]);
      return {
        key: `sym:${target}`,
        answer: target,
        play: () => playSymbol(target),
        options: opts.map((s) => ({ id: s, html: `<span class="opt-sym">${s}</span>` })),
      };
    },
  });
}

// ---------- 題型 3：聽四聲 ----------

const TONE_GESTURE = ['➡️', '↗️', '↘️↗️', '↘️'];
const TONE_DRAW = ['ˉ', 'ˊ', 'ˇ', 'ˋ'];

function toneItems() {
  const items = [];
  syllables.forEach((syl) => {
    syl.tones.forEach((ch, t) => {
      if (ch) items.push({ syl, t });
    });
  });
  // 只有一個聲調的音節（例如ㄈㄛ）不適合練四聲
  return items.filter((it) => it.syl.tones.filter(Boolean).length > 1);
}

function startTone() {
  const items = toneItems();
  runChoiceQuiz({
    activityId: 'tone',
    title: '聽一聽，第幾聲？',
    rounds: 6,
    makeQuestion: () => {
      const it = store.weightedPick(items, (x) => `tone:${x.syl.initial}${x.syl.final}:${x.t}`);
      return {
        key: `tone:${it.syl.initial}${it.syl.final}:${it.t}`,
        answer: String(it.t),
        play: () => playSyllable(it.syl, it.t),
        board: `<div class="tone-board">${it.syl.initial}${it.syl.final}<span class="tone-q">？</span></div>`,
        options: [0, 1, 2, 3].map((t) => ({
          id: String(t),
          html: `<span class="tone-mark">${TONE_DRAW[t]}</span>
                 <span class="tone-gesture">${TONE_GESTURE[t]}</span>
                 <span class="tone-name">${TONE_NAMES[t]}</span>`,
        })),
      };
    },
  });
}

// ---------- 題型 4：拼一拼 ----------

function startSpell() {
  inActivity = true;
  const rounds = 6;
  let round = 0;
  let firstTry = 0;

  const next = () => {
    if (round >= rounds) return finishActivity('spell', firstTry, rounds);
    const syl = store.weightedPick(syllables, (s) => `spell:${s.initial}${s.final}`);
    const tone = syl.tones[0] ? 0 : syl.tones.findIndex(Boolean);
    const key = `spell:${syl.initial}${syl.final}`;
    const slots = { initial: null, final: null };
    let attempts = 0;
    let locked = false;
    const play = () => playSyllable(syl, tone);
    let me = -1;
    const advance = () => {
      if (me !== screenId) return; // 已經離開這個畫面
      round++;
      next();
    };

    render(
      `<main class="screen">
        ${topBar('拼一拼')}
        ${progressDots(round, rounds)}
        <div class="quiz-body">
          <div class="quiz-left">
            ${linlin()}
            <button class="icon-btn big" data-act="replay" aria-label="再聽一次">🔊</button>
          </div>
          <div class="quiz-right">
            <div class="slots">
              <div class="slot" data-slot="initial" id="slot-initial"></div>
              <span class="plus">＋</span>
              <div class="slot" data-slot="final" id="slot-final"></div>
            </div>
            <div class="tile-row">${initials.map((s) => tileHtml(s)).join('')}</div>
            <div class="tile-row">${finals.map((s) => tileHtml(s)).join('')}</div>
          </div>
        </div>
      </main>`,
      {
        home: () => showHome(),
        replay: () => play(),
      }
    );

    const slotEl = (kind) => document.getElementById(`slot-${kind}`);

    const place = (sym) => {
      if (locked) return;
      const kind = SYMBOLS[sym].kind;
      slots[kind] = sym;
      slotEl(kind).textContent = sym;
      slotEl(kind).classList.add('filled');
      slotEl(kind).classList.remove('wrong');
      if (slots.initial && slots.final) check();
      else playSymbol(sym);
    };

    const clearSlot = (kind) => {
      slots[kind] = null;
      slotEl(kind).textContent = '';
      slotEl(kind).classList.remove('filled', 'wrong');
    };

    ['initial', 'final'].forEach((k) =>
      slotEl(k).addEventListener('click', () => !locked && clearSlot(k))
    );

    const check = async () => {
      locked = true;
      const made = SYLLABLES.find((s) => s.initial === slots.initial && s.final === slots.final);
      const madeTone = made ? (made.tones[tone] ? tone : made.tones.findIndex(Boolean)) : -1;
      if (made && madeTone >= 0) await playSyllable(made, madeTone);
      await wait(200);

      if (slots.initial === syl.initial && slots.final === syl.final) {
        store.record(key, attempts === 0);
        if (attempts === 0) firstTry++;
        slotEl('initial').classList.add('correct');
        slotEl('final').classList.add('correct');
        await linlinSay(`${pickPraise()}是 ${syl.tones[tone]} 的 ${syllableText(syl, tone)}`, 'happy');
        await wait(400);
        return advance();
      }

      attempts++;
      ['initial', 'final'].forEach((k) => {
        if (slots[k] !== syl[k]) slotEl(k).classList.add('wrong');
      });
      if (attempts === 1) {
        await linlinSay('不太對喔，再聽一次！', 'sad');
        ['initial', 'final'].forEach((k) => slots[k] !== syl[k] && clearSlot(k));
        await play();
        locked = false;
      } else {
        store.record(key, false);
        ['initial', 'final'].forEach((k) => {
          slotEl(k).textContent = syl[k];
          slotEl(k).classList.remove('wrong');
          slotEl(k).classList.add('hint', 'filled');
        });
        await linlinSay('答案是這樣拼喔！', 'sad');
        await play();
        await wait(1200);
        advance();
      }
    };

    me = screenId;
    app.querySelectorAll('.tile').forEach((t) => enableDrag(t, place));
    wait(300).then(play);
  };
  next();
}

function tileHtml(sym) {
  return `<div class="tile ${SYMBOLS[sym].kind}" data-sym="${sym}">${sym}</div>`;
}

// 拖曳磚塊到格子裡；移動很少時當成點一下
function enableDrag(tile, onPlace) {
  tile.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const sym = tile.dataset.sym;
    const startX = e.clientX;
    const startY = e.clientY;
    let ghost = null;

    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!ghost && Math.hypot(dx, dy) > 10) {
        ghost = tile.cloneNode(true);
        ghost.classList.add('ghost');
        document.body.appendChild(ghost);
      }
      if (ghost) {
        ghost.style.left = `${ev.clientX}px`;
        ghost.style.top = `${ev.clientY}px`;
      }
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!ghost) return onPlace(sym);
      ghost.remove();
      const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-slot]');
      if (target && target.dataset.slot === SYMBOLS[sym].kind) onPlace(sym);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  });
}

// ---------- 家長 ----------

function showParentLock() {
  inActivity = false;
  const a = 3 + Math.floor(Math.random() * 7);
  const b = 3 + Math.floor(Math.random() * 7);
  let input = '';
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, 'OK'];
  render(
    `<main class="screen">
      ${topBarSimple('家長專區', 'back')}
      <div class="lock">
        <p>請回答：</p>
        <div class="lock-q">${a} ＋ ${b} ＝ <span id="ans" class="lock-ans"></span></div>
        <div class="numpad">
          ${keys.map((k) => `<button class="num" data-act="key:${k}">${k}</button>`).join('')}
        </div>
      </div>
    </main>`,
    {
      back: () => showProfiles(),
      key: (k) => {
        const ans = document.getElementById('ans');
        if (k === '⌫') input = input.slice(0, -1);
        else if (k === 'OK') {
          if (Number(input) === a + b) return showParent();
          input = '';
          ans.classList.add('shake');
          setTimeout(() => ans.classList.remove('shake'), 400);
        } else if (input.length < 3) input += k;
        ans.textContent = input;
      },
    }
  );
}

function accuracy(stat) {
  if (!stat || stat.c + stat.w === 0) return null;
  return Math.round((stat.c / (stat.c + stat.w)) * 100);
}

function profileReport(p) {
  const symRows = level.symbols
    .map((s) => {
      const acc = accuracy(p.stats[`sym:${s}`]);
      const cls = acc === null ? 'na' : acc >= 80 ? 'good' : acc >= 50 ? 'mid' : 'bad';
      return `<div class="acc-cell ${cls}"><b>${s}</b><span>${acc === null ? '—' : acc + '%'}</span></div>`;
    })
    .join('');

  const toneStat = [0, 1, 2, 3].map((t) => {
    let c = 0;
    let w = 0;
    Object.entries(p.stats).forEach(([k, v]) => {
      if (k.startsWith('tone:') && k.endsWith(`:${t}`)) {
        c += v.c;
        w += v.w;
      }
    });
    const acc = accuracy({ c, w });
    return `<div class="acc-cell ${acc === null ? 'na' : acc >= 80 ? 'good' : acc >= 50 ? 'mid' : 'bad'}">
      <b>${TONE_NAMES[t]}</b><span>${acc === null ? '—' : acc + '%'}</span></div>`;
  });

  const missed = Object.entries(p.stats)
    .filter(([, v]) => v.w > 0)
    .sort((x, y) => y[1].w - y[1].c - (x[1].w - x[1].c))
    .slice(0, 5)
    .map(([k, v]) => `<li>${describeKey(k)}：錯 ${v.w} 次、對 ${v.c} 次</li>`)
    .join('');

  const usedMin = Math.round(store.usedMsToday(p) / 60000);
  return `<section class="report">
    <h3>${p.avatar} ${p.name || '（沒有名字）'}
      <button class="small-btn danger" data-act="del:${p.id}">刪除</button></h3>
    <p>今天練習了 ${usedMin} 分鐘 · 貼紙 ${p.stickers.length} 張</p>
    <h4>聽音選符號 答對率</h4>
    <div class="acc-grid">${symRows}</div>
    <h4>四聲 答對率</h4>
    <div class="acc-grid">${toneStat.join('')}</div>
    <h4>最常錯的</h4>
    ${missed ? `<ul>${missed}</ul>` : '<p class="muted">還沒有錯題紀錄</p>'}
  </section>`;
}

function describeKey(k) {
  const [type, a, b] = k.split(':');
  if (type === 'sym') return `符號 ${a}`;
  if (type === 'spell') return `拼音 ${a}`;
  if (type === 'tone') return `四聲 ${a}${TONE_MARKS[Number(b)]}（${TONE_NAMES[Number(b)]}）`;
  return k;
}

function showParent() {
  const st = store.getState();
  const limits = [10, 15, 20, 30, 45];
  render(
    `<main class="screen parent">
      ${topBarSimple('家長專區', 'back')}
      <div class="parent-body">
        <section class="report">
          <h3>每天練習時間上限</h3>
          <div class="limit-row">
            ${limits
              .map(
                (m) =>
                  `<button class="small-btn ${st.settings.dailyLimitMin === m ? 'sel' : ''}" data-act="limit:${m}">${m} 分鐘</button>`
              )
              .join('')}
          </div>
        </section>
        <section class="report">
          <h3>發音錄音</h3>
          <p class="muted">用你的聲音取代語音合成。已錄 ${recordings.count()} / ${recordItems().length} 個。</p>
          <div class="limit-row">
            <button class="small-btn" data-act="recs">🎙️ 錄音 / 上傳</button>
          </div>
        </section>
        ${st.profiles.map(profileReport).join('') || '<p class="muted">還沒有小朋友，回上一頁按＋新增</p>'}
        <section class="report">
          <h3>備份進度</h3>
          <p class="muted">進度和錄音只存在這台平板上。清除 Safari 資料前，請先匯出備份。</p>
          <div class="limit-row">
            <button class="small-btn" data-act="export">⬇️ 匯出</button>
            <button class="small-btn" data-act="import">⬆️ 匯入</button>
            <input type="file" id="importFile" accept="application/json,.json" hidden>
          </div>
        </section>
      </div>
    </main>`,
    {
      back: () => showProfiles(),
      recs: () => showRecordings(),
      limit: (m) => {
        store.setLimit(Number(m));
        showParent();
      },
      del: (id) => {
        const p = st.profiles.find((x) => x.id === id);
        if (confirm(`確定要刪除 ${p.avatar} ${p.name} 的所有紀錄嗎？`)) {
          store.removeProfile(id);
          showParent();
        }
      },
      export: async () => {
        const data = JSON.parse(store.exportData());
        data.recordings = await recordings.exportAll();
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `潾潾學注音-備份-${store.today()}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      },
      import: () => {
        const input = document.getElementById('importFile');
        input.onchange = async () => {
          const file = input.files[0];
          if (!file) return;
          try {
            const data = JSON.parse(await file.text());
            const recs = data.recordings;
            delete data.recordings;
            store.importData(JSON.stringify(data));
            await recordings.importAll(recs);
            alert('匯入成功！');
            showParent();
          } catch {
            alert('這個檔案看起來不是潾潾的備份檔');
          }
        };
        input.click();
      },
    }
  );
}

// ---------- 發音錄音 ----------

// 要錄的項目：這一關的符號，加上所有有字的兩拼音節
function recordItems() {
  const items = level.symbols.map((s) => ({
    key: symbolKey(s),
    label: s,
    hint: `像「${SYMBOLS[s].say}」`,
    fallback: SYMBOLS[s].say,
    group: '單一符號',
  }));
  syllables.forEach((syl) =>
    syl.tones.forEach((ch, t) => {
      if (!ch) return;
      items.push({
        key: syllableKey(syl, t),
        label: syllableText(syl, t),
        hint: `「${ch}」`,
        fallback: ch,
        group: '兩拼音節',
      });
    })
  );
  return items;
}

const MAX_RECORD_MS = 4000;

function showRecordings() {
  const items = recordItems();
  let recordingKey = null;
  let autoStop = null;
  const scrollY = window.scrollY;

  const row = (it) => {
    const has = recordings.has(it.key);
    const status = has ? '✅ 已錄' : hasBuiltin(it.key) ? '🔈 內建音檔' : '⚠️ 語音合成';
    return `<div class="rec-row ${has ? 'has' : hasBuiltin(it.key) ? 'builtin' : 'tts'}">
      <div class="rec-label"><b>${it.label}</b><span>${it.hint}</span></div>
      <span class="rec-status">${status}</span>
      <div class="rec-btns">
        <button class="small-btn rec-btn" data-act="rec:${it.key}">🎙️ 錄音</button>
        <button class="small-btn" data-act="upload:${it.key}">📁 上傳</button>
        <button class="small-btn" data-act="play:${it.key}" aria-label="試聽">▶️</button>
        ${has ? `<button class="small-btn danger" data-act="del:${it.key}" aria-label="刪除">🗑</button>` : ''}
      </div>
    </div>`;
  };

  const groups = [...new Set(items.map((i) => i.group))]
    .map(
      (g) => `<section class="report"><h3>${g}</h3>
        ${items.filter((i) => i.group === g).map(row).join('')}</section>`
    )
    .join('');

  render(
    `<main class="screen parent">
      ${topBarSimple('發音錄音', 'back')}
      <div class="parent-body">
        <section class="report">
          <p>每個音可以<b>直接錄音</b>（再按一次停止，最多 4 秒），或<b>上傳</b>已經錄好的檔案（例如語音備忘錄）。</p>
          <p class="muted">每個音只唸一次、唸清楚。你錄的聲音會優先使用；沒錄的會用「🔈 內建音檔」，沒有內建音檔的用「⚠️ 語音合成」（比較不準，建議優先錄這些）。</p>
          ${recordings.canRecord() ? '' : '<p class="warn">這個瀏覽器不支援錄音，請用「上傳」。</p>'}
        </section>
        ${groups}
      </div>
      <input type="file" id="audioFile" accept="audio/*,.m4a,.mp3,.wav,.aac" hidden>
    </main>`,
    {
      back: () => showParent(),
      play: (key) => playKey(key, items.find((i) => i.key === key).fallback),
      del: async (key) => {
        if (!confirm('確定要刪除這個錄音嗎？')) return;
        await recordings.remove(key);
        showRecordings();
      },
      upload: (key) => {
        const input = document.getElementById('audioFile');
        input.value = '';
        input.onchange = async () => {
          const file = input.files[0];
          if (!file) return;
          await recordings.save(key, file);
          showRecordings();
          playUrl(recordings.urlFor(key));
        };
        input.click();
      },
      rec: async (key, el) => {
        // 正在錄別的音時，先把那一個停下來
        if (recordingKey) return finishRecording();
        try {
          stop();
          await recordings.startRecording();
        } catch {
          alert('沒辦法使用麥克風。請到「設定 → Safari → 麥克風」允許使用，或改用上傳。');
          return;
        }
        recordingKey = key;
        el.classList.add('recording');
        el.textContent = '⏹ 停止';
        autoStop = setTimeout(finishRecording, MAX_RECORD_MS);
      },
    }
  );
  window.scrollTo(0, scrollY);

  async function finishRecording() {
    clearTimeout(autoStop);
    const key = recordingKey;
    const blob = await recordings.stopRecording();
    recordingKey = null;
    if (blob) {
      await recordings.save(key, blob);
      showRecordings();
      playUrl(recordings.urlFor(key));
    } else showRecordings();
  }
}

// ---------- 啟動 ----------

recordings.loadAll().finally(showStart);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
