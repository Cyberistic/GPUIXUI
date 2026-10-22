/**
 * CodeBlock: source, terminal output or a log in the runtime's own code host.
 *
 * `<code>` is a native text host. It highlights the source from its own
 * tree-sitter grammar, numbers the rows, lays every line out at one height and
 * scrolls horizontally by itself, so this package does not re-implement any of
 * that. The host paints **no surface of its own** — no fill, border, radius,
 * padding or language header — so `CodeBlock` owns the card around it, and hands
 * the host the palette the token package maps (`nativeTextTheme`): the code ink,
 * the gutter's ink and the block's type scale are the roles the contrast
 * contract measures on the page fill the block paints.
 *
 * The block arrives with the house entrance — a fade and a 4 px rise, the same
 * seam every overlay uses — because it is a block a reader meets on arrival. A
 * caller that would rather it simply be there passes `level="none"`, and
 * `MotionProvider preference="reduced"` paints the resting frame at once.
 *
 * The copy action is a **press**, not a clipboard write: `@gpuix/native@0.11.0`
 * publishes no clipboard API (measured; `docs/gpuix-capabilities.md`), so
 * `onCopy` owns the path — usually writing into the read-only field the platform
 * lets a reader copy from — and the block only acknowledges the press.
 */

import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import type { MotionLevel } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import { useEffect, useRef, useState } from "react";
import {
  fadeFrom,
  presenceMotion,
  useMotionPreference,
  useSurfacePresence,
  useSurfaceTiming,
} from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { IconButton } from "./internal/button.js";
import { nativeTextTheme, useTheme } from "./internal/theme.js";
import {
  codeBlockDescription,
  codeBlockHeader,
  codeBlockName,
  codeRowCount,
  copyAcknowledgementMs,
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
/** The body's padding; the code host paints none of its own. */
const CODE_BLOCK_BODY = "px-3 py-2";
/** The placeholder an empty source paints instead of a bare surface. */
const CODE_BLOCK_EMPTY = "text-sm font-mono text-muted-foreground";
/** The hairline under the header. The runtime has no `border-b` utility. */
const CODE_BLOCK_RULE = "h-px bg-border";

/** How far the block rises as it arrives, in pixels. */
const CODE_BLOCK_RISE = 4;

/** What a code block paints at one frame. */
export interface CodeBlockState {
  /** Whether the source has anything to paint. */
  readonly hasCode: boolean;
  /** Whether the copy action is showing its acknowledgement. */
  readonly acknowledged: boolean;
  readonly reducedMotion: boolean;
}

/** {@link CodeBlock} props. */
export interface CodeBlockProps extends Omit<Props, "children" | "style"> {
  /** The source to show. Lines are split, numbered and highlighted by the host. */
  readonly code: string;
  /** The header's title. Defaults to `path`; a block with neither paints no title. */
  readonly title?: string;
  /** The file a snippet came from: the fallback title, and its language's hint. */
  readonly path?: string;
  /**
   * The language alias (`"tsx"`, `"rust"`, `"bash"`). Defaults to the path's
   * extension when the host is known to highlight it.
   */
  readonly language?: string;
  /** Number every row from 1 in the gutter. Default `false`. */
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
 * The block is one part: a surface, a header and the runtime's code host. It
 * publishes a `group` named by its title (or "Code") and described by its line
 * count, because the host paints its own text and exposes no accessible node of
 * its own.
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
  const [acknowledged, setAcknowledged] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const base = testId ?? "code-block";

  useEffect(
    () => () => {
      if (timer.current !== undefined) clearTimeout(timer.current);
    },
    [],
  );

  const copy = (): void => {
    onCopy?.(code);
    setAcknowledged(true);
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => setAcknowledged(false),
      copyAcknowledgementMs,
    );
  };

  const capped = Option.getOrUndefined(
    Option.filter(
      Option.fromNullishOr(height),
      (pixels) => Number.isFinite(pixels) && pixels > 0,
    ),
  );

  const state: CodeBlockState = {
    hasCode: content,
    acknowledged,
    reducedMotion: preference === "reduced",
  };
  const spansHeader =
    Option.isSome(header.title) ||
    Option.isSome(header.language) ||
    onCopy !== undefined;

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
                <IconButton
                  testId={`${base}-copy`}
                  size="sm"
                  label={acknowledged ? copiedLabel : copyLabel}
                  onClick={copy}
                >
                  <Icon
                    name={acknowledged ? "check" : "copy"}
                    size="sm"
                    color={theme.colors.mutedForeground}
                  />
                </IconButton>
              )}
            </div>
          </div>
          <div style={recipeStyle(CODE_BLOCK_RULE, theme)} />
        </>
      ) : null}
      <div style={recipeStyle(CODE_BLOCK_BODY, theme)}>
        {content ? (
          <div
            style={
              capped === undefined
                ? {}
                : { height: capped, overflowY: "scroll" }
            }
          >
            <code
              testId={`${base}-source`}
              code={code}
              language={Option.getOrUndefined(header.language)}
              path={Option.getOrUndefined(header.title)}
              showLineNumbers={lineNumbers}
              // The page fill is what the block paints, so the host's ink, gutter
              // and type scale are the pairs the contrast contract measures there.
              theme={nativeTextTheme(theme, "background")}
              style={{ width: "100%" }}
            />
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
    "the source is painted by the runtime's `<code>` host, whose text publishes no accessible node: a reader gets the block's name and line count, not the code",
    "syntax colours are the runtime's built-in light/dark syntax palette; no token group owns them yet",
    "no per-line highlight, wrap toggle or diff markers through the host's API — a diff goes to the runtime's `<diff>` host",
    "no clipboard write exists in 0.11.0, so the copy action calls the caller's `onCopy` and acknowledges the press, not a finished write",
    "a capped block scrolls by wheel and scrollbar only; it is not a keyboard scroll region",
  ],
  docs: "docs/code-block.mdx",
  example: "examples/code-block.example.tsx",
  testFile: "src/behaviour/code-block.test.tsx",
} as const;
