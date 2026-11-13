import type { ActorId, Point, World } from '../domain/types';
import type { Phase } from '../domain/clock';

/** "Todos para a cama" (lot 6B) shows at dusk and at night only. */
export const bedtimeShown = (phase: Phase) => phase === 'entardecer' || phase === 'noite';
/** Who walks in view at bedtime: whoever stays in this room and changes place walks to it; whoever goes to another room leaves it. */
export function bedtimeMoves(before: World, after: World): { actor: ActorId; point: Point }[] {
  return after.actors.filter(a => {
    const was = before.actors.find(b => b.id === a.id);
    return !!was && was.room === before.room && a.room === before.room && (was.x !== a.x || was.y !== a.y);
  }).map(a => ({ actor: a.id, point: { x: a.x, y: a.y } }));
}
/** The moon card first in the Turma drawer (icon only, `label` for screen readers): a touch calls `go`. Returns what shows it, only at
 *  dusk and at night. */
export function bedtimeButton(root: HTMLElement, label: string, go: () => void) {
  const card = document.createElement('article'), button = document.createElement('button'), moon = document.createElement('img');
  card.className = 'character-card bedtime-card'; card.hidden = true;
  button.id = 'bedtime'; button.type = 'button'; button.setAttribute('aria-label', label); button.addEventListener('click', () => { go(); closeDrawer(root); });
  moon.src = '/icons/ui-panel-rest.svg'; moon.alt = ''; moon.draggable = false;
  button.append(moon); card.append(button);
  root.querySelector('#cast')?.prepend(card);
  return (phase: Phase) => { card.hidden = !bedtimeShown(phase); };
}
/** The drawer closes, so the scene shows everyone going to bed. */
function closeDrawer(root: HTMLElement) {
  const toggle = root.querySelector<HTMLButtonElement>('#tray-toggle');
  if (toggle?.getAttribute('aria-expanded') === 'true') toggle.click();
}
