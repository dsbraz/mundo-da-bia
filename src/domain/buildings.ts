import type { Building, BuildingModel, Neighborhood, NeighborhoodAction } from './neighborhood-types';
import { institutionWorld, marketWorld } from './institution-plans';
import { initialWorld } from './world';
import { addRoom } from './rooms';
import { editWorld } from './design';
function freePlot(town: Neighborhood) { return Array.from({ length: town.plots }, (_, i) => i).find(i => !town.buildings.some(b => b.plot === i))!; }
function append(town: Neighborhood, building: Building): Neighborhood {
  const buildings = [...town.buildings, building];
  return { ...town, buildings, nextBuilding: building.id + 1, plots: buildings.length === town.plots ? town.plots + 2 : town.plots };
}
export function construct(town: Neighborhood, plot: number, model: BuildingModel, plan?: 'market'): Neighborhood {
  if (!Number.isInteger(plot) || plot < 0 || plot >= town.plots || town.buildings.some(b => b.plot === plot)) return town;
  const market = plan === 'market' && model === 'shop';
  const name = market ? 'Mercado' : { house: 'Casa', apartment: 'Prédio', shop: 'Loja', hospital: 'Hospital', police: 'Delegacia', office: 'Escritório', 'fire-station': 'Bombeiros', school: 'Escola', stadium: 'Estádio', 'sports-club': 'Clube esportivo' }[model];
  const world = market ? marketWorld() : startWorld(model);
  return append(town, { id: town.nextBuilding, name: `${name} ${town.nextBuilding}`, model, color: 'original', plot, entry: 'sala', layout: world.layout, show: false });
}
/** A new building of `model`: the house as it starts, an institution's plan, or two bare rooms. */
function startWorld(model: BuildingModel) {
  let world = initialWorld();
  if (model !== 'house') {
    world = editWorld(world, { type: 'clear' });
    const rooms = { ...world.layout.rooms, sala: { ...world.layout.rooms.sala, name: model === 'shop' ? 'Salão' : 'Entrada' }, quarto: { ...world.layout.rooms.quarto, name: model === 'shop' ? 'Fundos' : 'Ateliê' } };
    world = { ...world, layout: { ...world.layout, rooms } };
  }
  if (model === 'apartment') world = addRoom(world, { name: 'Sala de brincar', size: 'medium', template: 'empty', cell: 4 });
  return institutionWorld(model) ?? world;
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

export function moveBuilding(town: Neighborhood, id: number, plot: number): Neighborhood {
  const source = town.buildings.find(b => b.id === id);
  if (!source || !Number.isInteger(plot) || plot < 0 || plot >= town.plots || plot === source.plot) return town;
  const buildings = town.buildings.map(b => {
    if (b === source) return { ...b, plot };
    return b.plot === plot ? { ...b, plot: source.plot } : b;
  });
  return { ...town, buildings };
}
