/** @jsxImportSource @gpuix/react */
/**
 * Layout example: an inspector sidebar.
 *
 * A real application frame rather than a gallery — a header, a scrolling
 * property list separated from the chrome, and a footer pushed to the edge by a
 * `Spacer`. It is the composition that proves the layout primitives work
 * together: `Box` owns the surface, `Stack` the axes, `Grid` the label/value
 * pairs, `ScrollArea` the bounded list and `Separator` the regions.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { EventPayload } from "@gpuix/react";
import { useState, type ReactElement } from "react";
import {
  Box,
  Grid,
  ScrollArea,
  Separator,
  Spacer,
  Stack,
  Text,
} from "../src/index.js";

/** One property row: a name and its value. */
const properties: ReadonlyArray<{
  readonly name: string;
  readonly value: string;
}> = [
  { name: "Type", value: "Rectangle" },
  { name: "Width", value: "1280 px" },
  { name: "Height", value: "800 px" },
  { name: "X", value: "0 px" },
  { name: "Y", value: "24 px" },
  { name: "Corner radius", value: "12 px" },
  { name: "Fill", value: "Surface / Card" },
  { name: "Border", value: "1 px / Border" },
  { name: "Shadow", value: "Elevation / Overlay" },
];

/** A property inspector: a fixed header, a scrolling body and a footer. */
export const LayoutExample = (): ReactElement => {
  // The drop target measures itself: `onLayout` reports the box the runtime
  // painted, so the caption states the size the primitive actually got instead
  // of a number the example guessed. The state is this example's own — a
  // measurement nobody else reads.
  const [drop, setDrop] = useState<
    Option.Option<{ readonly width: number; readonly height: number }>
  >(Option.none());
  const measure = (event: EventPayload) => {
    const width = Math.round(event.width ?? 0);
    const height = Math.round(event.height ?? 0);
    setDrop((held) =>
      Option.exists(held, (box) => box.width === width && box.height === height)
        ? held
        : Option.some({ width, height }),
    );
  };
  return (
    <Box
      tone="card"
      radius="lg"
      border
      testId="layout-example"
      style={{ width: 340, height: 420, overflow: "hidden" }}
    >
      <Box tone="none" fullWidth paddingX="md" paddingY="sm">
        <Stack direction="row" align="center" gap="sm" fullWidth>
          <Box
            tone="accent"
            radius="sm"
            aspectRatio={1}
            style={{ width: 12 }}
          />
          <Text role="h3">Inspector</Text>
          <Spacer />
          <Text role="caption" tone="muted">
            {properties.length} properties
          </Text>
        </Stack>
      </Box>

      <Separator orientation="horizontal" />

      <ScrollArea
        axis="vertical"
        padding="md"
        testId="layout-example-properties"
      >
        <Stack direction="column" gap="xs">
          {Arr.map(properties, (property) => (
            <Grid columns={2} gap="sm" key={property.name}>
              <Text role="caption" tone="muted">
                {property.name}
              </Text>
              <Text role="code">{property.value}</Text>
            </Grid>
          ))}
          <Box
            tone="none"
            border
            borderStyle="dashed"
            radius="md"
            paddingX="sm"
            paddingY="sm"
            testId="layout-example-drop"
            onLayout={measure}
          >
            <Stack direction="row" align="center" gap="sm" fullWidth>
              <Text role="caption" tone="muted">
                Drop a layer here
              </Text>
              <Spacer />
              <Text role="caption" tone="muted">
                {Option.match(drop, {
                  onNone: () => "—",
                  onSome: ({ width, height }) => `${width} × ${height}`,
                })}
              </Text>
            </Stack>
          </Box>
        </Stack>
      </ScrollArea>

      <Separator orientation="horizontal" />

      <Box tone="none" fullWidth paddingX="md" paddingY="sm">
        <Stack direction="row" align="center" gap="sm" fullWidth>
          <Text role="caption" tone="muted">
            Read-only
          </Text>
          <Spacer />
          <Text role="caption" tone="primary">
            Reset all
          </Text>
        </Stack>
      </Box>
    </Box>
  );
};
