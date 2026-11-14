import { asking, nextAsk, type Ask } from '../domain/asks';

let last: Ask | null = null;
/** The one turn every asking bubble shares (lot 8E): the need thought and the routine's wish ask here, at the frame's `now`, only when
 *  they could be drawn; true while `key` is the ask up. A thought waits for the frame after its turn opens, so a wish that wants the same
 *  turn (its loop runs later in the frame) takes it without the thought flashing first. */
export function mayAsk(key: string, now: number): boolean {
  last = nextAsk(last, key, now);
  return asking(last, key, now) && (key.startsWith('wish:') || now > last.at);
}
