import type { CropId, Point } from '../domain/types';
import { gardenText } from '../content/garden';
import { positionTargets } from './viewport';

/** The seed bag over an empty plot: only the pictures of the seeds she has, no text to read (§3.3). Callbacks only. */
export function seedBag(root: HTMLElement, actions: { plant: (crop: CropId) => void }) {
  const panel = document.createElement('section'); panel.id = 'seed-bag'; panel.className = 'seed-bag'; panel.hidden = true;
  panel.setAttribute('role', 'group'); panel.setAttribute('aria-label', gardenText.bag);
  const bag = document.createElement('img'); bag.className = 'bag-art'; bag.src = '/icons/ui-seeds.svg'; bag.alt = ''; bag.draggable = false;
  const seeds = document.createElement('div'); seeds.className = 'bag-seeds';
  const close = document.createElement('button'); close.type = 'button'; close.className = 'bag-close illustrated'; close.setAttribute('aria-label', gardenText.close);
  close.style.setProperty('--button-icon', "url('/icons/ui-close.svg')"); close.addEventListener('click', hide);
  panel.append(bag, seeds, close); root.append(panel);
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
  function seed(crop: CropId) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'bag-seed'; button.dataset.crop = crop;
    button.setAttribute('aria-label', gardenText.seed(crop));
    const picture = document.createElement('img'); picture.src = `/icons/ing-${crop}.svg`; picture.alt = ''; picture.draggable = false;
    button.append(picture); button.addEventListener('click', () => actions.plant(crop)); return button;
  }
  function hide() { panel.hidden = true; delete panel.dataset.worldX; delete panel.dataset.worldY; }
  return {
    /** Opens over the plot at `point` (world), with one picture per seed in the bag. */
    open(crops: readonly CropId[], point: Point) {
      seeds.replaceChildren(...crops.map(seed));
      panel.dataset.worldX = String(point.x); panel.dataset.worldY = String(point.y); panel.hidden = false;
      positionTargets(root); seeds.querySelector('button')?.focus({ preventScroll: true });
    },
    close: hide, isOpen: () => !panel.hidden,
  };
}
