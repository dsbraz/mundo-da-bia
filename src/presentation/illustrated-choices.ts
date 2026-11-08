// Keep the existing form callbacks; expose their choices as illustrated cards.
export function illustratedChoices(root: HTMLElement) {
  root.querySelectorAll<HTMLSelectElement>('select').forEach(select => {
    const signature = Array.from(select.options).map(o => `${o.value}:${o.text}`).join('|') + select.value;
    let group = select.nextElementSibling as HTMLElement | null;
    if (!group?.classList.contains('choice-cards')) {
      group = document.createElement('div'); group.className = 'choice-cards'; group.setAttribute('role', 'group');
      group.setAttribute('aria-label', select.getAttribute('aria-label') ?? select.labels?.[0]?.textContent ?? 'Escolher');
      select.after(group); select.hidden = true; select.tabIndex = -1;
    }
    if (group.dataset.options === signature) return;
    group.dataset.options = signature;
    group.replaceChildren(...Array.from(select.options).map(option => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = option.text;
      button.setAttribute('aria-pressed', String(option.value === select.value));
      button.onclick = () => { select.value = option.value; select.dispatchEvent(new Event('change', { bubbles: true })); illustratedChoices(root); };
      return button;
    }));
  });
}
