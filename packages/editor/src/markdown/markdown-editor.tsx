/**
 * `MarkdownEditor`: markdown **source** on the left and its rendered preview on
 * the right, with a source-only and a preview-only view.
 *
 * The runtime has no editable rich-text host. `<textarea>` is the only editable
 * element, it paints plain text, and it reports neither a caret position nor a
 * selection (measured by `editor-overlay`: an overlay field is pixel-identical
 * to the code alone, and no caret is painted), so a toolbar cannot wrap a
 * selection and a WYSIWYG surface cannot be composed. This editor is the
 * strongest honest alternative: the reader writes markdown, and the same value
 * renders through the runtime's `<markdown>` host beside it.
 *
 * An unclosed fence is closed in the **preview only** — the source keeps every
 * character the reader typed (`markdown/logic.ts`).
 */

import type { StyleDesc } from "@gpuix/react";
import type { ReactElement } from "react";
import { mergeStyles } from "@gpuix/react/floating";
import { DIVIDER_WIDTH, SplitPane } from "@gpuixui/dock";
import { accessibleName, Button, ScrollArea } from "@gpuixui/primitives";
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

/** The view a mode button asks for. */
const MODE_LABELS: Readonly<Record<MarkdownMode, string>> = {
  split: "Split",
  source: "Source",
  preview: "Preview",
};

/** {@link MarkdownEditor} props. */
export interface MarkdownEditorProps {
  /** The controlled markdown. Omit it to let the editor hold its own draft. */
  readonly value?: string;
  /** The initial markdown when uncontrolled. */
  readonly defaultValue?: string;
  /** Every edit. */
  readonly onValueChange?: (value: string) => void;
  /** The controlled view; `undefined` means uncontrolled. */
  readonly mode?: MarkdownMode;
  /** The uncontrolled starting view. Default `"split"`. */
  readonly defaultMode?: MarkdownMode;
  /** Reports every accepted view change, in both modes. */
  readonly onModeChange?: (mode: MarkdownMode) => void;
  /** The editor's accessible name. Default `"Markdown editor"`; a blank name reads as the default. */
  readonly label?: string;
  /** Shown while the source is empty. */
  readonly placeholder?: string;
  /** The body's height in points. Default `280`. */
  readonly height?: number;
  /** The editor's width in points. Default `640`. */
  readonly width?: number;
  /** The split's source-pane size in points. Controlled. */
  readonly splitSize?: number;
  /** The uncontrolled starting source-pane size. Default half the body. */
  readonly defaultSplitSize?: number;
  /** Reports the source pane's size after a divider drag or key. */
  readonly onSplitSizeChange?: (size: number) => void;
  /** Editable or read-only. A read-only editor keeps its tab stop. */
  readonly readOnly?: boolean;
  /** Not editable, out of the tab order, painted with the disabled chrome. */
  readonly disabled?: boolean;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly style?: StyleDesc;
  readonly testId?: string;
}

const DEFAULT_HEIGHT = 280;
const DEFAULT_WIDTH = 640;
const DEFAULT_LABEL = "Markdown editor";

const bodyHeight = (height: number): number =>
  Number.isFinite(height) && height > 0 ? height : DEFAULT_HEIGHT;

/** A source pane: a code-styled `<textarea>` the runtime edits directly. */
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

/** A markdown source editor with its rendered preview beside it. */
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
  // A label arrives from an i18n table or a saved record as often as it is a
  // literal, so a blank one is an absence: every part derives its name from it,
  // and a blank prefix would publish " source", " preview" and " split".
  const name = accessibleName(label) ?? DEFAULT_LABEL;
  const [source, setSource] = useControllableState({
    // A draft restored from storage may not be text at all; it reads as an empty
    // document rather than throwing out of the status line and the preview. An
    // absent controlled value still means "uncontrolled".
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

  // 0.11.0 shapes a host placeholder in a fixed grey no token reaches, so the
  // source field paints the hint itself in the measured `placeholder` role.
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
          // The runtime shapes an unthemed host from its built-in dark palette,
          // so the source pane's caret and selection wash follow the active
          // theme only when the host is handed the seam.
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

/** The view ids, for a consumer that persists the reader's choice. */
export { MARKDOWN_MODES };
