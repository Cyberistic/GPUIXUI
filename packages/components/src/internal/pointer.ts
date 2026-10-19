/**
 * Whether a pointer event landed on a part, in the runtime's window coordinates.
 *
 * An overlay learns about a press on its own trigger from `mouseDownOutside`:
 * that event fires on the press, while the trigger's click arrives on release —
 * separate tasks (measured, plan 583). Reading the press position is therefore
 * the only honest way to tell a press on the overlay's trigger apart from a press
 * anywhere else; a one-gesture mark cleared on a microtask cannot survive to the
 * click.
 *
 * The parameters use the runtime's own `| null` shapes (`renderer` from
 * `useGpuix`, `element` from a ref); each is converted here, once, at the
 * boundary. This is a point-in-box test, not a comparison of two origins, so the
 * plan-540 box conventions do not apply: the centre of a control lies inside its
 * reported box under every convention the binding reports.
 */

import type {
  EventPayload,
  NativeRenderer,
  PublicInstance,
} from "@gpuix/react";
import * as Option from "effect/Option";

/** Whether `event` landed inside `element`'s measured box. */
export const pressedOn = (
  renderer: NativeRenderer | null,
  element: PublicInstance | null,
  event: EventPayload,
): boolean =>
  Option.match(
    Option.all({
      x: Option.fromNullishOr(event.x),
      y: Option.fromNullishOr(event.y),
      box: Option.flatMap(Option.fromNullishOr(element), (target) =>
        Option.flatMap(Option.fromNullishOr(renderer), (live) =>
          Option.fromNullishOr(live.getElementBounds?.(target.id)),
        ),
      ),
    }),
    {
      onNone: () => false,
      onSome: ({ box, x, y }) =>
        x >= box.x &&
        x <= box.x + box.width &&
        y >= box.y &&
        y <= box.y + box.height,
    },
  );
