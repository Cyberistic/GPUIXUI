import { useCallback, useState } from "react";
import { BlockIcon } from "./block-icons";

export const RAIL_COLLAPSED_WIDTH = 64;

export const RAIL_TRANSITION_MS = 200;

export const toggleRail = (collapsed: boolean): boolean => !collapsed;

export const railToggleLabel = (collapsed: boolean): string =>
  collapsed ? "Expand sidebar" : "Collapse sidebar";

export interface RailCollapse {
  readonly collapsed: boolean;
  readonly toggle: () => void;
}

export const useRailCollapse = (initiallyCollapsed = false): RailCollapse => {
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);
  const toggle = useCallback(() => setCollapsed(toggleRail), []);
  return { collapsed, toggle };
};

export interface RailToggleProps {
  readonly collapsed: boolean;
  readonly onToggle: () => void;

  readonly className?: string;
}

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
      <BlockIcon name="panelLeft" size={15} />
    </button>
  );
};
