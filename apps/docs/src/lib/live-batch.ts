/**
 * The mutation batch the live GPUix surface paints, and nothing that touches a
 * browser.
 *
 * `/live` is the one page where the docs show a **real** GPUix frame: the wasm
 * build of the renderer paints it, so the pixels come from `@gpuix/native`
 * rather than from a DOM reproduction. The React reconciler is not what drives
 * that renderer yet (see `docs/preview-strategy.md` §The live surface), so the
 * page feeds the renderer the same closed mutation protocol the reconciler
 * does. The styles are not written here: every element takes its `StyleDesc`
 * from `@gpuixui/primitives/core`, which is the library's own resolver, so the
 * painted button is the recipe the package ships.
 *
 * This module is pure so the batch can be read, asserted and diffed in Node:
 * the numbers below are the library's, not a screenshot's.
 */
import {
  buttonVariants,
  controlStyle,
  surfaceStyle,
  textStyle,
} from "@gpuixui/primitives/core";
import type { Theme } from "@gpuixui/tokens";

/** The window the batch is laid out in. */
export interface LiveBox {
  readonly width: number;
  readonly height: number;
}

/** One mutation, in the protocol `applyBatch` takes. */
export type LiveOp = ReadonlyArray<string | number | boolean | object>;

/** The elements the page samples and updates after a press. */
export const liveIds = {
  root: 1,
  card: 2,
  title: 3,
  body: 4,
  button: 5,
  buttonLabel: 6,
  status: 7,
  banner: 8,
} as const;

/** The banner's box, in the card's own coordinate space. */
export const liveBanner = {
  height: 24,
} as const;

/** The banner's resting fill: the neutral strip a message sits on. */
export const liveRestingFill = (theme: Theme): string => theme.colors.muted;

/** The banner's fill after a press, so the probe can hold a pixel to it. */
export const livePressedFill = (theme: Theme): string =>
  theme.colors.successSoft;

const bannerStyle = (theme: Theme, fill: string): object => ({
  height: liveBanner.height,
  borderRadius: theme.radius.sm,
  backgroundColor: fill,
});

/** The button's resting fill, the colour the probe samples first. */
export const liveButtonFill = (theme: Theme): string =>
  String(
    controlStyle({ variant: buttonVariants.primary, size: "md" }, theme)
      .backgroundColor,
  );

/**
 * The first screen.
 *
 * A card with a title, a sentence, a filled action and a status line — the
 * smallest composition that still shows a real control rather than a coloured
 * rectangle. The button carries a `click` listener so a press repaints through
 * the renderer's own event path.
 */
export const liveScene = (
  theme: Theme,
  box: LiveBox,
): ReadonlyArray<LiveOp> => {
  const card = surfaceStyle(
    { tone: "card", padding: "lg", radius: "lg", border: true },
    theme,
  );

  return [
    ["createElement", liveIds.root, "div"],
    [
      "setStyle",
      liveIds.root,
      {
        width: box.width,
        height: box.height,
        padding: theme.spacing["2xl"],
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
        backgroundColor: theme.colors.background,
      },
    ],
    ["createElement", liveIds.card, "div"],
    [
      "setStyle",
      liveIds.card,
      {
        ...card,
        gap: theme.spacing.md,
        width: box.width - theme.spacing["2xl"] * 2,
      },
    ],
    ["createElement", liveIds.title, "text"],
    ["setText", liveIds.title, "A real GPUix frame"],
    [
      "setStyle",
      liveIds.title,
      textStyle({ role: "h3", tone: "default" }, theme),
    ],
    ["createElement", liveIds.body, "text"],
    [
      "setText",
      liveIds.body,
      "Painted by the wasm renderer, styled by @gpuixui/primitives.",
    ],
    [
      "setStyle",
      liveIds.body,
      textStyle({ role: "body", tone: "muted" }, theme),
    ],
    ["createElement", liveIds.button, "div"],
    [
      "setStyle",
      liveIds.button,
      {
        ...controlStyle({ variant: buttonVariants.primary, size: "md" }, theme),
        alignSelf: "start",
      },
    ],
    ["setEventListener", liveIds.button, "click", true],
    ["createElement", liveIds.buttonLabel, "text"],
    ["setText", liveIds.buttonLabel, "Press me"],
    [
      "setStyle",
      liveIds.buttonLabel,
      textStyle({ role: "label", tone: "inherit" }, theme),
    ],
    ["appendChild", liveIds.button, liveIds.buttonLabel],
    ["createElement", liveIds.banner, "div"],
    ["setStyle", liveIds.banner, bannerStyle(theme, liveRestingFill(theme))],
    ["createElement", liveIds.status, "text"],
    ["setText", liveIds.status, "Waiting for a press"],
    [
      "setStyle",
      liveIds.status,
      textStyle({ role: "caption", tone: "muted" }, theme),
    ],
    ["appendChild", liveIds.card, liveIds.title],
    ["appendChild", liveIds.card, liveIds.body],
    ["appendChild", liveIds.card, liveIds.button],
    ["appendChild", liveIds.card, liveIds.banner],
    ["appendChild", liveIds.card, liveIds.status],
    ["appendChild", liveIds.root, liveIds.card],
    ["setRoot", liveIds.root],
  ];
};

/** The batch a press applies: the banner turns success, the status counts. */
export const livePressBatch = (
  theme: Theme,
  presses: number,
): ReadonlyArray<LiveOp> => [
  ["setStyle", liveIds.banner, bannerStyle(theme, livePressedFill(theme))],
  [
    "setText",
    liveIds.status,
    `Pressed ${presses} ${presses === 1 ? "time" : "times"}`,
  ],
];
