import { expect, it } from 'vitest';
import { dayIndex, eventOfDay, phaseAt, untilMorning } from './clock';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
import { initialAlbum } from './houses';
import { initialWorld } from './world';

const min = 60_000;
it('phaseAt nas bordas de um dia de 16 min', () => {
  expect(phaseAt(0, 'calmo')).toBe('manha');
  expect(phaseAt(5 * min - 1, 'calmo')).toBe('manha');
  expect(phaseAt(5 * min, 'calmo')).toBe('tarde');
  expect(phaseAt(10 * min - 1, 'calmo')).toBe('tarde');
  expect(phaseAt(10 * min, 'calmo')).toBe('entardecer');
  expect(phaseAt(11.5 * min - 1, 'calmo')).toBe('entardecer');
  expect(phaseAt(11.5 * min, 'calmo')).toBe('noite');
  expect(phaseAt(14.5 * min - 1, 'calmo')).toBe('noite');
  expect(phaseAt(14.5 * min, 'calmo')).toBe('amanhecer');
  expect(phaseAt(16 * min - 1, 'calmo')).toBe('amanhecer');
  expect(phaseAt(16 * min, 'calmo')).toBe('manha');
  expect(phaseAt(21 * min, 'chuva')).toBe('tarde');
});
it('na noite de estrelas a noite vai de 11,5 a 17,5 min e o dia tem 19 min', () => {
  expect(phaseAt(11.5 * min - 1, 'estrelas')).toBe('entardecer');
  expect(phaseAt(11.5 * min, 'estrelas')).toBe('noite');
  expect(phaseAt(16 * min, 'estrelas')).toBe('noite');
  expect(phaseAt(17.5 * min - 1, 'estrelas')).toBe('noite');
  expect(phaseAt(17.5 * min, 'estrelas')).toBe('amanhecer');
  expect(phaseAt(19 * min - 1, 'estrelas')).toBe('amanhecer');
  expect(phaseAt(19 * min, 'estrelas')).toBe('manha');
  expect(phaseAt(5 * min, 'estrelas')).toBe('tarde');
  expect(phaseAt(10 * min, 'estrelas')).toBe('entardecer');
});
it('dayIndex de 31/12 e de 01/01 difere em 1, e conta dias corridos', () => {
  expect(dayIndex({ y: 2027, m: 1, d: 1 }) - dayIndex({ y: 2026, m: 12, d: 31 })).toBe(1);
  expect(dayIndex({ y: 2026, m: 3, d: 1 }) - dayIndex({ y: 2026, m: 2, d: 28 })).toBe(1);
  expect(dayIndex({ y: 1970, m: 1, d: 1 })).toBe(0);
  expect(dayIndex({ y: 2026, m: 11, d: 10 })).toBe(20767);
});
it('eventOfDay cobre os 10 restos', () => {
  expect(Array.from({ length: 10 }, (_, day) => eventOfDay(day + 20))).toEqual(
    ['calmo', 'chuva', 'calmo', 'feira', 'aniversario', 'calmo', 'carteiro', 'piquenique', 'calmo', 'estrelas']);
  expect(eventOfDay(-1)).toBe('estrelas');
});
it('tick sem nada que dependa do tempo devolve o mesmo bairro', () => {
  const town = migrateNeighborhood(initialAlbum(initialWorld()));
  expect(neighborhoodAction(town, { type: 'tick', now: 1_000 })).toBe(town);
});
it('até a manhã seguinte (W3L-15): o resto do dia de 16 min, ou de 19 min numa noite de estrelas', () => {
  expect(untilMorning(12 * 60_000, 'calmo')).toBe(4 * 60_000);
  expect(untilMorning(12 * 60_000, 'estrelas')).toBe(7 * 60_000);
  expect(untilMorning(17 * 60_000, 'calmo')).toBe(15 * 60_000);
  expect(untilMorning(0, 'calmo')).toBe(16 * 60_000);
  expect(phaseAt(12 * 60_000 + untilMorning(12 * 60_000, 'estrelas'), 'estrelas')).toBe('manha');
});
