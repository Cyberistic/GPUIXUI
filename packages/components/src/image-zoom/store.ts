/**
 * ImageZoom's pointer, held in Effect.
 *
 * The magnification and the pan are arithmetic over the frame, the surface and
 * this one reading (`logic.ts`); what a component has to keep between renders is
 * therefore the pointer alone. It lives in a store so a move is a write into
 * Effect rather than a React state, and a repeat of the point already followed
 * writes nothing: the runtime emits a move per frame while the pointer is held.
 *
 * The surface a reading is taken against is measurement, not interaction: it
 * stays in `internal/surface-box.tsx` with the 1 px probe that keeps a moved
 * frame's origin fresh, and this store holds only what the reader did.
 */

import { Option } from "effect";
import { makeEffectStore, type EffectStore } from "../internal/effect-store.js";
import { samePointer, type ZoomPointer } from "./logic.js";

/** {@link ImageZoom}'s pointer state and the two events that move it. */
export interface ZoomStore extends EffectStore<Option.Option<ZoomPointer>> {
  /** Follow a pointer reading; a repeat of the held point writes nothing. */
  readonly follow: (point: ZoomPointer) => void;
  /** The pointer left the frame: the picture returns to rest. */
  readonly leave: () => void;
}

/** A zoom at rest: no pointer over the frame. */
export const makeZoomStore = (): ZoomStore => {
  const store = makeEffectStore<Option.Option<ZoomPointer>>(Option.none());

  return {
    ...store,
    follow: (point) => {
      const held = store.read();
      if (Option.exists(held, (previous) => samePointer(previous, point))) {
        return;
      }
      store.set(Option.some(point));
    },
    leave: () => {
      if (Option.isSome(store.read())) store.set(Option.none());
    },
  };
};
