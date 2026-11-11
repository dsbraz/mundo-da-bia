import { expect, it } from 'vitest';
import { decodeNeighborhood, encodeNeighborhood } from './neighborhood';
import { migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
import { recipes } from '../domain/recipes';
import type { Neighborhood } from '../domain/neighborhood-types';
import type { PieceKind } from '../domain/types';

const roundTrip = (town: Neighborhood) => decodeNeighborhood(encodeNeighborhood(town));
/** House 1 with one bench piece at `x`, `y` of the living room, a chef Bia and a full pantry. */
function kitchen(kind: PieceKind, x: number, y: number): Neighborhood {
  const town = migrateNeighborhood(initialAlbum(initialWorld()));
  const [house] = town.buildings;
  return { ...town, buildings: [{ ...house!, layout: { ...house!.layout, nextId: 60, pieces: [...house!.layout.pieces, { id: 50, kind, room: 'sala', x, y, color: 'original', flipped: false }] } }],
    actors: town.actors.map(a => a.id === 'bia' ? { ...a, look: 'chef' as const } : a),
    progress: { ...town.progress, specials: ['chocolate', 'canela', 'mel'], basket: { alface: 2, tomate: 4, cenoura: 6, milho: 6, morango: 6, abobora: 6 } } };
}

it('cozinhar qualquer receita, em qualquer canto, até a mesa encher, sobrevive a encode → decode igual', () => {
  for (const [kind, x, y] of [['stove', 0, 250], ['counter', 780, 420], ['kitchen-cart', 430, 140]] as const) {
    let town = kitchen(kind, x, y), cooked = 0;
    for (const recipe of recipes) {
      // A full table first: the 7th is refused; then the table is cleared and the recipe cooks.
      const action = { type: 'cook' as const, building: 1, piece: 50, cook: 'bia' as const, ingredients: recipe.ingredients, utensil: recipe.utensil };
      if (town.items.filter(i => i.kind === 'prato').length === 6) {
        expect(neighborhoodAction(town, action)).toBe(town);
        town = { ...town, items: town.items.filter(i => i.kind !== 'prato') };
      }
      const next = neighborhoodAction(town, action);
      expect(roundTrip(next), `${kind} ${recipe.id}`).toEqual(next);
      cooked += Number(next !== town); town = next;
    }
    expect(cooked).toBe(29);
    expect(town.progress.basket).toEqual({ cenoura: 3, milho: 4, morango: 4, abobora: 4 });
  }
});
