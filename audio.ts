/* ========================================================================
   ЗВУКИ через Web Audio API — усиленные, атмосферные
   ======================================================================== */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch { return null; }
  }
  return audioCtx;
}

function resumeCtx() {
  const ctx = getCtx();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

// Правильный ответ — яркий, праздничный "дзынь-дзынь"
export function playCorrect(): void {
  const ctx = getCtx();
  if (!ctx) return;
  resumeCtx();
  const now = ctx.currentTime;
  
  // Три ноты — как колокольчики
  [880, 1108.73, 1318.51].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.08);
    gain.gain.setValueAtTime(0, now + i * 0.08);
    gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.45);
  });
}

// Неправильный ответ — низкий, мягкий "бум"
export function playWrong(): void {
  const ctx = getCtx();
  if (!ctx) return;
  resumeCtx();
  const now = ctx.currentTime;
  
  // Две низкие ноты
  [220, 165].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + i * 0.1);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + i * 0.1 + 0.25);
    gain.gain.setValueAtTime(0.22, now + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.35);
  });
}

// Клик — тихий, приятный
export function playTap(): void {
  const ctx = getCtx();
  if (!ctx) return;
  resumeCtx();
  const now = ctx.currentTime;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.03);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

// Новый уровень mastery — праздничный аккорд
export function playMastery(): void {
  const ctx = getCtx();
  if (!ctx) return;
  resumeCtx();
  const now = ctx.currentTime;
  
  // Мажорный аккорд
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.05);
    gain.gain.setValueAtTime(0, now + i * 0.05);
    gain.gain.linearRampToValueAtTime(0.18, now + i * 0.05 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.05);
    osc.stop(now + i * 0.05 + 0.65);
  });
}

/* ========================================================================
   TTS — произношение слов через Web Speech API
   ======================================================================== */

let voicesCache: SpeechSynthesisVoice[] | null = null;

function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  if (voicesCache) return voicesCache;
  voicesCache = window.speechSynthesis.getVoices();
  return voicesCache || [];
}

export function preloadVoices(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  voicesCache = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    voicesCache = window.speechSynthesis.getVoices();
  };
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = getVoices();
  if (!voices.length) return null;
  const langPrefix = lang.split('-')[0].toLowerCase();
  const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
  if (!langVoices.length) return null;
  const natural = langVoices.find(v => /enhanced|natural|premium|neural/i.test(v.name));
  if (natural) return natural;
  const local = langVoices.find(v => v.localService);
  return local || langVoices[0];
}

export function speak(text: string, lang: 'en' | 'ru' = 'en'): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'en' ? 'en-US' : 'ru-RU';
    u.rate = 0.85;
    u.pitch = 1.0;
    u.volume = 1.0;
    const voice = pickVoice(u.lang);
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  } catch {
    // ignore
  }
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
}
