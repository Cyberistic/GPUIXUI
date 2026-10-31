/** @jsxImportSource @gpuix/react */
/**
 * SegmentedControl: one choice among a few, as AppKit's segmented control.
 *
 * A quiet `muted` track holds equal-width segments; the chosen one is raised —
 * the `background` fill with the `sm` lift. Unlike a tab list or a toggle
 * group, the arrow keys **select** as they move, which is how a Mac view
 * switcher behaves, and the group is one tab stop on the chosen segment.
 *
 * Each segment is the primitives' action, so Enter/Space, the focus ring and
 * the disabled stop are the shared contract.
 */

import {
  useGpuix,
  type KeyEvent,
  type Props,
  type PublicInstance,
} from "@gpuix/react";
import { Icon, type IconName } from "@gpuixui/icons";
import { Button as Action } from "@gpuixui/primitives/button";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useEffect, useRef } from "react";
import { elevationShadow, useTheme } from "./internal/theme.js";

/** One segment. */
export interface SegmentedControlItem {
  readonly value: string;
  readonly label: string;
  readonly icon?: IconName;
  readonly disabled?: boolean;
}

/** {@link SegmentedControl} props. */
export interface SegmentedControlProps extends Omit<Props, "children"> {
  /** The group's accessible name. */
  readonly label: string;
  readonly items: ReadonlyArray<SegmentedControlItem>;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  /** The segments' control size. Defaults to `sm`, a toolbar's. */
  readonly size?: "sm" | "md";
}

/**
 * The segment an arrow selects: the next or previous enabled one, stopping at
 * either end.
 */
export const stepSegment = (
  items: ReadonlyArray<SegmentedControlItem>,
  value: string,
  direction: 1 | -1,
): Option.Option<string> => {
  const at = Option.getOrElse(
    Arr.findFirstIndex(items, (item) => item.value === value),
    () => 0,
  );
  const ahead =
    direction === 1
      ? Arr.drop(items, at + 1)
      : Arr.reverse(Arr.take(items, at));
  return Option.map(
    Arr.findFirst(ahead, (item) => item.disabled !== true),
    (item) => item.value,
  );
};

/** The segmented control. */
export const SegmentedControl = ({
  label,
  items,
  value,
  onValueChange,
  size = "sm",
  style,
  ...rest
}: SegmentedControlProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const segments = useRef(new Map<string, PublicInstance>());
  // An arrow moves the tab stop with the choice; focus follows once the new
  // stop has rendered, or the runtime focuses the segment that is leaving it.
  const follow = useRef(false);

  useEffect(() => {
    if (!follow.current) return;
    follow.current = false;
    const target = segments.current.get(value);
    if (target !== undefined) renderer?.focusElement?.(target.id);
  }, [value, renderer]);

  const choose = (next: string): void => {
    follow.current = true;
    onValueChange(next);
  };

  const onKeyDown = (event: KeyEvent): void => {
    const key = event.key ?? "";
    if (key !== "left" && key !== "right") return;
    Option.map(stepSegment(items, value, key === "right" ? 1 : -1), choose);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      {...rest}
      onKeyDown={onKeyDown}
      style={{
        display: "flex",
        flexDirection: "row",
        gap: 2,
        padding: 2,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.muted,
        ...style,
      }}
    >
      {Arr.map(items, (item) => {
        const chosen = item.value === value;
        return (
          <Action
            key={item.value}
            variant="ghost"
            size={size}
            label={item.label}
            disabled={item.disabled === true}
            tabIndex={chosen ? 0 : -1}
            testId={`segment-${item.value}`}
            aria-checked={chosen}
            ref={(instance: PublicInstance | null) => {
              if (instance === null) segments.current.delete(item.value);
              else segments.current.set(item.value, instance);
            }}
            onActivate={() => choose(item.value)}
            leading={
              item.icon === undefined ? undefined : (
                <Icon
                  name={item.icon}
                  size={theme.iconSize.sm}
                  color={theme.colors.foreground}
                />
              )
            }
            style={{
              flexGrow: 1,
              flexBasis: 0,
              borderRadius: theme.radius.sm,
              ...(chosen
                ? {
                    backgroundColor: theme.colors.background,
                    boxShadow: elevationShadow(theme, "sm"),
                  }
                : {}),
            }}
          >
            {item.label}
          </Action>
        );
      })}
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md`'s Segmented control row. */
export const segmentedControlMeta = {
  name: "Segmented control",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "No `aria-checked` channel is read by assistive technology in 0.11.0; the chosen segment is the group's one tab stop",
  ],
  docs: "docs/segmented-control.mdx",
  example: "examples/segmented-control.example.tsx",
  testFile: "src/behaviour/segmented-control.test.tsx",
} as const;
