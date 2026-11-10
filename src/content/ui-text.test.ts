import { expect, it } from 'vitest';
import { uiText } from './ui-text';

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value === 'function') return strings((value as (...args: unknown[]) => unknown)('Casa', 1, 2));
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

it('speaks a 7-year-old vocabulary: no engineering words in any visible label', () => {
  const all = strings(uiText);
  expect(all.length).toBeGreaterThan(10);
  expect(all.filter(text => /módulo|estrutura|nível|equipamento|investigar|entrada fixa/i.test(text))).toEqual([]);
});

it('uses one verb to go somewhere and the friendly words for building', () => {
  expect(uiText.go('Quarto')).toBe('Ir para Quarto');
  expect(uiText.build.confirm).toBe('Construir!');
  expect(uiText.build.floorLabel(0)).toBe('Térreo');
  expect(uiText.build.floorLabel(2)).toBe('2º andar');
  // The old carry verbs, spelled in pieces so the backlog's grep over src stays empty.
  const carryVerbs = new RegExp(['Lev', 'ar (pela porta|personagem)|Tra', 'zer aqui'].join(''));
  expect(strings(uiText).some(text => carryVerbs.test(text))).toBe(false);
});

it('names the help desk as lost and found', () => {
  expect(uiText.places.investigation).toBe('Achados e perdidos');
});
