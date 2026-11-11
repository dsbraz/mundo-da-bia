import { initialOutdoor, plazaBall } from '../domain/outdoor';
import type { LegacyNeighborhood } from '../domain/neighborhood-types';
import type { RoomId } from '../domain/types';
import { plazaWidth } from '../domain/neighborhood-geometry';
export function upgradeNeighborhood<T extends LegacyNeighborhood>(town: T): T {
  return plazaBall({ ...town, outdoor: initialOutdoor(), buildings: town.buildings.map(b => {
    const ordered = (Object.keys(b.layout.rooms) as RoomId[]).filter(id => id !== b.entry).sort((a, c) => b.layout.rooms[a]!.cell - b.layout.rooms[c]!.cell);
    const rooms = { ...b.layout.rooms };
    [b.entry, ...ordered].forEach((id, cell) => { rooms[id] = { ...rooms[id]!, cell }; });
    return { ...b, layout: { ...b.layout, rooms } };
  }), actors: town.actors.map(a => a.location.kind === 'street' ? { ...a, x: a.x + plazaWidth } : a),
  items: town.items.map(i => i.location.kind === 'street' ? { ...i, x: i.x + plazaWidth } : i) });
}
