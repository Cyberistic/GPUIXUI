/**
 * ToggleGroup example: a document toolbar.
 *
 * Two groups with the two selection rules: alignment is a segmented control (one
 * mode at a time, re-pressing the active mode changes nothing), formatting is a
 * set (each item presses independently). Underline is disabled to show that a
 * group skips it with the arrows and refuses its press, and the summary is
 * derived from both groups rather than repeated by hand.
 */

import { useState, type ReactElement } from "react";
import * as Arr from "effect/Array";
import { Box, Separator, Stack, Text, ToggleGroup } from "../src/index.js";

/** A document toolbar with a single-select mode and a multi-select format set. */
export const ToggleGroupExample = (): ReactElement => {
  const [align, setAlign] = useState("left");
  const [format, setFormat] = useState<ReadonlyArray<string>>(["bold"]);

  return (
    <Box
      tone="card"
      padding="lg"
      radius="md"
      border
      testId="toggle-group-example"
      style={{ width: 480 }}
    >
      <Stack direction="column" gap="md">
        <Text role="h3">Document toolbar</Text>

        <Stack direction="row" gap="sm" align="center">
          <Text role="label" tone="muted">
            Align
          </Text>
          <ToggleGroup
            type="single"
            testId="toggle-group-example-align"
            label="Alignment"
            variant="outline"
            options={[
              { value: "left", label: "Align left" },
              { value: "centre", label: "Align centre" },
              { value: "right", label: "Align right" },
            ]}
            value={align}
            onValueChange={setAlign}
          />
        </Stack>

        <Stack direction="row" gap="sm" align="center">
          <Text role="label" tone="muted">
            Format
          </Text>
          <ToggleGroup
            type="multiple"
            testId="toggle-group-example-format"
            label="Formatting"
            options={[
              { value: "bold", label: "Bold" },
              { value: "italic", label: "Italic" },
              { value: "underline", label: "Underline", disabled: true },
            ]}
            value={format}
            onValueChange={setFormat}
          />
        </Stack>

        <Separator orientation="horizontal" />

        <Text role="caption" tone="muted">
          {`Align ${align} · Formatting ${
            Arr.isReadonlyArrayNonEmpty(format)
              ? Arr.join(format, ", ")
              : "none"
          } · Underline unavailable for this font.`}
        </Text>
      </Stack>
    </Box>
  );
};
