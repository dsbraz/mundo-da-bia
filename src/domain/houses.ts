import type { Album, RoomId, World } from './types';
import { editWorld } from './design';
export function initialAlbum(state: World): Album { return { active: 1, houses: [{ id: 1, name: 'Minha casa', state }] }; }
export function activeHouse(album: Album) { return album.houses.find(h => h.id === album.active)!; }
export function duplicateHouse(album: Album, empty: boolean): Album {
  const id = Math.max(...album.houses.map(h => h.id)) + 1;
  let state = JSON.parse(JSON.stringify(activeHouse(album).state)) as World;
  if (empty) {
    for (const room of Object.keys(state.layout.rooms) as RoomId[]) state = editWorld({ ...state, room }, { type: 'clear' });
    state = { ...state, room: 'sala', show: false };
  }
  const house = { id, name: empty ? `Casa nova ${id}` : `${activeHouse(album).name.slice(0, 40)} · cópia`, state };
  return { active: id, houses: [...album.houses, house] };
}
export function selectHouse(album: Album, id: number): Album {
  return album.houses.some(h => h.id === id) ? { ...album, active: id } : album;
}
export function updateHouse(album: Album, state: World): Album {
  return { ...album, houses: album.houses.map(h => h.id === album.active ? { ...h, state } : h) };
}
export function renameHouse(album: Album, name: string): Album {
  const trimmed = name.trim().slice(0, 48);
  return trimmed ? { ...album, houses: album.houses.map(h => h.id === album.active ? { ...h, name: trimmed } : h) } : album;
}
