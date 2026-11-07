/** @jsxImportSource @gpuix/react */
import { Card } from "@gpuixui/components/card";
import { textStyle, useTheme } from "@gpuixui/components/authoring";
import { MotionProvider } from "@gpuixui/components/motion";
import { Particles } from "../src/particles.js";
import { ShineButton } from "../src/shine-button.js";

const fill = {
  position: "absolute" as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

export const ParticlesExample = () => {
  const theme = useTheme();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ maxWidth: 460, padding: 0, overflow: "hidden" }}>
        <div style={{ position: "relative", height: 220 }}>
          <div style={fill}>
            <Particles count={28} seed={7} />
          </div>
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: theme.spacing.sm,
              padding: theme.spacing.lg,
            }}
          >
            <text
              style={{
                ...textStyle(theme, "display"),
                color: theme.colors.foreground,
              }}
            >
              Aurora 3.0
            </text>
            <text
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.mutedForeground,
              }}
            >
              A release notes panel: the field is decoration, so the copy in
              front of it keeps every press.
            </text>
            <ShineButton variant="primary">Read the notes</ShineButton>
          </div>
        </div>
      </Card>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
        }}
      >
        <div
          style={{
            position: "relative",
            width: 120,
            height: 72,
            overflow: "hidden",
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.muted,
          }}
        >
          <MotionProvider preference="reduced">
            <div style={fill}>
              {}
              <Particles
                count={12}
                seed={2}
                color={theme.colors.mutedForeground}
              />
            </div>
          </MotionProvider>
        </div>
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The same field under the reduced preference, with the caller's colour
          and count.
        </text>
      </div>
    </div>
  );
};
