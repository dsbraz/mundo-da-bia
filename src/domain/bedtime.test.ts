import { expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import { seatPiece, seatPoint } from './seats';
import type { ActorId, Piece, World } from './types';

// Lot 6B: "Todos para a cama": everyone of the house goes to a free bed or sofa (a cat to its bed), whoever finds none asks for a bed.
const who = (world: World, id: ActorId) => world.actors.find(a => a.id === id)!;
const kindOf = (world: World, id: ActorId) => { const a = who(world, id); return a.seat ? seatPiece(world, a.seat, a.room)?.kind : undefined; };

it('na casa nova: a cama de um, o sofá de dois e a caminha de um gato; quem sobra pede uma cama, quem está à vista por último', () => {
  const world = initialWorld(), result = transition(world, { type: 'bedtime' });
  const next = result.state;
  // The Bia (first) gets the bed of the bedroom; the Luna keeps her sofa seat and Léo takes the other one.
  expect(who(next, 'bia')).toMatchObject({ room: 'quarto', seat: '8.0', resting: true, ...{ x: seatPoint(next, '8.0', 'quarto')!.x } });
  expect(who(next, 'luna')).toMatchObject({ room: 'sala', seat: '2.1', resting: true });
  expect(who(next, 'leo')).toMatchObject({ room: 'sala', seat: '2.0', resting: true });
  // No place left for Rui and the grown-ups: they stay up and ask for a bed, the one in view (Rui) last.
  for (const id of ['rui', 'daniel', 'fabiana'] as const) expect(who(next, id)).toEqual(who(world, id));
  const missing = result.events.filter(e => e.type === 'missing');
  expect(missing.map(e => e.actor).sort()).toEqual(['daniel', 'fabiana', 'rui']);
  expect(missing.every(e => e.need === 'bed' && e.want === 'bed')).toBe(true);
  expect(result.events.at(-1)).toMatchObject({ type: 'missing', actor: 'rui' });
  // The cats: one in the cat bed (in the bedroom), the others on the living-room rug; nobody of them on a sofa or a bed.
  const cats = next.actors.filter(a => a.kind === 'cat');
  expect(cats.every(c => c.resting)).toBe(true);
  expect(cats.filter(c => kindOf(next, c.id) === 'cat-bed')).toHaveLength(1);
  expect(cats.filter(c => c.seat && kindOf(next, c.id) !== 'cat-bed')).toEqual([]);
  // One line for the room, by the first one in view who lies down (Luna, on her sofa seat), not six bubbles over each other.
  expect(result.events.filter(e => e.type === 'rested')).toEqual([{ type: 'rested', actor: 'luna' }]);
  // The view stays where it was.
  expect(next.room).toBe('sala');
});
it('quem já dorme fica; com mais lugares, ninguém sobra: uma cama antes de um sofá, a do próprio quarto antes das outras', () => {
  const world = initialWorld(), sofa = (id: number, x: number): Piece => ({ id, kind: 'sofa', room: 'quarto', x, y: 270, color: 'original', flipped: false });
  const roomy: World = { ...world, layout: { ...world.layout, nextId: 93, pieces: [...world.layout.pieces, sofa(91, 200), sofa(92, 530)] } };
  const asleep = transition(roomy, { type: 'rest', actor: 'bia' }).state;
  const result = transition(asleep, { type: 'bedtime' });
  expect(who(result.state, 'bia')).toEqual(who(asleep, 'bia'));
  expect(result.events.some(e => e.actor === 'bia')).toBe(false);
  // The Bia already naps on the living-room sofa: Léo (in the living room) takes the bed of the bedroom before any sofa.
  expect(who(result.state, 'leo')).toMatchObject({ room: 'quarto', seat: '8.0' });
  // The grown-ups take the bedroom's sofas, their own room's, and nobody is left without a place.
  expect([kindOf(result.state, 'daniel'), kindOf(result.state, 'fabiana')]).toEqual(['sofa', 'sofa']);
  expect(who(result.state, 'daniel').room).toBe('quarto');
  expect(result.events.filter(e => e.type === 'missing')).toEqual([]);
});
