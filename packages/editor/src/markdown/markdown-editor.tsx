/** @jsxImportSource @gpuix/react */
import type { StyleDesc } from "@gpuix/react";
import type { ReactElement } from "react";
import { mergeStyles } from "@gpuix/react/floating";
import { DIVIDER_WIDTH, SplitPane } from "@gpuixui/dock";
import { Button, ScrollArea } from "@gpuixui/primitives";
import {
  fieldHelp,
  fieldHint,
  hintHost,
  renderFieldHint,
} from "@gpuixui/primitives/hint";
import { disabledOpacity, nativeTextTheme, textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import { useControllableState } from "../internal/controllable.js";
import { recipeStyle } from "../internal/recipe.js";
import { labelOf } from "../internal/text.js";
import {
  closeFences,
  draftOf,
  MARKDOWN_MODES,
  markdownStats,
  modeOf,
  splitBounds,
  splitOf,
  statsLabel,
  type MarkdownMode,
} from "./logic.js";

const EDITOR_ROOT =
  "flex flex-col overflow-hidden rounded-lg border border-input bg-background";
const TOOLBAR = "flex flex-row items-center gap-2 border-b border-border px-3";
const BODY = "flex flex-row min-h-0";
const SOURCE_VIEW = "flex flex-col flex-grow min-w-0";
const PREVIEW_VIEW = "flex flex-col flex-grow min-w-0";

const MODE_LABELS: Readonly<Record<MarkdownMode, string>> = {
  split: "Split",
  source: "Source",
  preview: "Preview",
};

export interface MarkdownEditorProps {
  readonly value?: string;

  readonly defaultValue?: string;

  readonly onValueChange?: (value: string) => void;

  readonly mode?: MarkdownMode;

  readonly defaultMode?: MarkdownMode;

  readonly onModeChange?: (mode: MarkdownMode) => void;

  readonly label?: string;

  readonly placeholder?: string;

  readonly height?: number;

  readonly width?: number;

  readonly splitSize?: number;

  readonly defaultSplitSize?: number;

  readonly onSplitSizeChange?: (size: number) => void;

  readonly readOnly?: boolean;

  readonly disabled?: boolean;

  readonly className?: string;
  readonly style?: StyleDesc;
  readonly testId?: string;
}

const DEFAULT_HEIGHT = 280;
const DEFAULT_WIDTH = 640;
const DEFAULT_LABEL = "Markdown editor";

const bodyHeight = (height: number): number =>
  Number.isFinite(height) && height > 0 ? height : DEFAULT_HEIGHT;

const sourceStyle = (
  theme: ReturnType<typeof useTheme>,
  width: number,
  height: number,
): StyleDesc => ({
  width,
  height,
  padding: theme.spacing.md,
  backgroundColor: theme.colors.background,
  color: theme.colors.foreground,
  borderWidth: 0,
});

export const MarkdownEditor = ({
  value,
  defaultValue = "",
  onValueChange,
  mode: modeProp,
  defaultMode,
  onModeChange,
  label,
  placeholder,
  height = DEFAULT_HEIGHT,
  width = DEFAULT_WIDTH,
  splitSize,
  defaultSplitSize,
  onSplitSizeChange,
  readOnly = false,
  disabled = false,
  className,
  style,
  testId,
}: MarkdownEditorProps) => {
  const theme = useTheme();

  const name = labelOf(label, DEFAULT_LABEL);
  const [source, setSource] = useControllableState({
    value: value === undefined ? undefined : draftOf(value),
    defaultValue: draftOf(defaultValue),
    onChange: onValueChange,
  });
  const [mode, setMode] = useControllableState({
    value: modeProp,
    defaultValue: modeOf(defaultMode),
    onChange: onModeChange,
  });
  const view = modeOf(mode);
  const body = bodyHeight(height);
  const total = Number.isFinite(width) && width > 0 ? width : DEFAULT_WIDTH;
  const available = Math.max(0, total - DIVIDER_WIDTH);
  const split = splitBounds(available);
  const [splitAt, setSplitAt] = useControllableState({
    value: splitSize,
    defaultValue: defaultSplitSize ?? Math.floor(available / 2),
    onChange: onSplitSizeChange,
  });
  const splitWidth = splitOf(splitAt, available);
  const paneWidth = view === "split" ? splitWidth : total;
  const stats = markdownStats(source);
  const showsSource = view !== "preview";
  const showsPreview = view !== "source";
  const help = fieldHelp({ placeholder }, source);

  const sourcePane = (width: number): ReactElement => {
    const chrome = sourceStyle(theme, width, body);
    const hint = fieldHint({ placeholder, disabled }, theme, source, {
      origin: "host",
      align: "top",
      style: chrome,
    });
    return (
      <div
        style={mergeStyles(
          recipeStyle(SOURCE_VIEW, theme),
          hintHost({ width }),
        )}
      >
        <textarea
          value={source}
          onChange={(event) => {
            if (!readOnly && !disabled) setSource(event.value ?? "");
          }}
          theme={nativeTextTheme(theme, "background")}
          aria-label={`${name} source`}
          aria-description={help ?? "Markdown source"}
          readOnly={readOnly || disabled}
          tabIndex={disabled ? -1 : 0}
          testId="markdown-source"
          style={chrome}
        />
        {Option.match(hint, {
          onNone: () => null,
          onSome: (painted) => renderFieldHint(painted, "markdown-source"),
        })}
      </div>
    );
  };

  const previewPane = (width?: number): ReactElement => (
    <div
      style={mergeStyles(
        recipeStyle(PREVIEW_VIEW, theme),
        width === undefined ? {} : { width },
      )}
    >
      <ScrollArea
        axis="vertical"
        focusable={!disabled}
        label={`${name} preview`}
        testId="markdown-preview"
        viewportTestId="markdown-preview-viewport"
        padding="sm"
        style={{ height: body }}
      >
        {source.trim() === "" ? (
          <text
            testId="markdown-empty"
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.mutedForeground,
            }}
          >
            Nothing to preview yet.
          </text>
        ) : (
          <markdown
            testId="markdown-rendered"
            source={closeFences(source)}
            theme={nativeTextTheme(theme, "background")}
            style={{ color: theme.colors.foreground }}
          />
        )}
      </ScrollArea>
    </div>
  );

  return (
    <div
      testId={testId}
      style={mergeStyles(
        mergeStyles(
          mergeStyles(recipeStyle(cn(EDITOR_ROOT, className), theme), {
            width: total,
          }),
          disabled ? { opacity: disabledOpacity } : {},
        ),
        style,
      )}
    >
      <div style={recipeStyle(TOOLBAR, theme)}>
        {MARKDOWN_MODES.map((candidate) => (
          <Button
            key={candidate}
            variant={view === candidate ? "secondary" : "ghost"}
            size="sm"
            label={MODE_LABELS[candidate]}
            testId={`markdown-mode-${candidate}`}
            aria-selected={view === candidate}
            disabled={disabled}
            onActivate={() => setMode(candidate)}
          >
            {MODE_LABELS[candidate]}
          </Button>
        ))}
        <div style={{ flexGrow: 1 }} />
        <text
          testId="markdown-stats"
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          {statsLabel(stats)}
        </text>
      </div>
      <div style={recipeStyle(BODY, theme)}>
        {showsSource && showsPreview ? (
          <SplitPane
            size={splitWidth}
            min={split.min}
            max={split.max}
            onResize={setSplitAt}
            disabled={disabled}
            dividerLabel={`${name} split`}
            testId={testId === undefined ? undefined : `${testId}-split`}
            first={sourcePane(splitWidth)}
            second={previewPane()}
          />
        ) : showsSource ? (
          sourcePane(paneWidth)
        ) : showsPreview ? (
          previewPane(paneWidth)
        ) : null}
      </div>
    </div>
  );
};

export { MARKDOWN_MODES };
