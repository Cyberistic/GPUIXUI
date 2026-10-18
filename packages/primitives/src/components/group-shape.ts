/**
 * The shape and width contract a `ButtonGroup` gives its buttons.
 *
 * The runtime has no `:first-child`/`:last-child` and a component cannot restyle
 * a child without cloning it, so an attached group cannot round only its ends.
 * It asks every button to be **square** instead and rounds/clips the group: the
 * clip supplies the outer corners, and a shared edge has no double-rounded notch
 * (measured: plan `078`).
 *
 * A **horizontal** group also shares its width between its buttons. A text run is
 * a flex item the runtime never shrinks, so without this a long label made the
 * first button 401 px wide in a 220 px group and pushed the second button
 * entirely outside it (measured: plan `369`). A vertical group stretches its
 * buttons instead and must not shrink their height, so the flag is horizontal
 * only.
 *
 * Context is React's own composition mechanism — no cloned children, no
 * per-child props — and a `Button`'s explicit `radius` still wins.
 */

import { createContext, useContext } from "react";
import * as Option from "effect/Option";
import type { RadiusStep } from "../core/theme.js";

/** What the surrounding group asks of each button; empty outside a group. */
export interface GroupShape {
  /** The radius the group supplies; empty for a separated group. */
  readonly radius: Option.Option<RadiusStep>;
  /** Whether the group clips its surface, so the ring must move inside. */
  readonly clipped: boolean;
  /** Whether the group shares its width between its buttons. */
  readonly shrink: boolean;
}

/** The shape a `ButtonGroup` supplies to its buttons; empty outside one. */
export const GroupShapeContext = createContext<Option.Option<GroupShape>>(
  Option.none(),
);

/** The shape the surrounding group asks for, if any. */
export const useGroupShape = (): Option.Option<GroupShape> =>
  useContext(GroupShapeContext);
