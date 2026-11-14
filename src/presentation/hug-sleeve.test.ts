import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { lookIds } from '../domain/types';
import { looks } from '../content/catalog';
import { outfitLayer } from './outfit';
import { adultArt, lookSource } from './actor-paint';
import { adultSleeve, childArmPoints, sleeveCut, stretch } from './hug-sleeve';
import { inside, outlines } from './svg-outline.test-kit';

const sheet = readFileSync('public/art/adult.svg', 'utf8'), human = readFileSync('src/presentation/assets/human.svg', 'utf8');

it('lote 8: o braço do adulto no abraço veste a manga da roupa, com a cor e o corte do braço pendurado', () => {
  const painted = (look: 'sol' | 'outing' | 'market') => lookSource(look, adultArt(sheet));
  const sol = adultSleeve(painted('sol'), 'adult-sol-arms')!, outing = adultSleeve(painted('outing'), 'adult-outing-arms')!;
  const market = adultSleeve(painted('market'), 'adult-market-arms')!;
  // Short sleeves cover the top of the arm, long ones almost all of it; the cloth is the look's colour (the uniform's own).
  expect(sol.cut).toBeLessThan(.35); expect(sol.cut).toBeGreaterThan(.1);
  expect(outing.cut).toBeGreaterThan(.8);
  expect(sol.color).toBe(looks.sol.color);
  expect([market.color, market.outline]).toEqual([0xf2ede1, 0x715e58]);
  expect(sol.width).toBeCloseTo(18 / 12.4);
  for (const outfit of ['adult-sol-m', 'adult-sol-y', 'adult-outing', 'adult-outing-y', 'adult-office', 'adult-doctor', 'adult-firefighter', 'adult-police'])
    expect(adultSleeve(sheet, `${outfit}-arms`), outfit).not.toBeNull();
});

/** Every closed outline of a child's garment layer, in the 140 × 220 canvas (drawn `translate(0 -25.68) scale(1 1.12)`). */
function garment(id: string) {
  const start = human.indexOf(`<g id="${id}"`), group = human.slice(start, human.indexOf('</g>', start));
  return [...group.matchAll(/<path d="([^"]+)"/g)].flatMap(m => outlines(m[1]!)).map(g => g.map(p => ({ x: p.x, y: p.y * 1.12 - 25.68 })));
}
it('lote 8: a linha do braço de criança começa dentro da manga de toda roupa e sai dela no fim da manga, curta ou comprida', () => {
  const garments = [...new Set(lookIds.flatMap(look => [outfitLayer(look, false), outfitLayer(look, true)]))];
  const cuts = Object.fromEntries(garments.map(id => {
    const shapes = garment(id), on = childArmPoints().map(p => shapes.some(s => inside(p, s)) ? 255 : 0);
    // The Zoey top has straps, no sleeves: that arm goes round bare.
    expect(on.slice(0, 3), id).toEqual(id === 'body-zoey' ? [0, 0, 0] : [255, 255, 255]);
    return [id, sleeveCut(on)];
  }));
  expect(cuts['body-casual']).toBeLessThan(.6);
  expect(cuts['body-spiderman']).toBeGreaterThan(cuts['body-casual']!);
  expect(cuts['body-zoey']).toBe(0);
});

it('a manga cobre o começo do braço, pelo comprimento', () => {
  expect(sleeveCut([255, 255, 0, 0, 0])).toBe(.5);
  expect(sleeveCut([255, 255])).toBe(1);
  expect(stretch([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], .75)).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }]);
});
