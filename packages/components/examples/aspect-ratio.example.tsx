/** @jsxImportSource @gpuix/react */
import { AspectRatio } from "../src/aspect-ratio.js";
import { useTheme } from "../src/internal/theme.js";

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
