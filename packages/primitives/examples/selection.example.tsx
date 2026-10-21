/**
 * Selection example: notification preferences.
 *
 * The three selection controls in the roles they actually differ in — a
 * checkbox group with an indeterminate parent, a radio group for cadence, and a
 * switch for an immediate pause. Each is controlled by the caller, so the
 * example demonstrates the API a real settings screen uses.
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@gpuixui/icons";
import {
  Box,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Separator,
  Stack,
  Switch,
  Text,
  useTheme,
} from "../src/index.js";

/** A labelled row: the control and the sentence that explains it. */
const Row = ({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly children: ReactElement;
}): ReactElement => (
  <Stack direction="row" align="center" justify="between" gap="md">
    <Stack direction="column" gap="2xs" grow>
      <Text role="label">{title}</Text>
      <Text role="caption" tone="muted">
        {description}
      </Text>
    </Stack>
    {children}
  </Stack>
);

/** Notification preferences: checkboxes, a radio group and a switch. */
export const SelectionExample = (): ReactElement => {
  const theme = useTheme();
  const [email, setEmail] = useState(true);
  const [push, setPush] = useState(false);
  const [cadence, setCadence] = useState("daily");
  const [paused, setPaused] = useState(false);
  const all = email && push;
  const none = !email && !push;

  return (
    <Box
      tone="card"
      padding="lg"
      radius="md"
      border
      testId="selection-example"
      style={{ width: 440 }}
    >
      <Stack direction="column" gap="md">
        <Text role="h3">Notifications</Text>

        <Checkbox
          checked={all}
          indeterminate={!all && !none}
          onCheckedChange={(next) => {
            setEmail(next);
            setPush(next);
          }}
          label="All channels"
        />
        <Text role="caption" tone="muted">
          {all
            ? "Every channel is on."
            : none
              ? "No channel is on."
              : "Some channels are on."}
        </Text>

        <Stack
          direction="column"
          gap="sm"
          style={{ paddingLeft: theme.spacing.lg }}
        >
          <Row title="Email" description="A digest to your account address.">
            <Checkbox
              checked={email}
              onCheckedChange={setEmail}
              label="Email notifications"
            />
          </Row>
          <Row title="Push" description="Delivered by the desktop application.">
            <Checkbox
              checked={push}
              onCheckedChange={setPush}
              label="Push notifications"
            />
          </Row>
          <Row
            title="Favourites"
            description="A custom mark replaces the default check."
          >
            <Checkbox
              defaultChecked
              label="Mark as favourite"
              testId="selection-example-favourite"
            >
              <Icon
                name="star-filled"
                size={theme.iconSize.sm}
                color={theme.colors.primaryForeground}
              />
            </Checkbox>
          </Row>
        </Stack>

        <Separator orientation="horizontal" />

        <Stack direction="column" gap="sm">
          <Text role="label">Digest cadence</Text>
          <RadioGroup
            label="Digest cadence"
            value={cadence}
            onValueChange={setCadence}
          >
            <RadioGroupItem value="daily" label="Daily">
              <Text role="label">Daily</Text>
              <Text role="caption" tone="muted">
                One email each morning.
              </Text>
            </RadioGroupItem>
            <RadioGroupItem value="weekly" label="Weekly">
              <Text role="label">Weekly</Text>
              <Text role="caption" tone="muted">
                Every Monday.
              </Text>
            </RadioGroupItem>
            <RadioGroupItem value="never" label="Never">
              <Icon
                name="x"
                size={theme.iconSize.sm}
                color={theme.colors.mutedForeground}
              />
              <Text role="label">Never</Text>
            </RadioGroupItem>
          </RadioGroup>
        </Stack>

        <Separator orientation="horizontal" />

        <Row
          title="Pause everything"
          description="Keeps your preferences; sends nothing until paused off."
        >
          <Switch
            checked={paused}
            onCheckedChange={setPaused}
            label="Pause all notifications"
            testId="selection-example-pause"
          />
        </Row>
      </Stack>
    </Box>
  );
};
