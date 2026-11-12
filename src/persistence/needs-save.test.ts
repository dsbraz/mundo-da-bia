import { expect, it } from 'vitest';
import { decodeNeighborhood, encodeNeighborhood } from './neighborhood';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
import { migrateNeighborhood } from '../domain/neighborhood';
import { initialNeeds, live, needsOf } from '../domain/needs';

const start = () => migrateNeighborhood(initialAlbum(initialWorld()));
const lived = () => live(start(), { type: 'live', elapsed: 60_000, phase: 'noite', idle: ['bia'] });

it('as necessidades não vão para o save: os bytes são os mesmos com ou sem elas', () => {
  const town = lived();
  expect(town.actors.every(a => a.needs)).toBe(true);
  expect(encodeNeighborhood(town)).toBe(encodeNeighborhood(start()));
  expect(encodeNeighborhood(town)).not.toContain('needs');
});
it('recarregar começa com fome 20, sono 0 e tédio 0, e um save com `needs` carrega sem elas', () => {
  const decoded = decodeNeighborhood(encodeNeighborhood(lived()))!;
  expect(decoded).toEqual(decodeNeighborhood(encodeNeighborhood(start())));
  expect(decoded.actors.map(needsOf)).toEqual(decoded.actors.map(() => initialNeeds()));
  const raw = JSON.parse(encodeNeighborhood(start()));
  raw.town.actors = raw.town.actors.map((a: object) => ({ ...a, needs: { fome: 90, sono: 90, tedio: 90, alegria: 0 } }));
  expect(decodeNeighborhood(JSON.stringify(raw))!.actors.every(a => a.needs === undefined)).toBe(true);
});
