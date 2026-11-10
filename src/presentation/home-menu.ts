import { uiText } from '../content/ui-text';
export function homeMenu(root: HTMLElement, hint: () => string) {
  const dialog = root.querySelector<HTMLDialogElement>('#room-dialog')!;
  const organization = root.querySelector<HTMLElement>('[data-home-panel="organize"]')!;
  organization.prepend(root.querySelector('.home-settings')!);
  root.querySelector('.home-tabs')!.after(organization);
  const choose = (tab: string) => {
    dialog.dataset.homeTab = tab;
    root.querySelectorAll<HTMLButtonElement>('[data-home-tab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.homeTab === tab)));
    root.querySelectorAll<HTMLElement>('[data-home-panel]').forEach(p => { p.hidden = !p.dataset.homePanel!.split(' ').includes(tab); });
    root.querySelector('#home-hint')!.textContent = tab === 'organize' ? uiText.map.organizeHint : hint();
    root.querySelector<HTMLElement>('#quick-rooms')!.hidden = true;
    dialog.scrollTop = 0;
  };
  root.querySelectorAll<HTMLButtonElement>('[data-home-tab]').forEach(b => b.onclick = () => choose(b.dataset.homeTab!));
  choose('map'); return choose;
}
