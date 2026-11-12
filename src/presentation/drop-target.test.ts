import { expect, it } from 'vitest';
import { initialWorld, transition } from '../domain/world';
import { seatPoint, seatPiece } from '../domain/seats';
import type { Piece, World } from '../domain/types';
import { visualPiecePoint } from './furniture-scale';
import { actorDropTarget, drawnBox, personTarget, targetName } from './drop-target';
import { glassOf } from './mirror-reflection';
import { noteFrame, waveFrame } from './play-effects';

const standing = (world: World): World => ({ ...world, actors: world.actors.map(a => ({ ...a, seat: null, x: 300 + a.id.length * 40, y: 530 })) });
const feetOn = (world: World, seat: string) => visualPiecePoint(seatPiece(world, seat)!, seatPoint(world, seat)!);

it('arrastando alguém, o assento livre sob os pés acende; o ocupado diz quem está nele', () => {
  const world = standing(initialWorld());
  const free = actorDropTarget(world, 'bia', feetOn(world, '2.0'));
  expect(free).toMatchObject({ kind: 'seat', seat: '2.0', box: drawnBox(world.layout.pieces.find(p => p.id === 2)!) });
  expect(targetName(free)).toBe('seat:2.0');
  const taken = transition(world, { type: 'sit', actor: 'luna', seat: '2.0' }).state;
  expect(targetName(actorDropTarget(taken, 'bia', feetOn(taken, '2.0')))).toBe('seat:2.0:luna');
  expect(targetName(actorDropTarget(taken, 'luna', feetOn(taken, '2.0')))).toBe('seat:2.0');
  expect(actorDropTarget(world, 'bia', { x: 700, y: 560 })).toBeNull();
});

it('sem assento, o espelho à frente dos pés acende; um objeto sobre alguém acende essa pessoa', () => {
  const mirror: Piece = { id: 40, kind: 'mirror', room: 'sala', x: 600, y: 130, color: 'original', flipped: false };
  const world = { ...standing(initialWorld()), layout: { ...initialWorld().layout, pieces: [mirror], nextId: 41 } };
  expect(actorDropTarget(world, 'bia', { x: 660, y: 420 })).toMatchObject({ kind: 'mirror', piece: 40, box: glassOf(mirror) });
  expect(actorDropTarget(world, 'bia', { x: 760, y: 420 })).toBeNull();
  const luna = world.actors.find(a => a.id === 'luna')!;
  expect(targetName(personTarget(luna))).toBe('person:luna');
  expect(personTarget(undefined)).toBeNull();
  expect(targetName(null)).toBe('');
});

it('as notas sobem e somem uma após a outra, as ondas da TV crescem; com movimento reduzido ficam paradas', () => {
  noteFrame(0, false).forEach((n, i) => expect(n.rise).toBeCloseTo(i * 40 / 3));
  expect(noteFrame(0, true)).toEqual(noteFrame(5000, true));
  expect(noteFrame(1599, false)[0]!.alpha).toBeLessThan(.01);
  waveFrame(0, false).forEach((w, i) => expect(w.radius).toBeCloseTo(10 + i * 26 / 3));
  expect(waveFrame(0, true)).toEqual(waveFrame(9999, true));
});
