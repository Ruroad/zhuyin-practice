// 聲音：有音檔就播音檔，沒有就用裝置內建的台灣中文語音合成
import { AUDIO_FILES, SYMBOLS, TONE_MARKS } from './data.js';

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

function playFile(name) {
  return new Promise((resolve) => {
    const a = new Audio(`audio/${name}.mp3`);
    current = a;
    a.onended = resolve;
    a.onerror = resolve;
    a.play().catch(resolve);
  });
}

async function play(fileName, text, rate) {
  stop();
  if (available.has(fileName)) return playFile(fileName);
  return speak(text, rate);
}

export function playSymbol(sym) {
  const s = SYMBOLS[sym];
  return play(`sym-${s.id}`, s.say, 0.7);
}

export function playSyllable(syl, tone) {
  const name = `syl-${SYMBOLS[syl.initial].id}${SYMBOLS[syl.final].id}${tone + 1}`;
  return play(name, syl.tones[tone], 0.7);
}

export function syllableText(syl, tone) {
  return syl.initial + syl.final + TONE_MARKS[tone];
}

// 潾潾說話
export function say(text) {
  stop();
  return speak(text, 0.95);
}
