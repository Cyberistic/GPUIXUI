import { useCallback, useState } from "react";
import { BlockIcon } from "./block-icons";

/**
 * The one collapse rule every block with a rail shares.
 *
 * A rail is a navigation strip, so collapsing it is not a modal state: the
 * toggle flips one boolean, the rail keeps its icons and hides its labels, and
 * the content pane takes the width back. The transition lives in
 * `blocks.css` (`RAIL_TRANSITION_MS`), including the reduced-motion snap.
 */

/** The width a collapsed rail holds, in pixels. */
export const RAIL_COLLAPSED_WIDTH = 64;

/** The rail's width transition, which the sheet and the tests both declare. */
export const RAIL_TRANSITION_MS = 200;

/** The next rail state. */
export const toggleRail = (collapsed: boolean): boolean => !collapsed;

/** The toggle's accessible name, which states the action rather than the state. */
export const railToggleLabel = (collapsed: boolean): string =>
  collapsed ? "Expand sidebar" : "Collapse sidebar";

export interface RailCollapse {
  readonly collapsed: boolean;
  readonly toggle: () => void;
}

/** A block's rail state, for the blocks whose surface owns no reducer. */
export const useRailCollapse = (initiallyCollapsed = false): RailCollapse => {
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);
  const toggle = useCallback(() => setCollapsed(toggleRail), []);
  return { collapsed, toggle };
};

export interface RailToggleProps {
  readonly collapsed: boolean;
  readonly onToggle: () => void;
  /** A block's own button class, joined after the shared one. */
  readonly className?: string;
}

/** The chevron that collapses or expands a rail. */
export const RailToggle = ({
  collapsed,
  onToggle,
  className,
}: RailToggleProps) => {
  const label = railToggleLabel(collapsed);
  return (
    <button
      aria-expanded={!collapsed}
      aria-label={label}
      className={
        className === undefined
          ? "gx-rail-toggle"
          : `gx-rail-toggle ${className}`
      }
      onClick={onToggle}
      title={label}
      type="button"
    >
      <BlockIcon name={collapsed ? "chevronRight" : "chevronLeft"} size={13} />
    </button>
  );
};
