import { quickRooms, roomPicture } from './quick-rooms';
import type { RoomId, World } from '../domain/types';
import type { NewRoom } from '../domain/rooms';
import { projects } from '../content/projects';
interface Actions {
  enter: (room: RoomId) => void; add: (room: NewRoom) => void; rename: (name: string) => void;
  reorder: (room: RoomId, target: RoomId) => void; snapshot: (name: string) => void; closeTray: () => void;
}
export function roomControls(root: HTMLElement, actions: Actions) {
  const dialog = root.querySelector<HTMLDialogElement>('#room-dialog')!;
  let state: World;
  const choose = quickRooms(root, actions.add, () => dialog.close());
  root.querySelector('#map-toggle')!.addEventListener('click', () => { actions.closeTray(); dialog.showModal(); });
  root.querySelector('#close-map')!.addEventListener('click', () => dialog.close());
  root.querySelector('#room-rename')!.addEventListener('click', () => actions.rename(root.querySelector<HTMLInputElement>('#current-room-name')!.value));
  root.querySelector('#add-room')!.addEventListener('click', () => choose(freeCell(state)));
  projectCards(root, actions.snapshot);
  return (next: World) => {
    state = next; renderCards(root, state, actions, () => dialog.close());
    root.querySelector<HTMLButtonElement>('#add-room')!.disabled = freeCell(state) < 0;
    root.querySelector('#room-name')!.textContent = state.layout.rooms[state.room]!.name;
    const input = root.querySelector<HTMLInputElement>('#current-room-name')!;
    if (document.activeElement !== input) input.value = state.layout.rooms[state.room]!.name;
  };
}
function freeCell(state: World) { return Array.from({ length: 12 }, (_, i) => i).find(i => !Object.values(state.layout.rooms).some(r => r.cell === i)) ?? -1; }
function renderCards(root: HTMLElement, state: World, actions: Actions, close: () => void) {
  const entries = (Object.entries(state.layout.rooms) as [RoomId, import('../domain/types').Room][]).sort((a, b) => a[1].cell - b[1].cell);
  const cards = entries.map(([id, room], index) => {
    const card = document.createElement('article'); card.className = 'room-card'; card.dataset.room = id;
    const visit = document.createElement('button'); visit.append(roomPicture(room.template), document.createTextNode(room.name));
    visit.setAttribute('aria-label', `Visitar ${room.name}`); visit.setAttribute('aria-pressed', String(state.room === id));
    visit.addEventListener('click', () => { actions.enter(id); close(); }); card.append(visit);
    for (const [label, offset] of [['antes', -1], ['depois', 1]] as const) {
      const button = document.createElement('button'); button.textContent = offset < 0 ? '← Antes' : 'Depois →';
      button.setAttribute('aria-label', `Mover ${room.name} ${label}`); const target = entries[index + offset]; button.disabled = !target;
      button.addEventListener('click', () => { actions.reorder(id, target![0]); root.querySelector<HTMLButtonElement>(`[aria-label="Visitar ${room.name}"]`)?.focus(); }); card.append(button);
    }
    cardDrag(card, id, actions.reorder); return card;
  });
  root.querySelector('#room-map')!.replaceChildren(...cards);
}
function cardDrag(card: HTMLElement, id: RoomId, reorder: Actions['reorder']) {
  let active: { id: number; x: number; y: number } | null = null; let dragged = false;
  card.addEventListener('dragstart', e => e.preventDefault());
  card.addEventListener('pointerdown', e => { if (active || (e.target as HTMLElement).closest('button')?.getAttribute('aria-label')?.startsWith('Mover')) return; active = { id: e.pointerId, x: e.clientX, y: e.clientY }; dragged = false; (e.target as Element).closest('button')?.setPointerCapture(e.pointerId); });
  card.addEventListener('pointermove', e => { if (active?.id === e.pointerId && Math.hypot(e.clientX - active.x, e.clientY - active.y) > 12) { dragged = true; card.classList.add('dragging'); } });
  card.addEventListener('pointerup', e => {
    if (active?.id !== e.pointerId) return;
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-room]')?.dataset.room;
    active = null; card.classList.remove('dragging'); if (dragged && target) reorder(id, target as RoomId);
  });
  card.addEventListener('click', e => { if (dragged) { e.preventDefault(); e.stopPropagation(); } }, true);
  const cancel = () => { active = null; card.classList.remove('dragging'); };
  card.addEventListener('pointercancel', cancel); card.addEventListener('lostpointercapture', cancel);
}
function projectCards(root: HTMLElement, snapshot: Actions['snapshot']) {
  let name = projects[0]!.title;
  projects.forEach(project => {
    const button = document.createElement('button'); const title = document.createElement('strong'); title.textContent = project.title;
    const description = document.createElement('span'); description.textContent = project.description;
    button.append(title, description); button.addEventListener('click', () => { name = project.title; root.querySelectorAll('#project-cards button').forEach(b => b.setAttribute('aria-pressed', String(b === button))); });
    root.querySelector('#project-cards')!.append(button);
  });
  root.querySelector('#save-project')!.addEventListener('click', () => snapshot(name));
}
