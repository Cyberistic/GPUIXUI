import type { ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { ENTER_KEY, SPACE_KEY } from "@gpuixui/primitives/core";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";

export const isActivationKey = (key: string | undefined): boolean =>
  key === ENTER_KEY || key === SPACE_KEY;

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

export const Toolbar = ({ children }: { readonly children: ReactNode }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    {children}
  </div>
);

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
