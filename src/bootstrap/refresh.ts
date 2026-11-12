import { roomWidth } from '../domain/geometry';
import { streetWidth } from '../domain/neighborhood-geometry';
import type { ActorId, Album, World } from '../domain/types';
import type { Neighborhood } from '../domain/neighborhood-types';
import type { history } from '../domain/design';
import { streetFrame, pieceSpans, peopleSpans, type viewport } from '../presentation/viewport';
import type { PlayScene } from '../presentation/scene';
import type { townActions } from './town-actions';

/** What a repaint reads and redraws: the app's state and every panel that follows it. */
export interface RefreshDeps {
  root: HTMLElement; scene: PlayScene; view: () => ReturnType<typeof viewport> | undefined; townActs: () => ReturnType<typeof townActions>;
  town: () => Neighborhood; state: () => World; selected: () => ActorId; building: () => boolean; constructing: () => boolean;
  piece: () => number | null; saved: () => boolean; edits: () => ReturnType<typeof history>; album: () => Album;
  camera: () => number; setCamera: (x: number) => void;
  controls: (state: World, selected: ActorId, saved: boolean) => void;
  mode: (building: boolean, street: boolean, constructing: boolean) => void;
  editor: (album: Album, edits: ReturnType<typeof history>, building: boolean, piece: number | null) => void;
  /** The other panels that follow the world (rooms, scene buttons, neighborhood, navigation, pictures, outdoor, kitchen, garden). */
  panels: () => void;
}
export function sceneRefresh(deps: RefreshDeps) {
  const { root, scene } = deps;
  function refresh() {
    const town = deps.town(), state = deps.state(), building = deps.building(), constructing = deps.constructing();
    deps.setCamera(Math.min(deps.camera(), streetWidth(town.plots) - 1000));
    scene.neighborhood(town); scene.camera(deps.camera());
    scene.buildMode(building, deps.piece());
    scene.paint(state, deps.selected()); deps.controls(state, deps.selected(), deps.saved()); deps.mode(building, town.location.kind === 'street', constructing);
    frameScene();
    renderControls();
    root.querySelector<HTMLButtonElement>('#construct-structure')!.textContent = town.location.kind === 'street' ? 'Escolher construção para ampliar' : 'Adicionar cômodo ou andar';
    root.querySelector('#construct-mode')!.setAttribute('aria-pressed', String(constructing));
    root.querySelector('#build-toggle')!.setAttribute('aria-pressed', String(building));
    root.querySelector('#decorate-mode')!.setAttribute('aria-pressed', String(building && !constructing));
  }
  /** Street: its closer lower band. Interior: the full height, opening on the chosen character, then the most whole people, then furniture. */
  function frameScene() {
    const state = deps.state(), chosen = state.actors.find(a => a.id === deps.selected() && a.room === state.room), street = !!state.streetWidth;
    const opening = deps.townActs().opening();
    if (street) { deps.view()?.scene(JSON.stringify(deps.town().location), 1000, streetFrame, opening.spans, opening.must, opening.people); return; }
    deps.view()?.scene(JSON.stringify(deps.town().location), roomWidth(state), 600, pieceSpans(state), chosen && { left: chosen.x - 42, right: chosen.x + 42 }, peopleSpans(state));
  }
  function renderControls() {
    const state = deps.state(), piece = deps.piece();
    const focus = state.layout.pieces.find(p => p.id === piece) ?? state.actors.find(a => a.id === deps.selected())!;
    root.classList.toggle('selection-on-right', focus.x > 500);
    deps.controls(state, deps.selected(), deps.saved());
    deps.editor(deps.album(), deps.edits(), deps.building(), piece); deps.panels();
    root.querySelector<HTMLElement>('#build-history')!.hidden = !deps.building() && !deps.townActs().canUndo() && !deps.townActs().canRedo();
    root.querySelector<HTMLButtonElement>('#undo')!.disabled = !deps.townActs().canUndo(); root.querySelector<HTMLButtonElement>('#redo')!.disabled = !deps.townActs().canRedo();
  }
  return { refresh, frameScene, renderControls };
}
