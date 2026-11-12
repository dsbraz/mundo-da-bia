import { initialOutdoor, interactOutdoor, releaseOutdoor } from './outdoor';
import { streetWidth } from './neighborhood-geometry';
import { editModule } from './modules';
import { sameLocation, validLocation } from './location';
import { itemKind } from './item-kind';
import type { Album, World, RoomId } from './types';
import type { GardenAction, LegacyNeighborhood, Location, ModuleAction, Neighborhood, NeighborhoodAction, NeighborhoodItem } from './neighborhood-types';
import { initialProgress, nextItemAfter } from './progress';
import { activeHouse } from './houses';
import { initialWorld } from './world';
import { removeBuilding } from './remove-building';
import { construct, duplicateBuilding, customize, moveBuilding } from './buildings';
import { transport } from './neighborhood-transfer';
import { cook } from './recipes';
import { garden, gardenActions } from './garden';
import { feel, live } from './needs';
export function migrateNeighborhood(album: Album): Neighborhood {
  const town = albumTown(album);
  return { ...town, progress: initialProgress(), nextItem: nextItemAfter(town.items) };
}
function albumTown(album: Album): LegacyNeighborhood {
  const active = activeHouse(album);
  return {
    outdoor: initialOutdoor(),
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
  if (buildingActions.includes(action.type)) return editBuilding(town, action as BuildingAction);
  if (gardenActions.includes(action.type)) return garden(town, action as GardenAction | { type: 'tick'; now: number });
  switch (action.type) {
    case 'outdoor': return interactOutdoor(town, action);
    case 'cook': return cook(town, action).town;
    case 'visit': return validLocation(town, action.location) ? { ...town, location: action.location } : town;
    case 'transport': return transport(town, action);
    case 'live': return live(town, action);
    default: return editModule(town, action as ModuleAction);
  }
}
const buildingActions: readonly NeighborhoodAction['type'][] = ['construct', 'facade', 'duplicate', 'remove-building', 'move-building'];
type BuildingAction = Extract<NeighborhoodAction, { type: 'construct' | 'facade' | 'duplicate' | 'remove-building' | 'move-building' }>;
function editBuilding(town: Neighborhood, action: BuildingAction): Neighborhood {
  switch (action.type) {
    case 'construct': return construct(town, action.plot, action.model);
    case 'facade': return customize(town, action);
    case 'duplicate': return duplicateBuilding(town, action.building);
    case 'remove-building': return removeBuilding(town, action.building);
    default: return moveBuilding(town, action.building, action.plot);
  }
}
function localRoom(location: Location, view: Location): RoomId {
  if (location.kind === 'street') return view.kind === 'street' ? 'sala' : 'room-0';
  return view.kind === 'interior' && location.building === view.building ? location.room : 'room-0';
}
export function localWorld(town: LegacyNeighborhood): World {
  const location = town.location;
  const building = location.kind === 'interior' ? town.buildings.find(b => b.id === location.building)! : null;
  const room = location.kind === 'interior' ? location.room : 'sala';
  const layout = building?.layout ?? streetLayout(town.plots);
  return { ...(building ? {} : { streetWidth: streetWidth(town.plots) }), layout, room, home: layout.rooms[room]!.home, show: building?.show ?? false,
    actors: town.actors.map(a => ({ ...a, room: localRoom(a.location, location) })),
    items: town.items.filter(i => localRoom(i.location, location) !== 'room-0').map(i => ({ ...i, room: localRoom(i.location, location) })),
  };
}
function streetLayout(plots: number) {
  const layout = initialWorld().layout;
  return { ...layout, pieces: [], rooms: { ...layout.rooms, sala: { ...layout.rooms.sala, name: 'Nosso bairro', size: 'small' as const } }, streetWidth: streetWidth(plots) } as typeof layout;
}
/** A dish that was in view and is no longer in the world was eaten: it leaves the neighborhood too. */
const eaten = (item: NeighborhoodItem, world: World, view: Location) =>
  item.kind === 'prato' && localRoom(item.location, view) !== 'room-0' && !world.items.some(i => i.id === item.id);
export function storeWorld(town: Neighborhood, world: World): Neighborhood {
  const view = town.location;
  const location = (room: RoomId): Location => view.kind === 'street' ? view : { ...view, room };
  const actors = town.actors.map(a => {
    const updated = world.actors.find(p => p.id === a.id)!;
    return { ...updated, room: updated.room === 'room-0' ? a.room : updated.room, location: updated.room === 'room-0' ? a.location : location(updated.room) };
  });
  const items = town.items.filter(i => !eaten(i, world, view)).map(i => {
    const updated = world.items.find(p => p.id === i.id);
    const holder = actors.find(a => a.id === (updated ?? i).holder);
    if (holder) return { ...(updated ?? i), room: holder.room, x: holder.x, y: holder.y, location: holder.location };
    return updated ? { ...updated, location: location(updated.room) } : i;
  });
  const buildings = town.buildings.map(b => view.kind === 'interior' && b.id === view.building ? { ...b, show: world.show,
    layout: { ...world.layout, rooms: { ...world.layout.rooms, [world.room]: { ...world.layout.rooms[world.room], home: world.home } } } } : b);
  let outdoor = town.outdoor;
  town.actors.forEach(a => { const next = actors.find(n => n.id === a.id)!; if (!sameLocation(next.location, a.location) || next.x !== a.x || next.y !== a.y) outdoor = releaseOutdoor(outdoor, a.id); });
  return { ...town, outdoor, buildings, actors, items, location: location(world.room) };
}
/** Undo and redo bring old houses back, never take a gain away: progress and the dishes stay as they are now (a dish in a house the
 *  undo removes goes with it), and item ids never go back. */
export function undoTo(next: Neighborhood, current: Neighborhood): Neighborhood {
  const dishes = current.items.filter(i => i.kind === 'prato' && validLocation(next, i.location));
  return { ...feel(next, current), progress: current.progress, nextItem: Math.max(next.nextItem, current.nextItem), items: [...next.items.filter(i => i.kind !== 'prato'), ...dishes] };
}
