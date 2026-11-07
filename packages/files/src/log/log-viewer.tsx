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
  LEVEL_COLUMN_WIDTH,
  LOG_LEVELS,
  parseLogLine,
  type LogLevel,
} from "./logic.js";
import { LOG_ROW, LOG_TOOLBAR, LOG_VIEWER_ROOT } from "./recipe.js";

export interface LogViewerProps extends Omit<Props, "children"> {
  readonly lines: ReadonlyArray<string>;

  readonly height: number;

  readonly rowHeight?: number;

  readonly enabledLevels?: ReadonlyArray<LogLevel>;

  readonly onEnabledLevelsChange?: (levels: ReadonlyArray<LogLevel>) => void;

  readonly followTail?: boolean;

  readonly onFollowTailChange?: (follow: boolean) => void;
  readonly className?: string;
  readonly testId?: string;
}

const levelColour = (theme: Theme, level: LogLevel): string =>
  Option.match(levelTone(level), {
    onNone: () => theme.colors.mutedForeground,
    onSome: (tone) => statusTone(theme, tone).foreground,
  });

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
