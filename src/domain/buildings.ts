import type { Building, BuildingModel, Neighborhood, NeighborhoodAction } from './neighborhood-types';
import { initialWorld } from './world';
import { addRoom } from './rooms';
import { editWorld } from './design';
function freePlot(town: Neighborhood) { return Array.from({ length: town.plots }, (_, i) => i).find(i => !town.buildings.some(b => b.plot === i))!; }
function append(town: Neighborhood, building: Building): Neighborhood {
  const buildings = [...town.buildings, building];
  return { ...town, buildings, nextBuilding: building.id + 1, plots: buildings.length === town.plots ? town.plots + 2 : town.plots };
}
export function construct(town: Neighborhood, plot: number, model: BuildingModel): Neighborhood {
  if (!Number.isInteger(plot) || plot < 0 || plot >= town.plots || town.buildings.some(b => b.plot === plot)) return town;
  let world = initialWorld();
  if (model !== 'house') {
    world = editWorld(world, { type: 'clear' });
    const rooms = { ...world.layout.rooms, sala: { ...world.layout.rooms.sala, name: model === 'shop' ? 'Salão' : 'Entrada' }, quarto: { ...world.layout.rooms.quarto, name: model === 'shop' ? 'Fundos' : 'Ateliê' } };
    world = { ...world, layout: { ...world.layout, rooms } };
  }
  if (model === 'apartment') world = addRoom(world, { name: 'Sala de brincar', size: 'medium', template: 'empty', cell: 2 });
  const name = { house: 'Casa', apartment: 'Prédio', shop: 'Loja' }[model];
  return append(town, { id: town.nextBuilding, name: `${name} ${town.nextBuilding}`, model, color: 'original', plot, entry: 'sala', layout: world.layout, show: false });
}
export function duplicateBuilding(town: Neighborhood, id: number): Neighborhood {
  const source = town.buildings.find(b => b.id === id); if (!source) return town;
  const next = append(town, { ...source, id: town.nextBuilding, name: `${source.name.slice(0, 40)} · cópia`, plot: freePlot(town) });
  return town.location.kind === 'street' ? next : { ...next, location: { kind: 'interior', building: town.nextBuilding, room: source.entry } };
}
export function customize(town: Neighborhood, action: Extract<NeighborhoodAction, { type: 'facade' }>): Neighborhood {
  return { ...town, buildings: town.buildings.map(b => b.id === action.building ? { ...b,
    name: action.name?.trim().slice(0, 48) || b.name, color: action.color ?? b.color } : b) };
}
