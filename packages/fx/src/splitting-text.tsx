/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import type { StaggerFrom } from "@gpuixui/motion/timeline";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import { useEffect } from "react";
import {
  send,
  useLocalState,
  useLocalStore,
  delayedTiming,
  useSurfaceTiming,
  recipeStyle,
  textOf,
  textStyle,
  useTheme,
  type TextRole,
} from "@gpuixui/components/authoring";
import { offsetOf, type SplitMode } from "./splitting-text/logic.js";
import { makeSplittingStore } from "./splitting-text/store.js";

export interface SplittingTextState {
  readonly text: string;

  readonly units: number;
  readonly reducedMotion: boolean;
}

export interface SplittingTextProps extends Omit<Props, "children" | "style"> {
  readonly text: string;

  readonly split?: SplitMode;

  readonly stepMs?: number;

  readonly from?: StaggerFrom;

  readonly offset?: number;

  readonly role?: TextRole;

  readonly className?: string;

  readonly style?: StateStyle<SplittingTextState>;
}

export const SplittingText = ({
  text,
  split = "words",
  stepMs,
  from = "start",
  offset,
  role = "body",
  className,
  style,
  ...rest
}: SplittingTextProps) => {
  const theme = useTheme();
  const timing = useSurfaceTiming("normal");

  const phrase = textOf(text);
  const store = useLocalStore(
    makeSplittingStore({ text: phrase, split, stepMs, from }),
  );
  const reveal = useLocalState(store.local);

  useEffect(() => {
    send(store.show({ text: phrase, split, stepMs, from }));
  }, [store, phrase, split, stepMs, from]);

  const rise = offsetOf(Option.fromNullishOr(offset));
  const metrics = textStyle(theme, role);
  const state: SplittingTextState = {
    text: reveal.text,
    units: reveal.units,
    reducedMotion: timing.enter.duration === 0,
  };

  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(className), theme), {
          display: "flex",
          flexDirection: "column",
        }),
        resolveStyle(style, state),
      )}
    >
      {reveal.lines.map((line) => (
        <div
          key={line.key}
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "baseline",

            columnGap:
              split === "words" ? Math.round(metrics.fontSize * 0.3) : 0,
          }}
        >
          {line.units.map((unit) => (
            <text
              key={unit.key}
              motion={{
                initial: { opacity: 0, top: rise },
                animate: { opacity: 1, top: 0 },
                transition: delayedTiming(timing.enter, unit.delayMs),
              }}
              style={{
                position: "relative",
                ...metrics,
                color: theme.colors.foreground,
              }}
            >
              {unit.text}
            </text>
          ))}
        </div>
      ))}
    </div>
  );
};

export const splittingTextMeta = {
  name: "Splitting text",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the runtime cannot animate one text node, so every unit is its own host",
    "no transform: a unit fades and rises on a relative top offset",
    "no aria-hidden in 0.11.0, so assistive technology hears the split units in order",
  ],
  docs: "docs/splitting-text.mdx",
  example: "examples/splitting-text.example.tsx",
  testFile: "src/behaviour/splitting-text.test.tsx",
} as const;
