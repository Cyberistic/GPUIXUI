/**
 * Icons example: a status strip and the size scale.
 *
 * The two rules the package enforces are visible here: a decorative icon takes
 * its colour from the surrounding text role and stays out of the accessibility
 * tree, while an icon that carries meaning on its own gets a `label` and is
 * announced as an image. The size row shows the five named steps beside text,
 * which is what the scale is for.
 */

import { Match } from "effect";
import * as Arr from "effect/Array";
import { ICON_NAMES, ICON_SIZES, Icon, type IconName } from "@gpuixui/icons";
import type { ReactElement } from "react";
import { Box, Separator, Stack, Text, useTheme } from "../src/index.js";

/** The five named sizes, largest first, so the rung pattern reads. */
const SIZES = ["xl", "lg", "md", "sm", "xs"] as const;

/** A short, meaningful subset of the set — a strip, not the whole registry. */
const STATUS_ICONS: ReadonlyArray<{
  readonly name: IconName;
  readonly tone: "success" | "destructive" | "muted";
}> = [
  { name: "success", tone: "success" },
  { name: "warning", tone: "destructive" },
  { name: "clock", tone: "muted" },
];

/** Decoration, meaning and the size scale in one card. */
export const IconsExample = (): ReactElement => {
  const theme = useTheme();
  const toneColor = (tone: "success" | "destructive" | "muted"): string =>
    Match.value(tone).pipe(
      Match.when("success", () => theme.colors.success),
      Match.when("destructive", () => theme.colors.destructive),
      Match.when("muted", () => theme.colors.mutedForeground),
      Match.exhaustive,
    );
  return (
    <Box
      tone="card"
      padding="lg"
      radius="md"
      border
      testId="icons-example"
      style={{ width: 420 }}
    >
      <Stack direction="column" gap="md">
        <Text role="h3">Icon set</Text>
        <Text role="caption" tone="muted">
          {ICON_NAMES.length} icons on the 24×24 grid
        </Text>

        <Stack direction="row" align="center" gap="md">
          {Arr.map(STATUS_ICONS, (item) => (
            <Stack direction="row" align="center" gap="xs" key={item.name}>
              {/* Labelled: the icon is the only carrier of the status. */}
              <Icon
                name={item.name}
                color={toneColor(item.tone)}
                size="md"
                label={item.name}
              />
              <Text role="label">{item.name}</Text>
            </Stack>
          ))}
        </Stack>

        <Separator orientation="horizontal" />

        <Stack direction="column" gap="sm">
          {Arr.map(SIZES, (size) => (
            <Stack direction="row" align="center" gap="sm" key={size}>
              <Text role="caption" tone="muted" style={{ width: 20 }}>
                {size}
              </Text>
              {/* Decoration: the size label beside it already carries meaning. */}
              <Icon
                name="settings"
                color={theme.colors.foreground}
                size={size}
              />
              <Text role="caption" tone="muted">
                {ICON_SIZES[size]} px
              </Text>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
};
