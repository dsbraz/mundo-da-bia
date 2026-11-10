import { expect, it } from 'vitest';
import { eventLine, modeLine, nameOf, outdoorLine, refusal, say } from './feedback-text';
import { personalities, pickReaction } from './personalities';
import { actorIds } from '../domain/types';
import type { PresentationEvent } from '../domain/types';
const words = (text: string) => text.trim().split(/\s+/).length;
const banned = /\b(erro|errado|ocupad[oa]|Escolha|Solte|Pronto para brincar|Obrigada)\b/i;
const types: PresentationEvent['type'][] = ['named', 'furniture', 'moved', 'dressed', 'picked', 'dropped', 'fed', 'rested', 'room', 'summoned', 'show'];

it('interpola o nome atual, inclusive o renomeado', () => {
  expect(nameOf({ id: 'bia' })).toBe('Bia');
  expect(nameOf({ id: 'bia', name: 'Tetê' })).toBe('Tetê');
  expect(say('Oi, {nome}!', 'Tetê')).toBe('Oi, Tetê!');
});

it('o evento moved não gera fala e as outras falas da cena cabem em 6 palavras', () => {
  expect(eventLine('moved', { id: 'bia' }, false)).toBeNull();
  for (const type of types) for (const cat of [false, true]) {
    const line = eventLine(type, { id: cat ? 'mimi' : 'luna', name: 'Maria Clara' }, cat);
    if (line === null) continue;
    expect(words(line), line).toBeLessThanOrEqual(6); expect(line).not.toMatch(banned);
  }
});

it('recusas dizem quem está no lugar e oferecem alternativa sem culpa', () => {
  const swing = refusal('outdoor', 'Maria Clara');
  expect(swing).toContain('Maria Clara');
  for (const kind of ['outdoor', 'blocked', 'walk', 'edit'] as const) {
    const line = refusal(kind, 'Maria Clara');
    expect(words(line), line).toBeLessThanOrEqual(6); expect(line).not.toMatch(banned);
  }
});

it('o gato fala sem gênero ao vestir', () => {
  expect(eventLine('dressed', { id: 'mimi' }, true)).toBe('Miau! (Mimi amou o look)');
  for (const type of types) expect(eventLine(type, { id: 'nino', name: 'Tom' }, true) ?? '').not.toMatch(/\b(lindo|linda|bonito|bonita)\b/);
});

it('falas da praça e de modo seguem o tom do guia', () => {
  for (const target of ['bench', 'swing', 'water', 'bell', 'mail'] as const) {
    const line = outdoorLine(target, 'Maria Clara');
    expect(line).toContain('Maria Clara'); expect(words(line), line).toBeLessThanOrEqual(6);
  }
  for (const [a, b] of [[false, false], [true, false], [true, true]] as const) expect(modeLine(a, b)).not.toMatch(banned);
});

it('cada personagem tem 2 ou 3 reações curtas com o nome; o gato ronrona', () => {
  for (const id of actorIds) {
    const pool = personalities[id];
    expect(pool.length).toBeGreaterThanOrEqual(2); expect(pool.length).toBeLessThanOrEqual(3);
    pool.forEach(r => { expect(r.line).toContain('{nome}'); expect(words(say(r.line, 'Maria Clara'))).toBeLessThanOrEqual(6); });
  }
  expect(personalities.mimi.some(r => r.cue === 'purr')).toBe(true);
});

it('sorteia sem repetir a reação anterior', () => {
  const sequence = [0, .99, .5, 0, .99, .2, .7];
  let previous: number | undefined, i = 0;
  const random = () => sequence[i++ % sequence.length]!;
  for (let n = 0; n < 20; n++) {
    const next = pickReaction(3, previous, random);
    expect(next).not.toBe(previous); expect(next).toBeGreaterThanOrEqual(0); expect(next).toBeLessThan(3);
    previous = next;
  }
  expect(pickReaction(2, 0, () => .99)).toBe(1);
  expect(pickReaction(2, 1, () => 0)).toBe(0);
  expect(pickReaction(2, undefined, () => .99)).toBe(1);
});
