/**
 * The corner shape an attached `ButtonGroup` gives its buttons.
 *
 * The runtime has no `:first-child`/`:last-child` and a component cannot restyle
 * a child without cloning it, so an attached group cannot round only its ends.
 * It asks every button to be **square** instead and rounds/clips the group: the
 * clip supplies the outer corners, and a shared edge has no double-rounded notch
 * (measured: plan `078`).
 *
 * Context is React's own composition mechanism — no cloned children, no
 * per-child props — and a `Button`'s explicit `radius` still wins.
 */

import { createContext, useContext } from "react";
import * as Option from "effect/Option";
import type { RadiusStep } from "../core/theme.js";

export const GroupShapeContext = createContext<Option.Option<RadiusStep>>(
  Option.none(),
);

/** The shape the surrounding group asks for, if any. */
export const useGroupShape = (): Option.Option<RadiusStep> =>
  useContext(GroupShapeContext);
