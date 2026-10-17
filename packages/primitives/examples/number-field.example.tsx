/**
 * Number field example: export settings.
 *
 * Two bounded numbers where typing is the point — a copy count and a render
 * resolution — with the panel's state controlling both and the summary derived
 * from it. The copy count shows the `1–99` guard a print dialog actually has;
 * the resolution shows a larger step, so the arrows are visibly coarser.
 */

import { useState, type ReactElement } from "react";
import { Box, NumberField, Separator, Stack, Text } from "../src/index.js";

/** A labelled row with the field's current value on the right. */
const Row = ({
  title,
  description,
  value,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly value: string;
  readonly children: ReactElement;
}): ReactElement => (
  <Stack direction="row" align="center" justify="between" gap="md">
    <Stack direction="column" gap="2xs" grow>
      <Text role="label">{title}</Text>
      <Text role="caption" tone="muted">
        {description}
      </Text>
    </Stack>
    <Stack direction="row" align="center" justify="end" gap="sm">
      {children}
      <Text role="caption" tone="muted">
        {value}
      </Text>
    </Stack>
  </Stack>
);

/** Export settings: two bounded number fields and a derived summary. */
export const NumberFieldExample = (): ReactElement => {
  const [copies, setCopies] = useState(2);
  const [dpi, setDpi] = useState(144);

  return (
    <Box
      tone="card"
      padding="lg"
      radius="md"
      border
      testId="number-field-example"
      style={{ width: 460 }}
    >
      <Stack direction="column" gap="md">
        <Text role="h3">Export settings</Text>

        <Row title="Copies" description="1 to 99" value={`${copies} ×`}>
          <div style={{ width: 110 }}>
            <NumberField
              testId="number-field-example-copies"
              label="Copies"
              value={copies}
              onValueChange={setCopies}
              min={1}
              max={99}
            />
          </div>
        </Row>

        <Separator orientation="horizontal" />

        <Row
          title="Resolution"
          description="72 to 600 DPI, in steps of 12"
          value={`${dpi} DPI`}
        >
          <div style={{ width: 130 }}>
            <NumberField
              testId="number-field-example-dpi"
              label="Resolution"
              value={dpi}
              onValueChange={setDpi}
              min={72}
              max={600}
              step={12}
            />
          </div>
        </Row>

        <Separator orientation="horizontal" />

        <Text role="caption" tone="muted">
          {`${copies} ${copies === 1 ? "print" : "prints"} at ${dpi} DPI. Type a value, or use ↑ ↓ and PageUp/PageDown.`}
        </Text>
      </Stack>
    </Box>
  );
};
