/** Asks are rare (lot 8E, the owner: "toda hora a Bia está com fome, sono…"). Every bubble that asks for something (anyone's need
 *  thought, or the routine's wish) takes turns on one clock: an ask stays up `askShow` (long enough to tap), and the next one, of any
 *  need or anyone, only comes `askGap` after the last one began. Pure: the caller keeps the last ask. */
export interface Ask { key: string; at: number }
export const askShow = 8_000, askGap = 8 * 60_000;
/** A routine wish (`wish:…`) outranks a need thought that took the turn in the same instant: the wish leads somewhere (home, the market). */
const outranks = (last: Ask, key: string, now: number) => last.at === now && key.startsWith('wish:') && !last.key.startsWith('wish:');
/** The ask in force at `now` when `key` wants to come up: a new one once the gap since the last has passed, else the last. */
export const nextAsk = (last: Ask | null, key: string, now: number): Ask =>
  !last || now - last.at >= askGap || outranks(last, key, now) ? { key, at: now } : last;
/** Whether `key` is the one up at `now`. */
export const asking = (ask: Ask, key: string, now: number) => ask.key === key && now - ask.at < askShow;
