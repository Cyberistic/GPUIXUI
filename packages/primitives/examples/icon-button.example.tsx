/** @jsxImportSource @gpuix/react */
import { useState, type ReactElement } from "react";
import {
  Box,
  ButtonGroup,
  IconButton,
  Separator,
  Stack,
  Text,
  useTheme,
} from "../src/index.js";
import { Icon } from "@gpuixui/icons";

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

        <Stack direction="row" gap="sm" align="start">
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
          {}
          <ButtonGroup
            mode="attached"
            orientation="vertical"
            label="Zoom"
            testId="icon-button-example-zoom"
          >
            <IconButton
              testId="icon-button-example-zoom-in"
              label="Zoom in"
              icon={<Icon name="plus" color={theme.colors.foreground} />}
              onActivate={() => setSaved("Zoomed in")}
            />
            <IconButton
              testId="icon-button-example-zoom-out"
              label="Zoom out"
              icon={<Icon name="minus" color={theme.colors.foreground} />}
              onActivate={() => setSaved("Zoomed out")}
            />
          </ButtonGroup>
        </Stack>

        <Separator orientation="horizontal" />

        <Text role="caption" tone="muted">
          {`Layer ${selected ? "selected" : "none"} · ${saved}`}
        </Text>
      </Stack>
    </Box>
  );
};
