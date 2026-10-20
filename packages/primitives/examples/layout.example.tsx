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
import { useState, type ReactElement } from "react";
import {
  Box,
  Grid,
  ScrollArea,
  Separator,
  Spacer,
  Stack,
  Text,
  useTheme,
  type ScrollPosition,
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
  { name: "Rotation", value: "0°" },
  { name: "Opacity", value: "100%" },
  { name: "Corner radius", value: "12 px" },
  { name: "Fill", value: "Surface / Card" },
  { name: "Border", value: "1 px / Border" },
  { name: "Shadow", value: "Elevation / Overlay" },
  { name: "Blend mode", value: "Normal" },
  { name: "Constraints", value: "Left / Top" },
  { name: "Export", value: "2x PNG" },
  { name: "Name", value: "Frame 1280" },
  { name: "Parent", value: "Canvas" },
  { name: "Visible", value: "Yes" },
  { name: "Lock aspect", value: "Off" },
  { name: "Clip content", value: "On" },
  { name: "Stroke", value: "Border / Strong" },
  { name: "Stroke width", value: "1 px" },
  { name: "Layer", value: "Content" },
  { name: "Text", value: "Inter / 14" },
  { name: "Fill opacity", value: "100%" },
];

/** A property inspector: a fixed header, a scrolling body and a footer. */
export const LayoutExample = (): ReactElement => {
  const theme = useTheme();
  const [position, setPosition] = useState<ScrollPosition>({ x: 0, y: 0 });
  return (
    <Box
      tone="card"
      radius="lg"
      border
      testId="layout-example"
      style={{ width: 340, height: 420, overflow: "hidden" }}
    >
      <Stack
        direction="column"
        gap="xs"
        style={{
          paddingLeft: theme.spacing.md,
          paddingRight: theme.spacing.md,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.sm,
        }}
      >
        <Stack direction="row" align="center" justify="between" gap="sm">
          <Text role="h3">Inspector</Text>
          <Text role="caption" tone="muted">
            {properties.length} properties
          </Text>
        </Stack>
        {/* The source path is identified by its filename, so the run keeps its
            end and clips the beginning (plan 783). */}
        <Text
          role="caption"
          tone="muted"
          truncate="start"
          testId="layout-example-path"
        >
          workspaces/primitives/packages/primitives/src/components/Button.tsx
        </Text>
      </Stack>

      <Separator orientation="horizontal" />

      <ScrollArea
        axis="vertical"
        label="Component properties"
        testId="layout-example-properties"
        onScrollPositionChange={setPosition}
        style={{ flexGrow: 1, minHeight: 0 }}
      >
        <Stack
          direction="column"
          gap="xs"
          style={{
            padding: theme.spacing.md,
          }}
        >
          {Arr.map(properties, (property) => (
            <Grid columns={2} gap="sm" key={property.name}>
              <Text role="caption" tone="muted">
                {property.name}
              </Text>
              <Text role="code">{property.value}</Text>
            </Grid>
          ))}
        </Stack>
      </ScrollArea>

      <Separator orientation="horizontal" />

      <Stack
        direction="row"
        align="center"
        gap="sm"
        style={{
          paddingLeft: theme.spacing.md,
          paddingRight: theme.spacing.md,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.sm,
        }}
      >
        <Text role="caption" tone="muted">
          Read-only
        </Text>
        <Spacer />
        <Text role="caption" tone="primary" testId="layout-example-position">
          {position.y === 0 ? "Top" : `${Math.round(-position.y)} px`}
        </Text>
      </Stack>
    </Box>
  );
};
