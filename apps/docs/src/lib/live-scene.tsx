/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import {
  buttonVariants,
  controlStyle,
  surfaceStyle,
  textStyle,
} from "@gpuixui/primitives/core";
import type { Theme } from "@gpuixui/tokens";

export interface LiveBox {
  readonly width: number;
  readonly height: number;
}

export const liveIds = {
  root: "live-root",
  card: "live-card",
  title: "live-title",
  body: "live-body",
  button: "live-button",
  banner: "live-banner",
  status: "live-status",
} as const;

export const liveBanner = {
  height: 24,
} as const;

export const liveRestingFill = (theme: Theme): string => theme.colors.muted;

export const livePressedFill = (theme: Theme): string =>
  theme.colors.successSoft;

export const liveButtonFill = (theme: Theme): string =>
  String(
    controlStyle({ variant: buttonVariants.primary, size: "md" }, theme)
      .backgroundColor,
  );

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
