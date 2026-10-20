/**
 * A raster surface: the one honest pixel path in published GPUix.
 *
 * The gradient is generated in memory and handed to `setImagePixels`; nothing
 * in this example is a DOM canvas or an HTML image (plan `696`).
 */

import { Effect } from "effect";
import * as Arr from "effect/Array";
import { useMemo, type ReactElement } from "react";
import {
  Box,
  Surface,
  Stack,
  Text,
  Tooltip,
  rasterSurface,
  useTheme,
  type RasterFrame,
} from "@gpuixui/primitives";

const channels = (hex: string): readonly [number, number, number] => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];

const row = (colour: readonly [number, number, number], width: number) =>
  Uint8Array.from(Arr.flatMap(Arr.range(0, width), () => [...colour, 255]));

const gradient = (
  width: number,
  height: number,
  from: readonly [number, number, number],
  to: readonly [number, number, number],
): RasterFrame => {
  const pixels = new Uint8Array(width * height * 4);
  Arr.forEach(Arr.range(0, height), (y) => {
    const mix = height <= 1 ? 0 : y / (height - 1);
    const colour: readonly [number, number, number] = [
      Math.round(from[0] + (to[0] - from[0]) * mix),
      Math.round(from[1] + (to[1] - from[1]) * mix),
      Math.round(from[2] + (to[2] - from[2]) * mix),
    ];
    pixels.set(row(colour, width), y * width * 4);
  });
  return { width, height, pixels };
};

/** A 240 × 120 raster gradient generated from the active theme's roles. */
export const SurfaceExample = (): ReactElement => {
  const theme = useTheme();
  const adapter = useMemo(
    () =>
      rasterSurface({
        paint: ({ width, height }) =>
          Effect.succeed(
            gradient(
              width,
              height,
              channels(theme.colors.primary),
              channels(theme.colors.accent),
            ),
          ),
      }),
    [theme],
  );

  return (
    <Box tone="card" padding="lg" radius="md" border testId="surface-example">
      <Stack direction="column" gap="sm">
        <Text role="h3">Raster surface</Text>
        <Tooltip
          content="Generated from the active theme's primary and accent roles"
          side="top"
        >
          <Surface
            adapter={adapter}
            width={240}
            height={120}
            label="Theme gradient rendered as raster pixels"
            tabIndex={0}
            testId="surface-leaf"
          />
        </Tooltip>
        <Text role="caption" tone="muted">
          A raster surface paints its own pixels; it is not a native view. A
          focusable one is also a tooltip trigger.
        </Text>
      </Stack>
    </Box>
  );
};
