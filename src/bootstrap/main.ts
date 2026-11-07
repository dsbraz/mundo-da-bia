import { doors } from '../presentation/neighborhood-doors';
import { localWorld, storeWorld, neighborhoodAction } from '../domain/neighborhood';
import type { NeighborhoodAction, Neighborhood } from '../domain/neighborhood-types';
import { neighborhoodControls } from '../presentation/neighborhood-controls';
import { neighborhoodGesture } from '../presentation/neighborhood-gesture';
import { buttonArt } from '../presentation/button-art';
import { cancelTrayDrag } from '../presentation/tray-drag';
import { sceneControls } from '../presentation/scene-controls';
import { createShell } from '../presentation/shell';
import { roomControls } from '../presentation/room-controls';
import { addRoom, renameRoom, reorderRoom } from '../domain/rooms';
import type { Album } from '../domain/types';
import { editWorld, history, recordEdit, redo, undo } from '../domain/design';
import type { EditAction, World } from '../domain/types';
import { createEditorControls } from '../presentation/editor-controls';
import { createBuildGesture } from '../presentation/build-gesture';
import Phaser from 'phaser';
import { createSound } from '../presentation/sound';
import { actors } from '../content/catalog';
import type { Action, ActorId } from '../domain/types';
import { transition } from '../domain/world';
import { loadNeighborhood, saveNeighborhood } from '../persistence/storage';
import { createControls, positionContext } from '../presentation/controls';
import { bindInput } from '../presentation/input';
import { PlayScene } from '../presentation/scene';
import '../presentation/style.css';

let town = loadNeighborhood();
let state = localWorld(town);
let camera = 0;
let streetPast: Neighborhood[] = [], streetFuture: Neighborhood[] = [];
function albumView(): Album { return { active: town.location.kind === 'interior' ? town.location.building : town.buildings[0]!.id, houses: town.buildings.map(b => ({ id: b.id, name: b.name, state: localWorld({ ...town, location: { kind: 'interior', building: b.id, room: b.entry } }) })) }; }
let edits = history(state);
let building = false;
let selectedPiece: number | null = null;
let selected: ActorId = 'bia';
let saved = saveNeighborhood(town);
const root = document.querySelector<HTMLElement>('#app')!;
const scene = new PlayScene(state);
let wardrobeOpen = false;
let cancelInput = () => {};
const wardrobeButton = root.querySelector<HTMLButtonElement>('#wardrobe-toggle')!;
const shell = createShell(root, () => cancelInput());
function toggleWardrobe() { wardrobeOpen = !wardrobeOpen; scene.openWardrobe(wardrobeOpen); }
function openLooks() { wardrobeOpen = false; scene.openWardrobe(false); shell.looks(); }
wardrobeButton.addEventListener('click', openLooks);
const playSound = createSound(root.querySelector<HTMLButtonElement>('#sound-toggle')!);
const controls = createControls(root, dispatch, select, () => state, () => building, item => neighborhood.carryItem(item), () => doors(town).length > 0);
const accessibleScene = sceneControls(root, id => { selectedPiece = id; refresh(); }, dispatch, toggleWardrobe);
const rooms = roomControls(root, {
  enter: room => dispatch({ type: 'room', room }),
  add: options => {
    cancelInput(); restoreEdit(recordEdit(edits, addRoom(state, options)));
  },
  rename: name => restoreEdit(recordEdit(edits, renameRoom(state, name))),
  reorder: (room, target) => restoreEdit(recordEdit(edits, reorderRoom(state, room, target))),
  closeTray: () => { cancelInput(); shell.close(); },
  snapshot: () => townDispatch({ type: 'duplicate', building: albumView().active }),
});
const editor = createEditorControls(root, {
  toggle: toggleBuild, edit: applyEdit,
  undo: () => town.location.kind === 'street' ? streetUndo(false) : restoreEdit(undo(edits)), redo: () => town.location.kind === 'street' ? streetUndo(true) : restoreEdit(redo(edits)),
  select: id => { selectedPiece = id; refresh(); },
  house: id => townDispatch({ type: 'visit', location: { kind: 'interior', building: id, room: town.buildings.find(b => b.id === id)!.entry } }),
  duplicate: empty => { if (empty) newBuilding(); else townDispatch({ type: 'duplicate', building: albumView().active }); },
  rename: name => townDispatch({ type: 'facade', building: albumView().active, name }),
});
const neighborhood = neighborhoodControls(root, () => town, townDispatch, () => selected, () => root.querySelector<HTMLDialogElement>('#room-dialog')!.close());
root.querySelector('#play-mode')!.addEventListener('click', () => { if (building) toggleBuild(); });
function persist() { town = storeWorld(town, state); saved = saveNeighborhood(town); }
function toggleBuild() {
  cancelTrayDrag(); cancelInput(); building = !building; selectedPiece = null; edits = history(state); streetPast = []; streetFuture = [];
  shell.close();
  refresh();
  root.querySelector('#announcement')!.textContent = building ? 'Escolha uma peça. Arraste para mudar de lugar. Experimente sem medo: dá para desfazer!' : 'Sua casa está pronta para brincar!';
}
function applyEdit(action: EditAction) {
  if (!building || town.location.kind === 'street') return;
  const next = editWorld(state, action);
  edits = recordEdit(edits, next); state = next;
  if (action.type === 'add') selectedPiece = state.layout.pieces.at(-1)?.id ?? null;
  if (!state.layout.pieces.some(p => p.id === selectedPiece)) selectedPiece = null;
  persist(); refresh();
}
function restoreEdit(next: typeof edits) { cancelInput(); edits = next; state = edits.present; selectedPiece = null; persist(); refresh(); }
function newBuilding() {
  townDispatch({ type: 'visit', location: { kind: 'street' } });
  if (!building) toggleBuild();
  root.querySelector<HTMLDialogElement>('#room-dialog')!.close();
  neighborhood.plot(Array.from({ length: town.plots }, (_, i) => i).find(i => !town.buildings.some(b => b.plot === i))!);
}
function townDispatch(action: NeighborhoodAction) {
  cancelTrayDrag(); cancelInput();
  const next = neighborhoodAction(town, action);
  if (next === town) return;
  if (building && town.location.kind === 'street' && ['construct', 'facade', 'duplicate'].includes(action.type)) { streetPast = [...streetPast.slice(-49), town]; streetFuture = []; }
  else { streetPast = []; streetFuture = []; }
  const previous = town.location;
  town = next; state = localWorld(town); edits = history(state); selectedPiece = null;
  if (town.location.kind === 'street' && previous.kind === 'interior') camera = Math.max(0, Math.min(town.plots * 440 - 1000, town.buildings.find(b => b.id === previous.building)!.plot * 440 - 280));
  if (town.location.kind !== 'street') camera = 0;
  saved = saveNeighborhood(town); refresh();
}
function streetUndo(forward: boolean) {
  cancelInput();
  const from = forward ? streetFuture : streetPast, to = forward ? streetPast : streetFuture;
  const next = from.pop(); if (!next) return;
  to.push(town); town = next; state = localWorld(town); saved = saveNeighborhood(town); refresh();
}
function previewTown(action: NeighborhoodAction | null) {
  const preview = action ? neighborhoodAction(town, action) : town;
  scene.neighborhood(preview); scene.paint(localWorld(preview), selected);
}
function previewBuild(action: EditAction | null) {
  const preview: World = action ? editWorld(state, action) : state;
  scene.previewLayout(preview);
}
function refresh() {
  camera = Math.min(camera, town.plots * 440 - 1000);
  scene.neighborhood(town); scene.camera(camera);
  scene.buildMode(building, selectedPiece);
  scene.paint(state, selected); controls(state, selected, saved); shell.mode(building, town.location.kind === 'street');
  renderControls();
}
function renderControls() {
  controls(state, selected, saved);
  editor(albumView(), edits, building, selectedPiece); rooms(state); accessibleScene(state, selected, building); neighborhood.refresh(building, camera);
  if (town.location.kind === 'street') { root.querySelector<HTMLButtonElement>('#undo')!.disabled = !streetPast.length; root.querySelector<HTMLButtonElement>('#redo')!.disabled = !streetFuture.length; }
}
function select(id: ActorId) { root.classList.add('actor-chosen'); selected = id; refresh(); }
function dispatch(action: Action) {
  if ('actor' in action) root.classList.add('actor-chosen');
  if (action.type === 'room' || action.type === 'travel') cancelInput();
  const settle = scene.captureMotion();
  const result = transition(state, action);
  state = result.state;
  edits = history(state); selectedPiece = null;
  if (result.events.length) persist();
  refresh();
  settle(); scene.react(result.events); playSound(result.events);
  const event = result.events[0];
  if (event) root.querySelector('#announcement')!.textContent = messages[event.type];
}
const messages = {
  named: 'Nome salvo!',
  furniture: 'A casa também brinca com você!', moved: 'Novo lugar para brincar!', dressed: 'Look novo!', picked: 'Objeto na mão!', dropped: 'Objeto solto.',
  fed: 'Lanche servido.', rested: 'Hora de cuidar.', room: 'Vamos explorar!', summoned: 'A turma chegou.', show: 'A música é por sua conta! Vamos dançar!',
};
const game = new Phaser.Game({
  type: Phaser.CANVAS, parent: 'world', width: 2000, height: 1200, backgroundColor: '#f6dfd4',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene, audio: { noAudio: true }, render: { antialias: true },
  callbacks: { postBoot: current => {
    current.canvas.setAttribute('aria-label', 'Casa de brincar. Abra o armário e arraste roupas, comida e brinquedos até os personagens.');
    new ResizeObserver(renderControls).observe(current.canvas);
    cancelInput = bindInput(current.canvas, () => state, select, point => dispatch({ type: 'move', actor: selected, point }), {
      dispatch, wardrobe: () => wardrobeOpen, toggleWardrobe, preview: drag => scene.preview(drag), previewActor: (id, point) => scene.previewActor(id, point),
    }, { enabled: () => building, gesture: createBuildGesture(() => state, id => { selectedPiece = id; refresh(); }, previewBuild, applyEdit, point => scene.pickPiece(point)) }, {
      camera: () => camera, setCamera: x => { camera = x; scene.camera(x); positionContext(root, state.actors.find(a => a.id === selected)!, state); neighborhood.refresh(building, camera); },
      building: () => building, wardrobe: () => wardrobeOpen, dispatch,
      pan: (room, fraction) => scene.pan(room, fraction),
      transfer: (room, actor, item, point) => scene.previewTransfer(room, actor, item, point),
      progress: (value, side) => {
        const indicator = root.querySelector<HTMLElement>('#edge-progress')!;
        indicator.hidden = value === 0; indicator.dataset.side = side;
        indicator.style.setProperty('--progress', `${value * 100}%`); indicator.setAttribute('aria-valuenow', String(Math.round(value * 100)));
      },
    }, base => neighborhoodGesture(base, { town: () => town, world: () => state, building: () => building, dispatch: townDispatch, plot: neighborhood.plot, preview: previewTown, progress: value => { const indicator = root.querySelector<HTMLElement>('#edge-progress')!; indicator.hidden = value === 0; indicator.style.setProperty('--progress', `${value * 100}%`); } }));
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
window.addEventListener('resize', () => requestAnimationFrame(renderControls));
window.addEventListener('pagehide', () => { persist(); game.loop.sleep(); });
window.addEventListener('pageshow', () => game.loop.wake());
