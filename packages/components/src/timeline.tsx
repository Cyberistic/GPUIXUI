/**
 * Timeline: a read-only rail of events.
 *
 * Status is passed, not derived: a history has no current index to count from,
 * so the consumer that knows the events marks them. The root tells each direct
 * child whether it is the last item, which is the only fact an item needs from
 * its siblings (the rail stops there).
 *
 * `@gpuix/native@0.10.0` has no pseudo-elements, so the connector is a real
 * 1px element, and no `aria-current`, so the current event carries
 * `aria-selected` — the substitution Stepper and Pagination use.
 */

import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Children, createContext, isValidElement, useContext } from "react";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { textStyle, useTheme, type Theme } from "./internal/theme.js";

/** Where an event sits in the history. */
export type TimelineStatus = "complete" | "current" | "upcoming";

/** What an item derives from the root: whether the rail ends with it. */
interface TimelineContextValue {
  readonly last: boolean;
}

const TimelineContext = createContext<TimelineContextValue>({ last: false });

/** The dot fill for one status. */
const dotFill = (theme: Theme, status: TimelineStatus): string =>
  status === "current"
    ? theme.colors.primary
    : status === "complete"
      ? theme.colors.foreground
      : theme.colors.muted;

/** {@link Timeline} props. */
export interface TimelineProps extends Omit<Props, "children"> {
  /** The list's accessible name. */
  readonly label?: string;
  readonly children?: PartChildren;
}

/** A vertical event rail. */
export const Timeline = ({
  label,
  children,
  style,
  ...rest
}: TimelineProps) => {
  const theme = useTheme();
  assertParts(timelineRoot, children);

  const items = Children.toArray(children);
  const lastItem = items.reduce(
    (last, child, index) =>
      isValidElement(child) && child.type === TimelineItem ? index : last,
    -1,
  );

  return (
    <div
      role="list"
      {...(label === undefined ? {} : { "aria-label": label })}
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        },
        style,
      )}
    >
      {items.map((item, index) => (
        <TimelineContext.Provider
          key={index}
          value={{ last: index === lastItem }}
        >
          {item}
        </TimelineContext.Provider>
      ))}
    </div>
  );
};

/** {@link TimelineItem} props. */
export interface TimelineItemProps extends Omit<Props, "children" | "style"> {
  /** The event's name. */
  readonly title: string;
  /** One line of supporting copy. */
  readonly description?: string;
  /** When it happened, as the consumer formats it. */
  readonly timestamp?: string;
  /** Default `"complete"`. */
  readonly status?: TimelineStatus;
  /** A style, or a function of the item's status and position. */
  readonly style?: StateStyle<TimelineItemState>;
}

/** What an item draws: its status and whether it ends the rail. */
export interface TimelineItemState {
  readonly status: TimelineStatus;
  readonly last: boolean;
}

/** One event: timestamp, dot, connector, title and optional description. */
export const TimelineItem = ({
  title,
  description,
  timestamp,
  status = "complete",
  style,
  ...rest
}: TimelineItemProps) => {
  const theme = useTheme();
  const { last } = useContext(TimelineContext);

  return (
    <div
      role="listitem"
      aria-label={title}
      aria-selected={status === "current"}
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          alignSelf: "stretch",
          gap: theme.spacing.md,
        },
        resolveStyle(style, { status, last }),
      )}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: 16,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: theme.radius.full,
            backgroundColor: dotFill(theme, status),
            marginTop: theme.spacing.xs,
          }}
        />
        {last ? null : (
          <div
            style={{
              width: theme.borderWidth.thin,
              flexGrow: 1,
              backgroundColor: theme.colors.border,
              marginTop: theme.spacing["2xs"],
            }}
          />
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing["2xs"],
          flexGrow: 1,
          paddingBottom: last ? 0 : theme.spacing.lg,
        }}
      >
        {timestamp === undefined ? null : (
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            {timestamp}
          </text>
        )}
        <text
          style={{
            ...textStyle(theme, "label"),
            color:
              status === "upcoming"
                ? theme.colors.mutedForeground
                : theme.colors.foreground,
          }}
        >
          {title}
        </text>
        {description === undefined ? null : (
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.mutedForeground,
            }}
          >
            {description}
          </text>
        )}
      </div>
    </div>
  );
};

/** Every part, so a misplaced sibling is named. */
const timelineParts: ReadonlyArray<PartComponent> = [Timeline, TimelineItem];

const timelineRoot: PartsContract = {
  parent: "Timeline",
  family: timelineParts,
  accepts: [TimelineItem],
  hint: "Put TimelineItem directly inside Timeline.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const timelineMeta = {
  name: "Timeline",
  tier: 2,
  gpuixSupport: "partial",
  focusable: false,
  status: "done",
  limitations: [
    "display-only: no click, selection or aria-current",
    "the last item is computed from direct children; a fragment of items shares one flag",
    "the connector is a 1px element because 0.10.0 has no pseudo-elements",
  ],
  docs: "docs/timeline.mdx",
  example: "examples/timeline.example.tsx",
  testFile: "src/behaviour/timeline.test.tsx",
} as const;
