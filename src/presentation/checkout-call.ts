import type { Point } from '../domain/types';
import type { Good } from '../domain/market';
import { goodNames, marketText } from '../content/kitchen';
import { goodPictures } from './market-play';
import { positionTargets } from './viewport';

interface CallActions {
  /** She walks to the checkout and pays. */
  pay: () => void;
  /** The first-time hand (lot 6F): whether it was already shown, and to remember that it was. */
  hintSeen: () => boolean; hintDone: () => void;
}
const receiptMs = 1800;
function node<K extends keyof HTMLElementTagNameMap>(tag: K, id: string, className = ''): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag); if (id) element.id = id; element.className = className; return element;
}
function picture(src: string, className: string) {
  const image = document.createElement('img'); image.src = src; image.alt = ''; image.draggable = false; image.className = className; return image;
}
const anchor = (element: HTMLElement, at: Point) => { element.dataset.worldX = String(at.x); element.dataset.worldY = String(at.y); };
/** A button that pays at a touch (the bubble's and the chip's register, the arrow). */
function payButton(element: HTMLElement, pay: () => void) {
  if (element instanceof HTMLButtonElement) element.type = 'button';
  element.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); pay(); });
}
/** The checkout calls her (lot 6F, "a Bia ficou perdida"): while she holds goods not paid for in the market, a ring pulses on the register
 *  and a drawn arrow bounces over it, and her bag shows what is in it beside a register to touch; any of them walks her there to pay. The
 *  very first time, the ghost hand taps the arrow. Paying pops a receipt with a check out of the register. Pictures only, never a number. */
export function checkoutCall(root: HTMLElement, actions: CallActions) {
  const call = node('button', 'checkout-call', 'checkout-call'), arrow = picture('/icons/checkout-arrow.svg', 'arrow');
  call.setAttribute('aria-label', marketText.call); call.append(node('span', 'checkout-halo', 'halo'), arrow); payButton(call, actions.pay);
  const chip = node('div', 'market-chip', 'market-chip'), goods = node('span', 'market-chip-goods', 'chip-goods'), register = node('button', 'market-chip-pay', 'chip-pay');
  chip.setAttribute('role', 'group'); register.setAttribute('aria-label', marketText.pay); register.append(picture('/art/market.svg#checkout', 'register'));
  chip.append(picture('/icons/sacola.svg', 'chip-bag'), goods, register); payButton(register, actions.pay);
  const hand = picture('/icons/ghost-hand.svg', ''); hand.id = 'checkout-hint'; hand.setAttribute('aria-hidden', 'true');
  const dismiss = () => { hand.remove(); window.removeEventListener('pointerdown', dismiss, true); };
  function hint(at: Point) {
    if (actions.hintSeen()) return;
    actions.hintDone(); anchor(hand, at); root.append(hand);
    window.addEventListener('pointerdown', dismiss, true);
  }
  return {
    /** Over the register at `at` (world) with the bag's `contents`, or gone (null). With the shelf open (`shelf`) the hand waits. */
    show(at: Point | null, contents: readonly Good[], shelf: boolean) {
      if (!at) { call.remove(); chip.remove(); dismiss(); return; }
      anchor(call, at); if (!call.isConnected) root.append(call, chip);
      if (chip.dataset.bag !== contents.join(' ')) { goods.replaceChildren(...contents.map(good => { const slot = node('span', '', 'chip-good'); slot.append(...goodPictures(good)); return slot; })); chip.dataset.bag = contents.join(' '); }
      chip.setAttribute('aria-label', marketText.bag(contents.map(good => goodNames[good])));
      if (!shelf) hint(at);
      positionTargets(root);
    },
    /** Leaving without paying: the arrow jumps to be seen. */
    nudge() { call.classList.remove('nudge'); void call.offsetWidth; call.classList.add('nudge'); },
    /** Beep, beep: the receipt with its check pops out of the register at `at`. */
    paid(at: Point) {
      const receipt = node('div', 'checkout-receipt', 'checkout-receipt'); receipt.setAttribute('aria-hidden', 'true');
      receipt.append(picture('/icons/receipt.svg', 'paper'), picture('/icons/sacola-paga.svg', 'paid-bag'));
      document.getElementById('checkout-receipt')?.remove(); anchor(receipt, at); root.append(receipt); positionTargets(root);
      window.setTimeout(() => receipt.remove(), receiptMs);
    },
  };
}
