import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { decodeNeighborhood, encodeNeighborhood } from './neighborhood';
import { migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
import { snacksOf } from '../domain/larder';
import type { Neighborhood } from '../domain/neighborhood-types';

const town = () => migrateNeighborhood(initialAlbum(initialWorld()));
const withSnacks = (snacks: unknown): string => {
  const base = town();
  return JSON.stringify({ version: 3, town: { ...base, buildings: base.buildings.map(b => ({ ...b, snacks })) } });
};

describe('o lanche que acaba no save (lote 6F, §4)', () => {
  it('todo save de antes (v2, v3 rico, v3 de quem já cozinhou) abre com 4 lanches', () => {
    const v2 = readFileSync(new URL('./fixtures/rich-save-v2.json', import.meta.url), 'utf8');
    const v3 = readFileSync(new URL('./fixtures/rich-save-v3.json', import.meta.url), 'utf8');
    const cooked = encodeNeighborhood({ ...town(), buildings: town().buildings.map(b => ({ ...b, stock: { ovo: 1 } })) });
    for (const raw of [v2, v3, cooked]) {
      const loaded = decodeNeighborhood(raw)!;
      expect(loaded.buildings.every(b => !Object.hasOwn(b, 'snacks'))).toBe(true);
      expect(loaded.buildings.map(snacksOf)).toEqual(loaded.buildings.map(() => 4));
    }
  });
  it('a geladeira sem lanche continua sem lanche depois de salvar e carregar', () => {
    for (const snacks of [0, 2, 4]) {
      const eaten: Neighborhood = { ...town(), buildings: town().buildings.map(b => ({ ...b, snacks })) };
      expect(decodeNeighborhood(encodeNeighborhood(eaten))).toEqual(eaten);
    }
  });
  it('9 vira 4; negativo vira 0; fração, texto ou vazio são lidos como nunca contado (4)', () => {
    expect(decodeNeighborhood(withSnacks(9))!.buildings[0]!.snacks).toBe(4);
    expect(decodeNeighborhood(withSnacks(-2))!.buildings[0]!.snacks).toBe(0);
    for (const snacks of [1.5, 'muito', null, [1]]) expect(Object.hasOwn(decodeNeighborhood(withSnacks(snacks))!.buildings[0]!, 'snacks')).toBe(false);
  });
  it('comprar o lanche, pagar, guardar: o bairro sobrevive a encode → decode igual', () => {
    const built = neighborhoodAction(town(), { type: 'construct', plot: 1, model: 'shop', plan: 'market' });
    const hall = { kind: 'interior' as const, building: 2, room: 'sala' as const };
    const ready = { ...built, location: hall, items: built.items.map(i => ({ ...i, holder: null })),
      actors: built.actors.map(a => a.id === 'bia' ? { ...a, seat: null, location: hall, room: 'sala' as const, x: 500, y: 500 } : a) };
    const greens = ready.buildings[1]!.layout.pieces.filter(p => p.kind === 'market-shelf').sort((a, b) => a.id - b.id)[1]!.id;
    const bought = neighborhoodAction(ready, { type: 'buy', actor: 'bia', piece: greens, good: 'lanche' });
    expect(bought.items.find(i => i.kind === 'sacola')!.contents).toEqual(['lanche']);
    expect(decodeNeighborhood(encodeNeighborhood(bought))).toEqual(bought);
  });
  it('o build anterior (89dce20f) lê o save novo: o campo do lanche fica como está e o lanche da sacola sai sozinho', () => {
    // What the previous build sees, reproduced here (and checked by decoding a lot 6F save with the 89dce20f source): a building field
    // and a good it does not know. The field is kept untouched through load and save; the bag keeps only the goods it knows.
    const built = neighborhoodAction(town(), { type: 'construct', plot: 1, model: 'shop', plan: 'market' });
    const hall = { kind: 'interior' as const, building: 2, room: 'sala' as const };
    const ready = { ...built, location: hall, items: built.items.map(i => ({ ...i, holder: null })),
      actors: built.actors.map(a => a.id === 'bia' ? { ...a, seat: null, location: hall, room: 'sala' as const, x: 500, y: 500 } : a) };
    const greens = ready.buildings[1]!.layout.pieces.filter(p => p.kind === 'market-shelf').sort((a, b) => a.id - b.id)[1]!.id;
    const bought = (['lanche', 'peixe'] as const).reduce<Neighborhood>((t, good) => neighborhoodAction(t, { type: 'buy', actor: 'bia', piece: greens, good }), ready);
    const saved = JSON.parse(encodeNeighborhood(bought)) as { town: { buildings: Record<string, unknown>[]; items: Record<string, unknown>[] } };
    saved.town.buildings[0]!.lanchinhos = 1;
    saved.town.items.forEach(i => { if (i.kind === 'sacola') i.contents = ['lanche-do-futuro', 'peixe']; });
    const loaded = decodeNeighborhood(JSON.stringify(saved))!;
    expect(loaded.buildings[0]!).toMatchObject({ lanchinhos: 1 });
    expect(decodeNeighborhood(encodeNeighborhood(loaded))!.buildings[0]!).toMatchObject({ lanchinhos: 1 });
    expect(loaded.items.find(i => i.kind === 'sacola')).toMatchObject({ holder: 'bia', contents: ['peixe'], paid: false });
  });
});
