/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import {
  cn,
  TIMELINE_CONNECTOR,
  TIMELINE_CONTENT,
  TIMELINE_DESCRIPTION,
  TIMELINE_DOT,
  TIMELINE_ITEM,
  TIMELINE_RAIL,
  TIMELINE_ROOT,
  TIMELINE_TIMESTAMP,
  TIMELINE_TITLE,
} from "@gpuixui/tw";
import { Children, createContext, isValidElement, useContext } from "react";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { recipeStyle } from "./internal/recipe.js";
import { useTheme, type Theme } from "./internal/theme.js";

export type TimelineStatus = "complete" | "current" | "upcoming";

interface TimelineContextValue {
  readonly last: boolean;
}

const TimelineContext = createContext<TimelineContextValue>({ last: false });

const dotFill = (theme: Theme, status: TimelineStatus): string =>
  status === "current"
    ? theme.colors.primary
    : status === "complete"
      ? theme.colors.foreground
      : theme.colors.mutedForeground;

export interface TimelineProps extends Omit<Props, "children"> {
  readonly label?: string;

  readonly className?: string;
  readonly children?: PartChildren;
}

export const Timeline = ({
  label,
  className,
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
        recipeStyle(cn(TIMELINE_ROOT, className), theme),
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

export interface TimelineItemProps extends Omit<Props, "children" | "style"> {
  readonly title: string;

  readonly description?: string;

  readonly timestamp?: string;

  readonly status?: TimelineStatus;

  readonly className?: string;

  readonly style?: StateStyle<TimelineItemState>;
}

export interface TimelineItemState {
  readonly status: TimelineStatus;
  readonly last: boolean;
}

export const TimelineItem = ({
  title,
  description,
  timestamp,
  status = "complete",
  className,
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
        recipeStyle(cn(TIMELINE_ITEM, className), theme),
        resolveStyle(style, { status, last }),
      )}
    >
      <div style={recipeStyle(TIMELINE_RAIL, theme)}>
        <div
          style={mergeStyles(recipeStyle(TIMELINE_DOT, theme), {
            backgroundColor: dotFill(theme, status),
          })}
        />
        {last ? null : <div style={recipeStyle(TIMELINE_CONNECTOR, theme)} />}
      </div>
      <div
        style={mergeStyles(recipeStyle(TIMELINE_CONTENT, theme), {
          paddingBottom: last ? 0 : theme.spacing.lg,
        })}
      >
        {timestamp === undefined ? null : (
          <text style={recipeStyle(TIMELINE_TIMESTAMP, theme)}>
            {timestamp}
          </text>
        )}
        <text
          style={mergeStyles(recipeStyle(TIMELINE_TITLE, theme), {
            color:
              status === "upcoming"
                ? theme.colors.mutedForeground
                : theme.colors.foreground,
          })}
        >
          {title}
        </text>
        {description === undefined ? null : (
          <text style={recipeStyle(TIMELINE_DESCRIPTION, theme)}>
            {description}
          </text>
        )}
      </div>
    </div>
  );
};

const timelineParts: ReadonlyArray<PartComponent> = [Timeline, TimelineItem];

const timelineRoot: PartsContract = {
  parent: "Timeline",
  family: timelineParts,
  accepts: [TimelineItem],
  hint: "Put TimelineItem directly inside Timeline.",
};

export const timelineMeta = {
  name: "Timeline",
  tier: 2,
  gpuixSupport: "partial",
  status: "done",
  limitations: [
    "display-only: no click, selection or aria-current",
    "the last item is computed from direct children; a fragment of items shares one flag",
    "the connector is a 1px element because 0.11.0 has no pseudo-elements",
  ],
  docs: "docs/timeline.mdx",
  example: "examples/timeline.example.tsx",
  testFile: "src/behaviour/timeline.test.tsx",
} as const;
