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

        <Row
          title="Pause everything"
          description="Keeps your preferences; sends nothing until paused off."
        >
          <Switch
            checked={paused}
            onValueChange={setPaused}
            label="Pause all notifications"
            testId="selection-example-pause"
          />
        </Row>
      </Stack>
    </Box>
  );
};
