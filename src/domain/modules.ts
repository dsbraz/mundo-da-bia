import type { Building, ModuleAction, Neighborhood } from './neighborhood-types';
import type { Layout, RoomId, RoomTemplate } from './types';
import { addRoom } from './rooms';
import { initialWorld } from './world';
import { floorOf } from './neighborhood-geometry';
export function floorCount(layout: Layout) { return Math.max(...Object.values(layout.rooms).map(r => floorOf(r.cell))) + 1; }
const names: Record<RoomTemplate, string> = { classroom: 'Sala de aula', sportsfield: 'Campo', gym: 'Ginásio', reception: 'Recepção', consultation: 'Consultório', ward: 'Enfermaria', dispatch: 'Central de atendimento', investigation: 'Achados e perdidos', office: 'Escritório', meeting: 'Sala de reunião', breakroom: 'Copa', playground: 'Quintal de brincadeiras', laundry: 'Lavanderia', library: 'Biblioteca', dining: 'Sala de jantar', empty: 'Sala', bedroom: 'Quarto', kitchen: 'Cozinha', bathroom: 'Banheiro', studio: 'Estúdio', garden: 'Jardim' };
export function editModule(town: Neighborhood, action: ModuleAction): Neighborhood {
  const building = town.buildings.find(b => b.id === action.building);
  if (!building) return town;
  const layout = change(building, action);
  return layout === building.layout ? town : { ...town, buildings: town.buildings.map(b => b === building ? { ...b, layout } : b) };
}
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
  return addRoom(world, { cell, template, name: names[template], size: 'medium' }).layout;
}
function move(building: Building, id: RoomId, cell: number): Layout {
  const layout = building.layout;
  if (id === building.entry || cell === layout.rooms[building.entry]!.cell || !Number.isInteger(cell) || cell < 0 || cell >= 12) return layout;
  const room = layout.rooms[id]!; const rooms: Layout['rooms'] = { ...layout.rooms, [id]: { ...room, cell } };
  const target = (Object.keys(layout.rooms) as RoomId[]).find(key => layout.rooms[key]!.cell === cell);
  if (target) rooms[target] = { ...layout.rooms[target]!, cell: room.cell };
  return { ...layout, rooms };
}
