/**
 * IconButton example: a layer toolbar.
 *
 * The place icon-only actions belong — a row of tools above a canvas, where a
 * label would be noise for a sighted user and the only thing a screen reader
 * has to go on. Every action carries its name; Delete is unavailable until a
 * layer is picked, and Export shows the busy state a long write uses.
 *
 * Each glyph takes the role of the paint it sits on, because an `Icon` paints
 * one monochrome tint: a literal black would disappear on the dark theme and on
 * the filled destructive action.
 */

import { useState, type ReactElement } from "react";
import {
  Box,
  IconButton,
  Separator,
  Stack,
  Text,
  useTheme,
} from "../src/index.js";
import { Icon } from "@gpuixui/icons";

/** A canvas toolbar: named icon actions, one unavailable, one busy. */
export const IconButtonExample = (): ReactElement => {
  const theme = useTheme();
  const [selected, setSelected] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [saved, setSaved] = useState("Ready");

  return (
    <Box
      tone="card"
      padding="lg"
      radius="md"
      border
      testId="icon-button-example"
      style={{ width: 440 }}
    >
      <Stack direction="column" gap="md">
        <Text role="h3">Layer toolbar</Text>

        <Stack direction="row" gap="2xs" align="center">
          <IconButton
            testId="icon-button-example-add"
            label="Add layer"
            icon={<Icon name="plus" color={theme.colors.foreground} />}
            onActivate={() => setSelected(true)}
          />
          <IconButton
            testId="icon-button-example-rename"
            label="Rename layer"
            icon={<Icon name="pencil" color={theme.colors.foreground} />}
            disabled={!selected}
            onActivate={() => setSaved("Renamed")}
          />
          <IconButton
            testId="icon-button-example-settings"
            label="Layer settings"
            icon={<Icon name="settings" color={theme.colors.foreground} />}
            variant="outline"
            onActivate={() => setSaved("Settings opened")}
          />
          <IconButton
            testId="icon-button-example-export"
            label="Export layer"
            icon={<Icon name="upload" color={theme.colors.foreground} />}
            loading={exporting}
            onActivate={() => {
              setExporting(true);
              setSaved("Exporting");
            }}
          />
          <IconButton
            testId="icon-button-example-delete"
            label="Delete layer"
            icon={
              <Icon name="trash" color={theme.colors.destructiveForeground} />
            }
            variant="destructive"
            disabled={!selected}
            onActivate={() => {
              setSelected(false);
              setSaved("Deleted");
            }}
          />
        </Stack>

        <Separator orientation="horizontal" />

        <Text role="caption" tone="muted">
          {`Layer ${selected ? "selected" : "none"} · ${saved}`}
        </Text>
      </Stack>
    </Box>
  );
};
