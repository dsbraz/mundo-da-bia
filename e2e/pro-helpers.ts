import type { Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { professionOf, staffAt } from '../src/domain/staff';
import { buildingModels, type BuildingModel, type Neighborhood } from '../src/domain/neighborhood-types';
import type { RoomId } from '../src/domain/types';
import { readTown, ready, tap } from './helpers';

/** The institutions with a professional (lot 7). */
export const places = buildingModels.filter(model => professionOf(model));
/** An institution on plot 1, with the Bia and the Léo standing in the room its professional works in (the view there). */
export function proTown(model: BuildingModel, spots: Record<string, number> = { bia: 420, leo: 760 }): Neighborhood {
  const town = neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'construct', plot: 1, model });
  // Her work room (#37: her one place; the entry room is her work room at the fire station, the police and the stadium).
  const entry = town.buildings[1]!.entry, staffed = (id: RoomId) => !!staffAt(town, { kind: 'interior', building: 2, room: id });
  const room = (Object.keys(town.buildings[1]!.layout.rooms) as RoomId[]).find(id => id !== entry && staffed(id)) ?? entry;
  const where = { kind: 'interior' as const, building: 2, room };
  return { ...town, location: where, actors: town.actors.map(a => a.id in spots ? { ...a, location: where, room, seat: null, x: spots[a.id]!, y: 535 } : a) };
}
export async function openPro(page: Page, town: Neighborhood) {
  await page.addInitScript(([key, value]) => { if (!localStorage.getItem(key!)) localStorage.setItem(key!, value!); }, ['mundo-da-bia:neighborhood:v3', encodeNeighborhood(town)]);
  await ready(page);
}
/** Taps the professional of the room shown at her chest (her spot comes from the domain, as the scene draws it). */
export async function tapStaff(page: Page) {
  const town = await readTown(page), staff = staffAt(town, town.location)!;
  await tap(page, staff.x, staff.y - 120);
}
