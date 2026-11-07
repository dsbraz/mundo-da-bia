import { buttonArt } from '../presentation/button-art';
import { cancelTrayDrag } from '../presentation/tray-drag';
import { sceneControls } from '../presentation/scene-controls';
import { createShell } from '../presentation/shell';
import { roomControls } from '../presentation/room-controls';
import { addRoom, renameRoom, reorderRoom } from '../domain/rooms';
import { activeHouse, duplicateHouse, renameHouse, selectHouse, updateHouse } from '../domain/houses';
import { editWorld, history, recordEdit, redo, undo } from '../domain/design';
import type { EditAction, World } from '../domain/types';
import { createEditorControls } from '../presentation/editor-controls';
import { createBuildGesture } from '../presentation/build-gesture';
import Phaser from 'phaser';
import { createSound } from '../presentation/sound';
import { actors } from '../content/catalog';
import type { Action, ActorId } from '../domain/types';
import { transition } from '../domain/world';
import { loadAlbum, saveAlbum } from '../persistence/storage';
import { createControls } from '../presentation/controls';
import { bindInput } from '../presentation/input';
import { PlayScene } from '../presentation/scene';
import '../presentation/style.css';

let album = loadAlbum();
let state = activeHouse(album).state;
let edits = history(state);
let building = false;
let selectedPiece: number | null = null;
let selected: ActorId = 'bia';
let saved = saveAlbum(album);
const root = document.querySelector<HTMLElement>('#app')!;
const scene = new PlayScene(state);
let wardrobeOpen = false;
let cancelInput = () => {};
const wardrobeButton = root.querySelector<HTMLButtonElement>('#wardrobe-toggle')!;
const shell = createShell(root, () => cancelInput());
function toggleWardrobe() { wardrobeOpen = false; shell.looks(); }
wardrobeButton.addEventListener('click', toggleWardrobe);
const playSound = createSound(root.querySelector<HTMLButtonElement>('#sound-toggle')!);
const controls = createControls(root, dispatch, select, () => state, () => building);
const accessibleScene = sceneControls(root, id => { selectedPiece = id; refresh(); }, dispatch, toggleWardrobe);
const rooms = roomControls(root, {
  enter: room => dispatch({ type: 'room', room }),
  add: options => {
    cancelInput(); restoreEdit(recordEdit(edits, addRoom(state, options)));
  },
  rename: name => restoreEdit(recordEdit(edits, renameRoom(state, name))),
  reorder: (room, target) => restoreEdit(recordEdit(edits, reorderRoom(state, room, target))),
  closeTray: () => { cancelInput(); shell.close(); },
  snapshot: name => changeAlbum(renameHouse(duplicateHouse(album, false), name)),
});
const editor = createEditorControls(root, {
  toggle: toggleBuild, edit: applyEdit,
  undo: () => restoreEdit(undo(edits)), redo: () => restoreEdit(redo(edits)),
  select: id => { selectedPiece = id; refresh(); },
  house: id => changeAlbum(selectHouse(album, id)),
  duplicate: empty => { changeAlbum(duplicateHouse(album, empty)); if (!building) toggleBuild(); },
  rename: name => changeAlbum(renameHouse(album, name)),
});
root.querySelector('#play-mode')!.addEventListener('click', () => { if (building) toggleBuild(); });
function persist() { album = updateHouse(album, state); saved = saveAlbum(album); }
function toggleBuild() {
  cancelTrayDrag(); cancelInput(); building = !building; selectedPiece = null;
  shell.close();
  refresh();
  root.querySelector('#announcement')!.textContent = building ? 'Escolha uma peça. Arraste para mudar de lugar. Experimente sem medo: dá para desfazer!' : 'Sua casa está pronta para brincar!';
}
function applyEdit(action: EditAction) {
  if (!building) return;
  const next = editWorld(state, action);
  edits = recordEdit(edits, next); state = next;
  if (action.type === 'add') selectedPiece = state.layout.pieces.at(-1)?.id ?? null;
  if (!state.layout.pieces.some(p => p.id === selectedPiece)) selectedPiece = null;
  persist(); refresh();
}
function restoreEdit(next: typeof edits) { cancelInput(); edits = next; state = edits.present; selectedPiece = null; persist(); refresh(); }
function changeAlbum(next: typeof album) {
  cancelTrayDrag(); cancelInput(); album = next; state = activeHouse(album).state; edits = history(state); selectedPiece = null;
  saved = saveAlbum(album); refresh();
}
function previewBuild(action: EditAction | null) {
  const preview: World = action ? editWorld(state, action) : state;
  scene.previewLayout(preview);
}
function refresh() {
  scene.buildMode(building, selectedPiece);
  scene.paint(state, selected); controls(state, selected, saved); shell.mode(building);
  editor(album, edits, building, selectedPiece); rooms(state); accessibleScene(state, selected, building);
}
function select(id: ActorId) { root.classList.add('actor-chosen'); selected = id; refresh(); }
function dispatch(action: Action) {
  if ('actor' in action) root.classList.add('actor-chosen');
  if (action.type === 'room' || action.type === 'travel') cancelInput();
  const result = transition(state, action);
  state = result.state;
  edits = building && action.type === 'room' ? { ...edits, present: state } : history(state); selectedPiece = null;
  if (result.events.length) persist();
  refresh();
  scene.react(result.events); playSound(result.events);
  const event = result.events[0];
  if (event) root.querySelector('#announcement')!.textContent = messages[event.type];
}
const messages = {
  furniture: 'A casa também brinca com você!', moved: 'Novo lugar para brincar!', dressed: 'Look novo!', picked: 'Objeto na mão!', dropped: 'Objeto solto.',
  fed: 'Lanche servido.', rested: 'Hora de cuidar.', room: 'Vamos explorar!', summoned: 'A turma chegou.', show: 'A música é por sua conta! Vamos dançar!',
};
const game = new Phaser.Game({
  type: Phaser.CANVAS, parent: 'world', width: 1000, height: 600, backgroundColor: '#f6dfd4',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene, audio: { noAudio: true }, render: { antialias: true },
  callbacks: { postBoot: current => {
    current.canvas.setAttribute('aria-label', 'Casa de brincar. Abra o armário e arraste roupas, comida e brinquedos até os personagens.');
    new ResizeObserver(() => { controls(state, selected, saved); editor(album, edits, building, selectedPiece); accessibleScene(state, selected, building); }).observe(current.canvas);
    cancelInput = bindInput(current.canvas, () => state, select, point => dispatch({ type: 'move', actor: selected, point }), {
      dispatch, wardrobe: () => wardrobeOpen, toggleWardrobe, preview: drag => scene.preview(drag), previewActor: (id, point) => scene.previewActor(id, point),
    }, { enabled: () => building, gesture: createBuildGesture(() => state, id => { selectedPiece = id; refresh(); }, previewBuild, applyEdit, point => scene.pickPiece(point)) }, {
      building: () => building, wardrobe: () => wardrobeOpen, dispatch,
      pan: (room, fraction) => scene.pan(room, fraction),
      transfer: (room, actor, item, point) => scene.previewTransfer(room, actor, item, point),
      progress: (value, side) => {
        const indicator = root.querySelector<HTMLElement>('#edge-progress')!;
        indicator.hidden = value === 0; indicator.dataset.side = side;
        indicator.style.setProperty('--progress', `${value * 100}%`); indicator.setAttribute('aria-valuenow', String(Math.round(value * 100)));
      },
    });
  } },
});
root.addEventListener('keydown', event => {
  const target = event.target as HTMLElement;
  if (target.closest('input,select,button') && !target.matches('.scene-target')) return;
  const key = (event as KeyboardEvent).key;
  const offsets: Record<string, [number, number]> = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] };
  const offset = offsets[key];
  if (building) {
    if (offset && selectedPiece !== null) {
      event.preventDefault(); const piece = state.layout.pieces.find(p => p.id === selectedPiece)!;
      applyEdit({ type: 'move', id: piece.id, point: { x: piece.x + offset[0], y: piece.y + offset[1] } });
    }
    return;
  }
  if (!offset) return;
  event.preventDefault();
  const actor = state.actors.find(a => a.id === selected)!;
  dispatch({ type: 'move', actor: selected, point: { x: actor.x + offset[0], y: actor.y + offset[1] } });
});
buttonArt(root);
root.querySelector('#announcement')!.textContent = `${actors[selected].name} · crie um lugar, invente uma história.`;
refresh();
window.addEventListener('resize', () => requestAnimationFrame(() => {
  controls(state, selected, saved); editor(album, edits, building, selectedPiece); accessibleScene(state, selected, building);
}));
window.addEventListener('pagehide', () => { persist(); game.loop.sleep(); });
window.addEventListener('pageshow', () => game.loop.wake());
