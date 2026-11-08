import type { ActorId, ItemId } from '../domain/types';
import type { Location, Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';
import { sameLocation } from '../domain/location';
import { floorOf } from '../domain/neighborhood-geometry';
import { actors, items } from '../content/catalog';
import { itemKind } from '../domain/item-kind';
function button(label: string, click: () => void) { const b = document.createElement('button'); b.textContent = label; b.onclick = click; return b; }
export function travelDialog(root: HTMLElement, town: Neighborhood, actor: ActorId, destinations: Location[], dispatch: (a: NeighborhoodAction) => void) {
  const dialog = document.createElement('dialog'), select = document.createElement('select'); select.setAttribute('aria-label', 'Quem ou o que levar');
  const resident = town.actors.find(a => a.id === actor)!;
  const choices = town.items.filter(i => !i.holder && i.spot === 'floor' && sameLocation(i.location, town.location)).map(i => ({ value: i.id as string, name: items[itemKind(i)].name }));
  if (sameLocation(resident.location, town.location)) choices.unshift({ value: 'actor', name: resident.name ?? actors[actor].name });
  choices.forEach(choice => { const option = document.createElement('option'); option.value = choice.value; option.textContent = choice.name; select.append(option); });
  dialog.append(select);
  destinations.forEach(location => {
    const b = button(label(town, location), () => { dispatch({ type: 'transport', ...(select.value === 'actor' ? { actor } : { item: select.value as ItemId }), location, point: { x: 160, y: 520 } }); dialog.close(); });
    b.disabled = !choices.length; dialog.append(b);
  });
  dialog.append(button('Voltar', () => dialog.close())); dialog.onclose = () => dialog.remove(); root.append(dialog); dialog.showModal();
}
function label(town: Neighborhood, location: Location) {
  if (location.kind === 'street') return 'Rua';
  const room = town.buildings.find(b => b.id === location.building)!.layout.rooms[location.room]!;
  return `${room.name} · ${floorOf(room.cell) === 0 ? 'Térreo' : `${floorOf(room.cell)}º andar`}`;
}
