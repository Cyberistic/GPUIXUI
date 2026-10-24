/**
 * Small presentational helpers the scenarios share.
 *
 * `Readout` is the important one: every assertion reads a **number or a string
 * from a readout element**, never a pixel from a screenshot. A readout encodes
 * the state under test as `key=value key=value`.
 *
 * Every colour comes from the theme `ThemeProvider` supplies, so the shell's
 * palette switch re-paints these helpers without a restart.
 */
import type { ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { ENTER_KEY, SPACE_KEY } from "@gpuixui/primitives/core";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";

/**
 * Whether `key` activates a `role="button"` surface here.
 *
 * The two names are the runtime's own (`ENTER_KEY`/`SPACE_KEY`), not the DOM's:
 * GPUix reports the spacebar as `space`, so a comparison against `" "` — the
 * browser spelling — refuses every Space press. Both act on the key **down** in
 * the playground, unlike a library control's key-up rule for Space: the
 * renderer's synthetic key, this shell's only key source, sends a down and no
 * release, and selecting a sidebar row a second time is the same row.
 */
export const isActivationKey = (key: string | undefined): boolean =>
  key === ENTER_KEY || key === SPACE_KEY;

/** A `testId`-addressable string the smoke steps assert against. */
export const Readout = ({
  testId,
  children,
}: {
  readonly testId: string;
  readonly children: ReactNode;
}) => {
  const theme = useTheme();
  return (
    <text
      testId={testId}
      style={{
        ...textStyle(theme, "caption"),
        color: theme.colors.mutedForeground,
      }}
    >
      {children}
    </text>
  );
};

/** Body text in the theme's foreground colour. */
export const Body = ({
  testId,
  children,
}: {
  readonly testId?: string;
  readonly children: ReactNode;
}) => {
  const theme = useTheme();
  return (
    <text
      testId={testId}
      style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
    >
      {children}
    </text>
  );
};

/** A surface with padding and a hairline border. */
export const Panel = ({
  children,
  style,
}: {
  readonly children: ReactNode;
  readonly style?: StyleDesc;
}) => {
  const theme = useTheme();
  return (
    <div
      style={{
        backgroundColor: theme.colors.card,
        borderWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
        padding: theme.spacing.lg,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** A horizontal strip that holds controls. */
export const Toolbar = ({ children }: { readonly children: ReactNode }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    {children}
  </div>
);

/** A one-pixel separator. */
export const Divider = () => {
  const theme = useTheme();
  return (
    <div
      style={{
        height: theme.borderWidth.thin,
        backgroundColor: theme.colors.border,
      }}
    />
  );
};

/** A clickable surface used as a button (GPUix has no `<button>` element). */
export const Pressable = ({
  testId,
  onClick,
  style,
  children,
}: {
  readonly testId: string;
  readonly onClick?: () => void;
  readonly style?: StyleDesc;
  readonly children: ReactNode;
}) => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      tabIndex={0}
      role="button"
      onClick={onClick}
      onKeyDown={(event) => {
        if (!isActivationKey(event.key)) return;
        event.preventDefault();
        onClick?.();
      }}
      style={{
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        cursor: "pointer",
        backgroundColor: theme.colors.muted,
        hover: { backgroundColor: theme.colors.border },
        ...style,
      }}
    >
      {children}
    </div>
  );
};
