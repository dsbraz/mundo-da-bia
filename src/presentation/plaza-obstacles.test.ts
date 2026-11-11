import { describe, expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { initialAlbum } from '../domain/houses';
import { localWorld, migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import { plotStart } from '../domain/neighborhood-geometry';
import { outdoorPoints } from '../domain/outdoor';
import { plazaObstacles } from './plaza-obstacles';
import { walkingPath } from './walking-path';
import type { World } from '../domain/types';

const street = (): World => localWorld(neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'visit', location: { kind: 'street' } }));
const inside = (b: { left: number; right: number; top: number; bottom: number }, p: { x: number; y: number }) => p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;

describe('obstáculos da praça', () => {
  it('banco, os dois pés do balanço e os quatro canteiros da horta ocupam o chão onde estão desenhados', () => {
    expect(plazaObstacles.map(o => o.name)).toEqual(['bench', 'swing-left', 'swing-right', 'praca-1', 'praca-2', 'praca-3', 'praca-4']);
    const at = (name: string) => plazaObstacles.find(o => o.name === name)!;
    expect(inside(at('bench'), { x: 180, y: 445 })).toBe(true);
    expect(inside(at('praca-1'), { x: 573, y: 452 })).toBe(true);
    expect(inside(at('praca-4'), { x: 612, y: 480 })).toBe(true);
    expect(inside(at('swing-left'), { x: 340, y: 445 })).toBe(true);
    expect(inside(at('swing-right'), { x: 460, y: 445 })).toBe(true);
    expect(plazaObstacles.some(o => inside(o, { x: 400, y: 445 }))).toBe(false);
  });
  it('a criança contorna a horta em vez de atravessá-la', () => {
    const path = walkingPath(street(), { x: 470, y: 455 }, { x: 700, y: 455 });
    expect(path).not.toBeNull();
    expect(path!.some(p => p.y > plazaObstacles.find(o => o.name === 'praca-4')!.bottom)).toBe(true);
    expect(walkingPath(street(), { x: 470, y: 455 }, { x: 573, y: 455 })).toBeNull();
  });
  it('contorna o banco e os pés do balanço', () => {
    const bench = walkingPath(street(), { x: 90, y: 440 }, { x: 290, y: 440 });
    expect(bench!.some(p => p.y > plazaObstacles[0]!.bottom)).toBe(true);
    const post = walkingPath(street(), { x: 300, y: 440 }, { x: 380, y: 440 });
    expect(post!.some(p => p.y > plazaObstacles[1]!.bottom)).toBe(true);
  });
  it('quem está sentado no banco consegue sair, e as chegadas da praça e das portas ficam livres', () => {
    const world = street();
    expect(walkingPath(world, outdoorPoints.bench, { x: 300, y: 520 })).not.toBeNull();
    for (const end of [{ x: 180, y: 510 }, { x: 400, y: 510 }, { x: 560, y: 510 }, { x: plotStart(0) + 220, y: 452 }, { x: 400, y: 445 }]) {
      expect(walkingPath(world, { x: 700, y: 520 }, end)?.at(-1)).toEqual(end);
    }
  });
  it('dentro de casa a praça não existe', () => {
    const room = { ...initialWorld(), layout: { ...initialWorld().layout, pieces: [] } };
    expect(walkingPath(room, { x: 470, y: 455 }, { x: 573, y: 455 })).toEqual([{ x: 573, y: 455 }]);
  });
});
