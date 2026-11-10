/** One game jump, drawn in the scene only: a short crouch, the arc (the shadow shrinks in the air) and a landing squash with a puff of dust.
 *  It lasts as long as the jump lock (400 ms); the landing squash and dust come after it and never hold input. */
export const jumpMs = 400;
const crouchMs = 90, landMs = 160, height = 28, crouchSquash = -.08;
export type JumpPhase = 'crouch' | 'air' | 'land' | 'still';
/** `squash` < 0 is shorter and wider, > 0 taller; `travel` 0..1 along the path; `shadow` its scale; `dust` 0..1 through the puff (0 = none). */
export interface JumpFrame { phase: JumpPhase; travel: number; lift: number; squash: number; shadow: number; dust: number }
const still: JumpFrame = { phase: 'still', travel: 1, lift: 0, squash: 0, shadow: 1, dust: 0 };
export function jumpFrame(elapsed: number, reduced: boolean): JumpFrame {
  if (reduced || !(elapsed < jumpMs + landMs)) return { ...still };
  if (elapsed < crouchMs) return { phase: 'crouch', travel: 0, lift: 0, squash: crouchSquash * Math.sin(Math.max(0, elapsed) / crouchMs * Math.PI / 2), shadow: 1, dust: 0 };
  if (elapsed < jumpMs) {
    const u = (elapsed - crouchMs) / (jumpMs - crouchMs), lift = Math.sin(u * Math.PI) * height;
    return { phase: 'air', travel: u * u * (3 - 2 * u), lift, squash: .06 * Math.sin(u * Math.PI) * (1 - u), shadow: 1 - .4 * lift / height, dust: 0 };
  }
  const k = (elapsed - jumpMs) / landMs;
  return { phase: 'land', travel: 1, lift: 0, squash: crouchSquash * (1 - k), shadow: 1, dust: Math.max(k, .01) };
}
