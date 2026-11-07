import Phaser from 'phaser';
import { actors } from '../content/catalog';
import type { Action, ActorId } from '../domain/types';
import { transition } from '../domain/world';
import { load, save } from '../persistence/storage';
import { createControls } from '../presentation/controls';
import { bindInput } from '../presentation/input';
import { PlayScene } from '../presentation/scene';
import '../presentation/style.css';

let state = load();
let selected: ActorId = 'bia';
let saved = save(state);
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
const controls = createControls(root, dispatch, select);
function refresh() {
  scene.paint(state, selected); controls(state, selected, saved);
  wardrobeButton.disabled = state.room !== 'sala';
}
function select(id: ActorId) { selected = id; refresh(); }
function dispatch(action: Action) {
  if (action.type === 'room') cancelInput();
  const result = transition(state, action);
  state = result.state;
  if (result.events.length) saved = save(state);
  refresh();
  scene.react(result.events);
  const event = result.events[0];
  if (event) root.querySelector('#announcement')!.textContent = messages[event.type];
}
const messages = {
  moved: 'Novo lugar para brincar!', dressed: 'Look novo!', picked: 'Objeto na mão!', dropped: 'Objeto solto.',
  fed: 'Nhac! Que delícia!', rested: 'Hora de cuidar.', room: 'Vamos explorar!', summoned: 'Todo mundo juntinho!', show: 'A música é por sua conta! Vamos dançar!',
};
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'world', width: 1000, height: 600, backgroundColor: '#f6dfd4',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene, audio: { noAudio: true }, render: { antialias: true },
  callbacks: { postBoot: current => {
    current.canvas.setAttribute('aria-label', 'Casa de brincar. Abra o armário e arraste roupas, comida e brinquedos até os personagens.');
    cancelInput = bindInput(current.canvas, () => state, select, point => dispatch({ type: 'move', actor: selected, point }), {
      dispatch, wardrobe: () => wardrobeOpen, toggleWardrobe, preview: drag => scene.preview(drag),
    });
  } },
});
root.querySelector('#world')!.addEventListener('keydown', event => {
  const key = (event as KeyboardEvent).key;
  const offsets: Record<string, [number, number]> = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] };
  const offset = offsets[key];
  if (!offset) return;
  event.preventDefault();
  const actor = state.actors.find(a => a.id === selected)!;
  dispatch({ type: 'move', actor: selected, point: { x: actor.x + offset[0], y: actor.y + offset[1] } });
});
root.querySelector('#announcement')!.textContent = `Oi! ${actors[selected].name} está pronta para brincar.`;
refresh();
window.addEventListener('pagehide', () => { save(state); game.loop.sleep(); });
window.addEventListener('pageshow', () => game.loop.wake());
