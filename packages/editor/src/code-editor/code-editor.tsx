/**
 * CodeEditor: a real `<textarea>` with a read-only highlight layer behind it.
 *
 * The runtime's `<textarea>` owns the caret, the selection, the IME and the
 * paste, so the editor never re-implements text input. It paints two layers in
 * one box: a highlight layer of `@tanstack/highlight` runs (tokenised text plus
 * a line-number gutter) and, on top, the transparent `<textarea>` — the reader
 * sees the highlighted code, the runtime reads the keystrokes.
 *
 * Two runtime gaps limit the overlay (both measured upstream, see
 * `docs/code-editor.mdx`): a `<textarea>` with transparent ink paints no caret,
 * and it reports no scroll offset. The editor therefore states the caret colour
 * through `nativeTextTheme` on the page fill it paints (`"background"`, not a
 * plain control's `"input"`), sizes the box from the highlight layer — the
 * field's own lines, empty ones included — and documents what that cannot reach:
 * the field scrolls inside a box it does not size, so `maxRows` cannot cap it.
 *
 * Tab and Enter are editing decisions, not input re-implementation. In
 * `"insert"` mode Tab swallows the focus traversal and inserts the indent
 * string; Enter keeps the newline and appends the previous line's leading
 * indentation. Without a caret-position API the insert lands at the end of the
 * document, which is correct while typing sequentially and the strongest honest
 * alternative mid-document.
 */

import type { KeyEvent, StyleDesc } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import {
  fieldHelp,
  fieldHint,
  renderFieldHint,
} from "@gpuixui/primitives/hint";
import { accessibleName } from "@gpuixui/primitives/core";
import { cn } from "@gpuixui/tw";
import {
  disabledOpacity,
  nativeTextTheme,
  syntaxColors,
  textStyle,
} from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import { useControllableState } from "../internal/controllable.js";
import { recipeStyle } from "../internal/recipe.js";
import { draftOf } from "../internal/text.js";
import { codeLines, type HighlightRun } from "./highlight.js";
import {
  enterIndent,
  tabIndent,
  tabInserts,
  tabModeOf,
  visibleRows,
  type TabMode,
} from "./logic.js";

/** The editor's resting appearance: a field-edged surface with a gutter. */
const EDITOR_ROOT =
  "relative flex flex-row overflow-hidden rounded-lg border border-input bg-background";
/** The gutter column: right-aligned line numbers in the quiet role. It shares
 * the code column's top edge, so a number sits on the line it numbers. */
const EDITOR_GUTTER =
  "flex flex-col items-end bg-muted text-muted-foreground select-none";
/** The code area: one row per line, the runs painted inside. */
const EDITOR_CODE = "relative flex flex-col flex-grow";

/** A monospace digit's advance as a share of the code type size. */
const MONO_DIGIT = 0.6;

/** What the editor tells a `style` callback. */
export interface CodeEditorState {
  readonly disabled: boolean;
  readonly focused: boolean;
}

/** {@link CodeEditor} props. */
export interface CodeEditorProps {
  /** The controlled text. Omit it to let the editor hold its own draft. A stored value that is not text reads as an empty document. */
  readonly value?: string;
  /** The initial text when uncontrolled. A stored value that is not text reads as an empty document. */
  readonly defaultValue?: string;
  /** Every edit, including Tab and Enter insertions. */
  readonly onValueChange?: (value: string) => void;
  /** The tokenizer's language id (`"tsx"`, `"rust"`). An unknown id, or one that is not text, paints plain text. */
  readonly language?: string;
  /** Number every row in a gutter. Default `true`. */
  readonly lineNumbers?: boolean;
  /** What Tab does: insert indentation, or move focus. Default `"insert"`; a stored name that is neither reads as the default. */
  readonly tabMode?: TabMode;
  /**
   * The string Tab inserts in `"insert"` mode. Default two spaces. An empty
   * string leaves Tab as the platform's traversal, and a value that is not a
   * string reads as the default.
   */
  readonly indent?: string;
  readonly placeholder?: string;
  readonly readOnly?: boolean;
  /** Not editable, out of the tab order, painted with the disabled chrome. */
  readonly disabled?: boolean;
  /** Minimum visible rows. The highlight layer is what sizes the editor, so it paints the floor as empty rows. */
  readonly minRows?: number;
  /** Rows after which the field scrolls. The highlight layer cannot follow a scroll (the runtime reports no offset), so it paints every line and the surface grows with the document. */
  readonly maxRows?: number;
  readonly fullWidth?: boolean;
  /** Accessible name. Default `"Code editor"`; a blank name reads as the default. */
  readonly label?: string;
  /** A Tailwind class string for the surface, joined after the recipe so it wins. */
  readonly className?: string;
  /** A style, or a function of the editor's state. */
  readonly style?: StateStyle<CodeEditorState>;
  readonly testId?: string;
}

/**
 * A highlighted, editable code surface.
 *
 * The highlight layer is presentational (`role="presentation"` runs); the
 * `<textarea>` is the named, focusable editor. The two share one scroll
 * surface, so a reader scrolls the code and its highlight together.
 */
export const CodeEditor = ({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  language,
  lineNumbers = true,
  tabMode = "insert",
  indent = "  ",
  placeholder,
  readOnly = false,
  disabled = false,
  minRows,
  maxRows,
  fullWidth = false,
  label,
  className,
  style,
  testId = "code-editor",
}: CodeEditorProps) => {
  const theme = useTheme();
  // A blank name is an absence: an unnamed field is worse than the default, and
  // a label restored from an i18n table with a missing row arrives blank.
  const name = accessibleName(label) ?? "Code editor";
  const [value, setValue] = useControllableState({
    // A draft restored from storage may not be text at all; it reads as an
    // empty document rather than throwing out of the tokenizer and the gutter.
    // An absent controlled value still means "uncontrolled".
    value: valueProp === undefined ? undefined : draftOf(valueProp),
    defaultValue: draftOf(defaultValue),
    onChange: onValueChange,
  });
  const [focused, setFocused] = useState(false);
  // A tab mode is a saved preference as often as a literal: a name this release
  // does not carry reads as the documented `"insert"`, so a stored mode cannot
  // quietly turn the editor into a Tab trap's opposite (focus moving out of the
  // field while the prop says Tab inserts).
  const mode = tabModeOf(tabMode);

  const syntax = syntaxColors(theme);
  const metrics = textStyle(theme, "codeBlock");
  const lines = codeLines(value, language);
  // The layer is the editor's box (the field is absolutely positioned over it),
  // so it paints the field's own lines — the empty line of an empty document,
  // the caret's line after Enter — and the caller's `minRows` floor as blanks.
  const body = visibleRows(Arr.length(lines), minRows) - Arr.length(lines);
  const rows = Arr.appendAll(
    lines,
    Arr.take(Arr.replicate(Arr.empty<HighlightRun>(), body), body),
  );
  const gutterWidth =
    Math.ceil(
      String(Math.max(1, Arr.length(rows))).length *
        metrics.fontSize *
        MONO_DIGIT,
    ) + theme.spacing.sm;
  const state: CodeEditorState = { disabled, focused };

  const edit = (next: string): void => {
    if (!readOnly && !disabled) setValue(next);
  };

  /**
   * The host consumes Enter itself, so the auto-indent is read off the change
   * it reports: a value that only gained the newline at its end is an Enter at
   * the document's end, and it inherits the previous line's indentation.
   */
  const onChange = (next: string): void =>
    edit(next === `${value}\n` ? `${next}${enterIndent(value)}` : next);

  const onKeyDown = (event: KeyEvent): void => {
    if (readOnly || disabled) return;
    const indentText = tabIndent(indent);
    if (event.key === "tab" && tabInserts(mode, indentText)) {
      event.preventDefault();
      setValue(value + indentText);
    }
  };

  const fieldStyle: StyleDesc = {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    color: "transparent",
    backgroundColor: "transparent",
    fontSize: metrics.fontSize,
    lineHeight: metrics.lineHeight,
    fontFamily: metrics.fontFamily,
    fontWeight: metrics.fontWeight,
  };
  // The host shapes its own placeholder in a fixed grey no token reaches, so
  // the editor paints the hint in the measured `placeholder` role.
  const hint = fieldHint({ placeholder, disabled }, theme, value, {
    origin: "host",
    align: "top",
    style: fieldStyle,
  });
  const help = fieldHelp({ placeholder }, value);

  return (
    <div
      testId={`${testId}-surface`}
      style={mergeStyles(
        mergeStyles(
          mergeStyles(recipeStyle(cn(EDITOR_ROOT, className), theme), {
            width: fullWidth ? "100%" : undefined,
          }),
          disabled ? { opacity: disabledOpacity } : {},
        ),
        resolveStyle(style, state),
      )}
    >
      {lineNumbers ? (
        <div
          style={mergeStyles(recipeStyle(EDITOR_GUTTER, theme), {
            width: gutterWidth,
            flexShrink: 0,
          })}
        >
          {rows.map((_, index) => (
            <text
              key={index}
              role="presentation"
              style={{
                ...metrics,
                color: theme.colors.mutedForeground,
                textAlign: "right",
                paddingRight: theme.spacing.sm,
              }}
            >
              {String(index + 1)}
            </text>
          ))}
        </div>
      ) : null}
      <div style={recipeStyle(EDITOR_CODE, theme)}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {rows.map((line, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                flexDirection: "row",
                minHeight: metrics.lineHeight,
              }}
            >
              {line.map((run, runIndex) => (
                <text
                  key={runIndex}
                  role="presentation"
                  style={{
                    ...metrics,
                    color:
                      run.role === undefined
                        ? theme.colors.foreground
                        : syntax[run.role],
                    whiteSpace: "nowrap",
                  }}
                >
                  {run.text}
                </text>
              ))}
            </div>
          ))}
        </div>
        <textarea
          testId={testId}
          theme={nativeTextTheme(theme, "background")}
          aria-label={name}
          {...(help === undefined ? {} : { "aria-description": help })}
          value={value}
          readOnly={readOnly || disabled}
          tabIndex={disabled ? -1 : 0}
          minRows={minRows}
          maxRows={maxRows}
          style={fieldStyle}
          onChange={(event) => onChange(event.value ?? "")}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {Option.match(hint, {
          onNone: () => null,
          onSome: (painted) => renderFieldHint(painted, testId),
        })}
      </div>
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` by the owning workstream. */
export const codeEditorMeta = {
  name: "Code editor",
  tier: 4,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "a textarea with transparent ink paints no caret, and it reports no scroll offset (measured; gpuix-capabilities.md §Editable highlighted overlay), so the overlay is a highlight layer over a native field, not a positional editor",
    "Tab insert and Enter auto-indent append at the end of the document — the runtime exposes no caret position to insert at",
    "the two layers align by the codeBlock type scale in one box sized by the highlight layer; pixel-exact alignment is not verified without a native host",
    "maxRows cannot cap the editor's height: the layer cannot follow the field's internal scroll, because the runtime reports no scroll offset",
  ],
  docs: "docs/code-editor.mdx",
  example: "examples/code-editor.example.tsx",
  testFile: "src/code-editor/highlight.test.ts",
} as const;
