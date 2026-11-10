import { screenToWorld } from './viewport';
import type { GameKind } from '../domain/child-games';
import type { Point } from '../domain/types';

export function gameControls(root: HTMLElement, actions: { start: (kind: GameKind) => void; jump: (cell?: number) => void; cancel: () => void; tap: (point: Point) => void }) {
  const chooser = document.createElement('dialog'); chooser.id = 'game-chooser'; chooser.setAttribute('aria-labelledby', 'game-title');
  chooser.innerHTML = '<h2 id="game-title">Vamos brincar?</h2><p>Escolha uma criança com as mãos livres. Use um cômodo ou quintal com espaço no chão.</p><div class="game-choices"><button data-game="rope">Pular corda</button><button data-game="hopscotch">Amarelinha</button></div><p id="game-choice-message" role="status"></p><button id="game-close">Voltar</button>';
  const panel = document.createElement('section'); panel.id = 'game-panel'; panel.hidden = true; panel.setAttribute('aria-label', 'Brincadeira em andamento');
  panel.innerHTML = '<h2 id="game-name"></h2><p id="game-instruction"></p><p id="game-cue" aria-hidden="true"></p><p id="game-message" role="status"></p><button id="game-jump">Pular</button><button id="game-restart" hidden>Brincar de novo</button><button id="game-stop">Encerrar brincadeira</button>';
  root.append(chooser, panel);
  chooser.querySelector<HTMLButtonElement>('#game-close')!.onclick = () => chooser.close();
  chooser.querySelectorAll<HTMLButtonElement>('[data-game]').forEach(b => { b.onclick = () => actions.start(b.dataset.game as GameKind); });
  panel.querySelector<HTMLButtonElement>('#game-stop')!.onclick = actions.cancel;
  const jump = panel.querySelector<HTMLButtonElement>('#game-jump')!;
  jump.onclick = () => actions.jump();
  const restart = panel.querySelector<HTMLButtonElement>('#game-restart')!;
  restart.onclick = () => actions.start(panel.dataset.kind as GameKind);
  bindGameKeys(panel, jump, actions);
  const resetContact = bindGameTaps(root, panel, actions.tap);
  root.querySelector('#map-toggle')!.addEventListener('click', actions.cancel);
  return {
    /** Opened by the panel's "Brincar" button. */
    open() { actions.cancel(); chooser.querySelector('#game-choice-message')!.textContent = ''; chooser.showModal(); },
    error(message: string) { chooser.querySelector('#game-choice-message')!.textContent = message; },
    start(kind: GameKind) {
      chooser.close(); panel.hidden = false; panel.dataset.kind = kind; panel.dataset.phase = 'walking'; root.classList.add('playing-game');
      panel.querySelector('#game-name')!.textContent = kind === 'rope' ? 'Pular corda' : 'Amarelinha';
      panel.querySelector('#game-instruction')!.textContent = kind === 'rope' ? 'Toque ou aperte espaço quando aparecer “Agora!”. Pode tentar quantas vezes quiser.' : 'Toque na próxima casa iluminada, use o botão ou aperte espaço. Vá até 8 e volte.';
      jump.focus();
    },
    update(phase: string, label: string, message: string, disabled: boolean, cue = '') {
      panel.dataset.phase = phase; if (jump.textContent !== label) jump.textContent = label; jump.disabled = disabled; jump.hidden = phase === 'complete'; restart.hidden = phase !== 'complete';
      const status = panel.querySelector('#game-message')!, rhythm = panel.querySelector('#game-cue')!;
      if (status.textContent !== message) status.textContent = message;
      if (rhythm.textContent !== cue) rhythm.textContent = cue;
    },
    close() { resetContact(); panel.hidden = true; root.classList.remove('playing-game'); if (panel.contains(document.activeElement)) root.querySelector<HTMLButtonElement>('#actions [data-slot=play]')?.focus(); },
  };
}
function bindGameKeys(panel: HTMLElement, jump: HTMLButtonElement, actions: { jump: () => void; cancel: () => void }) {
  window.addEventListener('keydown', event => {
    if (panel.hidden) return;
    if (event.key === 'Escape') { actions.cancel(); return; }
    if (event.code !== 'Space' || event.repeat) return;
    const target = event.target as HTMLElement;
    if (target.closest('input,textarea,select,dialog') || (target.closest('button') && target !== jump)) return;
    event.preventDefault(); event.stopImmediatePropagation(); if (!jump.disabled && !jump.hidden) actions.jump();
  }, true);
  window.addEventListener('blur', actions.cancel);
  window.addEventListener('pagehide', actions.cancel);
}
function bindGameTaps(root: HTMLElement, panel: HTMLElement, tap: (point: Point) => void) {
  const world = root.querySelector<HTMLElement>('#world')!;
  let contact: { id: number; x: number; y: number } | null = null;
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'] as const) world.addEventListener(type, event => {
    if (panel.hidden) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (type === 'pointerdown') { contact = startContact(world, contact, event); }
    if (event.pointerId !== contact?.id) return;
    if (type === 'pointercancel') contact = null;
    if (type !== 'pointerup' || !contact) return;
    const start = contact; contact = null;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) return;
    const canvas = root.querySelector('canvas')!;
    tap(screenToWorld(canvas, { x: event.clientX, y: event.clientY }));
  }, true);
  return () => { contact = null; };
}
function startContact(world: HTMLElement, contact: { id: number; x: number; y: number } | null, event: PointerEvent) {
  if (contact || !event.isPrimary) return contact;
  world.setPointerCapture(event.pointerId); return { id: event.pointerId, x: event.clientX, y: event.clientY };
}
