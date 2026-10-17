/**
 * Small presentational helpers the scenarios share.
 *
 * `Readout` is the important one: every assertion reads a **number or a string
 * from a readout element**, never a pixel from a screenshot. A readout encodes
 * the state under test as `key=value key=value`.
 */
import type { ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { theme } from "./theme.js";

/** A `testId`-addressable string the smoke steps assert against. */
export const Readout = ({
  testId,
  children,
}: {
  readonly testId: string;
  readonly children: ReactNode;
}) => (
  <text testId={testId} style={{ color: theme.muted, fontSize: 12 }}>
    {children}
  </text>
);

/** Body text in the playground's foreground colour. */
export const Body = ({ children }: { readonly children: ReactNode }) => (
  <text style={{ color: theme.text, fontSize: 14 }}>{children}</text>
);

/** A surface with padding and a hairline border. */
export const Panel = ({
  children,
  style,
}: {
  readonly children: ReactNode;
  readonly style?: StyleDesc;
}) => (
  <div
    style={{
      backgroundColor: theme.panel,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      ...style,
    }}
  >
    {children}
  </div>
);

/** A horizontal strip that holds controls. */
export const Toolbar = ({ children }: { readonly children: ReactNode }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    {children}
  </div>
);

/** A one-pixel separator. */
export const Divider = () => (
  <div style={{ height: 1, backgroundColor: theme.border }} />
);

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
}) => (
  <div
    testId={testId}
    tabIndex={0}
    role="button"
    onClick={onClick}
    style={{
      padding: 8,
      borderRadius: 6,
      cursor: "pointer",
      backgroundColor: theme.panelAlt,
      hover: { backgroundColor: theme.border },
      ...style,
    }}
  >
    {children}
  </div>
);
