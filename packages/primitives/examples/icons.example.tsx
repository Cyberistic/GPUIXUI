/** @jsxImportSource @gpuix/react */
import { Match } from "effect";
import * as Arr from "effect/Array";
import { ICON_NAMES, ICON_SIZES, Icon, type IconName } from "@gpuixui/icons";
import type { ReactElement } from "react";
import { Box, Separator, Stack, Text, useTheme } from "../src/index.js";

const SIZES = ["xl", "lg", "md", "sm", "xs"] as const;

const STATUS_ICONS: ReadonlyArray<{
  readonly name: IconName;
  readonly tone: "success" | "destructive" | "muted";
}> = [
  { name: "success", tone: "success" },
  { name: "warning", tone: "destructive" },
  { name: "clock", tone: "muted" },
];

const WORKSPACE_ICONS: ReadonlyArray<IconName> = [
  "panel-left",
  "panel-right",
  "panel-bottom",
  "terminal",
  "file",
  "file-text",
  "save",
  "play",
  "pause",
  "undo",
  "redo",
  "sparkles",
];

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
              {}
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

        <Stack direction="column" gap="xs">
          <Text role="caption" tone="muted">
            Workspace
          </Text>
          <Stack direction="row" align="center" gap="sm">
            {Arr.map(WORKSPACE_ICONS, (name) => (
              <Icon
                key={name}
                name={name}
                color={theme.colors.mutedForeground}
                size="md"
                testId={`icon-${name}`}
              />
            ))}
          </Stack>
        </Stack>

        <Separator orientation="horizontal" />

        <Stack direction="column" gap="sm">
          {Arr.map(SIZES, (size) => (
            <Stack direction="row" align="center" gap="sm" key={size}>
              <Text role="caption" tone="muted" style={{ width: 20 }}>
                {size}
              </Text>
              {}
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
