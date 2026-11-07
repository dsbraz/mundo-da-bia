import { expect, it } from 'vitest';
import { streetPan } from './street-pan';
it('desloca continuamente, limita extremos e restaura a câmera ao cancelar', () => {
  let x = 300;
  const pan = streetPan(() => x, value => { x = value; }, () => 760, () => 500);
  pan.start(0, { x: 300, y: 0 }); pan.update(0, { x: 289, y: 0 }); expect(x).toBe(300);
  pan.update(0, { x: 250, y: 0 }); expect(x).toBe(400);
  pan.update(0, { x: -500, y: 0 }); expect(x).toBe(760);
  pan.cancel(); expect(x).toBe(300);
  pan.start(0, { x: 100, y: 0 }); pan.end(0, { x: 400, y: 0 }); expect(x).toBe(0);
  pan.cancel(); expect(x).toBe(0); pan.update(0, { x: -500, y: 0 }); expect(x).toBe(0);
});
