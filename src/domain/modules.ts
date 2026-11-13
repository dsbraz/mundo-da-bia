import type { Building, Location, ModuleAction, Neighborhood } from './neighborhood-types';
import type { Layout, Point, RoomId, RoomTemplate, World } from './types';
import { furnishRoom, placeRoom } from './rooms';
import { clearPassages } from './passage-clearance';
import { initialWorld } from './world';
import { floorOf } from './neighborhood-geometry';
export function floorCount(layout: Layout) { return Math.max(...Object.values(layout.rooms).map(r => floorOf(r.cell))) + 1; }
const names: Record<RoomTemplate, string> = { classroom: 'Sala de aula', sportsfield: 'Campo', gym: 'Ginásio', reception: 'Recepção', consultation: 'Consultório', ward: 'Enfermaria', dispatch: 'Central de atendimento', investigation: 'Achados e perdidos', office: 'Escritório', meeting: 'Sala de reunião', breakroom: 'Copa', playground: 'Quintal de brincadeiras', laundry: 'Lavanderia', library: 'Biblioteca', dining: 'Sala de jantar', empty: 'Sala', bedroom: 'Quarto', kitchen: 'Cozinha', bathroom: 'Banheiro', studio: 'Estúdio', garden: 'Jardim', market: 'Mercado' };
export function editModule(town: Neighborhood, action: ModuleAction): Neighborhood {
  const building = town.buildings.find(b => b.id === action.building);
  if (!building) return town;
  const layout = change(building, action);
  if (layout === building.layout) return town;
  const next = { ...town, buildings: town.buildings.map(b => b === building ? { ...b, layout } : b) };
  return structural.includes(action.type) ? clearBuilding(next, { ...building, layout }, building.layout) : next;
}
const structural: readonly ModuleAction['type'][] = ['add-floor', 'add-module', 'move-module'];
/** A new room or a moved one opens doorways and stairs: the pieces they would newly cover move out, with whoever sits on them. */
function clearBuilding(town: Neighborhood, building: Building, before: Layout): Neighborhood {
  const world = clearPassages(inside(town, building), before);
  if (world.layout === building.layout) return town;
  return { ...town, buildings: town.buildings.map(b => b.id === building.id ? { ...b, layout: world.layout } : b),
    actors: follow(town.actors, world.actors), items: follow(town.items, world.items) };
}
/** The building as a world with the people and objects inside it, each in its own room. */
function inside(town: Neighborhood, building: Building): World {
  const room = (location: Location) => location.kind === 'interior' && location.building === building.id ? location.room : null;
  return { ...initialWorld(), layout: building.layout, room: building.entry, home: building.layout.rooms[building.entry]!.home,
    actors: town.actors.filter(a => room(a.location)).map(a => ({ ...a, room: room(a.location)! })),
    items: town.items.filter(i => room(i.location)).map(i => ({ ...i, room: room(i.location)! })) };
}
const follow = <T extends Point & { id: string }>(all: T[], moved: (Point & { id: string })[]) =>
  all.map(e => { const to = moved.find(m => m.id === e.id); return to ? { ...e, x: to.x, y: to.y } : e; });
function change(building: Building, action: ModuleAction): Layout {
  const layout = building.layout;
  if (action.type === 'add-floor') return append(building, floorCount(layout) * 4, 'empty');
  if (action.type === 'add-module') return append(building, action.cell, action.template);
  const room = layout.rooms[action.room]; if (!room) return layout;
  if (action.type === 'move-module') return move(building, action.room, action.cell);
  if (action.type === 'replace-module') return { ...layout, rooms: { ...layout.rooms, [action.room]: { ...room, template: action.template } } };
  const name = action.name.trim().slice(0, 32);
  return name ? { ...layout, rooms: { ...layout.rooms, [action.room]: { ...room, name } } } : layout;
}
function append(building: Building, cell: number, template: RoomTemplate): Layout {
  const world = { ...initialWorld(), layout: building.layout, room: building.entry, home: building.layout.rooms[building.entry]!.home, actors: [], items: [] };
  const placed = placeRoom(world, { cell, template, name: names[template], size: 'medium' });
  return placed === world ? building.layout : furnishRoom(placed, template).layout;
}
function move(building: Building, id: RoomId, cell: number): Layout {
  const layout = building.layout;
  if (id === building.entry || cell === layout.rooms[building.entry]!.cell || !Number.isInteger(cell) || cell < 0 || cell >= 12) return layout;
  const room = layout.rooms[id]!; const rooms: Layout['rooms'] = { ...layout.rooms, [id]: { ...room, cell } };
  const target = (Object.keys(layout.rooms) as RoomId[]).find(key => layout.rooms[key]!.cell === cell);
  if (target) rooms[target] = { ...layout.rooms[target]!, cell: room.cell };
  return { ...layout, rooms };
}
