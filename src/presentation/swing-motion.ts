/** The plaza swing as a damped pendulum, drawn only (never saved): each push widens it, up to 0.45 rad;
 *  left alone, with or without a rider, it swings lower and lower and rests after about 8 s. With reduced motion it stays still. */
export const maxSwing = .45;
const omega = 2 * Math.PI / 2.2, damping = 1.08, kick = .15, substep = 1000 / 120, rest = .006;
export function swingMotion() {
  let angle = 0, speed = 0, last: number | null = null;
  const amplitude = () => Math.hypot(angle, speed / omega);
  function advance(ms: number) {
    for (let left = ms; left > 0; left -= substep) {
      const dt = Math.min(substep, left) / 1000;
      speed += (-omega * omega * angle - damping * speed) * dt; angle += speed * dt;
    }
    if (amplitude() < rest) { angle = 0; speed = 0; }
  }
  return {
    /** Once per frame; a pause longer than 100 ms counts as 100 ms. */
    step(now: number, reduced: boolean) {
      const elapsed = last === null ? 0 : Math.min(100, Math.max(0, now - last)); last = now;
      if (reduced) { angle = 0; speed = 0; return; }
      if (angle || speed) advance(elapsed);
    },
    /** A touch on the swing: returns true (it always answers, also when reduced motion keeps it still). */
    push(now: number, reduced: boolean) {
      this.step(now, reduced);
      if (reduced) return true;
      // Whatever the phase, a push widens the swing by `kick` (from rest it sets off forward).
      const size = amplitude(), wider = Math.min(maxSwing, size + kick);
      if (size < rest) speed = wider * omega;
      else { angle *= wider / size; speed *= wider / size; }
      return true;
    },
    angle: () => angle,
    amplitude: () => (angle || speed ? amplitude() : 0),
    /** -1..1: legs stretch forward (> 0) on the way forward and fold back on the way back. */
    legs: () => Math.max(-1, Math.min(1, speed / (omega * maxSwing))),
  };
}
