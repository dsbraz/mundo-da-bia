import { roomWidth } from '../domain/geometry';
import { childGames } from '../presentation/child-games';
import '../presentation/child-games.css';
import { illustratedChoices } from '../presentation/illustrated-choices';
import { viewport, positionTargets, screenScale, streetFrame, pieceSpans, peopleSpans } from '../presentation/viewport';
import { actorAt, sourceAt } from '../presentation/targets';
import { outdoorControls, outdoorAt } from '../presentation/outdoor-controls';
import { townActions } from './town-actions';
import { realClock, startTicks } from './clock';
import { sceneFeedback } from './scene-feedback';
import { modeLine, refusal, welcomeLine, nameOf } from '../content/feedback-text';
import { plaza } from './plaza';
import { playActions } from './play-actions';
import { bindKeyboard } from './keyboard';
import { edgeProgress } from './edge-progress';
import { worldNavigation } from '../presentation/world-navigation';
import { structureControls } from '../presentation/structure-controls';
import { streetWidth } from '../domain/neighborhood-geometry';
import { walking } from '../presentation/walking';
import { goTo } from './go';
import { doorWalk } from './door-walk';
import { uiText } from '../content/ui-text';
import { localWorld, storeWorld } from '../domain/neighborhood';
import type { NeighborhoodAction } from '../domain/neighborhood-types';
import { neighborhoodControls } from '../presentation/neighborhood-controls';
import { neighborhoodGesture } from '../presentation/neighborhood-gesture';
import { buttonArt } from '../presentation/button-art';
import { cancelTrayDrag } from '../presentation/tray-drag';
import { sceneControls } from '../presentation/scene-controls';
import { createShell } from '../presentation/shell';
import { roomControls } from '../presentation/room-controls';
import { addRoom, renameRoom } from '../domain/rooms';
import type { Action, ActorId, Album, EditAction } from '../domain/types';
import { editWorld, history, recordEdit } from '../domain/design';
import { createEditorControls } from '../presentation/editor-controls';
import { createBuildGesture } from '../presentation/build-gesture';
import { dragPreview, settleMove } from '../presentation/build-preview';
import Phaser from 'phaser';
import { loadFonts } from '../presentation/text-style';
import { transition } from '../domain/world';
import { loadFirstTouchSeen, loadNeighborhood, saveFirstTouchSeen, saveNeighborhood } from '../persistence/storage';
import { firstTouch } from '../presentation/first-touch';
import { createControls, positionContext } from '../presentation/controls';
import { bindInput } from '../presentation/input';
import { PlayScene } from '../presentation/scene';
import '../presentation/style.css';
import '../presentation/immersive.css';
import '../presentation/home-menu.css';
import '../presentation/dock-layout.css';
import '../presentation/kitchen.css';
import { kitchen } from './kitchen';
import { gardenPlay } from './garden';

let town = loadNeighborhood();
let state = localWorld(town);
let camera = 0;
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
const shell = createShell(root, () => cancelInput());
const feedback = sceneFeedback({ root, scene, state: () => state, selected: () => selected }), announce = feedback.announce, progress = edgeProgress(root);
function toggleWardrobe() { cancelGame(); wardrobeOpen = !wardrobeOpen; root.classList.toggle('wardrobe-open', wardrobeOpen); scene.openWardrobe(wardrobeOpen); }
function closeWardrobe() { wardrobeOpen = false; root.classList.remove('wardrobe-open'); scene.openWardrobe(false); }
function openLooks() { closeWardrobe(); shell.looks(); }
const controls = createControls(root, action => play.perform(action), id => play.select(id), () => state, () => building, { looks: openLooks, games: () => games.open() });
const accessibleScene = sceneControls(root, id => { selectedPiece = id; refresh(); }, action => play.perform(action), toggleWardrobe);
const rooms = roomControls(root, {
  enter: (room, going) => { const where = town.location; if (going && where.kind === 'interior') go({ ...where, room }); else dispatch({ type: 'room', room }); },
  hint: () => building ? uiText.map.createHint : uiText.map.playHint(nameOf(state.actors.find(a => a.id === selected)!)),
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
  blink: kind => scene.blinkPiece(kind),
});
const walker = walking({ reject: point => feedback.refuse(refusal('walk', ''), { x: point.x, y: point.y - 40 }), state: () => state, selected: () => selected, preview: (id, point) => { scene.previewActor(id, point); if (point) view?.follow({ ...point, x: point.x - camera }); },
  commit: (actor, point) => dispatch({ type: 'move', actor, point }, false), face: (actor, point) => scene.face(actor, point), hint: () => {} });
const games = childGames(root, { world: () => state, selected: () => selected, prepare: () => { walker.cancel(); cancelInput(); closeWardrobe(); shell.close(); view?.resume(); }, stopWalk: () => walker.cancel(), walk: walker.start, commit: (actor, point) => dispatch({ type: 'move', actor, point }, false), preview: value => scene.previewGame(value), follow: (point, slack) => view?.follow(point, undefined, slack),
  select: id => play.select(id), drop: actor => dispatch({ type: 'drop', actor }, false), stroll: moves => scene.stroll(moves), react: (id, pose, line) => { scene.poke(id, pose, line); feedback.sound.cue(pose === 'goof' ? 'poke' : 'cheer'); } });
cancelGame = games.cancel;
const go = goTo({ town: () => town, selected: () => selected, building: () => building, townDispatch });
const enterDoor = doorWalk({ town: () => town, selected: () => selected, building: () => building, walker, dispatch: townDispatch, enterDoor: (id, where, done) => scene.outdoor.enterDoor(id, where, done) });
scene.ballRest = (item, point) => dispatch({ type: 'place', item, point }, false);
const garden = gardenPlay({ root, town: () => town, selected: () => selected, building: () => building, walker, now: () => realClock.now(), apply: next => townActs.apply(next), scene, feedback });
const square = plaza({ town: () => town, selected: () => selected, walker, dispatch: townDispatch, refuse: feedback.refuse, push: rider => scene.outdoor.push(rider), garden });
const play = playActions({ root, state: () => state, selected: () => selected, choose: id => { selected = id; refresh(); }, cancelGame, walker, dispatch, toggleWardrobe, refuse: feedback.refuse, bench: piece => cooking.open(piece) });
const outside = outdoorControls(root, square.use);
const structure = structureControls(root, () => town, townDispatch, () => { if (!building) toggleBuild(); walker.cancel(); cancelInput(); shell.close(); });
const navigationBar = worldNavigation(root, { town: () => town, dispatch: townDispatch, go: location => go(location), construct: newBuilding, structure: () => structure.open(), camera: () => camera, pan: x => { camera = x; refresh(); } });
const neighborhood = neighborhoodControls(root, () => town, townDispatch, location => go(location), () => root.querySelector<HTMLDialogElement>('#room-dialog')!.close(), dx => { camera = Math.max(0, Math.min(streetWidth(town.plots) - 1000, camera + dx)); scene.camera(camera); positionTargets(root); }, id => structure.open(id), () => streetUndo(false));
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
function announceMode() { announce(modeLine(building, constructing)); }
function applyEdit(action: EditAction) {
  if (!building || town.location.kind === 'street') return;
  const next = editWorld(state, action);
  if (next === state) { announce(refusal('edit', '')); return; }
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
const townActs = townActions({ town: () => town, selected: () => selected, camera: () => camera, setCamera: x => { camera = x; }, refresh, scene, cue: sound => feedback.sound.cue(sound),
  commit: next => { town = next; state = localWorld(town); edits = history(state); selectedPiece = null; saved = saveNeighborhood(town); },
  quiet: next => { town = next; saved = saveNeighborhood(town); scene.neighborhood(town); scene.outdoor.garden.redraw(); },
  interrupt: () => { scene.balls.settle(); cancelGame(); closeWardrobe(); walker.cancel(); cancelTrayDrag(); cancelInput(); },
  pause: () => { cancelGame(); walker.cancel(); cancelInput(); }, structure: { open: id => structure.open(id), refresh: () => structure.refresh() } });
function townDispatch(action: NeighborhoodAction) { townActs.dispatch(action); }
const cooking = kitchen({ root, town: () => town, selected: () => selected, building: () => building, apply: next => townActs.apply(next), scene, feedback });
const remember = () => townActs.remember(), streetUndo = (forward: boolean) => townActs.undo(forward);
/** Ticks counted on #app only under automation (`navigator.webdriver`), for the E2E clock. */
let ticks = 0; startTicks(realClock, now => { townActs.tick(now); if (navigator.webdriver) root.dataset.ticks = String(++ticks); });
function previewBuild(action: EditAction | null) {
  const preview = action ? dragPreview(state, action) : { world: state, invalid: false };
  scene.previewLayout(preview.world); scene.placementHint(action?.type === 'move' ? action.id : null, preview.invalid);
}
function dropPiece(action: EditAction) {
  if (action.type !== 'move') { applyEdit(action); return; }
  applyEdit(settleMove(state, action) ?? action); scene.slidePiece(action.id, action.point);
}
function refresh() {
  camera = Math.min(camera, streetWidth(town.plots) - 1000);
  scene.neighborhood(town); scene.camera(camera);
  scene.buildMode(building, selectedPiece);
  scene.paint(state, selected); controls(state, selected, saved); shell.mode(building, town.location.kind === 'street', constructing);
  frameScene();
  renderControls();
  root.querySelector<HTMLButtonElement>('#construct-structure')!.textContent = town.location.kind === 'street' ? 'Escolher construção para ampliar' : 'Adicionar cômodo ou andar';
  root.querySelector('#construct-mode')!.setAttribute('aria-pressed', String(constructing));
  root.querySelector('#build-toggle')!.setAttribute('aria-pressed', String(building));
  root.querySelector('#decorate-mode')!.setAttribute('aria-pressed', String(building && !constructing));
}
/** Street: its closer lower band. Interior: the full height, opening on the chosen character, then the most whole people, then furniture. */
function frameScene() {
  const chosen = state.actors.find(a => a.id === selected && a.room === state.room), street = !!state.streetWidth;
  const opening = townActs.opening();
  if (street) { view?.scene(JSON.stringify(town.location), 1000, streetFrame, opening.spans, opening.must, opening.people); return; }
  view?.scene(JSON.stringify(town.location), roomWidth(state), 600, pieceSpans(state), chosen && { left: chosen.x - 42, right: chosen.x + 42 }, peopleSpans(state));
}
function renderControls() {
  const focus = state.layout.pieces.find(p => p.id === selectedPiece) ?? state.actors.find(a => a.id === selected)!;
  root.classList.toggle('selection-on-right', focus.x > 500);
  controls(state, selected, saved);
  editor(albumView(), edits, building, selectedPiece); rooms(state); accessibleScene(state, selected, building); neighborhood.refresh(building);
  navigationBar(); illustratedChoices(root); outside(town, selected, camera, building); cooking.refresh(); garden.refresh();
  root.querySelector<HTMLElement>('#build-history')!.hidden = !building && !townActs.canUndo() && !townActs.canRedo();
  root.querySelector<HTMLButtonElement>('#undo')!.disabled = !townActs.canUndo(); root.querySelector<HTMLButtonElement>('#redo')!.disabled = !townActs.canRedo();
}
function dispatch(action: Action, interrupt = true) {
  if (interrupt) { cancelGame(); walker.cancel(); }
  if ('actor' in action) root.classList.add('actor-chosen');
  if ('item' in action) scene.balls.forget(action.item);
  if (['room', 'travel', 'cross', 'transfer'].includes(action.type)) scene.balls.settle();
  if (action.type === 'room' || action.type === 'travel') { cancelInput(); closeWardrobe(); }
  const settle = scene.captureMotion();
  const result = transition(state, action);
  state = result.state;
  edits = history(state); selectedPiece = null;
  if (result.events.length) persist();
  refresh();
  settle(); feedback.events(result.events);
}
let game: Phaser.Game | undefined;
void loadFonts().then(() => { game = new Phaser.Game({
  type: Phaser.CANVAS, parent: 'world', width: 2000, height: 1200, backgroundColor: '#f6dfd4',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene, audio: { noAudio: true }, render: { antialias: true },
  callbacks: { postBoot: current => {
    current.canvas.setAttribute('aria-label', 'Casa de brincar. Abra o armário e arraste roupas, comida e brinquedos até os personagens.');
    view = viewport(current.canvas, (width, height, x, y) => { scene.frame(width, height, x, y); positionTargets(root); });
    frameScene();
    new ResizeObserver(() => { current.scale.getParentBounds(); current.scale.refresh(); view?.render(); }).observe(root.querySelector('#world')!);
    renderControls();
    firstTouch(root, { seen: loadFirstTouchSeen(), done: () => saveFirstTouchSeen(), target: () => { const bia = state.actors.find(a => a.id === selected)!; return { x: bia.x, y: bia.y - 90 }; },
      wave: () => state.actors.filter(a => a.room === state.room).forEach(a => scene.poke(a.id, 'hop', '')) });
    cancelInput = bindInput(current.canvas, () => scene.visibleWorld(), play.select, point => dispatch({ type: 'move', actor: selected, point }), {
      walk: point => { view?.resume(); const target = outdoorAt(town, point); if (target) square.touch(target); else walker.start(point); }, cancelWalk: () => walker.cancel(), hover: point => scene.hover(point), pickup: play.pickup, interact: play.interact, dispatch, wardrobe: () => wardrobeOpen, toggleWardrobe, selected: () => selected, poke: id => { root.classList.add('actor-chosen'); if (!square.leave(id)) feedback.poke(id); }, preview: drag => scene.preview(drag), previewActor: (id, point) => scene.previewActor(id, point, true), roll: (item, point, velocity) => scene.throwBall(item, point, velocity),
    }, { enabled: () => building, gesture: createBuildGesture(() => state, id => { selectedPiece = id; refresh(); }, previewBuild, dropPiece, point => scene.pickPiece(point), () => screenScale(current.canvas)) }, {
      view: { background: p => { const world = scene.visibleWorld(); return building ? !scene.pickPiece(p) : !sourceAt(world, p, wardrobeOpen) && !actorAt(world, p) && !scene.pickPiece(p); }, pan: (dx, dy) => {
        // On the street the drag moves the 1000-wide window first; what is left past its ends pans the closer view inside it.
        const scale = screenScale(current.canvas), wanted = camera - dx / scale;
        if (state.streetWidth) { camera = Math.max(0, Math.min(state.streetWidth - 1000, wanted)); scene.camera(camera); }
        view?.pan(state.streetWidth ? (camera - wanted) * scale : dx, dy);
      } },
      camera: () => camera, setCamera: x => { camera = x; scene.camera(x); positionContext(root, state.actors.find(a => a.id === selected)!, state); neighborhood.refresh(building); outside(town, selected, camera, building); navigationBar(); },
      building: () => building, wardrobe: () => wardrobeOpen, dispatch,
      pan: (room, fraction) => scene.pan(room, fraction),
      transfer: (room, actor, item, point) => scene.previewTransfer(room, actor, item, point),
      progress,
    }, base => neighborhoodGesture(base, { town: () => town, world: () => scene.visibleWorld(), building: () => building, dispatch: townDispatch, plot: neighborhood.plot, drop: square.drop, enter: enterDoor, preview: townActs.preview, progress }));
  } },
}); });
bindKeyboard(root, { building: () => building, state: () => state, piece: () => selectedPiece, actor: () => state.actors.find(a => a.id === selected)!,
  edit: applyEdit, move: point => dispatch({ type: 'move', actor: selected, point }), stopWalk: () => walker.cancel() });
buttonArt(root);
announce(welcomeLine(nameOf(state.actors.find(a => a.id === selected)!)));
refresh();
window.addEventListener('resize', () => requestAnimationFrame(renderControls));
window.addEventListener('blur', () => walker.cancel());
window.addEventListener('keydown', event => { if (event.key === 'Escape') walker.cancel(); });
window.addEventListener('pagehide', () => { walker.cancel(); scene.balls.settle(); persist(); game?.loop.sleep(); });
window.addEventListener('pageshow', () => game?.loop.wake());
