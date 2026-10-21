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
 * The same test answers the other direction (plan 816): 0.10.0 reports
 * `mouseDownOutside` by bounds, so an enclosing overlay is told that a press on a
 * nested surface is "outside" it. The dismiss stack asks its topmost layer
 * whether the press landed on the layer's own surface before it closes anything.
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

/** Whether `event` landed inside the measured box of native element `id`. */
export const pressedWithin = (
  renderer: NativeRenderer | null,
  id: number | null | undefined,
  event: EventPayload,
): boolean =>
  Option.match(
    Option.all({
      x: Option.fromNullishOr(event.x),
      y: Option.fromNullishOr(event.y),
      box: Option.flatMap(Option.fromNullishOr(id), (target) =>
        Option.flatMap(Option.fromNullishOr(renderer), (live) =>
          Option.fromNullishOr(live.getElementBounds?.(target)),
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

/** Whether `event` landed inside `element`'s measured box. */
export const pressedOn = (
  renderer: NativeRenderer | null,
  element: PublicInstance | null,
  event: EventPayload,
): boolean => pressedWithin(renderer, element?.id, event);

/**
 * The focused host when its centre lies inside native element `id`.
 *
 * A surface cannot ask 0.10.0 "is focus inside me?" — it delivers no
 * focus-within signal — so the box test is the signal (plan 386): a control
 * whose centre is inside a surface leaves with it. `None` when nothing holds
 * focus, because a removed host cannot be read (plan 708), and when either box
 * is missing. A point-in-box test, so the plan-540 box conventions do not
 * apply.
 */
export const focusedWithin = (
  renderer: NativeRenderer | null,
  id: number | null | undefined,
): Option.Option<number> =>
  Option.flatMap(
    Option.all({
      focused: Option.fromNullishOr(renderer?.getFocusedElementId?.() ?? null),
      surface: Option.flatMap(Option.fromNullishOr(id), (target) =>
        Option.fromNullishOr(renderer?.getElementBounds?.(target)),
      ),
    }),
    ({ focused, surface }) =>
      Option.filter(
        Option.fromNullishOr(renderer?.getElementBounds?.(focused)),
        (control) => {
          const x = control.x + control.width / 2;
          const y = control.y + control.height / 2;
          return (
            x >= surface.x &&
            x <= surface.x + surface.width &&
            y >= surface.y &&
            y <= surface.y + surface.height
          );
        },
      ).pipe(Option.as(focused)),
  );

/**
 * A dismiss layer's ownership test: the press landed on the surface `surfaceId`
 * names. Read at event time, because a surface mounts after the layer it owns.
 */
export const ownsSurface =
  (
    renderer: NativeRenderer | null,
    surfaceId: () => number | null | undefined,
  ): ((event: EventPayload) => boolean) =>
  (event) =>
    pressedWithin(renderer, surfaceId(), event);
