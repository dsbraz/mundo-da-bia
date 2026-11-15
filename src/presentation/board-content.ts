import type { DrawingId, Keepsake } from '../domain/progress';
import type { Point } from '../domain/types';
import { glyphGap, glyphStrokes, glyphWidth, strokesLength, strokesUpTo, type Stroke } from './chalk-font';

/** The lesson (W3L-26) lasts 20 s; never saved. */
export const lessonMs = 20_000;
/** When the chalk is on the board (ms into the lesson): the teacher walks there first, and the class sees the board whole at the end. */
export const writeWindow = { start: 1500, end: 19_000 };
/** Where the lesson is written on the board (board piece units): the lower band of the green, where the teacher's hand reaches. */
export const contentBox = { left: 60, right: 340, top: 104, bottom: 194 };
/** The drawing of a drawing lesson, in its 120 × 80 proportions, centred in the band. */
export const pictureBox = { left: 132, top: 104, width: 136, height: 90 };
export const chalkWhite = 0xfffdf7, chalkYellow = 0xf2c84b;
/** One step of the writing: a letter, a number, a sign or the dots under a number; `answer`: the result of a sum. */
export interface Mark { char: string; strokes: Stroke[]; color: number; answer?: boolean }
export type BoardContent = { kind: 'picture'; id: DrawingId } | { kind: 'writing'; marks: Mark[] };
/** What is on the board at a moment: the marks drawn so far (the last one cut where the chalk is), how much of a drawing shows, the
 *  chalk's point and whether the writing is finished. */
export interface BoardFrame { marks: Mark[]; reveal: number; tip: Point | null; done: boolean }

const dot = (c: Point): Stroke => Array.from({ length: 9 }, (_, i) => ({ x: c.x + 4.6 * Math.cos(i * Math.PI / 4), y: c.y + 4.6 * Math.sin(i * Math.PI / 4) }));
/** `count` dots under a number whose glyph starts at `left`: rows of up to 4, centred. */
function dots(count: number, left: number, width: number): Mark {
  const strokes = Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / 4), inRow = Math.min(4, count - row * 4);
    return dot({ x: left + width / 2 + (i % 4 - (inRow - 1) / 2) * 12, y: 173 + row * 14 });
  });
  return { char: '•', strokes, color: chalkWhite };
}
/** A row of glyphs `height` tall, centred on the board, from `top`; returns each glyph's left edge. */
function row(chars: readonly string[], height: number, top: number, gap: number): { char: string; left: number; strokes: Stroke[] }[] {
  const width = glyphWidth(height), total = chars.length * width + (chars.length - 1) * gap, start = (contentBox.left + contentBox.right) / 2 - total / 2;
  return chars.map((char, n) => { const left = start + n * (width + gap); return { char, left, strokes: glyphStrokes(char, { x: left, y: top }, height) }; });
}
function sum(a: number, b: number): Mark[] {
  const height = 52, glyphs = row([String(a), '+', String(b), '=', String(a + b)], height, 108, 22), width = glyphWidth(height);
  const marks = glyphs.map(g => ({ char: g.char, strokes: g.strokes, color: chalkWhite }));
  return [marks[0]!, dots(a, glyphs[0]!.left, width), marks[1]!, marks[2]!, dots(b, glyphs[2]!.left, width), marks[3]!,
    { ...marks[4]!, color: chalkYellow, answer: true }];
}
/** The content of a lesson's paper on the board: the drawing itself, the word's big capitals, or the sum with dots and its result. */
export function boardContent(id: Keepsake): BoardContent {
  if (id.startsWith('palavra-')) {
    const height = 72;
    return { kind: 'writing', marks: row([...id.slice(8).toUpperCase()], height, 112, glyphGap(height)).map(g => ({ char: g.char, strokes: g.strokes, color: chalkWhite })) };
  }
  if (id.startsWith('conta-')) { const [a, b] = id.slice(6).split('-').map(Number); return { kind: 'writing', marks: sum(a!, b!) }; }
  return { kind: 'picture', id: id as DrawingId };
}
const clamp = (value: number) => Math.min(1, Math.max(0, value));
/** How far the writing is (0 to 1) at `elapsed` ms into the lesson. */
export const writeProgress = (elapsed: number) => clamp((elapsed - writeWindow.start) / (writeWindow.end - writeWindow.start));
/** Writing by the chalk's length: the sum's result waits for a short pause and comes in the last stretch. */
function written(marks: readonly Mark[], raw: number): BoardFrame {
  const body = marks.filter(m => !m.answer), answer = marks.filter(m => m.answer);
  const [bodyShare, answerFrom] = answer.length ? [.84, .88] : [1, 1];
  const part = (list: readonly Mark[], f: number) => {
    const total = list.reduce((n, m) => n + strokesLength(m.strokes), 0);
    let left = total * clamp(f);
    return list.flatMap(mark => {
      if (left <= 0) return [];
      const length = strokesLength(mark.strokes), cut = strokesUpTo(mark.strokes, left); left -= length;
      return [{ ...mark, strokes: cut.strokes }];
    });
  };
  const shown = [...part(body, raw / bodyShare), ...(raw >= answerFrom ? part(answer, (raw - answerFrom) / (1 - answerFrom)) : [])];
  return { marks: shown, reveal: 0, tip: shown.at(-1)?.strokes.at(-1)?.at(-1) ?? null, done: raw >= 1 };
}
/** Step by step with reduced motion: whole marks appear one after the other; the last (the result) only at the end. */
function stepped(marks: readonly Mark[], raw: number): BoardFrame {
  const shown = marks.slice(0, raw >= 1 ? marks.length : Math.floor(raw * marks.length));
  return { marks: shown, reveal: 0, tip: shown.at(-1)?.strokes.at(-1)?.at(-1) ?? null, done: raw >= 1 };
}
/** The board at `elapsed` ms into a lesson about `content`. */
export function lessonFrame(content: BoardContent, elapsed: number, reduced: boolean): BoardFrame {
  const raw = writeProgress(elapsed);
  if (content.kind === 'writing') return reduced ? stepped(content.marks, raw) : written(content.marks, raw);
  const reveal = reduced ? (raw >= 1 ? 1 : Math.floor(raw * 4) / 4) : raw;
  const wobble = reduced ? 0 : Math.sin(elapsed / 90) * .32;
  return { marks: [], reveal, tip: { x: pictureBox.left + pictureBox.width * reveal, y: pictureBox.top + pictureBox.height * (.5 + wobble) }, done: raw >= 1 };
}
