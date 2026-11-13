import { describe, expect, it } from 'vitest';
import { decodeNeighborhood, encodeNeighborhood } from './neighborhood';
import { migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
import type { Neighborhood } from '../domain/neighborhood-types';

const town = (): Neighborhood => migrateNeighborhood(initialAlbum(initialWorld()));
const withMarket = () => neighborhoodAction(town(), { type: 'construct', plot: 1, model: 'shop', plan: 'market' });

describe('o mercado no save (W3L-21)', () => {
  it('construir o mercado, salvar e carregar devolve o mesmo bairro, com as peças e o cômodo de mercado', () => {
    const built = withMarket();
    expect(decodeNeighborhood(encodeNeighborhood(built))).toEqual(built);
  });
  it('um modelo de cômodo desconhecido vira vazio e a peça desconhecida sai sozinha, sem perder o mercado', () => {
    const built = withMarket(), shop = built.buildings.at(-1)!;
    const raw = JSON.parse(encodeNeighborhood(built)) as { town: { buildings: { layout: { rooms: Record<string, { template: string }>; pieces: { kind: string }[] } }[] } };
    const saved = raw.town.buildings.at(-1)!.layout;
    saved.rooms.quarto!.template = 'padaria'; saved.pieces.push({ ...saved.pieces[0]!, kind: 'balcao-de-padaria', id: 98 } as never);
    const loaded = decodeNeighborhood(JSON.stringify(raw))!.buildings.at(-1)!;
    expect(loaded.layout.pieces).toEqual(shop.layout.pieces);
    expect(loaded.layout.rooms.quarto!.template).toBe('empty');
  });
});
