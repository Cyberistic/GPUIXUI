/**
 * Value controls example: a render-settings panel.
 *
 * The components in the roles they actually differ in — a continuous quality
 * slider with a formatted value, a vertical master level, a price range with two
 * ends, and a meter reporting a measurement. The sliders are controlled, so the
 * example shows the API a settings screen uses: the panel's own state is the
 * source of truth and the readout is derived from it.
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@gpuixui/icons";
import {
  Box,
  Meter,
  MeterIndicator,
  MeterLabel,
  MeterTrack,
  MeterValue,
  RangeSlider,
  Separator,
  Slider,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
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
  const [level, setLevel] = useState(40);
  const [price, setPrice] = useState<readonly [number, number]>([20, 80]);
  const [saved, setSaved] = useState("not saved");
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
            formatValue={(value) => `${value}%`}
          >
            <SliderTrack>
              <SliderIndicator />
              <SliderThumb>
                <Icon
                  name="settings"
                  size={theme.iconSize.xs}
                  color={theme.colors.primaryForeground}
                />
              </SliderThumb>
            </SliderTrack>
          </Slider>
        </Row>

        <Separator orientation="horizontal" />

        <Row title="Master level" value={`${level}%`}>
          <Slider
            testId="value-example-level"
            label="Master level"
            orientation="vertical"
            value={level}
            onValueChange={setLevel}
            formatValue={(value) => `${value}%`}
            style={{ height: 120 }}
          />
        </Row>

        <Separator orientation="horizontal" />

        <Row title="Budget" value={`$${price[0]} – $${price[1]}`}>
          <RangeSlider
            testId="value-example-budget"
            label="Budget"
            value={price}
            onValueChange={setPrice}
            onValueCommit={(next) => setSaved(`$${next[0]} – $${next[1]}`)}
            step={5}
            formatValue={(value) => `$${value}`}
          />
        </Row>

        <Text role="caption" tone="muted">
          Budget saved on release: {saved}
        </Text>

        <Separator orientation="horizontal" />

        <Meter
          testId="value-example-disk"
          label="Disk usage"
          value={diskUsed}
          max={100}
          tone={diskUsed > 90 ? "destructive" : "primary"}
          formatValue={(value) => `${value} GB`}
        >
          <Stack direction="row" justify="between" align="baseline">
            <MeterLabel />
            <MeterValue />
          </Stack>
          <MeterTrack>
            <MeterIndicator />
          </MeterTrack>
        </Meter>

        <Text role="caption" tone="muted">
          Theme step: {theme.spacing.md}px · drag the thumb or use the arrow
          keys.
        </Text>
      </Stack>
    </Box>
  );
};
