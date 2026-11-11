import { expect, it } from 'vitest';
import { cards, personalities } from './personalities';
import { say } from './feedback-text';
import { actorIds, cropIds } from '../domain/types';
const words = (text: string) => text.trim().split(/\s+/).length;

it('cada cartão da Turma tem uma frase de até 4 palavras, um gesto, uma voz e uma cultura favorita', () => {
  for (const id of actorIds) {
    const card = cards[id];
    expect(words(card.motto), card.motto).toBeLessThanOrEqual(4);
    expect(['abraco', 'toca-aqui']).toContain(card.gesture);
    expect(card.voice).toBeGreaterThan(.5); expect(card.voice).toBeLessThan(1.5);
    expect(cropIds).toContain(card.crop);
  }
  expect(new Set(actorIds.map(id => cards[id].motto)).size).toBe(actorIds.length);
  expect(new Set(actorIds.map(id => cards[id].voice)).size).toBe(actorIds.length);
});

it('a Bia, definida pela família: independente e carinhosa no cartão, o gesto dela é o abraço', () => {
  expect(cards.bia).toMatchObject({ motto: 'Deixa comigo! Abraço?', gesture: 'abraco' });
});

it('cada humano tem as próprias reações ao toque; as da Bia falam de abraço, de ideia e de resolver sem ajuda', () => {
  const humans = ['bia', 'luna', 'leo', 'rui'] as const;
  const pools = humans.map(id => personalities[id].map(r => r.line).join('|'));
  expect(new Set(pools).size).toBe(humans.length);
  const bia = personalities.bia.map(r => say(r.line, 'Ana'));
  expect(bia.some(l => /abraço/i.test(l))).toBe(true); expect(bia.some(l => /ideia/i.test(l))).toBe(true);
  expect(bia.some(l => /resolve/i.test(l))).toBe(true);
  for (const line of bia) expect(line).toContain('Ana');
});
