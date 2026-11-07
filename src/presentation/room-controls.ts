import type { ActorId, RoomId, World } from '../domain/types';
import { roomSizes, roomTemplates } from '../domain/types';
import type { NewRoom } from '../domain/rooms';
import { templates, projects } from '../content/projects';
import { furnishings } from '../content/furnishings';
interface Actions { enter: (room: RoomId) => void; add: (room: NewRoom) => void; rename: (name: string) => void; move: (cell: number) => void; travel: (room: RoomId) => void; snapshot: (name: string) => void }
export function roomControls(root: HTMLElement, actions: Actions) {
  const dialog = root.querySelector<HTMLDialogElement>('#room-dialog')!;
  const form = root.querySelector<HTMLFormElement>('#room-form')!;
  const name = root.querySelector<HTMLInputElement>('#new-room-name')!;
  const template = root.querySelector<HTMLSelectElement>('#room-template')!;
  const size = root.querySelector<HTMLSelectElement>('#room-size')!;
  const cell = root.querySelector<HTMLSelectElement>('#new-room-cell')!;
  roomTemplates.forEach(id => template.add(new Option(templates[id].name, id)));
  root.querySelector('#map-toggle')!.addEventListener('click', () => dialog.showModal());
  root.querySelector('#close-map')!.addEventListener('click', () => dialog.close());
  root.querySelector('#room-rename')!.addEventListener('click', () => actions.rename(root.querySelector<HTMLInputElement>('#current-room-name')!.value));
  root.querySelector('#room-move')!.addEventListener('click', () => actions.move(Number(root.querySelector<HTMLSelectElement>('#room-position')!.value)));
  root.querySelector('#bring-selected')!.addEventListener('click', () => actions.travel(root.querySelector<HTMLSelectElement>('#travel-room')!.value as RoomId));
  form.addEventListener('submit', event => {
    event.preventDefault();
    actions.add({ name: name.value, template: roomTemplates.find(id => id === template.value)!, size: roomSizes.find(id => id === size.value)!, cell: Number(cell.value) });
    dialog.close();
  });
  const renderProjects = projectControls(root, actions.snapshot);
  return (state: World, selected: ActorId) => {
    const entries = Object.entries(state.layout.rooms) as [RoomId, NonNullable<typeof state.layout.rooms[RoomId]>][];
    renderNav(root, state, entries, actions.enter);
    renderMap(root, state, entries, actions.enter, value => { cell.value = String(value); name.focus(); });
    const free = Array.from({ length: 12 }, (_, index) => index).filter(index => !entries.some(([, r]) => r.cell === index));
    cell.replaceChildren(...free.map(i => new Option(`Espaço ${i + 1}`, String(i))));
    root.querySelector<HTMLButtonElement>('#create-room')!.disabled = !free.length;
    const input = root.querySelector<HTMLInputElement>('#current-room-name')!;
    if (document.activeElement !== input) input.value = state.layout.rooms[state.room]!.name;
    root.querySelector<HTMLSelectElement>('#room-position')!.replaceChildren(...free.map(i => new Option(`Espaço ${i + 1}`, String(i))));
    root.querySelector<HTMLButtonElement>('#room-move')!.disabled = !free.length;
    root.querySelector<HTMLSelectElement>('#travel-room')!.replaceChildren(...entries.map(([id, r]) => new Option(r.name, id, false, id === state.room)));
    root.querySelector('#bring-selected')!.textContent = `Levar ${selected === 'bia' ? 'Bia' : selected} para lá`;
    renderProjects(state);
  };
}
type Entries = [RoomId, import('../domain/types').Room][];
function renderNav(root: HTMLElement, state: World, entries: Entries, enter: Actions['enter']) {
  for (const selector of ['#rooms', '#room-strip']) {
    const nodes = entries.map(([id, room]) => {
      const button = document.createElement('button'); button.type = 'button';
      button.textContent = `${templates[room.template].icon} ${room.name}`; button.setAttribute('aria-pressed', String(id === state.room));
      if (selector === '#room-strip') button.setAttribute('aria-label', `Ir para ${room.name}`);
      button.addEventListener('click', () => enter(id)); return button;
    });
    root.querySelector(selector)!.replaceChildren(...nodes);
  }
}
function renderMap(root: HTMLElement, state: World, entries: Entries, enter: Actions['enter'], choose: (cell: number) => void) {
  const cells = Array.from({ length: 12 }, (_, cell) => {
    const entry = entries.find(([, r]) => r.cell === cell);
    const button = document.createElement('button'); button.type = 'button'; button.className = 'map-cell';
    button.textContent = entry ? `${templates[entry[1].template].icon} ${entry[1].name}` : '+ Criar';
    button.setAttribute('aria-label', entry ? `Abrir ${entry[1].name}` : `Construir no espaço ${cell + 1}`);
    button.setAttribute('aria-pressed', String(entry?.[0] === state.room));
    button.addEventListener('click', () => entry ? enter(entry[0]) : choose(cell)); return button;
  });
  root.querySelector('#room-map')!.replaceChildren(...cells);
}
function projectControls(root: HTMLElement, snapshot: Actions['snapshot']) {
  const select = root.querySelector<HTMLSelectElement>('#project-choice')!;
  projects.forEach(project => select.add(new Option(project.title, project.id)));
  let state: World;
  const render = () => {
    const project = projects.find(p => p.id === select.value)!;
    root.querySelector('#project-description')!.textContent = project.description;
    const rooms = project.rooms.map(template => ({ name: templates[template].name, exists: Object.values(state.layout.rooms).some(r => r.template === template) }));
    const pieces = project.pieces.map(kind => ({ name: furnishings[kind].name, exists: state.layout.pieces.some(p => p.kind === kind) }));
    root.querySelector('#project-ideas')!.replaceChildren(...[...rooms, ...pieces].map(idea => {
      const item = document.createElement('li');
      item.textContent = `${idea.exists ? '✓' : '○'} ${idea.name}`; return item;
    }));
  };
  select.addEventListener('change', render);
  root.querySelector('#save-project')!.addEventListener('click', () => snapshot(projects.find(p => p.id === select.value)!.title));
  return (next: World) => { state = next; render(); };
}
