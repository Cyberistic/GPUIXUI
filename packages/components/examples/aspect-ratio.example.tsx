/** @jsxImportSource @gpuix/react */
/**
 * Aspect ratio example: a media frame and a square tile.
 *
 * Each box takes the width of the column it sits in; the studio still is 16:9
 * and the palette swatch is square, so a resized window reshapes neither.
 */

import { AspectRatio } from "../src/aspect-ratio.js";
import { useTheme } from "../src/internal/theme.js";

/** A 16:9 still over a square swatch. */
export const AspectRatioExample = () => {
  const theme = useTheme();
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 16, width: 360 }}
    >
      <AspectRatio ratio={16 / 9}>
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.muted,
          }}
        />
      </AspectRatio>
      <text>Studio still · 16:9</text>
      <div style={{ width: 120 }}>
        <AspectRatio ratio={1}>
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.primary,
            }}
          />
        </AspectRatio>
      </div>
      <text>Swatch · 1:1</text>
    </div>
  );
};
