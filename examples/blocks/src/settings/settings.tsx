/** @jsxImportSource @gpuix/react */
import { Avatar } from "@gpuixui/components/avatar";
import { Card } from "@gpuixui/components/card";
import { Icon } from "@gpuixui/icons";
import {
  Button,
  Separator,
  Slider,
  Spacer,
  Stack,
  Switch,
  Text,
  ToggleGroup,
} from "@gpuixui/primitives";
import {
  darkTheme,
  lightTheme,
  platformTheme,
  type Theme,
} from "@gpuixui/tokens";
import { ThemeProvider, useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import { useState, type ReactNode } from "react";
import { looks, sections, type Look } from "./data.js";
import { isLook } from "./logic.js";

export { looks, type Look } from "./data.js";

export interface SettingsProps {
  readonly look: Look;
  readonly onLookChange: (look: Look) => void;
  readonly dark: boolean;
  readonly onDarkChange: (dark: boolean) => void;
}

const railWidth = (theme: Theme): number => theme.spacing["5xl"] * 3.5;

const Row = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) => {
  const theme = useTheme();
  return (
    <Stack
      direction="row"
      align="center"
      justify="between"
      gap="lg"
      style={{ paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.lg }}
    >
      <Stack direction="column" gap="2xs">
        <Text role="label">{label.toUpperCase()}</Text>
        {hint === undefined ? null : (
          <Text role="caption" tone="muted">
            {hint}
          </Text>
        )}
      </Stack>
      {children}
    </Stack>
  );
};

const Sidebar = () => {
  const theme = useTheme();
  return (
    <Stack
      direction="column"
      gap="2xs"
      style={{
        width: railWidth(theme),
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.background,
        borderRightWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <Stack
        direction="row"
        gap="sm"
        align="center"
        style={{ paddingBottom: theme.spacing.lg }}
      >
        <Avatar name="Gon Freecss" size="md" />
        <Stack direction="column" gap="2xs">
          <Text role="label">Gon Freecss</Text>
          <Text role="caption" tone="muted">
            Hunter License
          </Text>
        </Stack>
      </Stack>
      {Arr.map(sections, ([icon, name]) => (
        <Stack
          key={name}
          direction="row"
          gap="sm"
          align="center"
          style={{
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            backgroundColor:
              name === "Appearance" ? theme.colors.accent : undefined,
          }}
        >
          <Icon
            name={icon}
            size={theme.iconSize.sm}
            color={theme.colors.foreground}
          />
          <Text role="body">{name}</Text>
        </Stack>
      ))}
    </Stack>
  );
};

export const Settings = ({
  look,
  onLookChange,
  dark,
  onDarkChange,
}: SettingsProps) => {
  const theme = useTheme();
  const [sounds, setSounds] = useState(true);
  return (
    <Stack
      direction="row"
      testId="settings"
      style={{
        flexGrow: 1,
        width: "100%",
        height: "100%",
        alignItems: "stretch",
        backgroundColor: theme.colors.card,
      }}
    >
      <Sidebar />
      <Stack
        direction="column"
        gap="lg"
        style={{ flexGrow: 1, padding: theme.spacing["2xl"] }}
      >
        <Text role="h2">Appearance</Text>
        <Card
          variant="outline"
          style={{
            paddingLeft: theme.spacing.xl,
            paddingRight: theme.spacing.xl,
            background: {
              type: "linear-gradient",
              angle: 165,
              stops: [
                { color: theme.colors.card, position: 0 },
                { color: theme.colors.background, position: 1 },
              ],
            } as never,
            boxShadow: {
              offsetX: 0,
              offsetY: 0,
              blurRadius: 22,
              spreadRadius: 0,
              color: "rgba(10, 132, 255, 0.07)",
            },
          }}
        >
          <Row label="Look" hint="Every control follows the platform">
            <ToggleGroup
              type="single"
              label="Look"
              value={look}
              onValueChange={(next) =>
                isLook(next) ? onLookChange(next) : undefined
              }
              options={looks}
              itemTestId={(value) => `look-${value}`}
            />
          </Row>
          <Separator orientation="horizontal" />
          <Row label="Dark mode">
            <Switch
              testId="dark"
              label="Dark mode"
              checked={dark}
              onCheckedChange={onDarkChange}
            />
          </Row>
        </Card>
        <Card
          variant="outline"
          style={{
            paddingLeft: theme.spacing.xl,
            paddingRight: theme.spacing.xl,
            background: {
              type: "linear-gradient",
              angle: 165,
              stops: [
                { color: theme.colors.card, position: 0 },
                { color: theme.colors.background, position: 1 },
              ],
            } as never,
            boxShadow: {
              offsetX: 0,
              offsetY: 0,
              blurRadius: 22,
              spreadRadius: 0,
              color: "rgba(10, 132, 255, 0.07)",
            },
          }}
        >
          <Row label="Sound effects" hint="Play a sound on every press">
            <Switch
              testId="sounds"
              label="Sound effects"
              checked={sounds}
              onCheckedChange={setSounds}
            />
          </Row>
          <Separator orientation="horizontal" />
          <Row label="Volume">
            <Slider
              testId="volume"
              label="Volume"
              step={10}
              defaultValue={60}
              style={{ width: railWidth(theme) }}
            />
          </Row>
        </Card>
        <Spacer />
        <Stack direction="row" gap="sm" justify="end">
          <Button variant="ghost">Cancel</Button>
          <Button testId="save" variant="primary">
            Save changes
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
};

export const SettingsApp = ({
  initialLook = "darwin",
}: {
  readonly initialLook?: Look;
}) => {
  const [look, setLook] = useState<Look>(initialLook);
  const [dark, setDark] = useState(false);
  return (
    <ThemeProvider theme={platformTheme(dark ? darkTheme : lightTheme, look)}>
      <Settings
        look={look}
        onLookChange={setLook}
        dark={dark}
        onDarkChange={setDark}
      />
    </ThemeProvider>
  );
};
