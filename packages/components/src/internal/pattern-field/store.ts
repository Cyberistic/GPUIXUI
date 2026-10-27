/**
 * The state a decorative field keeps: the box it measured, and where its breath
 * has got to.
 *
 * A field generates its picture from the box it actually has, so the box is
 * state that outlives a render; the breath is the runtime's tween reporting in,
 * so its phase is state a completed motion writes. Both live here instead of in
 * `useState`, and the field only paints what this snapshot says.
 *
 * The breath's *timing* is the runtime's — a field has no `transform` to move
 * (upstream issue #102), so the tween is an opacity the motion engine owns and
 * `onMotionComplete` is the seam that flips the direction. A wall-clock copy of
 * that duration here would drift from the paint.
 */

import { Option } from "effect";
import { makeEffectStore, type EffectStore } from "../effect-store.js";
import type { PatternBox } from "../svg-pattern.js";

/** What a field paints at one frame. */
export interface FieldStoreState {
  /** The box the field last measured; `None` before its first layout. */
  readonly box: Option.Option<PatternBox>;
  /** Which half of the breath the layer is on. */
  readonly lit: boolean;
}

/** {@link FieldStoreState} and the two events that move it. */
export interface FieldStore extends EffectStore<FieldStoreState> {
  /** Record a measured box; a box of the same size writes nothing. */
  readonly note: (box: PatternBox) => void;
  /** The breath's tween landed: turn it around. */
  readonly breathe: () => void;
}

const resting: FieldStoreState = { box: Option.none(), lit: false };

/** A field with no box and its breath at rest. */
export const makeFieldStore = (): FieldStore => {
  const store = makeEffectStore(resting);

  return {
    ...store,
    note: (box) => {
      const held = store.read().box;
      if (
        Option.exists(
          held,
          (current) =>
            current.width === box.width && current.height === box.height,
        )
      ) {
        return;
      }
      store.set({ ...store.read(), box: Option.some(box) });
    },
    breathe: () => {
      const current = store.read();
      store.set({ ...current, lit: !current.lit });
    },
  };
};
