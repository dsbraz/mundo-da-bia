import { expect, it } from 'vitest';
import { goTo } from './go';
import { migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
import type { Location, Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';

function play(building: boolean, start: Neighborhood = migrateNeighborhood(initialAlbum(initialWorld()))) {
  let town = start; const actions: NeighborhoodAction[] = [];
  const go = goTo({ town: () => town, selected: () => 'bia', building: () => building, townDispatch: action => { actions.push(action); town = neighborhoodAction(town, action); } });
  return { go, actions, town: () => town };
}
const bia = (town: Neighborhood) => town.actors.find(a => a.id === 'bia')!;

it('takes the selected character along to another room while playing', () => {
  const game = play(false), home = game.town().buildings[0]!;
  const quarto: Location = { kind: 'interior', building: home.id, room: 'quarto' };
  game.go(quarto);
  expect(game.town().location).toEqual(quarto); expect(bia(game.town()).location).toEqual(quarto);
});

it('only changes the view while creating', () => {
  const game = play(true);
  game.go({ kind: 'street' });
  expect(game.town().location).toEqual({ kind: 'street' }); expect(bia(game.town()).location.kind).toBe('interior');
});

it('fetches a character who is elsewhere and walks out to the street together', () => {
  const game = play(false), home = game.town().buildings[0]!;
  game.go({ kind: 'interior', building: home.id, room: 'quarto' });
  game.actions.length = 0;
  const away = neighborhoodAction(game.town(), { type: 'visit', location: { kind: 'interior', building: home.id, room: 'sala' } });
  const again = play(false, away);
  again.go({ kind: 'street' });
  expect(again.actions[0]).toEqual({ type: 'visit', location: { kind: 'interior', building: home.id, room: 'quarto' } });
  expect(again.town().location).toEqual({ kind: 'street' }); expect(bia(again.town()).location).toEqual({ kind: 'street' });
});

it('gets down from the swing when going into a house', () => {
  const game = play(false), home = game.town().buildings[0]!;
  game.go({ kind: 'street' });
  const swinging = neighborhoodAction(game.town(), { type: 'outdoor', actor: 'bia', target: 'swing' });
  expect(swinging.outdoor.swing).toBe('bia');
  const again = play(false, swinging);
  again.go({ kind: 'interior', building: home.id, room: home.entry });
  expect(again.town().outdoor.swing).toBeNull(); expect(bia(again.town()).location).toMatchObject({ kind: 'interior', room: home.entry });
});
