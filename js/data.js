// 學習內容資料。新增關卡時，在 LEVELS 加一筆，並在 SYMBOLS / SYLLABLES 補上內容即可。

// say：給語音合成唸的字（沒有音檔時使用）
// id：音檔檔名，例如 audio/sym-b.mp3
export const SYMBOLS = {
  'ㄅ': { id: 'b', kind: 'initial', say: '玻', word: '爸爸', emoji: '👨' },
  'ㄆ': { id: 'p', kind: 'initial', say: '坡', word: '葡萄', emoji: '🍇' },
  'ㄇ': { id: 'm', kind: 'initial', say: '摸', word: '貓咪', emoji: '🐱' },
  'ㄈ': { id: 'f', kind: 'initial', say: '佛', word: '飛機', emoji: '✈️' },
  'ㄚ': { id: 'a', kind: 'final', say: '啊', word: '阿公', emoji: '👴' },
  'ㄛ': { id: 'o', kind: 'final', say: '喔', word: '公雞喔喔叫', emoji: '🐓' },
  'ㄜ': { id: 'e', kind: 'final', say: '鵝', word: '大白鵝', emoji: '🦢' },
  'ㄝ': { id: 'eh', kind: 'final', say: '欸', word: '欸，你好', emoji: '🙋' },
};

// 兩拼音節：四個聲調各自對應的字，null 表示沒有常用字
// 音檔檔名：audio/syl-<聲母id><韻母id><聲調>.mp3，例如 audio/syl-ba1.mp3
export const SYLLABLES = [
  { initial: 'ㄅ', final: 'ㄚ', tones: ['八', '拔', '把', '爸'] },
  { initial: 'ㄆ', final: 'ㄚ', tones: ['趴', '爬', null, '怕'] },
  { initial: 'ㄇ', final: 'ㄚ', tones: ['媽', '麻', '馬', '罵'] },
  { initial: 'ㄈ', final: 'ㄚ', tones: ['發', '罰', '法', null] },
  { initial: 'ㄅ', final: 'ㄛ', tones: ['波', '伯', '跛', null] },
  { initial: 'ㄆ', final: 'ㄛ', tones: ['坡', '婆', '叵', '破'] },
  { initial: 'ㄇ', final: 'ㄛ', tones: ['摸', '模', '抹', '墨'] },
  { initial: 'ㄈ', final: 'ㄛ', tones: [null, '佛', null, null] },
];

export const TONE_MARKS = ['', 'ˊ', 'ˇ', 'ˋ'];
export const TONE_NAMES = ['一聲', '二聲', '三聲', '四聲'];

export const LEVELS = [
  {
    id: 'L1',
    title: '第一關',
    symbols: ['ㄅ', 'ㄆ', 'ㄇ', 'ㄈ', 'ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'],
  },
];

// 已放進 audio/ 資料夾的音檔（不含副檔名）。放了新檔案就加進來。
// 目前的檔案由離線語音模型生成，見 audio/README.md
export const AUDIO_FILES = [
  'syl-ba1',
  'syl-ba4',
  'syl-bo1',
  'syl-bo2',
  'syl-fa1',
  'syl-fa3',
  'syl-ma1',
  'syl-ma2',
  'syl-ma3',
  'syl-ma4',
  'syl-mo1',
  'syl-mo2',
  'syl-pa2',
  'syl-pa4',
  'syl-po1',
  'syl-po2',
  'syl-po4',
  'sym-a',
  'sym-b',
  'sym-e',
  'sym-m',
  'sym-o',
  'sym-p',
];

export const AVATARS = ['🐣', '🐰', '🐼', '🦊', '🐸', '🐯', '🐨', '🦁'];

export const STICKERS = [
  '🌟', '🍎', '🎈', '🦋', '🌈', '🍓', '🚀', '🐳', '🌻', '🍦',
  '🎁', '🦄', '🍩', '⚽', '🐞', '🌙', '🍉', '🚂', '🐙', '🎨',
];
