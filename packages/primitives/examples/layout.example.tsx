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
import type { ReactElement } from "react";
import {
  Box,
  Grid,
  ScrollArea,
  Separator,
  Spacer,
  Stack,
  Text,
  useTheme,
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
  const theme = useTheme();
  return (
    <Box
      tone="card"
      radius="lg"
      border
      testId="layout-example"
      style={{ width: 340, height: 420, overflow: "hidden" }}
    >
      <Stack
        direction="row"
        align="center"
        justify="between"
        gap="sm"
        style={{
          paddingLeft: theme.spacing.md,
          paddingRight: theme.spacing.md,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.sm,
        }}
      >
        <Text role="h3">Inspector</Text>
        <Text role="caption" tone="muted">
          {properties.length} properties
        </Text>
      </Stack>

      <Separator orientation="horizontal" />

      <ScrollArea
        axis="vertical"
        label="Component properties"
        testId="layout-example-properties"
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
        <Text role="caption" tone="primary">
          Reset all
        </Text>
      </Stack>
    </Box>
  );
};
