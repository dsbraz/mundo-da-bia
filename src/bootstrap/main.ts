import { roomWidth } from '../domain/geometry';
import { childGames } from '../presentation/child-games';
import '../presentation/child-games.css';
import { illustratedChoices } from '../presentation/illustrated-choices';
import { viewport, positionTargets } from '../presentation/viewport';
import { actorAt, sourceAt } from '../presentation/targets';
import { pickupItem } from '../presentation/item-pickup';
import { approach, equipmentAction } from '../presentation/equipment-interaction';
import { outdoorControls, outdoorAt } from '../presentation/outdoor-controls';
import type { OutdoorTarget } from '../presentation/outdoor-controls';
import { worldNavigation } from '../presentation/world-navigation';
import { structureControls } from '../presentation/structure-controls';
import { streetWidth, plotStart } from '../domain/neighborhood-geometry';
import { walking } from '../presentation/walking';
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
import { addRoom, renameRoom } from '../domain/rooms';
import type { Album } from '../domain/types';
import { editWorld, history, recordEdit } from '../domain/design';
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
import '../presentation/immersive.css';
import '../presentation/home-menu.css';

let town = loadNeighborhood();
let state = localWorld(town);
let camera = 0;
let streetPast: Neighborhood[] = [], streetFuture: Neighborhood[] = [];
function albumView(): Album { return { active: town.location.kind === 'interior' ? town.location.building : town.buildings[0]!.id, houses: town.buildings.map(b => ({ id: b.id, name: b.name, state: localWorld({ ...town, location: { kind: 'interior', building: b.id, room: b.entry } }) })) }; }
let edits = history(state);
let building = false, constructing = false;
let selectedPiece: number | null = null;
let selected: ActorId = 'bia';
let saved = saveNeighborhood(town);
const root = document.querySelector<HTMLElement>('#app')!;
const scene = new PlayScene(state);
let wardrobeOpen = false;
let cancelInput = () => {};
let cancelGame = () => {};
let view: ReturnType<typeof viewport> | undefined;
const wardrobeButton = root.querySelector<HTMLButtonElement>('#wardrobe-toggle')!;
const shell = createShell(root, () => cancelInput());
function toggleWardrobe() { cancelGame(); wardrobeOpen = !wardrobeOpen; root.classList.toggle('wardrobe-open', wardrobeOpen); scene.openWardrobe(wardrobeOpen); }
function closeWardrobe() { wardrobeOpen = false; root.classList.remove('wardrobe-open'); scene.openWardrobe(false); }
function openLooks() { closeWardrobe(); shell.looks(); }
wardrobeButton.addEventListener('click', openLooks);
const playSound = createSound(root.querySelector<HTMLButtonElement>('#sound-toggle')!);
const controls = createControls(root, perform, select, () => state, () => building, item => neighborhood.carryItem(item), () => doors(town).length > 0);
const accessibleScene = sceneControls(root, id => { selectedPiece = id; refresh(); }, perform, toggleWardrobe);
const rooms = roomControls(root, {
  enter: room => dispatch({ type: 'room', room }),
  add: options => {
    if (town.location.kind === 'street') return 'Escolha a construção que deseja ampliar.';
    const next = addRoom(state, options);
    if (next === state) return 'Esse espaço não está disponível. Escolha outro espaço para o cômodo.';
    cancelInput(); restoreEdit(recordEdit(edits, next)); return null;
  },
  rename: name => restoreEdit(recordEdit(edits, renameRoom(state, name))),
  reorder: (room, target) => townDispatch({ type: 'move-module', building: albumView().active, room, cell: state.layout.rooms[target]!.cell }),
  closeTray: () => { cancelInput(); shell.close(); },
  snapshot: () => townDispatch({ type: 'duplicate', building: albumView().active }),
});
const editor = createEditorControls(root, {
  toggle: () => { if (!building) toggleBuild(); constructing = false; refresh(); shell.open(); announceMode(); }, edit: applyEdit,
  undo: () => streetUndo(false), redo: () => streetUndo(true),
  select: id => { selectedPiece = id; refresh(); },
  house: id => townDispatch({ type: 'visit', location: { kind: 'interior', building: id, room: town.buildings.find(b => b.id === id)!.entry } }),
  duplicate: empty => { if (empty) newBuilding(); else townDispatch({ type: 'duplicate', building: albumView().active }); },
  rename: name => townDispatch({ type: 'facade', building: albumView().active, name }),
});
const walker = walking({ reject: point => scene.reject(point), state: () => state, selected: () => selected, preview: (id, point) => { scene.previewActor(id, point); if (point) view?.follow({ ...point, x: point.x - camera }); },
  commit: (actor, point) => dispatch({ type: 'move', actor, point }, false), hint: text => { root.querySelector('#announcement')!.textContent = text; } });
const games = childGames(root, { world: () => state, selected: () => selected, prepare: () => { walker.cancel(); cancelInput(); closeWardrobe(); shell.close(); view?.resume(); }, stopWalk: () => walker.cancel(), walk: walker.start, commit: (actor, point) => dispatch({ type: 'move', actor, point }, false), preview: value => scene.previewGame(value), follow: point => view?.follow(point) });
cancelGame = games.cancel;
function dropOutside(actor: ActorId, point: import('../domain/types').Point) {
  const target = outdoorAt(town, point); if (!target) return false;
  townDispatch({ type: 'outdoor', actor, target: target.target, ...(target.building ? { building: target.building } : {}) }); return true;
}
function useOutdoor(target: OutdoorTarget) {
  walker.cancel();
  if (target.target === 'bench' || target.target === 'swing') {
    const occupant = town.outdoor[target.target];
    if (occupant && occupant !== selected) { root.querySelector('#announcement')!.textContent = 'Esse lugar está ocupado. Há outros lugares para brincar!'; return; }
  }
  walker.start({ x: target.point.x, y: 510 }, () => townDispatch({ type: 'outdoor', actor: selected, target: target.target, ...(target.building ? { building: target.building } : {}) }));
}
const outside = outdoorControls(root, useOutdoor, () => townDispatch({ type: 'outdoor', actor: selected, target: 'leave' }));
const structure = structureControls(root, () => town, townDispatch, () => { if (!building) toggleBuild(); walker.cancel(); cancelInput(); shell.close(); });
const navigationBar = worldNavigation(root, { town: () => town, dispatch: townDispatch, selected: () => selected, construct: newBuilding, structure: () => structure.open(), camera: () => camera, pan: x => { camera = x; refresh(); } });
const neighborhood = neighborhoodControls(root, () => town, townDispatch, () => selected, () => root.querySelector<HTMLDialogElement>('#room-dialog')!.close(), dx => { camera = Math.max(0, Math.min(streetWidth(town.plots) - 1000, camera + dx)); scene.camera(camera); positionTargets(root); });
root.querySelector('#construct-mode')!.addEventListener('click', () => { if (!building) toggleBuild(); constructing = true; walker.cancel(); cancelInput(); refresh(); announceMode(); });
root.querySelector('#construct-plot')!.addEventListener('click', newBuilding);
root.querySelector('#construct-structure')!.addEventListener('click', () => structure.open());
root.querySelector('#play-mode')!.addEventListener('click', () => { if (building) toggleBuild(); });
function persist() { town = storeWorld(town, state); saved = saveNeighborhood(town); }
function toggleBuild() {
  cancelGame();
  constructing = false;
  closeWardrobe(); walker.cancel(); cancelTrayDrag(); cancelInput(); building = !building; selectedPiece = null; edits = history(state);
  shell.close();
  refresh();
  announceMode();
}
function announceMode() {
  const editing = constructing ? 'Escolha uma casa pronta ou amplie com cartões de cômodos.' : 'Escolha uma peça. Arraste para mudar de lugar. Experimente sem medo: dá para desfazer!';
  root.querySelector('#announcement')!.textContent = building ? editing : 'Sua casa está pronta para brincar!';
}
function applyEdit(action: EditAction) {
  if (!building || town.location.kind === 'street') return;
  const next = editWorld(state, action);
  if (next === state) { root.querySelector('#announcement')!.textContent = 'Escolha um espaço livre. Móveis precisam de chão e a porta precisa de passagem.'; return; }
  remember();
  edits = recordEdit(edits, next); state = next;
  if (action.type === 'add') selectedPiece = state.layout.pieces.at(-1)?.id ?? null;
  if (!state.layout.pieces.some(p => p.id === selectedPiece)) selectedPiece = null;
  persist(); refresh();
}
function restoreEdit(next: typeof edits) { if (next.present === state) return; remember(); cancelInput(); edits = next; state = edits.present; selectedPiece = null; persist(); refresh(); }
function newBuilding() {
  townDispatch({ type: 'visit', location: { kind: 'street' } });
  if (!building) toggleBuild();
  root.querySelector<HTMLDialogElement>('#room-dialog')!.close();
  neighborhood.choosePlot();
}
function townDispatch(action: NeighborhoodAction) {
  cancelGame();
  closeWardrobe();
  walker.cancel(); cancelTrayDrag(); cancelInput();
  const next = neighborhoodAction(town, action);
  if (next === town) return;
  if (!['visit', 'transport', 'outdoor'].includes(action.type)) remember();
  const settle = scene.captureMotion();
  const previous = town.location; const exitCamera = streetCamera(town);
  town = next; state = localWorld(town); edits = history(state); selectedPiece = null;
  if (town.location.kind === 'street' && previous.kind === 'interior') camera = exitCamera;
  if (town.location.kind !== 'street') camera = 0;
  saved = saveNeighborhood(town); refresh();
  if (action.type === 'visit' || action.type === 'transport') scene.arrive(previous);
  if (action.type === 'construct') structure.open(town.nextBuilding - 1);
  if (action.type === 'outdoor') { settle(); scene.outdoorReaction(action); }
}
function streetCamera(previous: Neighborhood) {
  const where = previous.location;
  if (where.kind === 'street') return camera;
  return Math.max(0, Math.min(streetWidth(previous.plots) - 1000, plotStart(previous.buildings.find(b => b.id === where.building)!.plot) - 280));
}
function remember() { streetPast = [...streetPast.slice(-49), town]; streetFuture = []; }
function streetUndo(forward: boolean) {
  cancelGame(); walker.cancel(); cancelInput();
  const from = forward ? streetFuture : streetPast, to = forward ? streetPast : streetFuture;
  const next = from.pop(); if (!next) return;
  to.push(town); town = next; state = localWorld(town); edits = history(state); selectedPiece = null; saved = saveNeighborhood(town); refresh(); structure.refresh();
}
function previewTown(action: NeighborhoodAction | null) {
  const preview = action ? neighborhoodAction(town, action) : town;
  scene.neighborhood(preview); scene.paint(localWorld(preview), selected);
}
function previewBuild(action: EditAction | null) {
  const preview: World = action ? editWorld(state, action) : state;
  scene.previewLayout(preview);
  if (action?.type === 'move') scene.placementHint(action.point, preview === state);
  else scene.placementHint(null, false);
}
function refresh() {
  camera = Math.min(camera, streetWidth(town.plots) - 1000);
  scene.neighborhood(town); scene.camera(camera);
  scene.buildMode(building, selectedPiece);
  scene.paint(state, selected); controls(state, selected, saved); shell.mode(building, town.location.kind === 'street', constructing);
  view?.scene(JSON.stringify(town.location), state.streetWidth ? 1000 : roomWidth(state));
  renderControls();
  root.querySelector<HTMLButtonElement>('#construct-structure')!.textContent = town.location.kind === 'street' ? 'Escolher construção para ampliar' : 'Adicionar cômodo ou andar';
  root.querySelector('#construct-mode')!.setAttribute('aria-pressed', String(constructing));
  root.querySelector('#build-toggle')!.setAttribute('aria-pressed', String(building && !constructing));
}
function renderControls() {
  const focus = state.layout.pieces.find(p => p.id === selectedPiece) ?? state.actors.find(a => a.id === selected)!;
  root.classList.toggle('selection-on-right', focus.x > 500);
  controls(state, selected, saved);
  editor(albumView(), edits, building, selectedPiece); rooms(state); accessibleScene(state, selected, building); neighborhood.refresh(building, camera);
  navigationBar(); illustratedChoices(root); outside(town, selected, camera, building);
  root.querySelector<HTMLElement>('#build-history')!.hidden = !building && !streetPast.length && !streetFuture.length;
  root.querySelector<HTMLButtonElement>('#undo')!.disabled = !streetPast.length; root.querySelector<HTMLButtonElement>('#redo')!.disabled = !streetFuture.length;
}
function select(id: ActorId) { cancelGame(); walker.cancel(); root.classList.add('actor-chosen'); selected = id; refresh(); }
function perform(action: Action) {
  cancelGame();
  if (action.type === 'pick') { pickup(action.item); return; }
  if (!['use', 'sit', 'interact'].includes(action.type)) { dispatch(action); return; }
  walker.cancel();
  const point = approach(state, selected, action);
  if (!point) { root.querySelector('#announcement')!.textContent = 'Esse lugar está ocupado ou sem passagem.'; return; }
  walker.start(point, () => {
    if (approach(state, selected, action)) dispatch(action);
    else root.querySelector('#announcement')!.textContent = 'Esse lugar está ocupado ou sem passagem.';
  });
}
function pickup(item: import('../domain/types').ItemId) {
  pickupItem(item, { state: () => state, selected: () => selected, dispatch, walk: walker, hint: text => { root.querySelector('#announcement')!.textContent = text; } });
}
function interact(point: import('../domain/types').Point) {
  const action = equipmentAction(state, selected, point);
  if (action === 'wardrobe') { walker.cancel(); toggleWardrobe(); } else if (action) perform(action);
  return action !== null;
}
function dispatch(action: Action, interrupt = true) {
  if (interrupt) { cancelGame(); walker.cancel(); }
  if ('actor' in action) root.classList.add('actor-chosen');
  if (action.type === 'room' || action.type === 'travel') { cancelInput(); closeWardrobe(); }
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
    view = viewport(current.canvas, () => positionTargets(root));
    view.scene(JSON.stringify(town.location), state.streetWidth ? 1000 : roomWidth(state));
    new ResizeObserver(() => { current.scale.getParentBounds(); current.scale.refresh(); view?.render(); }).observe(root.querySelector('#world')!);
    cancelInput = bindInput(current.canvas, () => scene.visibleWorld(), select, point => dispatch({ type: 'move', actor: selected, point }), {
      walk: point => { view?.resume(); const target = outdoorAt(town, point); if (target) useOutdoor(target); else walker.start(point); }, cancelWalk: () => walker.cancel(), hover: point => scene.hover(point), pickup, interact, dispatch, wardrobe: () => wardrobeOpen, toggleWardrobe, preview: drag => scene.preview(drag), previewActor: (id, point) => scene.previewActor(id, point),
    }, { enabled: () => building, gesture: createBuildGesture(() => state, id => { selectedPiece = id; refresh(); }, previewBuild, applyEdit, point => scene.pickPiece(point), () => current.canvas.getBoundingClientRect().height / 600) }, {
      view: { background: p => { const world = scene.visibleWorld(); return building ? !scene.pickPiece(p) : !sourceAt(world, p, wardrobeOpen) && !actorAt(world, p) && !scene.pickPiece(p); }, pan: (dx, dy) => {
        if (state.streetWidth) { camera = Math.max(0, Math.min(state.streetWidth - 1000, camera - dx * 600 / current.canvas.getBoundingClientRect().height)); scene.camera(camera); }
        view?.pan(state.streetWidth ? 0 : dx, dy);
      } },
      camera: () => camera, setCamera: x => { camera = x; scene.camera(x); positionContext(root, state.actors.find(a => a.id === selected)!, state); neighborhood.refresh(building, camera); outside(town, selected, camera, building); navigationBar(); },
      building: () => building, wardrobe: () => wardrobeOpen, dispatch,
      pan: (room, fraction) => scene.pan(room, fraction),
      transfer: (room, actor, item, point) => scene.previewTransfer(room, actor, item, point),
      progress: (value, side) => {
        const indicator = root.querySelector<HTMLElement>('#edge-progress')!;
        indicator.hidden = value === 0; indicator.dataset.side = side;
        indicator.style.setProperty('--progress', `${value * 100}%`); indicator.setAttribute('aria-valuenow', String(Math.round(value * 100)));
      },
    }, base => neighborhoodGesture(base, { town: () => town, world: () => scene.visibleWorld(), building: () => building, dispatch: townDispatch, plot: neighborhood.plot, drop: dropOutside, preview: previewTown, progress: value => { const indicator = root.querySelector<HTMLElement>('#edge-progress')!; indicator.hidden = value === 0; indicator.style.setProperty('--progress', `${value * 100}%`); } }));
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
  event.preventDefault(); walker.cancel();
  const actor = state.actors.find(a => a.id === selected)!;
  dispatch({ type: 'move', actor: selected, point: { x: actor.x + offset[0], y: actor.y + offset[1] } });
});
buttonArt(root);
root.querySelector('#announcement')!.textContent = `${actors[selected].name} · crie um lugar, invente uma história.`;
refresh();
window.addEventListener('resize', () => requestAnimationFrame(renderControls));
window.addEventListener('blur', () => walker.cancel());
window.addEventListener('keydown', event => { if (event.key === 'Escape') walker.cancel(); });
window.addEventListener('pagehide', () => { walker.cancel(); persist(); game.loop.sleep(); });
window.addEventListener('pageshow', () => game.loop.wake());
