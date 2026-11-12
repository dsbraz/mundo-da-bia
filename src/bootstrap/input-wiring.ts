import type Phaser from 'phaser';
import type { Action, ActorId, EditAction, Point, World } from '../domain/types';
import type { PlaceStep } from '../presentation/place-transition';
import type { Neighborhood, NeighborhoodAction, Location } from '../domain/neighborhood-types';
import { bindInput } from '../presentation/input';
import { createBuildGesture } from '../presentation/build-gesture';
import { neighborhoodGesture } from '../presentation/neighborhood-gesture';
import { grabActor, sourceAt } from '../presentation/targets';
import { outdoorAt } from '../presentation/outdoor-controls';
import { doorBox } from '../presentation/neighborhood-doors';
import { screenScale, type viewport } from '../presentation/viewport';
import type { PlayScene } from '../presentation/scene';
import type { playActions } from './play-actions';
import type { plaza } from './plaza';
import type { walking } from '../presentation/walking';
import type { townActions } from './town-actions';

/** Everything the canvas input needs from the app: its state getters, the scene and the actions a gesture ends in. */
export interface InputWiring {
  root: HTMLElement; scene: PlayScene; view: () => ReturnType<typeof viewport> | undefined;
  state: () => World; town: () => Neighborhood; selected: () => ActorId; building: () => boolean; wardrobe: () => boolean;
  camera: () => number; setCamera: (x: number) => void;
  /** The house's own camera moves (street pan): the camera, the selection panel and the street controls follow. */
  moveCamera: (x: number) => void;
  play: ReturnType<typeof playActions>; square: ReturnType<typeof plaza>; walker: ReturnType<typeof walking>; townActs: ReturnType<typeof townActions>;
  dispatch: (action: Action) => void; townDispatch: (action: NeighborhoodAction) => void; toggleWardrobe: () => void;
  poke: (id: ActorId) => void; choosePiece: (id: number | null) => void;
  previewBuild: (action: EditAction | null) => void; dropPiece: (action: EditAction) => void;
  progress: (value: number, side?: string) => void; plot: (plot: number) => void; enter: (destination: Location) => boolean;
  /** How the next place change looks (a door crossed by drag, a swipe). */
  place: { next: (step: PlaceStep) => void; screen: (point: Point) => Point };
}
/** Binds the canvas: play and build gestures, the camera drag, rooms and doors. Returns the input's cancel. */
export function wireInput(current: Phaser.Game, deps: InputWiring) {
  const { scene, play, square, walker } = deps, canvas = current.canvas;
  /** Under automation only: how the last character drag ended. */
  const outcome = (value: string) => { if (navigator.webdriver) canvas.dataset.dropOutcome = value; };
  /** A character dropped on a lit door: the iris closes on that door. The drop unlights the door just before it dispatches, so the light is kept until that turn ends. */
  let lit: ReturnType<typeof doorBox> | null = null;
  const crossing = (action: NeighborhoodAction) => { if (lit && action.type === 'transport') deps.place.next({ kind: 'door', at: deps.place.screen({ x: lit.x + lit.width / 2, y: lit.y + lit.height / 2 }) }); };
  return bindInput(canvas, () => scene.visibleWorld(), play.select, point => deps.dispatch({ type: 'move', actor: deps.selected(), point }), {
    walk: point => { deps.view()?.resume(); const target = outdoorAt(deps.town(), point); if (target) square.touch(target); else walker.start(point); }, cancelWalk: () => walker.cancel(), hover: point => scene.hover(point), pickup: play.pickup, interact: play.interact, dispatch: deps.dispatch, wardrobe: deps.wardrobe, toggleWardrobe: deps.toggleWardrobe, selected: deps.selected, poke: deps.poke, preview: drag => scene.preview(drag), previewActor: (id, point) => scene.previewActor(id, point, true), roll: (item, point, velocity) => scene.throwBall(item, point, velocity), outcome, choose: play.choose, settle: play.settle,
  }, { enabled: deps.building, gesture: createBuildGesture(deps.state, deps.choosePiece, deps.previewBuild, deps.dropPiece, point => scene.pickPiece(point), () => screenScale(canvas)) }, {
    view: { background: p => { const world = scene.visibleWorld(); return deps.building() ? !scene.pickPiece(p) : !sourceAt(world, p, deps.wardrobe()) && !grabActor(world, p) && !scene.pickPiece(p); }, pan: (dx, dy) => {
      // On the street the drag moves the 1000-wide window first; what is left past its ends pans the closer view inside it.
      const state = deps.state(), scale = screenScale(canvas), wanted = deps.camera() - dx / scale;
      if (state.streetWidth) { deps.setCamera(Math.max(0, Math.min(state.streetWidth - 1000, wanted))); scene.camera(deps.camera()); }
      deps.view()?.pan(state.streetWidth ? (deps.camera() - wanted) * scale : dx, dy);
    } },
    camera: deps.camera, setCamera: deps.moveCamera,
    building: deps.building, wardrobe: deps.wardrobe, dispatch: deps.dispatch,
    pan: (room, fraction) => scene.pan(room, fraction), slide: (room, fraction) => deps.place.next({ kind: 'swipe', during: ms => scene.finishSlide(room, fraction, ms) }),
    transfer: (room, actor, item, point) => scene.previewTransfer(room, actor, item, point),
    progress: deps.progress,
  }, base => neighborhoodGesture(base, { town: deps.town, world: () => scene.visibleWorld(), building: deps.building, dispatch: action => { crossing(action); deps.townDispatch(action); }, plot: deps.plot, drop: square.drop, enter: deps.enter, preview: deps.townActs.preview, progress: deps.progress,
    glow: door => { const box = door && doorBox(deps.town(), door); scene.glowDoor(box); if (box) lit = box; else { const was = lit; queueMicrotask(() => { if (lit === was) lit = null; }); } }, outcome }));
}
