import { validLocation } from './location';
import { itemKind } from './item-kind';
import type { Album, World, RoomId } from './types';
import type { Location, Neighborhood, NeighborhoodAction } from './neighborhood-types';
import { activeHouse } from './houses';
import { initialWorld } from './world';
import { construct, duplicateBuilding, customize } from './buildings';
import { transport } from './neighborhood-transfer';
export function migrateNeighborhood(album: Album): Neighborhood {
  const active = activeHouse(album);
  return {
    location: { kind: 'interior', building: active.id, room: active.state.room },
    nextBuilding: Math.max(...album.houses.map(h => h.id)) + 1,
    plots: Math.max(4, Math.ceil((album.houses.length + 1) / 2) * 2),
    buildings: album.houses.map((h, plot) => ({ id: h.id, name: h.name, model: 'house', color: 'original', plot, entry: 'sala',
      layout: { ...h.state.layout, rooms: { ...h.state.layout.rooms, [h.state.room]: { ...h.state.layout.rooms[h.state.room], home: h.state.home } } }, show: h.state.show })),
    actors: active.state.actors.map(a => ({ ...a, location: { kind: 'interior', building: active.id, room: a.room } })),
    items: album.houses.flatMap(h => h.state.items.map(i => {
      const holder = h.state.actors.find(a => a.id === i.holder);
      const room = holder?.room ?? i.room;
      return { ...i, id: `${h.id}:${itemKind(i)}` as const, kind: itemKind(i), room,
        holder: h.id === active.id ? i.holder : null,
        ...(holder ? { x: holder.x, y: holder.y, spot: 'floor' as const } : {}),
        location: { kind: 'interior' as const, building: h.id, room } };
    })),
  };
}
export function neighborhoodAction(town: Neighborhood, action: NeighborhoodAction): Neighborhood {
  switch (action.type) {
    case 'visit': return validLocation(town, action.location) ? { ...town, location: action.location } : town;
    case 'transport': return transport(town, action);
    case 'construct': return construct(town, action.plot, action.model);
    case 'facade': return customize(town, action);
    case 'duplicate': return duplicateBuilding(town, action.building);
  }
}
function localRoom(location: Location, view: Location): RoomId {
  if (location.kind === 'street') return view.kind === 'street' ? 'sala' : 'room-0';
  return view.kind === 'interior' && location.building === view.building ? location.room : 'room-0';
}
export function localWorld(town: Neighborhood): World {
  const location = town.location;
  const building = location.kind === 'interior' ? town.buildings.find(b => b.id === location.building)! : null;
  const room = location.kind === 'interior' ? location.room : 'sala';
  const layout = building?.layout ?? streetLayout(town.plots);
  return { ...(building ? {} : { streetWidth: town.plots * 440 }), layout, room, home: layout.rooms[room]!.home, show: building?.show ?? false,
    actors: town.actors.map(a => ({ ...a, room: localRoom(a.location, location) })),
    items: town.items.filter(i => localRoom(i.location, location) !== 'room-0').map(i => ({ ...i, room: localRoom(i.location, location) })),
  };
}
function streetLayout(plots: number) {
  const layout = initialWorld().layout;
  return { ...layout, pieces: [], rooms: { ...layout.rooms, sala: { ...layout.rooms.sala, name: 'Nosso bairro', size: 'small' as const } }, streetWidth: plots * 440 } as typeof layout;
}
export function storeWorld(town: Neighborhood, world: World): Neighborhood {
  const view = town.location;
  const location = (room: RoomId): Location => view.kind === 'street' ? view : { ...view, room };
  const actors = town.actors.map(a => {
    const updated = world.actors.find(p => p.id === a.id)!;
    return { ...updated, room: updated.room === 'room-0' ? a.room : updated.room, location: updated.room === 'room-0' ? a.location : location(updated.room) };
  });
  const items = town.items.map(i => {
    const updated = world.items.find(p => p.id === i.id);
    const holder = actors.find(a => a.id === (updated ?? i).holder);
    if (holder) return { ...(updated ?? i), room: holder.room, x: holder.x, y: holder.y, location: holder.location };
    return updated ? { ...updated, location: location(updated.room) } : i;
  });
  const buildings = town.buildings.map(b => view.kind === 'interior' && b.id === view.building ? { ...b, show: world.show,
    layout: { ...world.layout, rooms: { ...world.layout.rooms, [world.room]: { ...world.layout.rooms[world.room], home: world.home } } } } : b);
  return { ...town, buildings, actors, items, location: location(world.room) };
}
