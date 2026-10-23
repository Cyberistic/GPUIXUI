/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import {
  buttonVariants,
  controlStyle,
  surfaceStyle,
  textStyle,
} from "@gpuixui/primitives/core";
import type { Theme } from "@gpuixui/tokens";

/**
 * The screen `/live` mounts through the React reconciler.
 *
 * This is the one page on the site whose pixels come from GPUix: the browser
 * build of the renderer paints them, and `@gpuix/react` decides what to paint.
 * The file carries the reconciler's JSX pragma because its elements are the
 * runtime's own (`div`, `text`), not the DOM's — the rest of the docs app stays
 * on React's DOM runtime.
 *
 * Every `StyleDesc` is resolved by `@gpuixui/primitives/core`, the library's own
 * resolver, so the painted card and action are the recipes the package ships
 * rather than a drawing that resembles them. `liveScreen` is a pure function of
 * its props so Node can hold the tree, its fills and its press handler without a
 * renderer; `liveScene` is the three-line state wrapper the route mounts.
 */

/** The window the screen is laid out in. */
export interface LiveBox {
  readonly width: number;
  readonly height: number;
}

/** The elements the probe samples; `testId` is the automation locator. */
export const liveIds = {
  root: "live-root",
  card: "live-card",
  title: "live-title",
  body: "live-body",
  button: "live-button",
  banner: "live-banner",
  status: "live-status",
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

/** The button's resting fill, the colour the probe samples first. */
export const liveButtonFill = (theme: Theme): string =>
  String(
    controlStyle({ variant: buttonVariants.primary, size: "md" }, theme)
      .backgroundColor,
  );

/** The sentence a press counts; `0` is the state before any press. */
export const liveStatus = (presses: number): string =>
  presses === 0
    ? "Waiting for a press"
    : `Pressed ${presses} ${presses === 1 ? "time" : "times"}`;

const bannerFill = (theme: Theme, presses: number): string =>
  presses === 0 ? liveRestingFill(theme) : livePressedFill(theme);

const bannerStyle = (theme: Theme, presses: number): object => ({
  height: liveBanner.height,
  borderRadius: theme.radius.sm,
  backgroundColor: bannerFill(theme, presses),
});

const cardStyle = (theme: Theme, box: LiveBox): object => ({
  ...surfaceStyle(
    { tone: "card", padding: "lg", radius: "lg", border: true },
    theme,
  ),
  gap: theme.spacing.md,
  width: box.width - theme.spacing["2xl"] * 2,
});

const rootStyle = (theme: Theme, box: LiveBox): object => ({
  width: box.width,
  height: box.height,
  padding: theme.spacing["2xl"],
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.lg,
  backgroundColor: theme.colors.background,
});

export interface LiveScreenProps {
  readonly theme: Theme;
  readonly box: LiveBox;
  readonly presses: number;
  readonly onPress: () => void;
}

/** The screen at one press count, with no state of its own. */
export const LiveScreen = ({
  theme,
  box,
  presses,
  onPress,
}: LiveScreenProps) => (
  <div testId={liveIds.root} style={rootStyle(theme, box)}>
    <div testId={liveIds.card} style={cardStyle(theme, box)}>
      <text
        testId={liveIds.title}
        style={textStyle({ role: "h3", tone: "default" }, theme)}
      >
        A real GPUix frame
      </text>
      <text
        testId={liveIds.body}
        style={textStyle({ role: "body", tone: "muted" }, theme)}
      >
        Painted by the wasm renderer through the React reconciler.
      </text>
      <div
        testId={liveIds.button}
        role="button"
        tabIndex={0}
        style={{
          ...controlStyle(
            { variant: buttonVariants.primary, size: "md" },
            theme,
          ),
          alignSelf: "start",
        }}
        onClick={onPress}
      >
        <text style={textStyle({ role: "label", tone: "inherit" }, theme)}>
          Press me
        </text>
      </div>
      <div testId={liveIds.banner} style={bannerStyle(theme, presses)} />
      <text
        testId={liveIds.status}
        style={textStyle({ role: "caption", tone: "muted" }, theme)}
      >
        {liveStatus(presses)}
      </text>
    </div>
  </div>
);

export interface LiveSceneProps {
  readonly theme: Theme;
  readonly box: LiveBox;
  readonly onPress: (presses: number) => void;
}

/** The mounted scene: the screen plus the count a press moves. */
export function LiveScene({ theme, box, onPress }: LiveSceneProps) {
  const [presses, setPresses] = useState(0);

  const press = (): void => {
    const next = presses + 1;
    setPresses(next);
    onPress(next);
  };

  return (
    <LiveScreen theme={theme} box={box} presses={presses} onPress={press} />
  );
}
