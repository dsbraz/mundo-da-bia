import { it, expect, vi } from 'vitest';
import { navigation } from './navigation';
function setup() {
  const preview = vi.fn(), visit = vi.fn();
  const gesture = navigation({ width: () => 1000, neighbor: d => d === 'right' ? 'quarto' : undefined, preview, visit });
  return { gesture, preview, visit };
}
it('acompanha o dedo após 12px, confirma 25% e não repete no segundo soltar', () => {
  const { gesture, preview, visit } = setup(); gesture.start(1, { x: 700, y: 100 });
  gesture.update(1, { x: 689, y: 100 }); expect(preview).not.toHaveBeenCalled();
  gesture.update(1, { x: 600, y: 100 }); expect(preview).toHaveBeenLastCalledWith('quarto', -.1);
  gesture.end(1, { x: 450, y: 100 }); expect(visit).toHaveBeenCalledExactlyOnceWith('quarto', -0.25);
  gesture.end(1, { x: 400, y: 100 }); expect(visit).toHaveBeenCalledTimes(1);
});
it('retorna em gesto incompleto, cancelamento e extremos sem circular', () => {
  const { gesture, preview, visit } = setup();
  for (const x of [600, 999]) {
    gesture.start(1, { x: 700, y: 100 }); gesture.update(1, { x, y: 100 }); gesture.end(1, { x, y: 100 });
    expect(preview).toHaveBeenLastCalledWith(null, 0); expect(visit).not.toHaveBeenCalled();
  }
  gesture.start(1, { x: 700, y: 100 }); gesture.update(1, { x: 300, y: 100 }); gesture.cancel();
  gesture.end(1, { x: 300, y: 100 }); expect(visit).not.toHaveBeenCalled();
});
it('ignora segundo dedo e preserva o dono do gesto', () => {
  const { gesture, visit } = setup(); expect(gesture.start(1, { x: 700, y: 100 })).toBe(true);
  expect(gesture.start(2, { x: 900, y: 100 })).toBe(false);
  gesture.update(2, { x: 100, y: 100 }); gesture.end(2, { x: 100, y: 100 }); expect(visit).not.toHaveBeenCalled();
  gesture.end(1, { x: 450, y: 100 }); expect(visit).toHaveBeenCalledTimes(1);
});
