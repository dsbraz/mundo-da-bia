import { expect, it } from 'vitest';
import { allLines, spokenEvents } from './lines';
import { eventLine, lineRotation, say } from './feedback-text';
import { actorIds } from '../domain/types';
import type { ActorId } from '../domain/types';
const words = (text: string) => text.trim().split(/\s+/).length;
const banned = /\b(erro|errado|ocupad[oa]|Escolha|Solte|Pronto para brincar|Obrigad[oa]|sozinh[oa]|pront[oa]|cansad[oa]|lind[oa]|bonit[oa]|todos|amigos|carteiro|nota|estrela)\b/i;
const cat = (id: ActorId) => ['mimi', 'nino', 'pipoca'].includes(id);

it('cobre os eventos novos da onda 3 além dos antigos', () => {
  expect(spokenEvents).toEqual(['named', 'dressed', 'picked', 'dropped', 'fed', 'rested', 'cooked', 'ate', 'harvested', 'served', 'letter', 'hint']);
});

it('a mesma ação 4 vezes dá 3 ou mais falas diferentes, para cada personagem e evento', () => {
  for (const id of actorIds) for (const type of spokenEvents) {
    const next = lineRotation(), said = [1, 2, 3, 4].map(() => next(type, { id }, cat(id)));
    expect(new Set(said).size, `${id} ${type}`).toBeGreaterThanOrEqual(3);
  }
});

it('a rotação é por personagem e por evento, e começa na primeira fala', () => {
  const next = lineRotation();
  expect(next('fed', { id: 'luna' }, false)).toBe(eventLine('fed', { id: 'luna' }, false, 0));
  expect(next('fed', { id: 'leo' }, false)).toBe(eventLine('fed', { id: 'leo' }, false, 0));
  expect(next('dressed', { id: 'luna' }, false)).toBe(eventLine('dressed', { id: 'luna' }, false, 0));
  expect(next('fed', { id: 'luna' }, false)).toBe(eventLine('fed', { id: 'luna' }, false, 1));
  expect(next('moved', { id: 'luna' }, false)).toBeNull();
  expect(next('summoned', undefined, false)).toBe('A turma toda chegou!');
});

it('com a Bia renomeada "Ana", todas as falas dela dizem "Ana"', () => {
  for (const type of spokenEvents) for (let turn = 0; turn < 5; turn++) expect(eventLine(type, { id: 'bia', name: 'Ana' }, false, turn)).toContain('Ana');
});

it('toda fala interpola o nome, tem até 6 palavras mesmo com nome composto e não usa masculino genérico nem nota', () => {
  const lines = allLines();
  expect(lines.length).toBeGreaterThanOrEqual(spokenEvents.length * 2 * 3);
  for (const line of lines) {
    expect(line, line).toContain('{nome}');
    const spoken = say(line, 'Maria Clara');
    expect(words(spoken), spoken).toBeLessThanOrEqual(6); expect(spoken).not.toMatch(banned);
  }
});

it('a Bia fala de batata frita e de pastel, os favoritos dela', () => {
  const bia = spokenEvents.flatMap(type => [0, 1, 2, 3].map(turn => eventLine(type, { id: 'bia' }, false, turn)));
  expect(bia.some(l => /batata frita/i.test(l ?? ''))).toBe(true); expect(bia.some(l => /pastel/i.test(l ?? ''))).toBe(true);
});
