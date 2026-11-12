import { expect, it } from 'vitest';
import { decodeNeighborhood, encodeNeighborhood } from './neighborhood';
import { localWorld, migrateNeighborhood, neighborhoodAction, storeWorld } from '../domain/neighborhood';
import { initialAlbum } from '../domain/houses';
import { initialWorld, transition } from '../domain/world';
import { recipes } from '../domain/recipes';
import type { Neighborhood } from '../domain/neighborhood-types';
import { actorIds } from '../domain/types';
import type { PieceKind } from '../domain/types';

const roundTrip = (town: Neighborhood) => decodeNeighborhood(encodeNeighborhood(town));
const unfelt = (town: Neighborhood) => ({ ...town, actors: town.actors.map(a => ({ ...a, needs: undefined })) });
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
      if (town.items.filter(i => i.kind === 'prato' && i.holder === null).length === 6) {
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

it('cada personagem recebendo cada prato (come ou cheira) e comendo com o botão sobrevive a encode → decode igual', () => {
  const start = kitchen('stove', 300, 250);
  for (const recipe of recipes) {
    const cooked = neighborhoodAction(start, { type: 'cook', building: 1, piece: 50, cook: 'bia', ingredients: recipe.ingredients, utensil: recipe.utensil });
    const plate = cooked.items.find(i => i.kind === 'prato')!;
    let town = cooked;
    for (const actor of actorIds) {
      const next = storeWorld(cooked, transition(localWorld(cooked), { type: 'give', actor, item: plate.id }).state);
      // Eating moves the needs (§3.1), which are never saved: they come back as the morning's.
      expect(roundTrip(next), `${actor} ${recipe.id}`).toEqual(unfelt(next));
      if (!next.items.some(i => i.id === plate.id) && town === cooked) town = next;
    }
    expect(town.items.some(i => i.id === plate.id), recipe.id).toBe(false);
    const held = transition(localWorld(cooked), { type: 'pick', actor: 'bia', item: plate.id }).state;
    const fed = storeWorld(cooked, transition(held, { type: 'feed', actor: 'bia' }).state);
    expect(fed.items.some(i => i.id === plate.id)).toBe(false);
    expect(roundTrip(fed)).toEqual(unfelt(fed));
  }
});
