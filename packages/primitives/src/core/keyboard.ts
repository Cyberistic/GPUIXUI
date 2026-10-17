/**
 * Keyboard behaviour, as decisions rather than handlers.
 *
 * GPUix delivers real key events to the focused element (`onKeyDown`,
 * `onKeyUp`, with `key`, `isHeld` and modifiers), so a control's keyboard
 * contract can be a pure function of those facts. Putting it here — instead of
 * inside each component's JSX — is what makes it provable without a rendering
 * runtime, and keeps every control agreeing on the same rules.
 *
 * The rules mirror the platform: **Enter** activates on key *down* so a held
 * key does not fire repeatedly, **Space** activates on key *up* the way a
 * browser button does, and a repeat event never activates.
 *
 * **Limitation:** `@gpuix/native` 0.10.0's `EventPayload` carries no
 * `defaultPrevented` and offers no way to prevent the platform default, so a
 * Space key down cannot be swallowed here. It does nothing on our controls,
 * but in a scroll container the runtime may also scroll — recorded in
 * `COMPONENTS.md`, and the reason there is no `preventDefault` field to fake.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** A key name as GPUix reports it in `EventPayload.key`, lower-cased. */
export type KeyName = string;

/** The phase of the key event being decided. */
export type KeyPhase = "down" | "up";

export const ENTER_KEY = "enter";
export const SPACE_KEY = "space";

/**
 * Whether a key event activates a button-like control.
 *
 * @param key the key name from the event
 * @param phase whether this is a key down or key up
 * @param held whether the key is repeating
 */
export const decideActivation = (
  key: KeyName,
  phase: KeyPhase,
  held: boolean,
): boolean => {
  if (held) return false;
  if (key === ENTER_KEY) return phase === "down";
  if (key === SPACE_KEY) return phase === "up";
  return false;
};

/** Toggle a boolean: a switch, a checkbox, an expanded row. */
export const decideToggle = (current: boolean): boolean => !current;

const ARROW_KEYS = {
  vertical: { forward: "down", backward: "up" },
  horizontal: { forward: "right", backward: "left" },
} as const;

/** The axis a group of controls navigates with the arrow keys. */
export type Orientation = keyof typeof ARROW_KEYS;

/**
 * Move a selection with the arrow keys, wrapping at the ends.
 *
 * `isDisabled` lets a group of controls skip items that cannot be chosen: a
 * radio group must never land on a disabled option, because the tab stop would
 * move there with no way to select it.
 *
 * `None` means the key is not a navigation key, or there is nowhere enabled to
 * move to, so a caller can tell "stay put" from "unhandled" without comparing
 * against a sentinel index.
 */
export const decideMove = (
  index: number,
  count: number,
  key: KeyName,
  orientation: Orientation,
  isDisabled: (index: number) => boolean = () => false,
): Option.Option<number> => {
  if (count <= 0) return Option.none();
  const { forward, backward } = ARROW_KEYS[orientation];
  if (key !== forward && key !== backward) return Option.none();
  const step = key === forward ? 1 : -1;
  const candidates = Arr.map(
    Arr.range(1, count - 1),
    (offset) => (((index + step * offset) % count) + count) % count,
  );
  return Arr.findFirst(candidates, (candidate) => !isDisabled(candidate));
};

/** Home and End land on the ends rather than moving by one. */
export const decideAbsolute = (
  count: number,
  key: KeyName,
): Option.Option<number> => {
  if (count <= 0) return Option.none();
  if (key === "home") return Option.some(0);
  if (key === "end") return Option.some(count - 1);
  return Option.none();
};

/** PageUp and PageDown move by a viewport's worth, clamped to the ends. */
export const decidePage = (
  index: number,
  count: number,
  key: KeyName,
  pageSize: number,
): Option.Option<number> => {
  if (count <= 0 || pageSize <= 0) return Option.none();
  if (key !== "pageup" && key !== "pagedown") return Option.none();
  const target = key === "pagedown" ? index + pageSize : index - pageSize;
  return Option.some(Math.max(0, Math.min(count - 1, target)));
};
