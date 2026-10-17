/** @jsxImportSource @gpuix/react */
/**
 * The live scenes, as real library components on the GPUix renderer.
 *
 * A scene is a full surface: it owns the theme it was given, names no colour
 * literal, and never reaches for a browser global. `main.tsx` supplies the
 * theme and the window size; the scene supplies the composition.
 */
import { Box, Button, Stack, Text } from "@gpuixui/primitives";
import type { ReactElement } from "react";
import type { LiveScene } from "./scenes";

const ButtonScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Stack direction="column" gap="2xs">
      <Text role="h3">Buttons</Text>
      <Text role="caption" tone="muted">
        The real `@gpuixui/primitives` component on the GPUix renderer.
      </Text>
    </Stack>
    <Stack direction="row" gap="sm" wrap>
      <Button variant="primary">Save changes</Button>
      <Button variant="secondary">Cancel</Button>
      <Button variant="outline">Duplicate</Button>
      <Button variant="ghost">Skip</Button>
      <Button variant="destructive">Delete</Button>
    </Stack>
    <Stack direction="row" gap="sm" wrap>
      <Button variant="primary" size="sm">
        Small
      </Button>
      <Button variant="primary" size="md">
        Medium
      </Button>
      <Button variant="primary" size="lg">
        Large
      </Button>
      <Button variant="primary" disabled>
        Disabled
      </Button>
    </Stack>
  </Stack>
);

export const LIVE_SCENE_VIEWS: Readonly<Record<LiveScene, () => ReactElement>> =
  {
    button: ButtonScene,
  };

/** The surface chrome every scene sits in: the theme's own background. */
export const LiveSurface = ({
  size,
  children,
}: {
  readonly size: { readonly width: number; readonly height: number };
  readonly children: ReactElement;
}): ReactElement => (
  <Box
    tone="background"
    padding="lg"
    style={{ width: size.width, height: size.height }}
  >
    {children}
  </Box>
);
