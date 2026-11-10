import { describe, expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { floorTop, onFloor, walkable } from './floor-band';
import { supportedActor } from './furniture-scale';
import { actorDepth } from './piece-art';
import { walkingPath } from './walking-path';

describe('faixa de chão', () => {
  const world = initialWorld();
  it('dentro de casa os pés ficam abaixo do rodapé pintado (y 392)', () => {
    expect(floorTop(world)).toBeGreaterThan(392);
    expect(onFloor(world, { x: 500, y: 300 }).y).toBe(floorTop(world));
    expect(walkable(world, { x: 500, y: 300 })).toBe(false);
    expect(walkable(world, { x: 500, y: 500 })).toBe(true);
  });
  it('na rua o chão começa abaixo das fachadas, mas alcança o banco e o balanço (y 445)', () => {
    const street = { ...world, streetWidth: 2000 };
    expect(floorTop(street)).toBeGreaterThan(floorTop(world) - 1);
    expect(floorTop(street)).toBeLessThanOrEqual(445);
  });
  it('o caminho nunca passa pela parede, mesmo partindo de um save antigo na parede', () => {
    const empty = { ...world, layout: { ...world.layout, pieces: [] } };
    const path = walkingPath(empty, { x: 200, y: 300 }, { x: 800, y: 500 })!;
    expect(path).not.toBeNull();
    expect(path.every(p => p.y >= floorTop(empty))).toBe(true);
  });
  it('personagem salvo na parede é desenhado no chão e ordenado como quem está no chão', () => {
    const actor = { ...world.actors.find(a => !a.seat)!, y: 300 };
    expect(supportedActor(world, actor).y).toBe(floorTop(world));
    expect(actorDepth(world, actor)).toBe(floorTop(world));
  });
});

describe('aproximação de móveis encostados na parede', () => {
  it('o guarda-roupa continua alcançável a partir do chão', async () => {
    const { approach } = await import('./equipment-interaction');
    const world = initialWorld();
    const point = approach(world, 'bia', { type: 'interact', target: 'drawer' });
    expect(point).not.toBeNull();
    expect(point!.y).toBeGreaterThanOrEqual(floorTop(world));
  });
});
