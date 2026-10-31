/**
 * Stats — Heavens Arena's numbers: four tiles with sparklines, bout wins by
 * fighter, aura output over the period, and the season's Nen types. The range
 * control swaps the whole data set.
 */
import { Card } from "@gpuixui/components/card";
import { BarChart, DonutChart, LineChart, Sparkline } from "@gpuixui/data";
import { Stack, Text, ToggleGroup } from "@gpuixui/primitives";
import { useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import { useState } from "react";
import { datasets, nenTypes, ranges, type Range } from "./data.js";
import { isRange } from "./logic.js";

/** The block, as a window's whole content. */
export const Stats = () => {
  const theme = useTheme();
  const [range, setRange] = useState<Range>("week");
  const data = datasets[range];
  return (
    <Stack
      direction="column"
      gap="lg"
      testId="stats"
      style={{
        flexGrow: 1,
        width: "100%",
        height: "100%",
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
      }}
    >
      <Stack direction="row" align="center" justify="between">
        <Stack direction="column" gap="2xs">
          <Text role="h2">Heavens Arena</Text>
          <Text role="caption" tone="muted">
            Gon and Killua, floors 50 to 200
          </Text>
        </Stack>
        <ToggleGroup
          type="single"
          label="Range"
          value={range}
          onValueChange={(next) => (isRange(next) ? setRange(next) : undefined)}
          options={ranges}
          itemTestId={(value) => `range-${value}`}
        />
      </Stack>
      <Stack direction="row" gap="md">
        {Arr.map(data.tiles, (tile) => (
          <Card
            key={tile.label}
            variant="outline"
            style={{ flexGrow: 1, flexBasis: 0, padding: theme.spacing.lg }}
          >
            <Stack direction="column" gap="xs">
              <Text role="caption" tone="muted">
                {tile.label}
              </Text>
              <Stack direction="row" align="center" justify="between">
                <Text role="h2" testId={`tile-${tile.label}`}>
                  {tile.value}
                </Text>
                <Sparkline values={tile.trend} width={84} height={28} />
              </Stack>
              <Text role="caption" tone="muted">
                {`${tile.change} on the last ${range}`}
              </Text>
            </Stack>
          </Card>
        ))}
      </Stack>
      <Stack direction="row" gap="md" style={{ flexGrow: 1, minHeight: 0 }}>
        <Card
          variant="outline"
          style={{ flexGrow: 3, flexBasis: 0, padding: theme.spacing.lg }}
        >
          <Stack direction="column" gap="sm">
            <Text role="label">Bout wins</Text>
            <BarChart
              series={data.wins}
              labels={data.labels}
              width={460}
              height={190}
              legend
            />
          </Stack>
        </Card>
        <Card
          variant="outline"
          style={{ flexGrow: 2, flexBasis: 0, padding: theme.spacing.lg }}
        >
          <Stack direction="column" gap="sm">
            <Text role="label">Nen types</Text>
            <DonutChart data={nenTypes} size={150} legend />
          </Stack>
        </Card>
      </Stack>
      <Card variant="outline" style={{ padding: theme.spacing.lg }}>
        <Stack direction="column" gap="sm">
          <Text role="label">Aura output</Text>
          <LineChart
            series={[{ key: "aura", label: "Aura", values: data.aura }]}
            labels={data.labels}
            width={900}
            height={120}
          />
        </Stack>
      </Card>
    </Stack>
  );
};
