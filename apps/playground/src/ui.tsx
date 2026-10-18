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
import type { ReactNode, Ref } from "react";
import type { PublicInstance, StyleDesc } from "@gpuix/react";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";

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
export const Body = ({ children }: { readonly children: ReactNode }) => {
  const theme = useTheme();
  return (
    <text
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
  ref,
  children,
}: {
  readonly testId: string;
  readonly onClick?: () => void;
  readonly style?: StyleDesc;
  /** The host instance, so a scenario can return native focus to this control. */
  readonly ref?: Ref<PublicInstance>;
  readonly children: ReactNode;
}) => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      ref={ref}
      tabIndex={0}
      role="button"
      onClick={onClick}
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
