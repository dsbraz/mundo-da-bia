import type { BuildingModel } from './neighborhood-types';
import type { RoomTemplate, World } from './types';
import { initialWorld } from './world';
import { addRoom, furnishRoom } from './rooms';

const plans: Partial<Record<BuildingModel, { name: string; template: RoomTemplate; cell: number }[]>> = {
  hospital: [{ name: 'Recepção', template: 'reception', cell: 0 }, { name: 'Consultório', template: 'consultation', cell: 1 }, { name: 'Enfermaria', template: 'ward', cell: 4 }],
  police: [{ name: 'Recepção', template: 'reception', cell: 0 }, { name: 'Central de atendimento', template: 'dispatch', cell: 1 }, { name: 'Sala de investigação', template: 'investigation', cell: 2 }],
  office: [{ name: 'Recepção', template: 'reception', cell: 0 }, { name: 'Escritório', template: 'office', cell: 1 }, { name: 'Sala de reunião', template: 'meeting', cell: 4 }, { name: 'Copa', template: 'breakroom', cell: 5 }],
};
export function institutionWorld(model: BuildingModel): World | undefined {
  const plan = plans[model]; if (!plan) return;
  let world = initialWorld();
  const rooms = { ...world.layout.rooms };
  for (const [index, id] of (['sala', 'quarto'] as const).entries()) rooms[id] = { ...rooms[id], ...plan[index]!, size: 'medium', wall: 'original', floor: 'original' };
  world = { ...world, actors: [], items: [], layout: { ...world.layout, rooms, pieces: [], nextId: 1 } };
  for (const id of ['sala', 'quarto'] as const) world = furnishRoom({ ...world, room: id }, rooms[id].template);
  for (const room of plan.slice(2)) world = addRoom(world, { ...room, size: 'medium' });
  return { ...world, room: 'sala', home: rooms.sala.home };
}
