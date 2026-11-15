import { expect, it } from 'vitest';
import { dayIndex, eventOfDay, phaseAt, untilMorning } from './clock';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
import { initialAlbum } from './houses';
import { initialWorld } from './world';

const min = 60_000;
it('phaseAt nas bordas de um dia de 32 min (lote 8E: o dobro do de 16, para a noite não chegar toda hora)', () => {
  expect(phaseAt(0, 'calmo')).toBe('manha');
  expect(phaseAt(10 * min - 1, 'calmo')).toBe('manha');
  expect(phaseAt(10 * min, 'calmo')).toBe('tarde');
  expect(phaseAt(20 * min - 1, 'calmo')).toBe('tarde');
  expect(phaseAt(20 * min, 'calmo')).toBe('entardecer');
  expect(phaseAt(23 * min - 1, 'calmo')).toBe('entardecer');
  expect(phaseAt(23 * min, 'calmo')).toBe('noite');
  expect(phaseAt(29 * min - 1, 'calmo')).toBe('noite');
  expect(phaseAt(29 * min, 'calmo')).toBe('amanhecer');
  expect(phaseAt(32 * min - 1, 'calmo')).toBe('amanhecer');
  expect(phaseAt(32 * min, 'calmo')).toBe('manha');
  expect(phaseAt(42 * min, 'chuva')).toBe('tarde');
});
it('na noite de estrelas a noite vai de 23 a 35 min e o dia tem 38 min', () => {
  expect(phaseAt(23 * min - 1, 'estrelas')).toBe('entardecer');
  expect(phaseAt(23 * min, 'estrelas')).toBe('noite');
  expect(phaseAt(32 * min, 'estrelas')).toBe('noite');
  expect(phaseAt(35 * min - 1, 'estrelas')).toBe('noite');
  expect(phaseAt(35 * min, 'estrelas')).toBe('amanhecer');
  expect(phaseAt(38 * min - 1, 'estrelas')).toBe('amanhecer');
  expect(phaseAt(38 * min, 'estrelas')).toBe('manha');
  expect(phaseAt(10 * min, 'estrelas')).toBe('tarde');
  expect(phaseAt(20 * min, 'estrelas')).toBe('entardecer');
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
it('até a manhã seguinte (W3L-15): o resto do dia de 32 min, ou de 38 min numa noite de estrelas', () => {
  expect(untilMorning(24 * 60_000, 'calmo')).toBe(8 * 60_000);
  expect(untilMorning(24 * 60_000, 'estrelas')).toBe(14 * 60_000);
  expect(untilMorning(34 * 60_000, 'calmo')).toBe(30 * 60_000);
  expect(untilMorning(0, 'calmo')).toBe(32 * 60_000);
  expect(phaseAt(24 * 60_000 + untilMorning(24 * 60_000, 'estrelas'), 'estrelas')).toBe('manha');
});
