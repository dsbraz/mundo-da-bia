import { activeHouse, duplicateHouse, renameHouse, selectHouse, updateHouse } from '../domain/houses';
import { editWorld, history, recordEdit, redo, undo } from '../domain/design';
import { fixture } from '../domain/layout';
import type { EditAction, World } from '../domain/types';
import { createEditorControls } from '../presentation/editor-controls';
import { createBuildGesture } from '../presentation/build-gesture';
import Phaser from 'phaser';
import { createSound } from '../presentation/sound';
import { homeControls } from '../presentation/home-controls';
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
function toggleWardrobe() {
  wardrobeOpen = !wardrobeOpen;
  wardrobeButton.textContent = wardrobeOpen ? 'Fechar armário' : 'Abrir armário';
  wardrobeButton.setAttribute('aria-expanded', String(wardrobeOpen));
  scene.openWardrobe(wardrobeOpen);
}
wardrobeButton.addEventListener('click', toggleWardrobe);
const playSound = createSound(root.querySelector<HTMLButtonElement>('#sound-toggle')!);
const furnitureControls = homeControls(root, dispatch);
const controls = createControls(root, dispatch, select);
const editor = createEditorControls(root, {
  toggle: toggleBuild, edit: applyEdit,
  undo: () => restoreEdit(undo(edits)), redo: () => restoreEdit(redo(edits)),
  select: id => { selectedPiece = id; refresh(); },
  house: id => changeAlbum(selectHouse(album, id)),
  duplicate: empty => { changeAlbum(duplicateHouse(album, empty)); if (!building) toggleBuild(); },
  rename: name => changeAlbum(renameHouse(album, name)),
});
root.querySelector('#catalog-toggle')!.addEventListener('click', () => {
  const hidden = root.classList.toggle('catalog-hidden');
  root.querySelector('#catalog-toggle')!.textContent = hidden ? 'Mostrar catálogo' : 'Ocultar catálogo';
  root.querySelector('#catalog-toggle')!.setAttribute('aria-expanded', String(!hidden));
});
function persist() { album = updateHouse(album, state); saved = saveAlbum(album); }
function toggleBuild() {
  cancelInput(); building = !building; selectedPiece = null;
  root.querySelectorAll('details.tray').forEach(tray => { (tray as HTMLDetailsElement).open = false; });
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
  cancelInput(); album = next; state = activeHouse(album).state; edits = history(state); selectedPiece = null;
  saved = saveAlbum(album); refresh();
}
function previewBuild(action: EditAction | null) {
  const preview: World = action ? editWorld(state, action) : state;
  scene.paint(preview, selected);
}
function refresh() {
  scene.buildMode(building, selectedPiece);
  scene.paint(state, selected); furnitureControls(state); controls(state, selected, saved);
  wardrobeButton.disabled = fixture(state, 'wardrobe')?.room !== state.room;
  editor(album, edits, building, selectedPiece);
}
function select(id: ActorId) { selected = id; refresh(); }
function dispatch(action: Action) {
  if (action.type === 'room') cancelInput();
  const result = transition(state, action);
  state = result.state;
  edits = history(state); selectedPiece = null;
  if (result.events.length) persist();
  refresh();
  scene.react(result.events); playSound(result.events);
  const event = result.events[0];
  if (event) root.querySelector('#announcement')!.textContent = messages[event.type];
}
const messages = {
  furniture: 'A casa também brinca com você!', moved: 'Novo lugar para brincar!', dressed: 'Look novo!', picked: 'Objeto na mão!', dropped: 'Objeto solto.',
  fed: 'Nhac! Que delícia!', rested: 'Hora de cuidar.', room: 'Vamos explorar!', summoned: 'Todo mundo juntinho!', show: 'A música é por sua conta! Vamos dançar!',
};
const game = new Phaser.Game({
  type: Phaser.CANVAS, parent: 'world', width: 1000, height: 600, backgroundColor: '#f6dfd4',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene, audio: { noAudio: true }, render: { antialias: true },
  callbacks: { postBoot: current => {
    current.canvas.setAttribute('aria-label', 'Casa de brincar. Abra o armário e arraste roupas, comida e brinquedos até os personagens.');
    cancelInput = bindInput(current.canvas, () => state, select, point => dispatch({ type: 'move', actor: selected, point }), {
      dispatch, wardrobe: () => wardrobeOpen, toggleWardrobe, preview: drag => scene.preview(drag),
    }, { enabled: () => building, gesture: createBuildGesture(() => state, id => { selectedPiece = id; refresh(); }, previewBuild, applyEdit, point => scene.pickPiece(point)) });
  } },
});
root.querySelector('#world')!.addEventListener('keydown', event => {
  const key = (event as KeyboardEvent).key;
  const offsets: Record<string, [number, number]> = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] };
  const offset = offsets[key];
  if (building) return;
  if (!offset) return;
  event.preventDefault();
  const actor = state.actors.find(a => a.id === selected)!;
  dispatch({ type: 'move', actor: selected, point: { x: actor.x + offset[0], y: actor.y + offset[1] } });
});
root.querySelector('#announcement')!.textContent = `Oi! ${actors[selected].name} está pronta para brincar.`;
refresh();
window.addEventListener('pagehide', () => { persist(); game.loop.sleep(); });
window.addEventListener('pageshow', () => game.loop.wake());
