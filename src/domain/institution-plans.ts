import type { BuildingModel } from './neighborhood-types';
import type { RoomId, RoomTemplate, World } from './types';
import { initialWorld } from './world';
import { furnishRoom, placeRoom } from './rooms';

const plans: Partial<Record<BuildingModel, { name: string; template: RoomTemplate; cell: number }[]>> = {
  'fire-station': [{ name: 'Central dos bombeiros', template: 'dispatch', cell: 0 }, { name: 'Descanso da equipe', template: 'bedroom', cell: 1 }, { name: 'Copa', template: 'breakroom', cell: 4 }],
  school: [{ name: 'Entrada da escola', template: 'reception', cell: 0 }, { name: 'Sala de aula', template: 'classroom', cell: 1 }, { name: 'Biblioteca', template: 'library', cell: 4 }, { name: 'Pátio', template: 'playground', cell: 2 }],
  stadium: [{ name: 'Campo', template: 'sportsfield', cell: 0 }, { name: 'Aquecimento', template: 'gym', cell: 1 }, { name: 'Lanchonete', template: 'breakroom', cell: 2 }],
  'sports-club': [{ name: 'Recepção do clube', template: 'reception', cell: 0 }, { name: 'Ginásio', template: 'gym', cell: 1 }, { name: 'Área de brincadeiras', template: 'playground', cell: 2 }],
  hospital: [{ name: 'Recepção', template: 'reception', cell: 0 }, { name: 'Consultório', template: 'consultation', cell: 1 }, { name: 'Enfermaria', template: 'ward', cell: 4 }],
  police: [{ name: 'Recepção', template: 'reception', cell: 0 }, { name: 'Central de atendimento', template: 'dispatch', cell: 1 }, { name: 'Achados e perdidos', template: 'investigation', cell: 2 }],
  office: [{ name: 'Recepção', template: 'reception', cell: 0 }, { name: 'Escritório', template: 'office', cell: 1 }, { name: 'Sala de reunião', template: 'meeting', cell: 4 }, { name: 'Copa', template: 'breakroom', cell: 5 }],
};
/** The shop's Mercado plan (W3L-21): a market hall with 2 shelves, a fridge and the checkout, and a storeroom. */
const market = [{ name: 'Mercado', template: 'market' as const, cell: 0 }, { name: 'Depósito', template: 'empty' as const, cell: 1 }];
export function marketWorld(): World { return planWorld(market); }
export function institutionWorld(model: BuildingModel): World | undefined {
  const plan = plans[model];
  return plan && planWorld(plan);
}
function planWorld(plan: { name: string; template: RoomTemplate; cell: number }[]): World {
  let world = initialWorld();
  const rooms = { ...world.layout.rooms };
  for (const [index, id] of (['sala', 'quarto'] as const).entries()) rooms[id] = { ...rooms[id], ...plan[index]!, size: 'medium', wall: 'original', floor: 'original' };
  world = { ...world, actors: [], items: [], layout: { ...world.layout, rooms, pieces: [], nextId: 1 } };
  for (const room of plan.slice(2)) world = placeRoom(world, { ...room, size: 'medium' });
  // Furnished once every room stands, so no piece goes where a later room opens a doorway or the stairs.
  for (const id of Object.keys(world.layout.rooms) as RoomId[]) world = furnishRoom({ ...world, room: id }, world.layout.rooms[id]!.template);
  return { ...world, room: 'sala', home: rooms.sala.home };
}
