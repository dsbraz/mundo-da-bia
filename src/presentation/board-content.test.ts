import { expect, it } from 'vitest';
import { drawingIds, sumIds, wordIds } from '../domain/progress';
import { boardContent, contentBox, lessonFrame, lessonMs, pictureBox, writeWindow } from './board-content';
import { strokesUpTo, strokesLength, glyphs } from './chalk-font';

const inBox = (p: { x: number; y: number }) => p.x >= contentBox.left - 1 && p.x <= contentBox.right + 1 && p.y >= contentBox.top - 1 && p.y <= contentBox.bottom + 1;

it('cada matéria põe o seu conteúdo no quadro: o desenho, as letras grandes da palavra, a conta com bolinhas e o resultado', () => {
  expect(boardContent('sol')).toEqual({ kind: 'picture', id: 'sol' });
  const word = boardContent('palavra-gato');
  expect(word.kind === 'writing' && word.marks.map(m => m.char)).toEqual(['G', 'A', 'T', 'O']);
  const sum = boardContent('conta-2-3');
  expect(sum.kind === 'writing' && sum.marks.map(m => m.char)).toEqual(['2', '•', '+', '3', '•', '=', '5']);
  // 2 dots under the 2, 3 under the 3; the answer last, in yellow chalk.
  expect(sum.kind === 'writing' && sum.marks.filter(m => m.char === '•').map(m => m.strokes.length)).toEqual([2, 3]);
  expect(sum.kind === 'writing' && sum.marks.at(-1)!.answer).toBe(true);
});
it('todas as palavras e contas cabem na faixa baixa do quadro, onde a mão da professora alcança', () => {
  for (const id of [...wordIds, ...sumIds]) {
    const content = boardContent(id);
    if (content.kind !== 'writing') throw new Error(id);
    for (const mark of content.marks) for (const stroke of mark.strokes) expect(stroke.every(inBox)).toBe(true);
  }
  expect(Object.keys(glyphs).length).toBeGreaterThan(20);
});
it('o giz escreve devagar e a ponta está onde o traço acaba; o resultado da conta só aparece no fim', () => {
  const sum = boardContent('conta-4-4');
  if (sum.kind !== 'writing') throw new Error('conta');
  const early = lessonFrame(sum, writeWindow.start + (writeWindow.end - writeWindow.start) * .3, false);
  expect(early.marks.length).toBeGreaterThan(0);
  expect(early.marks.some(m => m.answer)).toBe(false);
  expect(inBox(early.tip!)).toBe(true);
  const last = early.marks.at(-1)!;
  expect(last.strokes.at(-1)!.at(-1)).toEqual(early.tip);
  expect(lessonFrame(sum, writeWindow.start + (writeWindow.end - writeWindow.start) * .8, false).marks.some(m => m.answer)).toBe(false);
  expect(lessonFrame(sum, writeWindow.end, false).marks.at(-1)!.answer).toBe(true);
  expect(lessonFrame(sum, writeWindow.end, false).done).toBe(true);
});
it('com movimento reduzido os traços aparecem aos passos, letra por letra, e o resultado só no último', () => {
  const word = boardContent('palavra-bola');
  if (word.kind !== 'writing') throw new Error('palavra');
  const counts = [0, .2, .4, .6, .8, .99].map(f => lessonFrame(word, writeWindow.start + (writeWindow.end - writeWindow.start) * f, true).marks.length);
  expect(counts).toEqual([0, 0, 1, 2, 3, 3]);
  const whole = lessonFrame(word, writeWindow.start + (writeWindow.end - writeWindow.start) * .6, true).marks;
  whole.forEach((mark, n) => expect(mark.strokes).toEqual((word.marks[n]!).strokes));
  const sum = boardContent('conta-1-4');
  expect(lessonFrame(sum, writeWindow.end - 1, true).marks.some(m => m.answer)).toBe(false);
  expect(lessonFrame(sum, writeWindow.end, true).marks.some(m => m.answer)).toBe(true);
});
it('o desenho se revela da esquerda para a direita, com o giz na borda; aos passos com movimento reduzido', () => {
  const picture = boardContent('gato');
  const middle = lessonFrame(picture, (writeWindow.start + writeWindow.end) / 2, false);
  expect(middle.reveal).toBeCloseTo(.5, 1);
  expect(middle.tip!.x).toBeCloseTo(pictureBox.left + pictureBox.width * middle.reveal);
  expect(inBox(middle.tip!)).toBe(true);
  expect(lessonFrame(picture, writeWindow.start + (writeWindow.end - writeWindow.start) * .3, true).reveal).toBe(.25);
  expect(lessonFrame(picture, 0, false)).toMatchObject({ reveal: 0, done: false });
  expect(lessonFrame(picture, lessonMs, true)).toMatchObject({ reveal: 1, done: true });
  for (const id of drawingIds) expect(boardContent(id).kind).toBe('picture');
});
it('a professora chega ao quadro antes de escrever, e termina antes dos 20 s da aula', () => {
  expect(writeWindow.start).toBeGreaterThan(0);
  expect(writeWindow.end).toBeLessThanOrEqual(lessonMs);
  const word = boardContent('palavra-sol');
  if (word.kind !== 'writing') throw new Error('palavra');
  const total = word.marks.reduce((n, m) => n + strokesLength(m.strokes), 0);
  expect(strokesUpTo(word.marks.flatMap(m => m.strokes), total).strokes.length).toBe(word.marks.flatMap(m => m.strokes).length);
});
