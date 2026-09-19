/**
 * FSRS — Free Spaced Repetition Scheduler
 * 
 * Чистая реализация алгоритма FSRS-5 (как в Anki).
 * Модель DSR: Difficulty, Stability, Retrievability.
 * 
 * Только то, что реально влияет на интервалы.
 * Никакой декорации — только работающие формулы.
 */

// ============================================================================
// ТИПЫ
// ============================================================================

export type Grade = 1 | 2 | 3 | 4; // 1=Forgot, 2=Hard, 3=Good, 4=Easy

export interface FSRSState {
  difficulty: number;   // [1, 10] — насколько сложно вспомнить
  stability: number;    // дни — за сколько дней R падает до 90%
  repetitions: number;  // всего успешных повторений
  lapses: number;       // всего ошибок (забыл)
  lastReview: number;   // timestamp последнего повторения
  nextReview: number;   // timestamp следующего повторения
  interval: number;     // текущий интервал в днях
  totalCorrect: number;
  totalIncorrect: number;
  averageResponseTime: number; // мс
}

// ============================================================================
// ПАРАМЕТРЫ FSRS-5 (дефолты из Anki, оптимизированы на 100k+ повторений)
// ============================================================================

const W = [
  0.40255,   // w0: S0(Forgot)
  1.18385,   // w1: S0(Hard)
  3.173,     // w2: S0(Good)
  15.69105,  // w3: S0(Easy)
  7.1949,    // w4: D0(Forgot)
  0.5345,    // w5: D0 decay
  1.4604,    // w6: ΔD multiplier
  0.0046,    // w7: mean reversion
  1.54575,   // w8: S increase scale
  0.1192,    // w9: S saturation exponent
  1.01925,   // w10: R saturation
  1.9395,    // w11: failure S scale
  0.11,      // w12: failure D exponent
  0.29605,   // w13: failure S exponent
  2.2698,    // w14: failure R exponent
  0.2315,    // w15: hard penalty
  2.9898,    // w16: easy bonus
  0.51655,   // w17: short-term S rate
  0.6621     // w18: short-term S exponent
];

// Кривая забывания: R(t) = (1 + F*t/S)^C
const F = 19 / 81;
const C = -0.5;

// Целевая удерживаемость (90% — стандарт FSRS)
const DESIRED_RETENTION = 0.9;
const MAX_INTERVAL = 365; // дней

// ============================================================================
// КРИВАЯ ЗАБЫВАНИЯ
// ============================================================================

/** Вероятность вспомнить через elapsedDays при данной stability */
export function retrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  if (elapsedDays <= 0) return 1;
  return Math.pow(1 + F * (elapsedDays / stability), C);
}

/** Интервал, через который R упадёт до desiredRetention */
export function nextInterval(stability: number): number {
  if (stability <= 0) return 0;
  const i = (stability / F) * (Math.pow(DESIRED_RETENTION, 1 / C) - 1);
  return Math.min(Math.max(Math.round(i), 1), MAX_INTERVAL);
}

// ============================================================================
// НАЧАЛЬНЫЕ ЗНАЧЕНИЯ
// ============================================================================

/** Начальная stability после первого повторения */
function initialStability(grade: Grade): number {
  return W[grade - 1];
}

/** Начальная difficulty после первого повторения */
function initialDifficulty(grade: Grade): number {
  const d = W[4] - Math.exp(W[5] * (grade - 1)) + 1;
  return clamp(d, 1, 10);
}

// ============================================================================
// ОБНОВЛЕНИЕ STABILITY
// ============================================================================

/** Stability после успешного вспоминания */
function stabilitySuccess(d: number, s: number, r: number, grade: Grade): number {
  const td = 11 - d;                          // сложнее → медленнее растёт
  const ts = Math.pow(s, -W[9]);              // выше S → медленнее растёт (насыщение)
  const tr = Math.exp(W[10] * (1 - r)) - 1;  // ниже R → больше прирост (оптимально вспоминать на грани)
  const hardPenalty = grade === 2 ? W[15] : 1;
  const easyBonus = grade === 4 ? W[16] : 1;
  const alpha = 1 + td * ts * tr * hardPenalty * easyBonus * Math.exp(W[8]);
  return s * alpha;
}

/** Stability после ошибки */
function stabilityFailure(d: number, s: number, r: number): number {
  const df = Math.pow(d, -W[12]);
  const sf = Math.pow(s + 1, W[13]) - 1;
  const rf = Math.exp(W[14] * (1 - r));
  const newS = df * sf * rf * W[11];
  return Math.min(newS, s); // не может стать выше чем была
}

// ============================================================================
// ОБНОВЛЕНИЕ DIFFICULTY
// ============================================================================

function updateDifficulty(d: number, grade: Grade): number {
  const d0Easy = initialDifficulty(4);
  const deltaD = -W[6] * (grade - 3); // Again/Hard → +, Good → 0, Easy → -
  const dPrime = d + deltaD * ((10 - d) / 9); // linear damping
  const dDoublePrime = W[7] * d0Easy + (1 - W[7]) * dPrime; // mean reversion
  return clamp(dDoublePrime, 1, 10);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================================
// ГЛАВНАЯ ФУНКЦИЯ — ОБНОВЛЕНИЕ СОСТОЯНИЯ КАРТОЧКИ
// ============================================================================

export function updateFSRS(
  state: FSRSState,
  grade: Grade,
  responseTimeMs: number
): FSRSState {
  const now = Date.now();
  const elapsedDays = state.lastReview > 0
    ? (now - state.lastReview) / (24 * 60 * 60 * 1000)
    : 0;

  // Обновляем среднее время ответа
  const totalReviews = state.totalCorrect + state.totalIncorrect;
  const avgResponseTime = totalReviews > 0
    ? (state.averageResponseTime * totalReviews + responseTimeMs) / (totalReviews + 1)
    : responseTimeMs;

  const newState: FSRSState = {
    ...state,
    averageResponseTime: avgResponseTime,
    lastReview: now
  };

  if (state.repetitions === 0 && state.lapses === 0) {
    // Первое повторение
    newState.difficulty = initialDifficulty(grade);
    newState.stability = initialStability(grade);
    newState.repetitions = grade >= 2 ? 1 : 0;
    newState.lapses = grade === 1 ? 1 : 0;
    newState.totalCorrect = grade >= 2 ? 1 : 0;
    newState.totalIncorrect = grade === 1 ? 1 : 0;
  } else {
    // Последующие повторения
    const r = retrievability(elapsedDays, state.stability);
    newState.difficulty = updateDifficulty(state.difficulty, grade);

    if (grade === 1) {
      // Ошибка
      newState.stability = stabilityFailure(state.difficulty, state.stability, r);
      newState.lapses = state.lapses + 1;
      newState.totalIncorrect = state.totalIncorrect + 1;
    } else {
      // Успех
      newState.stability = stabilitySuccess(state.difficulty, state.stability, r, grade);
      newState.repetitions = state.repetitions + 1;
      newState.totalCorrect = state.totalCorrect + 1;
    }
  }

  // Вычисляем следующий интервал
  newState.interval = nextInterval(newState.stability);
  newState.nextReview = now + newState.interval * 24 * 60 * 60 * 1000;

  return newState;
}

// ============================================================================
// УТИЛИТЫ
// ============================================================================

/** Создать начальное состояние (никогда не повторялось) */
export function createInitialFSRSState(): FSRSState {
  return {
    difficulty: 5,
    stability: 0,
    repetitions: 0,
    lapses: 0,
    lastReview: 0,
    nextReview: 0,
    interval: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    averageResponseTime: 0
  };
}

/**
 * Слово считается усвоенным, если:
 * - Stability >= 21 день (3 недели)
 * - Lapses <= 2
 * - Retrievability >= 0.9 прямо сейчас
 */
export function isMastered(state: FSRSState): boolean {
  if (state.stability < 21) return false;
  if (state.lapses > 2) return false;
  const elapsed = state.lastReview > 0
    ? (Date.now() - state.lastReview) / (24 * 60 * 60 * 1000)
    : Infinity;
  return retrievability(elapsed, state.stability) >= 0.9;
}

/** Прогресс усвоения [0, 1] — для UI */
export function masteryProgress(state: FSRSState): number {
  if (state.stability <= 0) return 0;
  const elapsed = state.lastReview > 0
    ? (Date.now() - state.lastReview) / (24 * 60 * 60 * 1000)
    : 0;
  const r = retrievability(elapsed, state.stability);
  // Нормируем stability: 0 дней = 0, 30 дней = 1
  const sProgress = Math.min(1, state.stability / 30);
  return sProgress * r;
}

/**
 * Автоматическая оценка на основе правильности и времени ответа.
 * Используется когда у пользователя нет кнопок 1-2-3-4 (простой режим).
 */
export function autoGrade(correct: boolean, responseTimeMs: number, avgResponseTimeMs: number): Grade {
  if (!correct) return 1;
  
  if (avgResponseTimeMs <= 0) return 3;
  const ratio = responseTimeMs / avgResponseTimeMs;
  
  if (ratio < 0.5) return 4;  // намного быстрее среднего → Easy
  if (ratio < 1.2) return 3;  // примерно как среднее → Good
  if (ratio < 2.5) return 2;  // медленнее → Hard
  return 3;                    // очень медленно, но правильно → Good (не наказываем)
}
