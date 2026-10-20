// 聲音的優先順序：家長的錄音 → audio/ 資料夾的音檔 → 裝置內建的台灣中文語音合成
import { AUDIO_FILES, SYMBOLS, TONE_MARKS } from './data.js';
import * as recordings from './recordings.js';

const available = new Set(AUDIO_FILES);
let voice = null;
let current = null;

function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices();
  voice =
    voices.find((v) => v.lang === 'zh-TW') ||
    voices.find((v) => /zh[-_]TW/i.test(v.lang)) ||
    voices.find((v) => /^zh/i.test(v.lang)) ||
    null;
}

if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

// iOS 規定要在使用者點擊時先發出一次聲音，之後才能自由播放
export function unlockAudio() {
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  }
  const a = new Audio();
  a.play?.().catch(() => {});
}

export function stop() {
  if (current) {
    current.pause();
    current = null;
  }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

function speak(text, rate = 0.8) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-TW';
    if (voice) u.voice = voice;
    u.rate = rate;
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    u.onend = finish;
    u.onerror = finish;
    // 有些瀏覽器不會觸發 onend，保險起見設定逾時
    setTimeout(finish, 600 + text.length * 450);
    speechSynthesis.speak(u);
  });
}

export function playUrl(src) {
  stop();
  return new Promise((resolve) => {
    const a = new Audio(src);
    current = a;
    a.onended = resolve;
    a.onerror = resolve;
    a.play().catch(resolve);
  });
}

async function play(fileName, text, rate) {
  stop();
  const recorded = recordings.urlFor(fileName);
  if (recorded) return playUrl(recorded);
  if (available.has(fileName)) return playUrl(`audio/${fileName}.mp3`);
  return speak(text, rate);
}

export const symbolKey = (sym) => `sym-${SYMBOLS[sym].id}`;
export const syllableKey = (syl, tone) =>
  `syl-${SYMBOLS[syl.initial].id}${SYMBOLS[syl.final].id}${tone + 1}`;

export const hasBuiltin = (key) => available.has(key);

// 試聽用：照正常的優先順序播放
export const playKey = (key, fallbackText) => play(key, fallbackText, 0.7);

export function playSymbol(sym) {
  return play(symbolKey(sym), SYMBOLS[sym].say, 0.7);
}

export function playSyllable(syl, tone) {
  return play(syllableKey(syl, tone), syl.tones[tone], 0.7);
}

export function syllableText(syl, tone) {
  return syl.initial + syl.final + TONE_MARKS[tone];
}

// 潾潾說話
export function say(text) {
  stop();
  return speak(text, 0.95);
}
