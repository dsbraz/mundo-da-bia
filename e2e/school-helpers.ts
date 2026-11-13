import { expect, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { fromPiece } from '../src/domain/layout';
import { seatSlots } from '../src/domain/seats';
import { visualPiecePoint } from '../src/presentation/furniture-scale';
import type { Neighborhood } from '../src/domain/neighborhood-types';
import { drag, readTown, ready, tap } from './helpers';

const saveKey = 'mundo-da-bia:neighborhood:v3';
const classroom = { kind: 'interior' as const, building: 2, room: 'quarto' as const };
/** A school next door, and the Bia and the Léo standing in its classroom (the view there); the others stay home. */
export function schoolTown(): Neighborhood {
  const town = neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'construct', plot: 1, model: 'school' });
  const spots: Record<string, number> = { bia: 420, leo: 760 };
  return { ...town, location: classroom, actors: town.actors.map(a => a.id in spots ? { ...a, location: classroom, room: 'quarto', seat: null, x: spots[a.id]!, y: 535 } : a) };
}
const desks = (town: Neighborhood) => town.buildings[1]!.layout.pieces.filter(p => p.room === 'quarto' && p.kind === 'school-desk');
export async function openSchool(page: Page, town = schoolTown()) {
  await page.addInitScript(([key, value]) => { if (!localStorage.getItem(key!)) localStorage.setItem(key!, value!); }, [saveKey, encodeNeighborhood(town)]);
  await ready(page);
}
/** Drags `id` by the body onto the seat of desk `n`, and waits until she sits there. */
export async function seatAt(page: Page, id: string, n: number) {
  const town = await readTown(page), actor = town.actors.find(a => a.id === id)!, desk = desks(town)[n]!;
  const seat = visualPiecePoint(desk, fromPiece(desk, seatSlots['school-desk']![0]!));
  await drag(page, [actor.x, actor.y - 60], [seat.x, seat.y - 60]);
  await expect.poll(async () => (await readTown(page)).actors.find(a => a.id === id)!.seat).toBe(`${desk.id}.0`);
}
export async function tapBoard(page: Page) {
  const board = (await readTown(page)).buildings[1]!.layout.pieces.find(p => p.room === 'quarto' && p.kind === 'board')!;
  // Left on the green: the selected child's action menu may float over the middle of the board.
  await tap(page, board.x + 50, board.y + 130);
}
