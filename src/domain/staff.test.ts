import { describe, expect, it } from 'vitest';
import { professionOf, staffAt, staffBody, type Profession } from './staff';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
import { initialAlbum } from './houses';
import { initialWorld } from './world';
import { passages } from './passages';
import { doorway } from './doorway';
import { pieceBounds } from './layout';
import { overlap } from './placement';
import { actorIds } from './types';
import type { BuildingModel, Location, Neighborhood } from './neighborhood-types';
import type { RoomId } from './types';

const built = (model: BuildingModel): Neighborhood => neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'construct', plot: 1, model });
const roomOf = (town: Neighborhood, template: string) => Object.entries(town.buildings[1]!.layout.rooms).find(([, r]) => r.template === template)![0] as RoomId;
const at = (_town: Neighborhood, room: RoomId): Location => ({ kind: 'interior', building: 2, room });
const work: [BuildingModel, Profession, string][] = [['school', 'teacher', 'classroom'], ['fire-station', 'firefighter', 'dispatch'], ['police', 'police', 'reception'],
  ['hospital', 'doctor', 'consultation'], ['sports-club', 'coach', 'gym'], ['stadium', 'coach', 'sportsfield'], ['office', 'clerk', 'office']];
const box = (p: { x: number; y: number }) => ({ left: p.x - staffBody.half, right: p.x + staffBody.half, top: p.y - staffBody.height, bottom: p.y });
const rect = (r: { x: number; y: number; width: number; height: number }) => ({ left: r.x, right: r.x + r.width, top: r.y, bottom: r.y + r.height });

describe('os profissionais de cada instituição (lote 7)', () => {
  it('cada instituição tem o seu profissional; casa, apartamento e loja não têm', () => {
    for (const [model, profession] of work) expect(professionOf(model)).toBe(profession);
    for (const model of ['house', 'apartment', 'shop'] as const) expect(professionOf(model)).toBeUndefined();
  });
  for (const [model, profession, template] of work) it(`${profession} trabalha no cômodo ${template} de ${model}, fora das passagens, da porta da rua e das peças-chave`, () => {
    const town = built(model), room = roomOf(town, template), layout = town.buildings[1]!.layout;
    const staff = staffAt(town, at(town, room))!;
    expect(staff).toMatchObject({ profession, building: 2, room });
    expect(passages(layout, room).every(p => overlap(box(staff), rect(p.zone)) === 0)).toBe(true);
    if (layout.rooms[room]!.cell === 0) expect(overlap(box(staff), rect(doorway.interior))).toBe(0);
    const keys = layout.pieces.filter(p => p.room === room && ['board', 'counter', 'checkout'].includes(p.kind));
    expect(keys.every(p => overlap(box(staff), rect({ ...pieceBounds[p.kind], x: p.x, y: p.y })) === 0)).toBe(true);
    // In a 1024-wide view the whole figure is on screen.
    expect(staff.x - staffBody.half).toBeGreaterThanOrEqual(40);
  });
  it('nos outros cômodos, na rua e em casa não há profissional', () => {
    const town = built('school');
    expect(staffAt(town, at(town, roomOf(town, 'library')))).toBeNull();
    expect(staffAt(town, { kind: 'street' })).toBeNull();
    expect(staffAt(town, { kind: 'interior', building: 1, room: 'sala' })).toBeNull();
    expect(staffAt(town, { kind: 'interior', building: 9, room: 'sala' })).toBeNull();
  });
  it('a professora fica ao lado do quadro, e acompanha o quadro quando ele muda de lugar no Criar', () => {
    const town = built('school'), room = roomOf(town, 'classroom'), b = town.buildings[1]!;
    const board = b.layout.pieces.find(p => p.room === room && p.kind === 'board')!;
    const teacher = staffAt(town, at(town, room))!;
    expect(Math.min(Math.abs(teacher.x - board.x), Math.abs(teacher.x - board.x - 400))).toBeLessThan(staffBody.half + 60);
    const moved = { ...town, buildings: town.buildings.map(x => x === b ? { ...b, layout: { ...b.layout, pieces: b.layout.pieces.map(p => p === board ? { ...p, x: 160 } : p) } } : x) };
    const after = staffAt(moved, at(moved, room))!;
    expect(after.x).not.toBe(teacher.x);
    expect(overlap(box(after), rect({ ...pieceBounds.board, x: 160, y: board.y }))).toBe(0);
  });
  it('trocado o cômodo de trabalho por outro, o profissional vai embora; sem a sala, também', () => {
    const town = built('fire-station'), room = roomOf(town, 'dispatch'), b = town.buildings[1]!;
    const replaced = neighborhoodAction(town, { type: 'replace-module', building: 2, room, template: 'kitchen' });
    expect(staffAt(replaced, at(replaced, room))).toBeNull();
    const gone = { ...town, buildings: town.buildings.map(x => x === b ? { ...b, layout: { ...b.layout, rooms: {} as typeof b.layout.rooms } } : x) };
    expect(staffAt(gone, at(gone, room))).toBeNull();
  });
  it('um cômodo lotado ainda tem lugar para o profissional, o menos ruim', () => {
    const town = built('police'), room = roomOf(town, 'reception'), b = town.buildings[1]!;
    const counters = [0, 220, 440, 660, 880].map((x, n) => ({ id: 900 + n, kind: 'counter' as const, room, x, y: 260, color: 'original' as const, flipped: false }));
    const full = { ...town, buildings: town.buildings.map(x => x === b ? { ...b, layout: { ...b.layout, pieces: [...b.layout.pieces, ...counters] } } : x) };
    expect(staffAt(full, at(full, room))).toMatchObject({ profession: 'police' });
  });
  it('os profissionais nunca são personagens: não estão na Turma nem no save', () => {
    const town = built('hospital');
    for (const [, profession] of work) expect(actorIds as readonly string[]).not.toContain(profession);
    expect(town.actors.map(a => a.id)).toEqual([...actorIds]);
    expect(JSON.stringify(town)).not.toMatch(/teacher|firefighter"|doctor"|coach|clerk/);
  });
});
