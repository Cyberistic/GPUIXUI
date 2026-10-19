/**
 * Value controls example: a render-settings panel.
 *
 * The three components in the roles they actually differ in — a continuous
 * quality slider with a formatted value, a price range with two ends, and a
 * meter reporting a measurement. A coarse slider (`max` not on the step grid)
 * shows the stop rule: 0, 3, 6, 9, then the maximum, 10. The sliders are
 * controlled, so the example shows the API a settings screen uses: the panel's
 * own state is the source of truth and the readout is derived from it.
 */

import { useState, type ReactElement } from "react";
import {
  Box,
  Meter,
  RangeSlider,
  Separator,
  Slider,
  Stack,
  Text,
  useTheme,
} from "../src/index.js";

/** A labelled row with the control's current value on the right. */
const Row = ({
  title,
  value,
  children,
}: {
  readonly title: string;
  readonly value: string;
  readonly children: ReactElement;
}): ReactElement => (
  <Stack direction="column" gap="sm">
    <Stack direction="row" justify="between" align="baseline">
      <Text role="label">{title}</Text>
      <Text role="caption" tone="muted">
        {value}
      </Text>
    </Stack>
    {children}
  </Stack>
);

/** Render settings: one slider, one range, one meter. */
export const ValueExample = (): ReactElement => {
  const theme = useTheme();
  const [quality, setQuality] = useState(62);
  const [savedQuality, setSavedQuality] = useState(62);
  const [price, setPrice] = useState<readonly [number, number]>([20, 80]);
  const [depth, setDepth] = useState(10);
  const diskUsed = 68;

  return (
    <Box
      tone="card"
      padding="lg"
      radius="md"
      border
      testId="value-example"
      style={{ width: 460 }}
    >
      <Stack direction="column" gap="lg">
        <Text role="h3">Render settings</Text>

        <Row title="Quality" value={`${quality}%`}>
          <Slider
            testId="value-example-quality"
            label="Quality"
            value={quality}
            onValueChange={setQuality}
            onValueCommit={setSavedQuality}
            formatValue={(value) => `${value}%`}
          />
        </Row>

        <Separator orientation="horizontal" />

        <Row title="Budget" value={`$${price[0]} – $${price[1]}`}>
          <RangeSlider
            testId="value-example-budget"
            label="Budget"
            value={price}
            onValueChange={setPrice}
            step={5}
            formatValue={(value) => `$${value}`}
          />
        </Row>

        <Separator orientation="horizontal" />

        <Row title="Colour depth" value={`${depth} bit`}>
          <Slider
            testId="value-example-depth"
            label="Colour depth"
            min={0}
            max={10}
            step={3}
            value={depth}
            onValueChange={setDepth}
            formatValue={(value) => `${value} bit`}
          />
        </Row>

        <Separator orientation="horizontal" />

        <Row title="Disk usage" value={`${diskUsed} of 100 GB`}>
          <Meter
            testId="value-example-disk"
            label="Disk usage"
            value={diskUsed}
            max={100}
            tone={diskUsed > 90 ? "destructive" : "primary"}
            formatValue={(value) => `${value} GB`}
          />
        </Row>

        <Text role="caption" tone="muted">
          Theme step: {theme.spacing.md}px · drag the thumb or use the arrow
          keys · quality saved at {savedQuality}%.
        </Text>
      </Stack>
    </Box>
  );
};
