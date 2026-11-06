/** @jsxImportSource @gpuix/react */
import type { ComponentType } from "react";
import type { Theme } from "@gpuixui/tokens";

/**
 * One registered native example on `/live`'s stage.
 *
 * The stage owns only the window: the example is the library's own screen, and
 * every colour, gap and radius it paints comes from the theme the route
 * resolved. `/live` mounts this through the same reconciler as the hand-written
 * scene, so a capture and a reader see the same tree.
 */
export interface LiveExampleProps {
  readonly example: ComponentType;
  readonly theme: Theme;
  readonly box: { readonly width: number; readonly height: number };
}

export const LiveExample = ({
  example: Example,
  theme,
  box,
}: LiveExampleProps) => (
  <div
    style={{
      width: box.width,
      height: box.height,
      padding: theme.spacing["2xl"],
      display: "flex",
      flexDirection: "column",
      backgroundColor: theme.colors.background,
    }}
  >
    <Example />
  </div>
);

/** The stage before an example renders: the window's own fill, nothing else. */
export const LiveBlank = ({
  theme,
  box,
}: Omit<LiveExampleProps, "example">) => (
  <div
    style={{
      width: box.width,
      height: box.height,
      backgroundColor: theme.colors.background,
    }}
  />
);
