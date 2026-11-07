/** @jsxImportSource @gpuix/react */
import { useState, type ReactElement } from "react";
import * as Arr from "effect/Array";
import {
  Box,
  Separator,
  Stack,
  Text,
  Toggle,
  ToggleGroup,
  type GroupOption,
} from "../src/index.js";

const MODES: ReadonlyArray<GroupOption> = [
  { value: "grid", label: "Grid" },
  { value: "snap", label: "Snap to grid" },
  { value: "lock", label: "Lock layer", disabled: true },
];

export const ToggleExample = (): ReactElement => {
  const [modes, setModes] = useState<ReadonlyArray<string>>(["grid"]);
  const [preview, setPreview] = useState(true);
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

        <Toggle
          pressed={preview}
          onPressedChange={setPreview}
          testId="toggle-example-preview"
        >
          Live preview
        </Toggle>

        <Separator orientation="horizontal" />

        <Text role="caption" tone="muted">
          {`Grid ${grid ? "on" : "off"} · Snap ${snap ? "on" : "off"} · Preview ${preview ? "on" : "off"} · Lock unavailable until a layer is selected.`}
        </Text>
      </Stack>
    </Box>
  );
};
