/**
 * Toggle example: a canvas toolbar.
 *
 * Modes, not settings — grid and snapping change what the next drag does, so
 * they are toggles; the lock is a mode that is unavailable until something is
 * selected. The group holds one tab stop and the panel's state is controlled,
 * which is the API a toolbar uses.
 */

import { useState, type ReactElement } from "react";
import * as Arr from "effect/Array";
import {
  Box,
  Separator,
  Stack,
  Text,
  ToggleGroup,
  type GroupOption,
} from "../src/index.js";

/** The toolbar's modes; only the lock is unavailable at rest. */
const MODES: ReadonlyArray<GroupOption> = [
  { value: "grid", label: "Grid" },
  { value: "snap", label: "Snap to grid" },
  { value: "lock", label: "Lock layer", disabled: true },
];

/** Canvas toolbar: a pressed mode, a second mode, and an unavailable one. */
export const ToggleExample = (): ReactElement => {
  const [modes, setModes] = useState<ReadonlyArray<string>>(["grid"]);
  const grid = Arr.contains(modes, "grid");
  const snap = Arr.contains(modes, "snap");

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

        <ToggleGroup
          type="multiple"
          label="Canvas modes"
          variant="outline"
          value={modes}
          onValueChange={setModes}
          options={MODES}
          testId="toggle-example-modes"
        />

        <Separator orientation="horizontal" />

        <Text role="caption" tone="muted">
          {`Grid ${grid ? "on" : "off"} · Snap ${snap ? "on" : "off"} · Lock unavailable until a layer is selected.`}
        </Text>
      </Stack>
    </Box>
  );
};
