/**
 * Toggle example: a canvas toolbar.
 *
 * Modes, not settings — grid and snapping change what the next drag does, so
 * they are toggles; the lock is a toggle that is unavailable until something is
 * selected. The panel's state is controlled and the summary is derived from it,
 * which is the API a toolbar uses.
 */

import { useState, type ReactElement } from "react";
import { Box, Separator, Stack, Text, Toggle } from "../src/index.js";

/** Canvas toolbar: a pressed mode, a border variant, and a review row. */
export const ToggleExample = (): ReactElement => {
  const [grid, setGrid] = useState(true);
  const [snap, setSnap] = useState(false);

  return (
    <Box
      tone="card"
      padding="lg"
      radius="md"
      border
      testId="toggle-example"
      style={{ width: 440 }}
    >
      <Stack direction="column" gap="md">
        <Text role="h3">Canvas toolbar</Text>

        <Stack direction="row" gap="sm">
          <Toggle
            testId="toggle-example-grid"
            label="Grid"
            pressed={grid}
            onPressedChange={setGrid}
            variant="outline"
          >
            Grid
          </Toggle>
          <Toggle
            testId="toggle-example-snap"
            label="Snap to grid"
            pressed={snap}
            onPressedChange={setSnap}
            variant="outline"
          >
            Snap
          </Toggle>
          <Toggle label="Lock layer" disabled>
            Lock
          </Toggle>
        </Stack>

        <Separator orientation="horizontal" />

        {/* The review state: a stored mode the reader may inspect, not change. */}
        <Stack direction="row" align="center" gap="sm">
          <Text role="caption" tone="muted">
            Saved preset
          </Text>
          <Toggle
            testId="toggle-example-locked"
            label="Snap to grid (locked)"
            pressed
            readOnly
            variant="outline"
          >
            Snap
          </Toggle>
        </Stack>

        <Text role="caption" tone="muted">
          {`Grid ${grid ? "on" : "off"} · Snap ${snap ? "on" : "off"} · Lock unavailable until a layer is selected.`}
        </Text>
      </Stack>
    </Box>
  );
};
