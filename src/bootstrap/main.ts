import { childGames } from '../presentation/child-games';
import '../presentation/child-games.css';
import { illustratedChoices } from '../presentation/illustrated-choices';
import { outdoorControls } from '../presentation/outdoor-controls';
import { viewport, positionTargets, trayCover } from '../presentation/viewport';
import { mirrorSpan } from '../presentation/mirror-reflection';
import { wireInput } from './input-wiring';
import { sceneRefresh } from './refresh';
import { townActions } from './town-actions';
import { playTime, realClock, startTicks } from './clock';
import { showMoment } from './show-moment';
import { feel } from '../domain/needs';
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
import { placeChange } from './place-change';
import { doorFront } from '../presentation/neighborhood-doors';
import { doorWalk } from './door-walk';
import { uiText } from '../content/ui-text';
import { mirrorFaces } from '../content/personalities';
import { localWorld, neighborhoodAction, storeWorld } from '../domain/neighborhood';
import type { Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';
import { neighborhoodControls } from '../presentation/neighborhood-controls';
import { buttonArt } from '../presentation/button-art';
import { cancelTrayDrag } from '../presentation/tray-drag';
import { sceneControls } from '../presentation/scene-controls';
import { createShell } from '../presentation/shell';
import { roomControls } from '../presentation/room-controls';
import { addRoom, renameRoom } from '../domain/rooms';
import type { Action, ActorId, Album, EditAction } from '../domain/types';
import { editWorld, history, recordEdit } from '../domain/design';
import { createEditorControls } from '../presentation/editor-controls';
import { dragPreview, settleMove } from '../presentation/build-preview';
import Phaser from 'phaser';
import { loadFonts } from '../presentation/text-style';
import { transition } from '../domain/world';
import { loadCheckoutHintSeen, loadDrawerOpen, loadFirstTouchSeen, loadNeighborhood, saveCheckoutHintSeen, saveDrawerOpen, saveFirstTouchSeen, saveNeighborhood } from '../persistence/storage';
import { foodAtHome } from '../domain/larder';
import type { Destination, Suggestion } from '../domain/routine';
import { firstTouch } from '../presentation/first-touch';
import { createControls, positionContext } from '../presentation/controls';
import { PlayScene } from '../presentation/scene';
import '../presentation/style.css';
import '../presentation/immersive.css';
import '../presentation/home-menu.css';
import '../presentation/dock-layout.css';
import '../presentation/kitchen.css';
import '../presentation/missing-bubble.css';
import '../presentation/drawer-ring.css';
import '../presentation/landscape-only.css';
import { landscapeOnly } from '../presentation/landscape-only';
import '../presentation/place-transition.css';
import { kitchen } from './kitchen';
import { gardenPlay } from './garden';
import { marketPlay } from './market';
import { schoolPlay } from './school';
import { staffPlay } from './staff';
import { routineWiring } from './routine';
import { suggestionIcon } from '../presentation/routine-bubble';
import { selfCareWiring } from './self-care';
import { nightSleep } from './night-sleep';
import { bedtimeButton, bedtimeMoves } from '../presentation/bedtime-button';
import { endShow } from '../domain/show';

let town = loadNeighborhood();
let state = localWorld(town);
let camera = 0;
function albumView(): Album { return { active: town.location.kind === 'interior' ? town.location.building : town.buildings[0]!.id, houses: town.buildings.map(b => ({ id: b.id, name: b.name, state: localWorld({ ...town, location: { kind: 'interior', building: b.id, room: b.entry } }) })) }; }
let edits = history(state);
let building = false, constructing = false;
let selectedPiece: number | null = null;
let selected: ActorId = 'bia';
let saved = saveNeighborhood(town);
const root = document.querySelector<HTMLElement>('#app')!; landscapeOnly(root);
const scene = new PlayScene(state);
let wardrobeOpen = false;
let cancelInput = () => {};
let cancelGame = () => {};
let view: ReturnType<typeof viewport> | undefined;
const shell = createShell(root, () => cancelInput(), { open: loadDrawerOpen(), remember: open => { saveDrawerOpen(open); } });
const feedback = sceneFeedback({ root, scene, state: () => state, selected: () => selected, playing: () => !building, goRoom: room => { const where = town.location; if (where.kind === 'interior') go({ ...where, room }); },
  food: id => foodAtHome(town, id), toMarket: () => shopping.toMarket() }), announce = feedback.announce, progress = edgeProgress(root);
/** The Map opens with `place` marked by the suggestion's drawing (the "Ir" there takes her). */
function openMap(place: Destination, wish: Suggestion) { root.querySelector<HTMLButtonElement>('#map-toggle')!.click(); neighborhood.mark(place, suggestionIcon(wish)); }
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
const walker = walking({ reject: point => feedback.refuse('path', refusal('walk', ''), { x: point.x, y: point.y - 40 }), state: () => state, selected: () => selected, preview: (id, point) => { scene.previewActor(id, point); if (point) view?.follow({ ...point, x: point.x - camera }); },
  commit: (actor, point) => dispatch({ type: 'move', actor, point }, false), face: (actor, point) => scene.face(actor, point), hint: () => {} });
const games = childGames(root, { world: () => state, selected: () => selected, prepare: () => { walker.cancel(); cancelInput(); closeWardrobe(); shell.close(); view?.resume(); }, stopWalk: () => walker.cancel(), walk: walker.start, commit: (actor, point) => dispatch({ type: 'move', actor, point }, false), preview: value => scene.previewGame(value), follow: (point, slack) => view?.follow(point, undefined, slack),
  select: id => play.select(id), drop: actor => dispatch({ type: 'drop', actor }, false), stroll: moves => scene.stroll(moves), react: (id, pose, line) => { scene.poke(id, pose, line); feedback.sound.cue(pose === 'goof' ? 'poke' : 'cheer'); },
  played: (id, kind) => townActs.enjoy(id, kind === 'rope' ? 'corda' : 'amarelinha') });
cancelGame = games.cancel;
const place = placeChange({ root, town: () => town, state: () => state, selected: () => selected });
const go = goTo({ town: () => town, selected: () => selected, building: () => building, townDispatch });
const enterDoor = doorWalk({ town: () => town, selected: () => selected, building: () => building, walker, dispatch: action => { if (shopping.blocks(action)) return; if (action.type === 'transport') place.next({ kind: 'door', at: place.screen(doorFront(town, action.location)) }); townDispatch(action); }, enterDoor: (id, where, done) => scene.outdoor.enterDoor(id, where, done) });
// A kicked or thrown ball came to rest: whoever is selected played ball (W3L-13).
scene.ballRest = (item, point) => { dispatch({ type: 'place', item, point }, false); townActs.enjoy(selected, 'bola'); };
const garden = gardenPlay({ root, town: () => town, selected: () => selected, building: () => building, walker, now: () => realClock.now(), apply: next => townActs.apply(next), scene, feedback, enjoy: id => townActs.enjoy(id, 'regar') });
const square = plaza({ town: () => town, selected: () => selected, walker, dispatch: townDispatch, refuse: feedback.refuse, push: rider => scene.outdoor.push(rider), garden });
const play = playActions({ root, state: () => state, selected: () => selected, choose: id => { selected = id; refresh(); }, light: id => { selected = id; stale = true; scene.choose(id); }, settle: () => { if (stale) refresh(); }, cancelGame, walker, dispatch, toggleWardrobe, refuse: feedback.refuse, bench: piece => cooking.open(piece), instead: item => shopping.instead(item), serve: action => dispatch(action, false), looks: openLooks, grimace: (id, mirror) => { scene.poke(id, mirrorFaces[id], ''); const span = mirrorSpan(state, id, mirror); if (span) view?.reveal(span); } });
const outside = outdoorControls(root, square.use);
const structure = structureControls(root, () => town, townDispatch, () => { if (!building) toggleBuild(); walker.cancel(); cancelInput(); shell.close(); });
const navigationBar = worldNavigation(root, { town: () => town, dispatch: townDispatch, go: location => go(location), construct: newBuilding, structure: () => structure.open(), camera: () => camera, pan: x => { camera = x; refresh(); } });
const neighborhood = neighborhoodControls(root, () => town, townDispatch, location => go(location), () => root.querySelector<HTMLDialogElement>('#room-dialog')!.close(), dx => { camera = Math.max(0, Math.min(streetWidth(town.plots) - 1000, camera + dx)); scene.camera(camera); positionTargets(root); }, id => structure.open(id), () => streetUndo(false));
root.querySelector('#construct-mode')!.addEventListener('click', () => { if (!building) toggleBuild(); constructing = true; walker.cancel(); cancelInput(); refresh(); announceMode(); });
root.querySelector('#construct-plot')!.addEventListener('click', newBuilding);
root.querySelector('#construct-structure')!.addEventListener('click', () => structure.open());
root.querySelector('#play-mode')!.addEventListener('click', () => { if (building) toggleBuild(); });
function persist() { town = storeWorld(town, state); const worked = atWork(town); if (worked !== town) { town = worked; state = localWorld(town); edits = history(state); } saved = saveNeighborhood(town); }
/** W3L-25: whoever moved, the grown-ups dress for where they are and come home from work with groceries. */
function atWork(next: Neighborhood) { return neighborhoodAction(next, { type: 'work', phase: life.phase() }); }
function toggleBuild() {
  cancelGame();
  constructing = false;
  closeWardrobe(); walker.cancel(); cancelTrayDrag(); cancelInput(); building = !building; life.mode(!building); selectedPiece = null; edits = history(state);
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
const townActs = townActions({ town: () => town, selected: () => selected, camera: () => camera, setCamera: x => { camera = x; }, refresh: then => refresh(then), scene, cue: sound => feedback.sound.cue(sound),
  commit: next => { town = atWork(next); state = localWorld(town); edits = history(state); selectedPiece = null; saved = saveNeighborhood(town); },
  quiet: next => { town = next; saved = saveNeighborhood(town); scene.neighborhood(town); scene.outdoor.garden.redraw(); },
  feel: next => { town = next; state = feel(state, town); scene.feel(state); },
  interrupt: () => { scene.balls.settle(); cancelGame(); closeWardrobe(); walker.cancel(); cancelTrayDrag(); cancelInput(); },
  pause: () => { cancelGame(); walker.cancel(); cancelInput(); }, busy: () => [games.player()].filter(id => id !== null), structure: { open: id => structure.open(id), refresh: () => structure.refresh() } });
function townDispatch(action: NeighborhoodAction) { if (!shopping.blocks(action)) townActs.dispatch(action); }
const cooking = kitchen({ root, town: () => town, selected: () => selected, building: () => building, apply: next => townActs.apply(next), scene, feedback });
const shopping = marketPlay({ root, town: () => town, selected: () => selected, building: () => building, apply: next => townActs.apply(next), feedback, perform: action => play.perform(action), scene,
  openMap: place => openMap(place, 'mercado'), hint: { seen: () => loadCheckoutHintSeen(), done: () => { saveCheckoutHintSeen(); } } });
const schooling = schoolPlay({ root, town: () => town, selected: () => selected, apply: next => townActs.apply(next), scene, feedback });
const staffing = staffPlay({ state: () => state, scene, school: schooling, feedback });
const remember = () => townActs.remember(), streetUndo = (forward: boolean) => townActs.undo(forward);
/** Ticks counted on #app only under automation (`navigator.webdriver`), for the E2E clock. */
/** Session time in Brincar (Criar pauses life, §3.1). */
const life = playTime(realClock);
const selfCare = selfCareWiring({ root, state: () => state, selected: () => selected, location: () => town.location, stroll: moves => scene.stroll(moves), dispatch: action => dispatch(action, false),
  hop: id => scene.poke(id, 'hop', ''), played: id => townActs.enjoy(id, 'bola') });
// "Todos para a cama" (lot 6B): who stays in this room walks to the spot; the moon shows at dusk and at night. With the selected one in
// a bed (in any room), the night passes as when she lies down.
const bedtime = bedtimeButton(root, uiText.bedtime, () => {
  scene.stroll(bedtimeMoves(state, transition(state, { type: 'bedtime' }).state)); dispatch({ type: 'bedtime' }, false); nights([{ type: 'rested', actor: selected }], true);
});
const daylight = () => { scene.daylight(life.phase()); bedtime(life.phase(), town.location.kind === 'interior'); };
const nights = nightSleep({ root, town: () => town, state: () => state, selected: () => selected, phase: () => life.phase(), morning: () => { life.morning(); daylight(); },
  slept: id => townActs.sleepThrough(id), greet: () => { scene.poke(selected, 'cheer', uiText.goodMorning); announce(uiText.goodMorning); feedback.sound.cue('cheer'); } });
routineWiring({ root, town: () => town, selected: () => selected, playing: () => !building, phase: () => life.phase(), played: () => life.played(), head: id => scene.head(id),
  openMap });
let ticks = 0; startTicks(realClock, now => { townActs.tick(now, building ? undefined : life.take(now)); daylight(); if (!building) selfCare(life.played()); if (navigator.webdriver) root.dataset.ticks = String(++ticks); });
function previewBuild(action: EditAction | null) {
  const preview = action ? dragPreview(state, action) : { world: state, invalid: false };
  scene.previewLayout(preview.world); scene.placementHint(action?.type === 'move' ? action.id : null, preview.invalid);
}
function dropPiece(action: EditAction) {
  if (action.type !== 'move') { applyEdit(action); return; }
  applyEdit(settleMove(state, action) ?? action); scene.slidePiece(action.id, action.point);
}
/** A choice made mid-touch left the scene and panels behind until the next repaint. */
let stale = false;
const { refresh: repaint, frameScene, renderControls, ui: repaintControls } = sceneRefresh({ root, scene, view: () => view, townActs: () => townActs, town: () => town, state: () => state, selected: () => selected, building: () => building, constructing: () => constructing,
  piece: () => selectedPiece, saved: () => saved, edits: () => edits, album: albumView, camera: () => camera, setCamera: x => { camera = x; }, controls, mode: shell.mode, editor,
  panels: () => { bedtime(life.phase(), town.location.kind === 'interior'); rooms(state); accessibleScene(state, selected, building); neighborhood.refresh(building); navigationBar(); illustratedChoices(root); outside(town, selected, camera, building); cooking.refresh(); garden.refresh(); shopping.refresh(); } });
const showTime = showMoment((ms, fn) => { const id = setTimeout(fn, ms); return () => clearTimeout(id); }, () => { state = endShow(state); persist(); scene.endShow(state); });
function refresh(then?: () => void) { stale = false; showTime(state.show); place.refresh(repaint, then, repaintControls); }
/** A new action stops the game and the walk, or (a dish for a person) starts her walk to the meal seat instead: true then. */
function walksFirst(action: Action, interrupt: boolean): boolean {
  if (!interrupt) return false;
  if (play.sitToEat(action)) return true;
  cancelGame(); walker.cancel(); return false;
}
/** The market and the school take some taps over (a shelf, the checkout, the fridge with a bag, a board). */
const takenOver = (action: Action) => shopping.intercept(action) || schooling.intercept(action);
function dispatch(action: Action, interrupt = true) {
  if (walksFirst(action, interrupt) || takenOver(action)) return;
  if ('actor' in action) root.classList.add('actor-chosen');
  if ('item' in action) scene.balls.forget(action.item);
  if (['room', 'travel', 'cross', 'transfer'].includes(action.type)) scene.balls.settle();
  if (action.type === 'room' || action.type === 'travel') { cancelInput(); closeWardrobe(); }
  const settle = scene.captureMotion();
  const before = state, result = transition(state, action);
  state = result.state; playedWith(action, before, state);
  edits = history(state); selectedPiece = null;
  // A refusal (a `missing` event alone) changes nothing, so nothing is saved.
  if (state !== before) persist();
  refresh();
  settle(); feedback.events(result.events); nights(result.events);
}
/** Turning the piano or the TV on is playing (W3L-13). */
function playedWith(action: Action, before: typeof state, after: typeof state) {
  const piece = action.type === 'use' ? after.layout.pieces.find(p => p.id === action.id && p.active && (p.kind === 'piano' || p.kind === 'tv')) : undefined;
  if (piece && after !== before) queueMicrotask(() => townActs.enjoy(selected, piece.kind as 'piano' | 'tv'));
}
let game: Phaser.Game | undefined;
void loadFonts().then(() => { game = new Phaser.Game({
  type: Phaser.CANVAS, parent: 'world', width: 2000, height: 1200, backgroundColor: '#f6dfd4',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene, audio: { noAudio: true }, render: { antialias: true },
  callbacks: { postBoot: current => {
    current.canvas.setAttribute('aria-label', 'Casa de brincar. Abra o armário e arraste roupas, comida e brinquedos até os personagens.');
    view = viewport(current.canvas, (width, height, x, y) => { scene.frame(width, height, x, y); positionTargets(root); }, () => trayCover(root));
    frameScene();
    new ResizeObserver(() => { current.scale.getParentBounds(); current.scale.refresh(); view?.render(); }).observe(root.querySelector('#world')!);
    renderControls();
    firstTouch(root, { seen: loadFirstTouchSeen(), done: () => saveFirstTouchSeen(), target: () => { const bia = state.actors.find(a => a.id === selected)!; return { x: bia.x, y: bia.y - 90 }; },
      wave: () => state.actors.filter(a => a.room === state.room).forEach(a => scene.poke(a.id, 'hop', '')) });
    cancelInput = wireInput(current, { root, scene, view: () => view, state: () => state, town: () => town, selected: () => selected, building: () => building, wardrobe: () => wardrobeOpen,
      camera: () => camera, setCamera: x => { camera = x; }, moveCamera: x => { camera = x; scene.camera(x); positionContext(root, state.actors.find(a => a.id === selected)!, state); neighborhood.refresh(building); outside(town, selected, camera, building); navigationBar(); },
      play, square, walker, townActs, dispatch, townDispatch, blocks: action => shopping.blocks(action), toggleWardrobe, poke: id => { root.classList.add('actor-chosen'); if (!square.leave(id)) feedback.poke(id); }, choosePiece: id => { selectedPiece = id; refresh(); },
      previewBuild, dropPiece, progress, plot: neighborhood.plot, enter: enterDoor, place, staff: staffing.tap });
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
