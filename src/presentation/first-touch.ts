import type { Point } from '../domain/types';
import { positionTargets } from './viewport';

interface FirstTouch { seen: boolean; done: () => void; target: () => Point; wave: () => void }
/** First opening only: a ghost hand taps the selected child and the gang waves. Any touch or key dismisses it, and still acts. */
export function firstTouch(root: HTMLElement, options: FirstTouch) {
  if (options.seen) return;
  const hand = document.createElement('img'); hand.id = 'first-touch'; hand.src = '/icons/ghost-hand.svg'; hand.alt = ''; hand.setAttribute('aria-hidden', 'true');
  const point = options.target(); hand.dataset.worldX = String(point.x); hand.dataset.worldY = String(point.y);
  // Marked as seen as soon as it shows: only the very first opening gets the hand, and no write happens mid-gesture.
  root.append(hand); positionTargets(root); options.done();
  const wave = setTimeout(options.wave, 700);
  const dismiss = () => {
    clearTimeout(wave); hand.remove();
    window.removeEventListener('pointerdown', dismiss, true); window.removeEventListener('keydown', dismiss, true);
  };
  window.addEventListener('pointerdown', dismiss, true); window.addEventListener('keydown', dismiss, true);
}
