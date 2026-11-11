import { describe, expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { initialAlbum } from '../domain/houses';
import { localWorld, migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import { plotSpots } from '../domain/garden';
import { plazaPlots } from '../domain/progress';
import { cropIds } from '../domain/types';
import type { Plant } from '../domain/types';
import { canPoint, gardenParts, plantArt, plotAt, standPoint } from './plaza-garden';
import { outdoorAt, outdoorTargets } from './outdoor-controls';
import { nearbyHotspots } from './plaza-glow';
import { plazaObstacles } from './plaza-obstacles';
import { walkingPath } from './walking-path';

const street = () => neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'visit', location: { kind: 'street' } });
const plant = (stage: Plant['stage'], watered: boolean): Plant => ({ crop: 'tomate', stage, since: 0, watered });

describe('desenho das plantas', () => {
  it('cinco estágios desenhados: semente, broto, folhas, flor e pronto, os dois últimos da cultura', () => {
    expect([0, 1, 2, 3, 4].map(stage => plantArt(plant(stage as Plant['stage'], true)).key))
      .toEqual(['plant-seed', 'plant-sprout', 'plant-leaves', 'plant-flower-tomate', 'plant-ready-tomate']);
  });
  it('com sede, as folhas caem, a flor se inclina e uma gota pisca; pronta nunca tem sede', () => {
    expect([0, 1, 2, 3].map(stage => plantArt(plant(stage as Plant['stage'], false))))
      .toEqual([{ key: 'plant-seed', lean: 0, drop: true }, { key: 'plant-sprout-droop', lean: 0, drop: true },
        { key: 'plant-leaves-droop', lean: 0, drop: true }, { key: 'plant-flower-tomate', lean: .3, drop: true }]);
    expect(plantArt(plant(4, false))).toEqual({ key: 'plant-ready-tomate', lean: 0, drop: false });
    expect(plantArt(plant(2, true))).toEqual({ key: 'plant-leaves', lean: 0, drop: false });
  });
  it('cada textura tem as suas partes da folha de arte, e toda cultura tem flor e pronto', () => {
    const parts = gardenParts();
    for (const crop of cropIds) {
      expect(parts[`plant-flower-${crop}`]!.ids).toEqual(['leaves', `bloom-${crop}`]);
      expect(parts[`plant-ready-${crop}`]!.ids).toEqual([`ready-${crop}`]);
    }
    expect(parts['plot-wet']!.ids).toEqual(['plot', 'soil-wet']);
    for (const key of ['plot', 'plant-seed', 'plant-sprout', 'plant-sprout-droop', 'plant-leaves', 'plant-leaves-droop', 'garden-drop', 'garden-can', 'garden-basket']) expect(parts[key], key).toBeDefined();
  });
});

describe('canteiros na praça', () => {
  it('um toque no canteiro ou na planta escolhe aquele canteiro; a fileira da frente vence onde as plantas se cruzam', () => {
    for (const plot of plazaPlots) expect(plotAt({ x: plotSpots[plot].x, y: plotSpots[plot].y - 12 })).toBe(plot);
    expect(plotAt({ x: plotSpots['praca-1'].x, y: plotSpots['praca-1'].y - 70 })).toBe('praca-1');
    expect(plotAt({ x: plotSpots['praca-3'].x, y: plotSpots['praca-1'].y + 10 })).toBe('praca-3');
    expect(plotAt({ x: 400, y: 445 })).toBeNull();
    expect(plotAt(canPoint)).toBeNull();
  });
  it('quem cuida fica ao lado do canteiro, num chão livre, de frente para ele', () => {
    const world = localWorld(street());
    for (const plot of plazaPlots) {
      const stand = standPoint(plot);
      expect(Math.abs(stand.point.x - plotSpots[plot].x), plot).toBeLessThanOrEqual(60);
      expect(Math.sign(plotSpots[plot].x - stand.point.x), plot).toBe(stand.facing);
      expect(walkingPath(world, { x: 300, y: 520 }, stand.point)?.at(-1), plot).toEqual(stand.point);
    }
  });
  it('os quatro canteiros ficam no caminho e são contornados', () => {
    const world = localWorld(street());
    for (const plot of plazaPlots) {
      const block = plazaObstacles.find(o => o.name === plot)!;
      expect(block.left).toBeLessThan(plotSpots[plot].x); expect(block.right).toBeGreaterThan(plotSpots[plot].x);
      expect(walkingPath(world, { x: 300, y: 520 }, { x: plotSpots[plot].x, y: plotSpots[plot].y - 5 }), plot).toBeNull();
    }
    const around = walkingPath(world, { x: 470, y: 470 }, { x: 700, y: 470 })!;
    expect(around.some(p => p.y > Math.max(...plazaObstacles.map(o => o.bottom)))).toBe(true);
  });
  it('o regador e os canteiros têm alvo próprio, sem número no nome, e o brilho não amontoa sobre os canteiros', () => {
    const town = street();
    const targets = outdoorTargets(town);
    expect(targets.filter(t => t.target === 'plot').map(t => t.plot)).toEqual([...plazaPlots]);
    for (const t of targets.filter(t => t.target === 'plot' || t.target === 'water')) expect(t.name).not.toMatch(/\d/);
    expect(outdoorAt(town, { x: plotSpots['praca-4'].x, y: plotSpots['praca-4'].y - 20 })).toMatchObject({ target: 'plot', plot: 'praca-4' });
    expect(outdoorAt(town, canPoint)).toMatchObject({ target: 'water' });
    const near = { ...town, actors: town.actors.map(a => a.id === 'bia' ? { ...a, location: { kind: 'street' as const }, x: 560, y: 520 } : a) };
    expect(nearbyHotspots(near, 'bia').some(t => t.target === 'plot')).toBe(false);
    expect(nearbyHotspots(near, 'bia').some(t => t.target === 'water')).toBe(true);
  });
});
