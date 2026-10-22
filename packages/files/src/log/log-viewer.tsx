/**
 * `LogViewer` — a virtualized, bottom-anchored log over `@gpuixui/data`'s list.
 *
 * The list is `@gpuixui/data`'s `VirtualList` in children mode: the runtime's
 * `<virtual-list>` builds and paints only the rows around the viewport, and the
 * `followTail` + `alignment="bottom"` pair keep the reader at the tail until it
 * scrolls up. The parser (`parseLogLine`) and the level filter (`filterByLevel`)
 * are pure; the toolbar composes the filter and the follow toggle, and each row
 * paints its level in the status tone it maps to.
 *
 * ```tsx
 * <LogViewer
 *   height={320}
 *   lines={lines}
 *   followTail={follow}
 *   onFollowTailChange={setFollow}
 *   enabledLevels={levels}
 *   onEnabledLevelsChange={setLevels}
 * />
 * ```
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { VirtualList } from "@gpuixui/data";
import { Toggle, ToggleGroup } from "@gpuixui/primitives";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useMemo, useState } from "react";
import { recipeStyle } from "../recipe.js";
import { statusTone, textStyle, useTheme, type Theme } from "../theme.js";
import {
  filterByLevel,
  isLogLevel,
  levelTone,
  LOG_LEVELS,
  parseLogLine,
  type LogLevel,
} from "./logic.js";
import { LOG_ROW, LOG_TOOLBAR, LOG_VIEWER_ROOT } from "./recipe.js";

/** The width of the level column, so every message starts at the same `x`. */
export const LEVEL_COLUMN_WIDTH = 56;

/** {@link LogViewer} props. */
export interface LogViewerProps extends Omit<Props, "children"> {
  /** The raw log lines, one per row. */
  readonly lines: ReadonlyArray<string>;
  /** A definite viewport height, in pixels. */
  readonly height: number;
  /** The painted height of one row. Defaults to the density's `rowHeight`. */
  readonly rowHeight?: number;
  /** The enabled levels. Omit it to let the viewer hold its own filter. */
  readonly enabledLevels?: ReadonlyArray<LogLevel>;
  /** Reports the enabled levels after every change. */
  readonly onEnabledLevelsChange?: (levels: ReadonlyArray<LogLevel>) => void;
  /** Follow the tail as lines arrive. Omit it to let the viewer hold its own. */
  readonly followTail?: boolean;
  /** Reports the follow state after every change. */
  readonly onFollowTailChange?: (follow: boolean) => void;
  readonly className?: string;
  readonly testId?: string;
}

/** The colour a level's token paints in, resolved from its status tone. */
const levelColour = (theme: Theme, level: LogLevel): string =>
  Option.match(levelTone(level), {
    onNone: () => theme.colors.mutedForeground,
    onSome: (tone) => statusTone(theme, tone).foreground,
  });

/**
 * A virtualized log: a level filter, a follow-tail toggle and the tail-anchored
 * list of parsed lines.
 */
export const LogViewer = ({
  lines,
  height,
  rowHeight: namedRowHeight,
  enabledLevels,
  onEnabledLevelsChange,
  followTail,
  onFollowTailChange,
  className,
  testId,
  style,
  ...rest
}: LogViewerProps) => {
  const theme = useTheme();
  const [heldLevels, setHeldLevels] =
    useState<ReadonlyArray<LogLevel>>(LOG_LEVELS);
  const [heldFollow, setHeldFollow] = useState(true);

  const levels = enabledLevels ?? heldLevels;
  const follow = followTail ?? heldFollow;
  const rowHeight = namedRowHeight ?? theme.density.rowHeight;

  const entries = useMemo(() => Arr.map(lines, parseLogLine), [lines]);
  const visible = useMemo(
    () => filterByLevel(entries, HashSet.fromIterable(levels)),
    [entries, levels],
  );

  const commitLevels = (next: ReadonlyArray<LogLevel>): void => {
    if (enabledLevels === undefined) setHeldLevels(next);
    onEnabledLevelsChange?.(next);
  };

  const commitFollow = (next: boolean): void => {
    if (followTail === undefined) setHeldFollow(next);
    onFollowTailChange?.(next);
  };

  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(LOG_VIEWER_ROOT, className), theme),
        style,
      )}
    >
      <div style={recipeStyle(LOG_TOOLBAR, theme)}>
        <ToggleGroup
          type="multiple"
          size="sm"
          label="Log levels"
          options={Arr.map(LOG_LEVELS, (level) => ({
            value: level,
            label: Str.capitalize(level),
          }))}
          value={levels}
          onValueChange={(next) => commitLevels(Arr.filter(next, isLogLevel))}
        />
        <Toggle size="sm" pressed={follow} onPressedChange={commitFollow}>
          Follow tail
        </Toggle>
      </div>
      <VirtualList
        height={height}
        followTail={follow}
        alignment="bottom"
        testId={testId}
      >
        {visible.map((entry, index) => (
          <div
            key={index}
            style={{
              ...recipeStyle(LOG_ROW, theme),
              height: rowHeight,
            }}
          >
            <text
              style={{
                ...textStyle(theme, "code"),
                color: levelColour(theme, entry.level),
                width: LEVEL_COLUMN_WIDTH,
                flexGrow: 0,
                flexShrink: 0,
                flexBasis: LEVEL_COLUMN_WIDTH,
              }}
            >
              {entry.level}
            </text>
            <text
              style={{
                ...textStyle(theme, "code"),
                color: theme.colors.foreground,
                flexGrow: 1,
                flexShrink: 1,
                flexBasis: 0,
                minWidth: 0,
              }}
            >
              {entry.message}
            </text>
          </div>
        ))}
      </VirtualList>
    </div>
  );
};
