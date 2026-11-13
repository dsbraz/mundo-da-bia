import { describe, expect, it } from 'vitest';
import { professionOf, staffAt, staffBody, type Profession } from './staff';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
import { initialAlbum } from './houses';
import { initialWorld } from './world';
import { passages } from './passages';
import { doorway } from './doorway';
import { pieceBounds } from './layout';
import { footprint, overlap } from './placement';
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
    const keys = layout.pieces.filter(p => p.room === room && ['board', 'counter', 'checkout', 'school-desk', 'armchair', 'desk', 'chair', 'sofa'].includes(p.kind));
    expect(keys.every(p => overlap(box(staff), rect({ ...pieceBounds[p.kind], x: p.x, y: p.y })) === 0)).toBe(true);
    // Her feet are never inside a piece.
    const feet = { left: staff.x - 30, right: staff.x + 30, top: staff.y - 20, bottom: staff.y + 5 };
    expect(layout.pieces.filter(p => p.room === room).every(p => overlap(feet, footprint(p) ?? feet) === 0 || !footprint(p))).toBe(true);
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
    expect(Math.min(Math.abs(teacher.x - board.x), Math.abs(teacher.x - board.x - 400))).toBeLessThan(200);
    const moved = { ...town, buildings: town.buildings.map(x => x === b ? { ...b, layout: { ...b.layout, pieces: b.layout.pieces.filter(p => p.kind !== 'school-desk').map(p => p === board ? { ...p, x: 160 } : p) } } : x) };
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
  it('sem peça-chave fica no meio do cômodo; só a primeira sala tem a porta da rua para evitar', () => {
    const town = built('hospital'), room = roomOf(town, 'consultation'), b = town.buildings[1]!;
    const empty = { ...town, buildings: town.buildings.map(x => x === b ? { ...b, layout: { ...b.layout, pieces: b.layout.pieces.filter(p => p.room !== room) } } : x) };
    expect(staffAt(empty, at(empty, room))).toMatchObject({ x: 600, y: 465 });
    const entry = built('stadium'), field = roomOf(entry, 'sportsfield'), e = entry.buildings[1]!;
    const bare = { ...entry, buildings: entry.buildings.map(x => x === e ? { ...e, layout: { ...e.layout, pieces: [] } } : x) };
    const coach = staffAt(bare, at(bare, field))!;
    expect(overlap(box(coach), rect(doorway.interior))).toBe(0);
    expect(Math.abs(coach.x - 600)).toBeLessThan(200);
  });
  it('um móvel no lugar dela a empurra para o lado, sem pisar nele; nem na frente do caixa', () => {
    const town = built('hospital'), room = roomOf(town, 'consultation'), b = town.buildings[1]!;
    const extra = [{ id: 901, kind: 'armchair' as const, room, x: 510, y: 330, color: 'original' as const, flipped: false },
      { id: 902, kind: 'checkout' as const, room, x: 700, y: 300, color: 'original' as const, flipped: false }];
    const busy = { ...town, buildings: town.buildings.map(x => x === b ? { ...b, layout: { ...b.layout, pieces: [...b.layout.pieces.filter(p => p.room !== room), ...extra] } } : x) };
    const doctor = staffAt(busy, at(busy, room))!;
    const feet = { left: doctor.x - 30, right: doctor.x + 30, top: doctor.y - 20, bottom: doctor.y + 5 };
    expect(overlap(feet, footprint(extra[0]!)!)).toBe(0);
    expect(overlap(box(doctor), rect({ ...pieceBounds.checkout, x: 700, y: 300 }))).toBe(0);
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
