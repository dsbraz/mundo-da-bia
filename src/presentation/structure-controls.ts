import { illustratedChoices } from './illustrated-choices';
import type { Building, Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';
import type { RoomId, RoomTemplate } from '../domain/types';
import { roomTemplates } from '../domain/types';
import { templates } from '../content/projects';
import { floorCount } from '../domain/modules';
import { roomPicture } from './quick-rooms';
function button(label: string, click: () => void) { const b = document.createElement('button'); b.textContent = label; b.onclick = click; return b; }
export function structureControls(root: HTMLElement, get: () => Neighborhood, dispatch: (a: NeighborhoodAction) => void, prepare: () => void) {
  const dialog = document.createElement('dialog'); dialog.id = 'structure-dialog'; root.append(dialog);
  let id = 1;
  function current() { return get().buildings.find(b => b.id === id)!; }
  function commit(action: NeighborhoodAction) { dispatch(action); render(); }
  function advanced() {
    const building = current();
    const title = document.createElement('h2'); title.textContent = `${building.name} · estrutura`;
    dialog.replaceChildren(title, button('Voltar', render), button('Fechar estrutura', () => dialog.close()));
    for (let floor = floorCount(building.layout) - 1; floor >= 0; floor--) {
      const heading = document.createElement('h3'); heading.textContent = floor ? `${floor}º andar` : 'Térreo';
      const row = document.createElement('div'); row.className = 'module-row';
      for (let column = 0; column < 4; column++) row.append(moduleCard(building, floor * 4 + column, choose, edit, room => { dispatch({ type: 'visit', location: { kind: 'interior', building: id, room } }); dialog.close(); }));
      dialog.append(heading, row);
    }
    const add = button('+ Andar', () => preview({ type: 'add-floor', building: id }, 'Novo andar com uma sala', 'empty'));
    add.disabled = floorCount(building.layout) === 3; dialog.append(add);
  }
  function render() { guidedRooms(dialog, current(), choosePreview, () => preview({ type: 'add-floor', building: id }, 'Novo andar com uma sala', 'empty'), advanced); }
  function choosePreview(cell: number, template: RoomTemplate) {
    preview({ type: 'add-module', building: id, cell, template }, templates[template].name, template);
  }
  function choose(cell: number, room?: RoomId) {
    dialog.replaceChildren();
    roomTemplates.forEach(template => {
      const b = button(templates[template].name, () => preview(room ? { type: 'replace-module', building: id, room, template } : { type: 'add-module', building: id, cell, template }, templates[template].name, template));
      b.prepend(roomPicture(template)); dialog.append(b);
    });
    dialog.append(button('Cancelar', render));
  }
  function preview(action: NeighborhoodAction, name: string, template: RoomTemplate) {
    const heading = document.createElement('h3'); heading.textContent = `Prévia · ${name}`;
    dialog.replaceChildren(heading, roomPicture(template), button('Confirmar módulo', () => { commit(action); }), button('Cancelar', render));
  }
  function edit(room: RoomId) {
    const b = current(), value = b.layout.rooms[room]!;
    const name = document.createElement('input'); name.value = value.name; name.maxLength = 32; name.setAttribute('aria-label', 'Nome do módulo');
    dialog.replaceChildren(name, button('Salvar nome do módulo', () => commit({ type: 'rename-module', building: id, room, name: name.value })), button('Trocar ambiente', () => choose(value.cell, room)));
    if (room !== b.entry) {
      const destination = document.createElement('select'); destination.setAttribute('aria-label', 'Posição do módulo');
      for (let cell = 1; cell < floorCount(b.layout) * 4; cell++) { const option = document.createElement('option'); option.value = String(cell); option.textContent = `${Math.floor(cell / 4)}º nível · espaço ${cell % 4 + 1}`; option.selected = value.cell === cell; destination.append(option); }
      dialog.append(destination, button('Mover ou trocar posição', () => commit({ type: 'move-module', building: id, room, cell: Number(destination.value) })));
    }
    dialog.append(button('Voltar aos módulos', render)); illustratedChoices(dialog);
  }
  let choosing = false;
  function chooseBuilding() {
    const title = document.createElement('h2'); title.textContent = 'Qual construção vamos ampliar?';
    dialog.replaceChildren(title, ...get().buildings.map(b => button(`Ampliar ${b.name}`, () => { id = b.id; choosing = false; render(); })), button('Fechar estrutura', () => dialog.close()));
  }
  return { open(building?: number) {
    prepare(); const where = get().location;
    choosing = building === undefined && where.kind === 'street';
    id = building ?? (where.kind === 'interior' ? where.building : get().buildings[0]!.id);
    if (choosing) chooseBuilding(); else render();
    if (!dialog.open) dialog.showModal();
  }, refresh() { if (dialog.open && !choosing) render(); } };
}

function guidedRooms(dialog: HTMLDialogElement, building: Building, choosePreview: (cell: number, template: RoomTemplate) => void, addFloor: () => void, advanced: () => void) {
    const heading = document.createElement('h2'); heading.textContent = `Vamos ampliar ${building.name}?`;
    const hint = document.createElement('p'); hint.textContent = 'Escolha um cômodo pronto. Você poderá decorar depois.';
    dialog.replaceChildren(heading, hint, button('Fechar estrutura', () => dialog.close()));
    const occupied = new Set(Object.values(building.layout.rooms).map(room => room.cell));
    const free = Array.from({ length: 12 }, (_, cell) => cell).find(cell => !occupied.has(cell));
    hint.textContent = free === undefined ? 'Esta construção tem 12 de 12 cômodos. Crie outra construção para continuar.' : `O próximo cômodo ficará no ${free < 4 ? 'térreo' : `${Math.floor(free / 4)}º andar`}. Você poderá decorar depois.`;
    const choices = document.createElement('div'); choices.className = 'choices';
    roomTemplates.forEach(template => {
      const choice = button(`Adicionar ${templates[template].name}`, () => choosePreview(free!, template));
      choice.prepend(roomPicture(template)); choice.disabled = free === undefined; choices.append(choice);
    });
    const floor = button('Mais um andar', addFloor);
    floor.disabled = floorCount(building.layout) === 3;
    dialog.append(choices, floor, button('Organizar cômodos', advanced));
  }

function moduleCard(building: Building, cell: number, choose: (cell: number) => void, edit: (room: RoomId) => void, enter: (room: RoomId) => void) {
    const entry = (Object.entries(building.layout.rooms) as [RoomId, typeof building.layout.rooms.sala][]).find(([, r]) => r.cell === cell);
    if (!entry) return button(`+ Cômodo ${cell % 4 + 1}`, () => choose(cell));
    const [room, value] = entry;
    const card = document.createElement('article'); card.className = 'module-card';
    const visit = button(value.name, () => enter(room));
    visit.prepend(roomPicture(value.template)); card.append(visit, button('Editar módulo', () => edit(room)));
    if (room === building.entry) { const label = document.createElement('small'); label.textContent = 'Entrada fixa'; card.append(label); }
    return card;
  }
