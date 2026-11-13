import { describe, expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import { fromPiece } from './layout';
import { floorTop } from './geometry';
import type { World } from './types';

const teddy = (world: World) => world.items.find(i => i.id === 'ursinho')!;
const place = (world: World, x: number, y: number) => transition(world, { type: 'place', item: 'ursinho', point: { x, y } });
const table = (world: World) => world.layout.pieces.find(p => p.kind === 'table' && p.room === world.room)!;

describe('física leve: soltar é cair na vertical (W3L-17, §3.7)', () => {
  it('place sobre a mesa cai em spot: table, no tampo, no x em que foi solto', () => {
    const world = initialWorld(), top = fromPiece(table(world), { x: 280, y: 475 });
    const { state, events } = place(world, top.x, top.y - 120);
    expect(teddy(state)).toMatchObject({ spot: 'table', x: top.x, y: top.y, holder: null, room: 'sala' });
    expect(events).toEqual([{ type: 'dropped' }]);
  });
  it('rente ao tampo também fica na mesa; logo abaixo do tampo, cai no chão', () => {
    const world = initialWorld(), top = fromPiece(table(world), { x: 280, y: 475 });
    expect(teddy(place(world, top.x, top.y + 12).state).spot).toBe('table');
    expect(teddy(place(world, top.x, top.y + 13).state)).toMatchObject({ spot: 'floor', y: top.y + 13 });
  });
  it('fora da largura da mesa cai no chão abaixo', () => {
    const world = initialWorld(), left = fromPiece(table(world), { x: 165, y: 475 }), right = fromPiece(table(world), { x: 395, y: 475 });
    expect(teddy(place(world, left.x, 300).state).spot).toBe('table');
    expect(teddy(place(world, right.x, 300).state).spot).toBe('table');
    expect(teddy(place(world, left.x - 1, 300).state)).toMatchObject({ spot: 'floor', x: left.x - 1, y: floorTop(world) });
    expect(teddy(place(world, right.x + 1, 300).state)).toMatchObject({ spot: 'floor', y: floorTop(world) });
  });
  it('no meio da parede cai no chão abaixo (escorrega até o rodapé), nunca fica no ar', () => {
    const world = initialWorld();
    expect(teddy(place(world, 800, 150).state)).toMatchObject({ spot: 'floor', x: 800, y: 410 });
    expect(teddy(place(world, 800, 409).state)).toMatchObject({ spot: 'floor', y: 410 });
    expect(teddy(place(world, 800, 500).state)).toMatchObject({ spot: 'floor', y: 500 });
  });
  it('na rua o chão começa mais abaixo', () => {
    expect(floorTop({ ...initialWorld(), streetWidth: 2000 })).toBe(430);
    expect(floorTop(initialWorld())).toBe(410);
  });
  it('fora do cômodo, abaixo do chão ou sem número: nada muda', () => {
    const world = initialWorld();
    for (const [x, y] of [[20, 400], [990, 400], [500, 560], [NaN, 400], [500, Infinity]]) expect(place(world, x!, y!)).toEqual({ state: world, events: [] });
  });
  it('a mesa de outro cômodo não segura nada', () => {
    const world = transition(initialWorld(), { type: 'room', room: 'quarto' }).state;
    const moved = transition(world, { type: 'transfer', item: 'ursinho', room: 'quarto', point: { x: 500, y: 500 } }).state;
    const top = fromPiece(table(initialWorld()), { x: 280, y: 475 });
    expect(teddy(transition(moved, { type: 'place', item: 'ursinho', point: { x: top.x, y: 300 } }).state).spot).toBe('floor');
  });
});
