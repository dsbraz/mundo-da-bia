import { panelSlots } from './panel';
import type { PanelButton, PanelSlot, StatusBadge } from './panel';

/** Builds the five fixed panel buttons once; later renders only change label, icon and dimming, never order or visibility. */
export function panelControls(container: Element, run: Record<PanelSlot, () => void>) {
  const buttons = panelSlots.map(slot => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'panel-button'; button.dataset.slot = slot;
    const icon = document.createElement('img'); icon.alt = ''; icon.width = 40; icon.height = 40;
    const label = document.createElement('span');
    button.append(icon, label);
    button.addEventListener('click', () => run[slot]());
    return button;
  });
  container.replaceChildren(...buttons);
  return (state: PanelButton[]) => state.forEach((value, index) => {
    const button = buttons[index]!;
    const icon = button.querySelector('img')!;
    if (icon.getAttribute('src') !== value.icon) icon.src = value.icon;
    button.querySelector('span')!.textContent = value.label; button.setAttribute('aria-label', value.label);
    button.disabled = !value.enabled;
  });
}

export function renderBadges(container: Element, badges: StatusBadge[]) {
  container.replaceChildren(...badges.map(badge => {
    const image = document.createElement('img');
    image.src = badge.icon; image.alt = badge.label; image.title = badge.label; image.width = 28; image.height = 28;
    return image;
  }));
}
