import type { ActorId, Point, World } from '../domain/types';
import type { Phase } from '../domain/clock';

/** "Todos para a cama" (lot 6B) shows at dusk and at night only, inside a house. */
export const bedtimeShown = (phase: Phase, indoors = true) => indoors && (phase === 'entardecer' || phase === 'noite');
/** Who walks in view at bedtime: whoever stays in this room and changes place walks to it; whoever goes to another room leaves it. */
export function bedtimeMoves(before: World, after: World): { actor: ActorId; point: Point }[] {
  return after.actors.filter(a => {
    const was = before.actors.find(b => b.id === a.id);
    return !!was && was.room === before.room && a.room === before.room && (was.x !== a.x || was.y !== a.y);
  }).map(a => ({ actor: a.id, point: { x: a.x, y: a.y } }));
}
/** The moon card at the top of the Turma tab, above the cards (icon only, `label` for screen readers): a touch calls `go`. Returns what
 *  shows it, only at dusk and at night inside a house. */
export function bedtimeButton(root: HTMLElement, label: string, go: () => void) {
  const card = document.createElement('div'), button = document.createElement('button'), moon = document.createElement('img');
  card.className = 'bedtime-card'; card.hidden = true;
  button.id = 'bedtime'; button.type = 'button'; button.setAttribute('aria-label', label); button.addEventListener('click', () => { go(); closeDrawer(root); });
  moon.src = '/icons/ui-panel-rest.svg'; moon.alt = ''; moon.draggable = false;
  button.append(moon); card.append(button);
  root.querySelector('#cast')?.before(card);
  return (phase: Phase, indoors: boolean) => { card.hidden = !bedtimeShown(phase, indoors); };
}
/** The drawer closes, so the scene shows everyone going to bed. */
function closeDrawer(root: HTMLElement) {
  const toggle = root.querySelector<HTMLButtonElement>('#tray-toggle');
  if (toggle?.getAttribute('aria-expanded') === 'true') toggle.click();
}
