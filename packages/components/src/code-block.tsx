/**
 * CodeBlock: source, terminal output or a log, highlighted by `@tanstack/highlight`.
 *
 * `@tanstack/highlight` is a pure tokenizer — no DOM, no HTML — so the block
 * feeds it a source and a language id, maps each token class to the token
 * package's syntax role and paints **one `<text>` run per token**, the only
 * coloured-text primitive the runtime has. There is no `code` host behind
 * this: the block owns the highlighting, the line numbers and the horizontal
 * scroll, because the runtime paints text runs, not markup.
 *
 * The block arrives with the house entrance — a fade and a 4 px rise, the same
 * seam every overlay uses — because it is a block a reader meets on arrival. A
 * caller that would rather it simply be there passes `level="none"`, and
 * `MotionProvider preference="reduced"` paints the resting frame at once.
 *
 * The copy action is a **press**, not a clipboard write: `@gpuix/native@0.11.0`
 * publishes no clipboard API (measured; `docs/gpuix-capabilities.md`), so
 * `onCopy` owns the path — usually writing into the read-only field the platform
 * lets a reader copy from — and the block only acknowledges the press through
 * the shared `CopyButton` action.
 */

import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import {
  fadeFrom,
  presenceMotion,
  useMotionPreference,
  useSurfacePresence,
  useSurfaceTiming,
} from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { syntaxColors, textStyle, useTheme } from "./internal/theme.js";
import { CopyButton } from "./copy-button.js";
import { codeLines } from "./code-block/tokenize.js";
import {
  codeBlockDescription,
  codeBlockHeader,
  codeBlockName,
  codeRowCount,
  hasCode,
} from "./code-block/logic.js";

/** The block's resting appearance: a page-filled card with a field's edge. */
const CODE_BLOCK_ROOT =
  "flex flex-col overflow-hidden rounded-lg border border-input bg-background";
/** The header row: the title on the start edge, the language and action on the end. */
const CODE_BLOCK_HEADER =
  "flex flex-row items-center justify-between gap-2 px-3 py-1.5";
/** Header chrome: the file name and the language label share one small mono role. */
const CODE_BLOCK_LABEL = "text-xs font-mono text-muted-foreground";
/** The body's padding; the runs paint inside it. */
const CODE_BLOCK_BODY = "px-3 py-2";
/** The placeholder an empty source paints instead of a bare surface. */
const CODE_BLOCK_EMPTY = "text-sm font-mono text-muted-foreground";
/** The hairline under the header. The runtime has no `border-b` utility. */
const CODE_BLOCK_RULE = "h-px bg-border";

/** How far the block rises as it arrives, in pixels. */
const CODE_BLOCK_RISE = 4;

/** A monospace digit's advance as a share of the code type size. */
const MONO_DIGIT = 0.6;

/** What a code block paints at one frame. */
export interface CodeBlockState {
  /** Whether the source has anything to paint. */
  readonly hasCode: boolean;
  readonly reducedMotion: boolean;
}

/** {@link CodeBlock} props. */
export interface CodeBlockProps extends Omit<Props, "children" | "style"> {
  /** The source to show. Tokenized into runs and split into lines here. */
  readonly code: string;
  /** The header's title. Defaults to `path`; a block with neither paints no title. */
  readonly title?: string;
  /** The file a snippet came from: the fallback title, and its language's hint. */
  readonly path?: string;
  /**
   * The language alias (`"tsx"`, `"rust"`, `"bash"`). Defaults to the path's
   * extension when the tokenizer knows it; anything else paints plain text.
   */
  readonly language?: string;
  /** Number every row from 1 in a gutter the block paints. Default `false`. */
  readonly lineNumbers?: boolean;
  /**
   * Cap the block's height in pixels, scrolling the rows vertically. Omit it and
   * the block paints every line; a long file then wants `ScrollFade` around it.
   */
  readonly height?: number;
  /**
   * The entrance's motion level, or `"none"` to paint at rest. Default
   * `"normal"` (200 ms).
   */
  readonly level?: MotionLevel | "none";
  /** What an empty source paints. Default `"No code"`. */
  readonly emptyLabel?: string;
  /** The copy action's name. Default `"Copy"`. */
  readonly copyLabel?: string;
  /** The name the action carries right after a press. Default `"Copied"`. */
  readonly copiedLabel?: string;
  /**
   * Copy the source. The runtime has no clipboard API, so the caller owns the
   * write; omit the prop and the block paints no copy action at all.
   */
  readonly onCopy?: (code: string) => void;
  /** A Tailwind class string for the card, joined after the recipe so it wins. */
  readonly className?: string;
  /** A style for the card, or a function of the block's state. */
  readonly style?: StateStyle<CodeBlockState>;
}

/**
 * A syntax-highlighted code block with a header, an optional gutter and a copy
 * action.
 *
 * The block is one part: a surface, a header and a column of text-run rows. It
 * publishes a `group` named by its title (or "Code") and described by its line
 * count, because the runs are presentational — a reader cannot read the code
 * itself, only how much of it there is.
 */
export const CodeBlock = ({
  code,
  title,
  path,
  language,
  lineNumbers = false,
  height,
  level = "normal",
  emptyLabel = "No code",
  copyLabel = "Copy",
  copiedLabel = "Copied",
  onCopy,
  className,
  style,
  testId,
  "aria-label": ariaLabel,
  ...rest
}: CodeBlockProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const header = codeBlockHeader({ title, path, language });
  const content = hasCode(code);
  const timing = useSurfaceTiming(level === "none" ? "normal" : level);
  const presence = useSurfacePresence(true, timing);
  const base = testId ?? "code-block";

  const capped = Option.getOrUndefined(
    Option.filter(
      Option.fromNullishOr(height),
      (pixels) => Number.isFinite(pixels) && pixels > 0,
    ),
  );

  const state: CodeBlockState = {
    hasCode: content,
    reducedMotion: preference === "reduced",
  };
  const spansHeader =
    Option.isSome(header.title) ||
    Option.isSome(header.language) ||
    onCopy !== undefined;

  // The palette and the type scale the runs paint in, and the rows themselves.
  const syntax = syntaxColors(theme);
  const metrics = textStyle(theme, "codeBlock");
  const lines = codeLines(
    code,
    Option.getOrElse(header.language, () => ""),
  );
  const gutterWidth =
    Math.ceil(
      String(Math.max(1, lines.length)).length * metrics.fontSize * MONO_DIGIT,
    ) + theme.spacing.sm;

  return (
    <div
      {...rest}
      role="group"
      aria-label={ariaLabel ?? codeBlockName(header)}
      aria-description={codeBlockDescription(
        codeRowCount(code),
        header.language,
      )}
      testId={base}
      motion={
        level === "none"
          ? undefined
          : presenceMotion(fadeFrom("top", CODE_BLOCK_RISE), presence)
      }
      style={mergeStyles(
        mergeStyles(
          { position: "relative" },
          recipeStyle(cn(CODE_BLOCK_ROOT, className), theme),
        ),
        resolveStyle(style, state),
      )}
    >
      {spansHeader ? (
        <>
          <div style={recipeStyle(CODE_BLOCK_HEADER, theme)}>
            {Option.match(header.title, {
              onNone: () => <div />,
              onSome: (name) => (
                <text
                  testId={`${base}-title`}
                  style={recipeStyle(CODE_BLOCK_LABEL, theme)}
                >
                  {name}
                </text>
              ),
            })}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.xs,
              }}
            >
              {Option.match(header.language, {
                onNone: () => null,
                onSome: (name) => (
                  <text
                    testId={`${base}-language`}
                    style={recipeStyle(CODE_BLOCK_LABEL, theme)}
                  >
                    {name}
                  </text>
                ),
              })}
              {onCopy === undefined ? null : (
                <CopyButton
                  testId={`${base}-copy`}
                  size="sm"
                  text={code}
                  onCopy={onCopy}
                  label={copyLabel}
                  copiedLabel={copiedLabel}
                  level={level === "none" ? "none" : "fast"}
                  color={theme.colors.mutedForeground}
                />
              )}
            </div>
          </div>
          <div style={recipeStyle(CODE_BLOCK_RULE, theme)} />
        </>
      ) : null}
      <div style={recipeStyle(CODE_BLOCK_BODY, theme)}>
        {content ? (
          <div
            style={mergeStyles(
              { overflowX: "auto" },
              capped === undefined
                ? undefined
                : { height: capped, overflowY: "scroll" },
            )}
          >
            <div
              testId={`${base}-source`}
              style={{ display: "flex", flexDirection: "column" }}
            >
              {lines.map((line, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    minHeight: metrics.lineHeight,
                  }}
                >
                  {lineNumbers ? (
                    <div
                      style={{
                        width: gutterWidth,
                        flexShrink: 0,
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "flex-end",
                        paddingRight: theme.spacing.sm,
                      }}
                    >
                      <text
                        role="presentation"
                        style={{ ...metrics, color: theme.colors.placeholder }}
                      >
                        {String(index + 1)}
                      </text>
                    </div>
                  ) : null}
                  <div style={{ display: "flex", flexDirection: "row" }}>
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
                </div>
              ))}
            </div>
          </div>
        ) : (
          <text
            testId={`${base}-empty`}
            style={recipeStyle(CODE_BLOCK_EMPTY, theme)}
          >
            {emptyLabel}
          </text>
        )}
      </div>
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const codeBlockMeta = {
  name: "Code block",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the code text is painted as presentational runs, so a reader gets the block's name and line count, not the code",
    "the tokenizer is `@tanstack/highlight`, whose grammar decides which run is a token; the token package's `syntaxColors(theme)` decides the colour — a brand owns the palette by carrying `syntax`, which replaces the table whole",
    "a language the tokenizer does not ship (`@tanstack/highlight` has no `c` grammar, for example) paints plain text, and the gutter width is the block's own estimate, not the runtime's metrics",
    "no per-line highlight, wrap toggle or diff markers — a diff goes to the runtime's `<diff>` host",
    "no clipboard write exists in 0.11.0, so the copy action calls the caller's `onCopy` and acknowledges the press, not a finished write",
    "a capped block scrolls by wheel and scrollbar only; it is not a keyboard scroll region",
  ],
  docs: "docs/code-block.mdx",
  example: "examples/code-block.example.tsx",
  testFile: "src/behaviour/code-block.test.tsx",
} as const;
