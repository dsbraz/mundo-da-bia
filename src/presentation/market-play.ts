import { bagLimit } from '../domain/market';
import type { Good } from '../domain/market';
import type { Ingredient } from '../domain/ingredients';
import { goodNames, marketText } from '../content/kitchen';
import { ingredientIcon } from './kitchen-bench';

export interface MarketActions { buy: (good: Good) => void; close: () => void; pay: () => void }
/** What a bag shows: up to 6 goods, by picture, and the paid ribbon. */
export interface BagView { contents: readonly Good[]; paid: boolean }
const hopMs = 420;

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, label?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.className = className;
  if (label) node.setAttribute('aria-label', label);
  if (node instanceof HTMLButtonElement) node.type = 'button';
  return node;
}
function picture(src: string, className = '') { const image = element('img', className); image.alt = ''; image.draggable = false; image.src = src; return image; }
/** A good by picture: its ingredient, or for a seed the seed bag with the crop on it. */
export function goodPictures(good: Good): HTMLImageElement[] {
  if (!good.startsWith('semente-')) return [picture(ingredientIcon(good as Ingredient | 'lanche'))];
  return [picture('/icons/ui-seeds.svg', 'packet'), picture(ingredientIcon(good.slice(8) as Ingredient), 'seed')];
}

/** The shelf beside the scene (W3L-22): what it sells by picture, and the bag in her hand with up to 6 icons. No price, no number. */
export function marketPanel(root: HTMLElement, actions: MarketActions) {
  const panel = element('section', 'market-panel', marketText.region); panel.id = 'market-panel'; panel.hidden = true;
  const close = element('button', 'bench-close illustrated', marketText.close); close.style.setProperty('--button-icon', "url('/icons/ui-close.svg')");
  const shelf = element('div', 'market-goods'); shelf.setAttribute('role', 'group');
  const bag = element('div', 'market-bag'), bagArt = picture('/icons/sacola.svg', 'bag-art');
  const slots = Array.from({ length: bagLimit }, () => element('span', 'bag-slot'));
  bag.append(bagArt, ...slots);
  // Lot 6F: with goods not paid for, the register beside the bag calls her to the checkout.
  const pay = element('button', 'market-pay', marketText.pay); pay.append(picture('/art/market.svg#checkout')); pay.hidden = true;
  pay.addEventListener('click', () => actions.pay());
  const top = element('div', 'bench-top'); top.append(close, bag, pay);
  panel.append(top, shelf); root.append(panel);
  close.addEventListener('click', () => actions.close());
  let timer = 0;
  function render(view: BagView, hop: boolean) {
    slots.forEach((slot, i) => { const good = view.contents[i]; slot.replaceChildren(...(good ? goodPictures(good) : [])); slot.dataset.good = good ?? ''; slot.classList.toggle('hop', hop && i === view.contents.length - 1); });
    bagArt.src = view.paid ? '/icons/sacola-paga.svg' : '/icons/sacola.svg';
    panel.dataset.bag = view.contents.join(' '); panel.dataset.paid = String(view.paid); pay.hidden = view.paid || !view.contents.length;
    bag.setAttribute('aria-label', marketText.bag(view.contents.map(good => goodNames[good])));
    window.clearTimeout(timer); timer = window.setTimeout(() => slots.forEach(slot => slot.classList.remove('hop')), hopMs);
  }
  return {
    open(goods: readonly Good[], view: BagView) {
      shelf.replaceChildren(...goods.map(good => {
        const button = element('button', 'market-good', goodNames[good]); button.dataset.good = good; button.append(...goodPictures(good));
        button.addEventListener('click', () => actions.buy(good)); return button;
      }));
      render(view, false); panel.hidden = false;
    },
    /** After a tap: the good hops into the bag; a full bag shakes instead. */
    show(view: BagView, full: boolean) {
      render(view, !full);
      if (full) { bag.classList.remove('shake'); void bag.offsetWidth; bag.classList.add('shake'); }
    },
    close() { panel.hidden = true; },
    isOpen: () => !panel.hidden,
  };
}
