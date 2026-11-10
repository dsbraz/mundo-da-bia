import { expect, it } from 'vitest';
import { doorWalk } from './door-walk';
import { migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
import type { Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';
import type { Point } from '../domain/types';
import type { walking } from '../presentation/walking';

function setup(building = false, start: Neighborhood = migrateNeighborhood(initialAlbum(initialWorld()))) {
  let town = start, arrived: (() => void) | null = null, entered: (() => void) | null = null;
  const actions: NeighborhoodAction[] = [], walks: Point[] = [], events = new EventTarget();
  const walker = { start: (point: Point, done: () => void) => { walks.push(point); arrived = done; }, cancel: () => {} } as unknown as ReturnType<typeof walking>;
  const enter = doorWalk({ town: () => town, selected: () => 'bia', building: () => building, walker,
    dispatch: action => { actions.push(action); town = neighborhoodAction(town, action); }, enterDoor: (_id, _where, done) => { entered = done; } }, events);
  return { enter, actions, walks, events, town: () => town, arrive: () => arrived!(), finish: () => entered!() };
}

it('walks to the door, goes in and comes out in front of the inside door', () => {
  const game = setup();
  expect(game.enter({ kind: 'street' })).toBe(true);
  expect(game.walks).toEqual([{ x: 550, y: 432 }]); expect(game.actions).toEqual([]);
  game.arrive(); expect(game.actions).toEqual([]);
  game.finish();
  expect(game.actions).toEqual([{ type: 'transport', actor: 'bia', location: { kind: 'street' }, point: expect.objectContaining({ y: 520 }) as Point }]);
  expect(game.town().actors[0]!.location).toEqual({ kind: 'street' });
  const home = game.town().buildings[0]!, inside = { kind: 'interior' as const, building: home.id, room: home.entry };
  game.enter(inside); game.arrive(); game.finish();
  expect(game.actions.at(-1)).toEqual({ type: 'transport', actor: 'bia', location: inside, point: { x: 550, y: 480 } });
});
it('a new touch while going in keeps the character at the door', () => {
  const game = setup();
  game.enter({ kind: 'street' }); game.arrive();
  game.events.dispatchEvent(new Event('pointerdown'));
  game.finish(); expect(game.actions).toEqual([]);
});
it('only visits in Create mode or when the chosen character is elsewhere', () => {
  expect(setup(true).enter({ kind: 'street' })).toBe(false);
  const town = migrateNeighborhood(initialAlbum(initialWorld()));
  const away = setup(false, neighborhoodAction(town, { type: 'visit', location: { kind: 'street' } }));
  expect(away.enter({ kind: 'interior', building: 1, room: 'sala' })).toBe(false); expect(away.walks).toEqual([]);
});
