import { DATASET } from '../data/dataset';
import { FSRSState, createInitialFSRSState, isMastered } from '../utils/fsrs';
export type { FSRSState } from '../utils/fsrs';

const DB_NAME = 'nyenglish_v2';
const DB_VERSION = 2;
let db: IDBDatabase | null = null;

export interface WordRecord {
  id: string;
  english: string;
  russian: string;
  category: string;
  aliases: string[];
  context: string;
  createdAt: number;
  srs: {
    enToRu: FSRSState;
    ruToEn: FSRSState;
    context: FSRSState;
  };
}

export interface AttemptRecord {
  id?: number;
  wordId: string;
  mode: string;
  timestamp: number;
  correct: boolean;
  userAnswer: string;
  correctAnswer: string;
  responseTime: number;
  distance: number;
  sessionId: string;
}

export interface SessionRecord {
  id?: number;
  startTime: number;
  endTime: number;
  duration: number;
  attemptsCount: number;
  correct: number;
  incorrect: number;
  newWords: number;
  modes: Record<string, number>;
}

export interface DailyActivityRecord {
  date: string;
  count: number;
  correct: number;
  wrong: number;
  timestamp: number;
}

export interface UserStatsRecord {
  key: string;
  totalDuration: number;
  totalAttempts: number;
  totalSessions: number;
  mastered: number;
  currentStreak: number;
  maxStreak: number;
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = (e.target as IDBOpenDBRequest).result;
      const oldV = e.oldVersion;
      if (oldV < 1) {
        const ws = d.createObjectStore('words', { keyPath: 'id' });
        ws.createIndex('category', 'category', { unique: false });
        const at = d.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true });
        at.createIndex('byWord', 'wordId', { unique: false });
        at.createIndex('byTimestamp', 'timestamp', { unique: false });
        at.createIndex('bySession', 'sessionId', { unique: false });
        at.createIndex('byMode', 'mode', { unique: false });
        at.createIndex('wordMode', ['wordId', 'mode'], { unique: false });
        const ss = d.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
        ss.createIndex('byStart', 'startTime', { unique: false });
        const da = d.createObjectStore('dailyActivity', { keyPath: 'date' });
        da.createIndex('byDate', 'date', { unique: false });
        d.createObjectStore('userStats', { keyPath: 'key' });
        d.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('DB blocked'));
  });
}

function getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
  if (!db) throw new Error('DB not initialized');
  const t = db.transaction(storeName, mode);
  return t.objectStore(storeName);
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export async function idbGet(store: string, key: string): Promise<any> {
  return idbReq(getStore(store).get(key));
}

export async function idbGetAll(store: string): Promise<any[]> {
  return idbReq(getStore(store).getAll());
}

export async function idbPut(store: string, val: any): Promise<any> {
  return idbReq(getStore(store, 'readwrite').put(val));
}

export async function idbAdd(store: string, val: any): Promise<any> {
  return idbReq(getStore(store, 'readwrite').add(val));
}

export async function idbClear(store: string): Promise<void> {
  return idbReq(getStore(store, 'readwrite').clear());
}

export async function idbDelete(store: string, key: IDBValidKey): Promise<void> {
  return idbReq(getStore(store, 'readwrite').delete(key));
}

export async function idbGetAllByIndex(store: string, indexName: string, key: string): Promise<any[]> {
  const s = getStore(store);
  const idx = s.index(indexName);
  return idbReq(idx.getAll(key));
}

export async function seedDataset(): Promise<void> {
  const existing = await idbGetAll('words');
  if (existing.length >= DATASET.length) return;
  const map = new Map(existing.map((w: WordRecord) => [w.id, w]));
  for (const d of DATASET) {
    const cur = map.get(d.id);
    const base: WordRecord = cur ? { ...cur } : {
      id: d.id,
      english: d.english,
      russian: d.russian,
      category: d.category,
      aliases: d.aliases,
      context: d.context,
      createdAt: Date.now(),
      srs: { enToRu: createInitialFSRSState(), ruToEn: createInitialFSRSState(), context: createInitialFSRSState() }
    };
    // Убеждаемся что все режимы инициализированы
    if (!base.srs) {
      base.srs = { enToRu: createInitialFSRSState(), ruToEn: createInitialFSRSState(), context: createInitialFSRSState() };
    } else {
      // Проверяем каждый режим отдельно
      if (!base.srs.enToRu) base.srs.enToRu = createInitialFSRSState();
      if (!base.srs.ruToEn) base.srs.ruToEn = createInitialFSRSState();
      if (!base.srs.context) base.srs.context = createInitialFSRSState();
    }
    await idbPut('words', base);
  }
}

export async function initDB(): Promise<void> {
  await openDB();
  await seedDataset();
}

export async function computeStreak(): Promise<{ current: number; max: number }> {
  const days = await idbGetAll('dailyActivity');
  if (!days.length) return { current: 0, max: 0 };
  const set = new Set(days.map((d: DailyActivityRecord) => d.date).filter(Boolean));
  const today = new Date().toISOString().slice(0, 10);

  let cur = 0;
  let probe = new Date();
  if (!set.has(today)) probe.setDate(probe.getDate() - 1);
  // Лимит 3650 дней (10 лет) для предотвращения бесконечного цикла
  const maxIterations = 3650;
  let iterations = 0;
  while (iterations < maxIterations) {
    const key = probe.toISOString().slice(0, 10);
    if (!set.has(key)) break;
    cur++;
    probe.setDate(probe.getDate() - 1);
    iterations++;
  }

  const sorted = [...set].sort();
  let max = 0, run = 1;
  if (sorted.length === 1) max = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curD = new Date(sorted[i]);
    const diff = (curD.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000);
    if (Math.round(diff) === 1) { run++; max = Math.max(max, run); }
    else { run = 1; }
  }
  if (sorted.length === 1) max = 1;
  else if (run > max) max = run;

  return { current: cur, max };
}

export async function recomputeUserStats(): Promise<UserStatsRecord> {
  const sessions = await idbGetAll('sessions');
  const attempts = await idbGetAll('attempts');
  const words = await idbGetAll('words');

  const totalDuration = sessions.reduce((s: number, x: SessionRecord) => s + (x.duration || 0), 0);
  const totalAttempts = attempts.length;
  const totalSessions = sessions.length;

  let mastered = 0;
  for (const w of words as WordRecord[]) {
    const m = (['enToRu', 'ruToEn', 'context'] as const).every(m => isMastered(w.srs?.[m] || createInitialFSRSState()));
    if (m) mastered++;
  }

  const { current: currentStreak, max: maxStreak } = await computeStreak();

  const stats: UserStatsRecord = {
    key: 'global',
    totalDuration, totalAttempts, totalSessions, mastered,
    currentStreak, maxStreak,
    updatedAt: Date.now()
  };
  await idbPut('userStats', stats);
  return stats;
}

export async function bumpDailyActivity(attemptsCount: number, correct: number, incorrect: number): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const existing = await idbGet('dailyActivity', today);
  const upd: DailyActivityRecord = existing ? {
    ...existing,
    count: (existing.count || 0) + attemptsCount,
    correct: (existing.correct || 0) + correct,
    wrong: (existing.wrong || 0) + incorrect,
    timestamp: Date.now()
  } : {
    date: today,
    count: attemptsCount,
    correct,
    wrong: incorrect,
    timestamp: Date.now()
  };
  await idbPut('dailyActivity', upd);
}

export async function getNewWordsLimit(): Promise<number> {
  const rec = await idbGet('settings', 'dailyNewWordsLimit');
  return rec ? rec.value : 10;
}

export async function setNewWordsLimit(v: number): Promise<void> {
  await idbPut('settings', { key: 'dailyNewWordsLimit', value: v });
}

export async function getTodayNewWordIds(): Promise<Set<string>> {
  const today = new Date().toISOString().slice(0, 10);
  const dayStart = new Date(today + 'T00:00:00').getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const all = await idbGetAll('attempts');
  const todays = all.filter((a: AttemptRecord) => a.timestamp >= dayStart && a.timestamp < dayEnd);

  const byWord: Record<string, number> = {};
  for (const a of all as AttemptRecord[]) {
    if (!byWord[a.wordId] || a.timestamp < byWord[a.wordId]) byWord[a.wordId] = a.timestamp;
  }
  const ids = new Set<string>();
  for (const a of todays as AttemptRecord[]) {
    if (byWord[a.wordId] !== undefined && byWord[a.wordId] >= dayStart) ids.add(a.wordId);
  }
  return ids;
}

/* ========================================================================
   EXPORT / IMPORT — бэкап всего прогресса в JSON
   ======================================================================== */

const EXPORT_STORES = ['words', 'attempts', 'sessions', 'dailyActivity', 'userStats', 'settings'] as const;

export interface ExportPayload {
  version: number;
  exportedAt: string;
  exportedAtTs: number;
  appName: string;
  stores: Record<string, any[]>;
}

export async function exportAllData(): Promise<ExportPayload> {
  const stores: Record<string, any[]> = {};
  for (const name of EXPORT_STORES) {
    stores[name] = await idbGetAll(name);
  }
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    exportedAtTs: Date.now(),
    appName: '31.Dec',
    stores
  };
}

export async function importAllData(payload: ExportPayload, mode: 'merge' | 'replace' = 'replace'): Promise<{
  wordsMerged: number;
  attemptsAdded: number;
  sessionsAdded: number;
}> {
  // Валидация структуры
  if (!payload || typeof payload !== 'object') throw new Error('Invalid backup format');
  if (!payload.stores || typeof payload.stores !== 'object') throw new Error('Invalid backup format: missing stores');
  
  // Валидация массивов
  for (const key of Object.keys(payload.stores)) {
    if (!Array.isArray(payload.stores[key])) {
      throw new Error(`Invalid backup format: stores.${key} is not an array`);
    }
  }

  const stats = { wordsMerged: 0, attemptsAdded: 0, sessionsAdded: 0 };

  if (mode === 'replace') {
    for (const name of EXPORT_STORES) {
      await idbClear(name);
    }
  }

  // Words: merge by id (don't overwrite if existing has more progress)
  if (payload.stores.words) {
    const existing = new Map<string, WordRecord>();
    if (mode === 'merge') {
      const all = await idbGetAll('words') as WordRecord[];
      for (const w of all) existing.set(w.id, w);
    }
    for (const w of payload.stores.words as WordRecord[]) {
      const cur = existing.get(w.id);
      if (cur && mode === 'merge') {
        // Merge SRS: keep whichever has more mastery
        for (const mk of ['enToRu', 'ruToEn', 'context'] as const) {
          const incoming = w.srs?.[mk];
          const current = cur.srs?.[mk];
          if (incoming && current) {
            const incomingScore = incoming.stability * 10 + incoming.totalCorrect;
            const currentScore = current.stability * 10 + current.totalCorrect;
            if (incomingScore > currentScore) {
              cur.srs[mk] = incoming;
            }
          } else if (incoming && !current) {
            cur.srs[mk] = incoming;
          }
        }
        await idbPut('words', cur);
      } else {
        await idbPut('words', w);
      }
      stats.wordsMerged++;
    }
  }

  // Attempts: dedupe by (wordId, mode, timestamp)
  if (payload.stores.attempts) {
    const seen = new Set<string>();
    if (mode === 'merge') {
      const existing = await idbGetAll('attempts') as AttemptRecord[];
      for (const a of existing) seen.add(`${a.wordId}|${a.mode}|${a.timestamp}`);
    }
    for (const a of payload.stores.attempts as AttemptRecord[]) {
      const key = `${a.wordId}|${a.mode}|${a.timestamp}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const { id, ...rest } = a;
      await idbAdd('attempts', rest);
      stats.attemptsAdded++;
    }
  }

  // Sessions: dedupe by startTime
  if (payload.stores.sessions) {
    const seen = new Set<number>();
    if (mode === 'merge') {
      const existing = await idbGetAll('sessions') as SessionRecord[];
      for (const s of existing) seen.add(s.startTime);
    }
    for (const s of payload.stores.sessions as SessionRecord[]) {
      if (seen.has(s.startTime)) continue;
      seen.add(s.startTime);
      const { id, ...rest } = s;
      await idbAdd('sessions', rest);
      stats.sessionsAdded++;
    }
  }

  // Daily activity: merge counts
  if (payload.stores.dailyActivity) {
    for (const d of payload.stores.dailyActivity as DailyActivityRecord[]) {
      if (mode === 'merge') {
        const existing = await idbGet('dailyActivity', d.date);
        if (existing) {
          await idbPut('dailyActivity', {
            ...existing,
            count: Math.max(existing.count || 0, d.count || 0),
            correct: Math.max(existing.correct || 0, d.correct || 0),
            wrong: Math.max(existing.wrong || 0, d.wrong || 0),
            timestamp: Math.max(existing.timestamp || 0, d.timestamp || 0)
          });
          continue;
        }
      }
      await idbPut('dailyActivity', d);
    }
  }

  // User stats: keep better
  if (payload.stores.userStats) {
    for (const s of payload.stores.userStats as UserStatsRecord[]) {
      if (mode === 'merge') {
        const existing = await idbGet('userStats', s.key) as UserStatsRecord;
        if (existing) {
          await idbPut('userStats', {
            ...s,
            maxStreak: Math.max(existing.maxStreak || 0, s.maxStreak || 0),
            totalAttempts: Math.max(existing.totalAttempts || 0, s.totalAttempts || 0),
            totalSessions: Math.max(existing.totalSessions || 0, s.totalSessions || 0)
          });
          continue;
        }
      }
      await idbPut('userStats', s);
    }
  }

  // Settings: overwrite
  if (payload.stores.settings) {
    for (const s of payload.stores.settings) {
      await idbPut('settings', s);
    }
  }

  await recomputeUserStats();
  return stats;
}

export function downloadJson(data: ExportPayload, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ========================================================================
   АВТОСОХРАНЕНИЕ — автоматически создаёт бэкап каждые 2 минуты
   ======================================================================== */

let autoSaveInterval: ReturnType<typeof setInterval> | null = null;
let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;

export async function autoSave(): Promise<void> {
  try {
    const data = await exportAllData();
    const key = 'autoBackup_' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (quotaErr) {
      // QuotaExceededError - удаляем старые бэкапы и пробуем снова
      const keys = Object.keys(localStorage).filter(k => k.startsWith('autoBackup_')).sort();
      // Удаляем все кроме последнего
      for (let i = 0; i < keys.length - 1; i++) {
        localStorage.removeItem(keys[i]);
      }
      // Пробуем сохранить снова
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch {
        // Если всё равно не хватает места, пропускаем
        console.warn('Auto-save skipped: localStorage full');
        return;
      }
    }
    
    // Удаляем старые бэкапы (оставляем последние 5)
    const keys = Object.keys(localStorage).filter(k => k.startsWith('autoBackup_')).sort();
    while (keys.length > 5) {
      const oldest = keys.shift();
      if (oldest) localStorage.removeItem(oldest);
    }
  } catch (err) {
    console.warn('Auto-save failed:', err);
  }
}

export function startAutoSave(): void {
  if (autoSaveInterval) return;
  autoSaveInterval = setInterval(autoSave, 2 * 60 * 1000); // каждые 2 минуты
  // Первый бэкап через 30 секунд
  autoSaveTimeout = setTimeout(autoSave, 30 * 1000);
}

export function stopAutoSave(): void {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = null;
  }
}

export async function restoreFromAutoSave(): Promise<boolean> {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('autoBackup_')).sort();
    if (!keys.length) return false;
    
    const latest = keys[keys.length - 1];
    const data = localStorage.getItem(latest);
    if (!data) return false;
    
    const payload = JSON.parse(data) as ExportPayload;
    await importAllData(payload, 'replace');
    return true;
  } catch (err) {
    console.warn('Restore from auto-save failed:', err);
    return false;
  }
}
