import { expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import { addRoom } from './rooms';
import { needsOf } from './needs';
import { tableOf } from './seats';
import type { RecipeId } from './progress';
import type { ActorId, Item, Piece, SeatRef, World } from './types';

// Lot 6B: one dish shared by two people seated at the same table: both eat it and both get the relief.
const dish = (recipe: RecipeId, holder: ActorId | null = null): Item =>
  ({ id: '9:prato', kind: 'prato', recipe, room: 'sala', x: 400, y: 500, holder, spot: 'floor' }) as Item;
const hungry = (world: World): World => ({ ...world, actors: world.actors.map(a => ({ ...a, needs: { fome: 70, sono: 0, tedio: 0, alegria: 0 } })) });
const who = (world: World, id: ActorId) => world.actors.find(a => a.id === id)!;
/** A picnic table (4 seats) and a lone chair far from it, in the living room. */
function picnic(): World {
  const world = initialWorld(), pieces: Piece[] = [{ id: 40, kind: 'picnic-table', room: 'sala', x: 300, y: 340, color: 'original', flipped: false },
    { id: 41, kind: 'chair', room: 'sala', x: 860, y: 360, color: 'original', flipped: false }];
  return hungry({ ...world, layout: { ...world.layout, nextId: 42, pieces: [...world.layout.pieces, ...pieces] }, actors: world.actors.map(a => ({ ...a, seat: null, x: 500, y: 540 })) });
}
const sit = (world: World, actor: ActorId, seat: SeatRef) => transition(world, { type: 'sit', actor, seat }).state;

it('dois sentados à mesma mesa dividem o prato: os dois comem e os dois matam a fome', () => {
  const world = sit(sit(picnic(), 'bia', '40.0'), 'leo', '40.2');
  const result = transition({ ...world, items: [...world.items, dish('panqueca', 'bia')] }, { type: 'feed', actor: 'bia' });
  expect(result.state.items.some(i => i.id === '9:prato')).toBe(false);
  expect(result.events).toEqual([{ type: 'ate', actor: 'bia', recipe: 'panqueca' }, { type: 'ate', actor: 'leo', recipe: 'panqueca', by: 'bia' }]);
  for (const id of ['bia', 'leo'] as const) {
    expect(needsOf(who(result.state, id)).fome).toBeLessThan(70);
    expect(who(result.state, id).fed).toBe(true);
  }
  // Only one shares it: the third at the table keeps her hunger; the dish's favourite still dances.
  const three = sit(world, 'luna', '40.3');
  const shared = transition({ ...three, items: [...three.items, dish('panqueca', 'bia')] }, { type: 'feed', actor: 'bia' });
  expect(shared.events.filter(e => e.type === 'ate')).toHaveLength(2);
  expect(shared.state.actors.filter(a => needsOf(a).fome < 70)).toHaveLength(2);
});
it('quem está noutra mesa, em pé ou dormindo não divide: come sozinha', () => {
  const alone = sit(sit(picnic(), 'bia', '40.0'), 'leo', '41.0');
  const result = transition({ ...alone, items: [...alone.items, dish('panqueca', 'bia')] }, { type: 'feed', actor: 'bia' });
  expect(result.events).toEqual([{ type: 'ate', actor: 'bia', recipe: 'panqueca' }]);
  expect(needsOf(who(result.state, 'leo')).fome).toBe(70);
  // The one who comes to eat sits at the table first, then shares with whoever is there.
  const seated = sit(picnic(), 'leo', '40.1');
  const comes = transition({ ...seated, items: [...seated.items, dish('panqueca', 'bia')] }, { type: 'feed', actor: 'bia' });
  expect(who(comes.state, 'bia').seat).toMatch(/^40\./);
  expect(comes.events.map(e => e.actor)).toEqual(['bia', 'leo']);
});
it('as cadeiras de uma cozinha nova são da mesma mesa; um sofá ou uma cadeira solta não é mesa', () => {
  const kitchen = addRoom(initialWorld(), { name: 'Cozinha', template: 'kitchen', size: 'medium', cell: 2 });
  const here = kitchen.layout.pieces.filter(p => p.room === kitchen.room), table = here.find(p => p.kind === 'table')!;
  for (const chair of here.filter(p => p.kind === 'chair')) expect(tableOf(kitchen, `${chair.id}.0`)).toBe(table.id);
  expect(tableOf(picnic(), '40.3')).toBe(40);
  expect(tableOf(picnic(), '41.0')).toBeUndefined();
  expect(tableOf(picnic(), '2.0')).toBeUndefined();
});
