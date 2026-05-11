import type { QuizQuestion } from '../game/common/types';

export interface ParseResult {
  questions: QuizQuestion[];
  warnings: string[];
}

/**
 * Parses a human-friendly text format into QuizQuestion[].
 *
 * Format (per question, separated by blank lines):
 *
 *   Q: Что такое филология?
 *   A) Наука о языке и текстах *
 *   B) Раздел физики
 *   C) Учение о растениях
 *
 * A trailing `*` (or `!`, or `(верно)`) on an option marks it as correct.
 * If no option is explicitly marked, the first option is treated as correct.
 * Lines starting with `#` are treated as comments and ignored.
 *
 * Also accepts pasted JSON arrays of the QuizQuestion shape — if the input
 * starts with `[` or `{`, JSON parsing is attempted first.
 */
export function parseQuestionsText(input: string, konspektId: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { questions: [], warnings: ['Пустой ввод'] };

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(trimmed) as unknown;
      const list = Array.isArray(data) ? data : [data];
      const questions: QuizQuestion[] = [];
      const warnings: string[] = [];
      for (const raw of list) {
        const q = coerceJsonQuestion(raw, konspektId, questions.length);
        if (q) questions.push(q);
        else warnings.push('Пропущен вопрос в JSON: нет обязательных полей.');
      }
      return { questions, warnings };
    } catch (e) {
      return {
        questions: [],
        warnings: [`Не удалось распарсить JSON: ${(e as Error).message}`],
      };
    }
  }

  return parsePlainText(trimmed, konspektId);
}

function parsePlainText(input: string, konspektId: string): ParseResult {
  const lines = input.split(/\r?\n/);
  const questions: QuizQuestion[] = [];
  const warnings: string[] = [];

  let currentQuestionText: string | null = null;
  let currentOptions: { text: string; correct: boolean }[] = [];

  const flush = () => {
    if (!currentQuestionText) return;
    if (currentOptions.length < 2) {
      warnings.push(
        `Пропущен вопрос "${currentQuestionText.slice(0, 30)}…" — нужно минимум 2 варианта.`,
      );
      currentQuestionText = null;
      currentOptions = [];
      return;
    }
    let correctIdx = currentOptions.findIndex((o) => o.correct);
    if (correctIdx < 0) {
      warnings.push(
        `В вопросе "${currentQuestionText.slice(0, 30)}…" не отмечен правильный ответ (нет '*'). Использую первый вариант как правильный.`,
      );
      correctIdx = 0;
    }
    const idx = questions.length + 1;
    const options = currentOptions.map((o, i) => ({
      id: `${konspektId}-q${idx}-${String.fromCharCode(97 + i)}`,
      text: o.text,
    }));
    questions.push({
      id: `${konspektId}-q${idx}`,
      text: currentQuestionText,
      options,
      correctOptionId: options[correctIdx].id,
      difficulty: 2 as const,
    });
    currentQuestionText = null;
    currentOptions = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const qMatch = line.match(/^(?:Q|В|Вопрос)\s*[:.]\s*(.+)$/i);
    if (qMatch) {
      flush();
      currentQuestionText = qMatch[1].trim();
      continue;
    }

    const optMatch = line.match(/^(?:[A-EА-Е]|\d)\s*[).:]\s*(.+)$/);
    if (optMatch && currentQuestionText) {
      let text = optMatch[1].trim();
      let correct = false;
      const markers = [
        /\s*\*\s*$/,
        /\s*!\s*$/,
        /\s*\(\+\)\s*$/,
        /\s*\(верно\)\s*$/i,
        /\s*\(правильно\)\s*$/i,
        /\s*✅\s*$/,
      ];
      for (const m of markers) {
        if (m.test(text)) {
          text = text.replace(m, '').trim();
          correct = true;
          break;
        }
      }
      currentOptions.push({ text, correct });
      continue;
    }

    // Line that isn't Q/option but inside a question — treat as option without prefix
    if (currentQuestionText && line.length > 1) {
      let text = line;
      let correct = false;
      const markers = [/\s*\*\s*$/, /\s*✅\s*$/, /\s*\(верно\)\s*$/i];
      for (const m of markers) {
        if (m.test(text)) {
          text = text.replace(m, '').trim();
          correct = true;
          break;
        }
      }
      currentOptions.push({ text, correct });
    }
  }
  flush();
  return { questions, warnings };
}

function clampDifficulty(v: unknown): 1 | 2 | 3 | 4 | 5 {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 2;
  const i = Math.round(v);
  if (i <= 1) return 1;
  if (i >= 5) return 5;
  return i as 1 | 2 | 3 | 4 | 5;
}

function coerceJsonQuestion(
  raw: unknown,
  konspektId: string,
  index: number,
): QuizQuestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const text = typeof r.text === 'string' ? r.text : typeof r.question === 'string' ? r.question : null;
  if (!text) return null;
  const optionsRaw = Array.isArray(r.options) ? r.options : [];
  if (optionsRaw.length < 2) return null;
  const idx = index + 1;
  const options = optionsRaw.map((o, i) => {
    if (typeof o === 'string') {
      return {
        id: `${konspektId}-q${idx}-${String.fromCharCode(97 + i)}`,
        text: o,
      };
    }
    if (o && typeof o === 'object') {
      const obj = o as Record<string, unknown>;
      const t = typeof obj.text === 'string' ? obj.text : '';
      const id =
        typeof obj.id === 'string'
          ? obj.id
          : `${konspektId}-q${idx}-${String.fromCharCode(97 + i)}`;
      return { id, text: t };
    }
    return null;
  }).filter((o): o is { id: string; text: string } => !!o);
  if (options.length < 2) return null;
  let correctId =
    typeof r.correctOptionId === 'string' ? r.correctOptionId : null;
  if (typeof r.correctIndex === 'number' && r.correctIndex >= 0 && r.correctIndex < options.length) {
    correctId = options[r.correctIndex].id;
  }
  if (!correctId || !options.some((o) => o.id === correctId)) {
    correctId = options[0].id;
  }
  const difficulty: 1 | 2 | 3 | 4 | 5 = clampDifficulty(r.difficulty);
  return {
    id: typeof r.id === 'string' ? r.id : `${konspektId}-q${idx}`,
    text,
    options,
    correctOptionId: correctId,
    difficulty,
    explanation: typeof r.explanation === 'string' ? r.explanation : undefined,
  };
}
