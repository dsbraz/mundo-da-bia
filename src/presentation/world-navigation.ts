import { actors } from '../content/catalog';
import { travelDialog } from './travel-dialog';
import type { ActorId, RoomId } from '../domain/types';
import type { Location, Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';
import { floorOf, streetWidth } from '../domain/neighborhood-geometry';
interface Actions {
  town: () => Neighborhood; dispatch: (action: NeighborhoodAction) => void; selected: () => ActorId;
  construct: () => void; structure: () => void; camera: () => number; pan: (x: number) => void;
}
function button(label: string, click: () => void) { const b = document.createElement('button'); b.textContent = label; b.onclick = click; return b; }
export function worldNavigation(root: HTMLElement, actions: Actions) {
  const bar = root.querySelector<HTMLElement>('#room-navigation')!;
  root.querySelector('[data-home-panel="map organize"]')!.prepend(bar);
  const name = root.querySelector<HTMLElement>('#room-name')!;
  const adjacent = document.createElement('div'); adjacent.className = 'neighbor-rooms';
  const floors = document.createElement('select'); floors.setAttribute('aria-label', 'Andar');
  const previous = button('← Anterior', () => step(-1)), next = button('Próximo →', () => step(1));
  const carry = button('Levar personagem', () => transport());
  const shortcuts = document.createElement('details'); shortcuts.id = 'navigation-shortcuts';
  const summary = document.createElement('summary'); summary.textContent = 'Atalhos de navegação';
  shortcuts.append(summary, floors, previous, name, next, adjacent);
  bar.append(button('⌂ Bairro', () => { actions.dispatch({ type: 'visit', location: { kind: 'street' } }); root.querySelector<HTMLDialogElement>('#room-dialog')!.close(); }), carry, shortcuts);
  let rooms: [RoomId, string][] = [], destinations: Location[] = [];
  function step(direction: number) {
    const town = actions.town();
    if (town.location.kind === 'street') { actions.pan(Math.max(0, Math.min(streetWidth(town.plots) - 1000, actions.camera() + direction * 700))); return; }
    const current = town.location.room, index = rooms.findIndex(([id]) => id === current), room = rooms[index + direction];
    if (room) actions.dispatch({ type: 'visit', location: { ...town.location, room: room[0] } });
  }
  function transport() { root.querySelector<HTMLDialogElement>('#room-dialog')!.close(); travelDialog(root, actions.town(), actions.selected(), destinations, actions.dispatch); }
  floors.onchange = () => {
    const location = actions.town().location; if (location.kind !== 'interior') return;
    actions.dispatch({ type: 'visit', location: { ...location, room: floors.value as RoomId } });
  };
  return () => {
    const town = actions.town(), location = town.location;
    const selected = town.actors.find(a => a.id === actions.selected());
    carry.textContent = `Levar ${selected?.name ?? actors[actions.selected()].name}`;
    carry.title = 'Transportar personagem e objeto carregado. Visitar apenas muda a vista.';
    const building = location.kind === 'interior' ? town.buildings.find(b => b.id === location.building) : undefined;
    floors.hidden = carry.hidden = !building;
    if (!building || location.kind !== 'interior') { adjacent.replaceChildren(); previous.disabled = actions.camera() <= 0; next.disabled = actions.camera() >= streetWidth(town.plots) - 1000; return; }
    const entries = (Object.entries(building.layout.rooms) as [RoomId, typeof building.layout.rooms.sala][]).sort((a, b) => a[1].cell - b[1].cell);
    const floor = floorOf(building.layout.rooms[location.room]!.cell);
    rooms = entries.filter(([, r]) => floorOf(r.cell) === floor).map(([id, r]) => [id, r.name]);
    destinations = entries.filter(([id]) => id !== location.room).map(([room]) => ({ ...location, room }));
    const levels = [...new Set(entries.map(([, r]) => floorOf(r.cell)))];
    floors.replaceChildren(...levels.map(level => { const option = document.createElement('option'); option.value = entries.find(([, r]) => floorOf(r.cell) === level)![0]; option.textContent = level ? `${level}º andar` : 'Térreo'; option.selected = level === floor; return option; }));
    const index = rooms.findIndex(([id]) => id === location.room); previous.disabled = index === 0; next.disabled = index === rooms.length - 1;
    adjacent.replaceChildren(...rooms.filter(([id]) => id !== location.room).map(([room, name]) => button(name, () => actions.dispatch({ type: 'visit', location: { ...location, room } }))));
  };
}
