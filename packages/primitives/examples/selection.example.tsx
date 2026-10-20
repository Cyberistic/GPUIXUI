/**
 * Selection example: notification preferences.
 *
 * The three selection controls in the roles they actually differ in — a
 * checkbox group with a derived select-all parent, a radio group for cadence,
 * and a switch for an immediate pause. Each is controlled by the caller, so the
 * example demonstrates the API a real settings screen uses.
 */

import { useState, type ReactElement } from "react";
import {
  Box,
  CheckboxGroup,
  RadioGroup,
  Separator,
  Stack,
  Switch,
  Text,
} from "../src/index.js";

/** Notification preferences: a channel set, a radio group and a switch. */
export const SelectionExample = (): ReactElement => {
  const [channels, setChannels] = useState<readonly string[]>(["email"]);
  const [cadence, setCadence] = useState("daily");
  const [paused, setPaused] = useState(false);

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

        <CheckboxGroup
          label="Notification channels"
          selectAll="All channels"
          value={channels}
          onValueChange={setChannels}
          options={[
            {
              value: "email",
              label: "Email",
              description: "A digest to your account address.",
            },
            {
              value: "push",
              label: "Push",
              description: "Delivered by the desktop application.",
            },
          ]}
        />

        <Separator orientation="horizontal" />

        <Stack direction="column" gap="sm">
          <Text role="label">Digest cadence</Text>
          <RadioGroup
            label="Digest cadence"
            value={cadence}
            onValueChange={setCadence}
            options={[
              { value: "daily", label: "Daily" },
              {
                value: "weekly",
                label: "Weekly",
                description: "Every Monday.",
              },
              { value: "never", label: "Never" },
            ]}
          />
        </Stack>

        <Separator orientation="horizontal" />

        <Stack direction="column" gap="2xs">
          <Switch
            checked={paused}
            onValueChange={setPaused}
            testId="selection-example-pause"
          >
            Pause all notifications
          </Switch>
          <Text role="caption" tone="muted">
            Keeps your preferences; sends nothing until paused off.
          </Text>
        </Stack>
      </Stack>
    </Box>
  );
};
