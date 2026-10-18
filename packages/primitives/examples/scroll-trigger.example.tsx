/**
 * Scroll trigger example: an activity log with a hint.
 *
 * A labelled `ScrollArea` is one focusable root and accepts the `Tooltip` slot
 * contract (plan `399b`). The log text opts out of hit-testing with
 * `pointerEvents: "none"` so the pointer reaches the region: GPUix dispatches a
 * mouse event to the hit-tested element and does not bubble it to an ancestor,
 * so a content-filled region would only open the tip from the keyboard.
 */

import * as Arr from "effect/Array";
import type { ReactElement } from "react";
import {
  Box,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
  useTheme,
} from "../src/index.js";

const events = [
  "09:42  Build 0.10.0 finished",
  "09:40  Theme tokens compiled",
  "09:37  Smoke suite started",
  "09:31  Branch agent/primitives pushed",
  "09:28  Rating preview verified",
  "09:20  Tooltip long-content cap",
  "09:12  Release notes drafted",
  "09:04  Native binding loaded",
  "08:58  Workspace restored",
] as const;

/** An activity log whose region explains how to see older entries. */
export const ScrollTriggerExample = (): ReactElement => {
  const theme = useTheme();
  return (
    <Box
      tone="card"
      radius="lg"
      border
      testId="scroll-trigger-example"
      style={{ overflow: "hidden" }}
    >
      <Stack
        direction="row"
        align="center"
        justify="between"
        gap="sm"
        style={{
          paddingLeft: theme.spacing.md,
          paddingRight: theme.spacing.md,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.sm,
        }}
      >
        <Text role="h3">Activity log</Text>
        <Text role="caption" tone="muted">
          {events.length} events
        </Text>
      </Stack>
      <Tooltip
        content="Scroll for older entries"
        side="top"
        style={{ width: 320 }}
      >
        <ScrollArea
          label="Activity log"
          testId="scroll-trigger-example-log"
          style={{ height: 180 }}
        >
          <Stack
            direction="column"
            gap="xs"
            style={{ padding: theme.spacing.md, pointerEvents: "none" }}
          >
            {Arr.map(events, (event) => (
              <Text role="caption" key={event}>
                {event}
              </Text>
            ))}
          </Stack>
        </ScrollArea>
      </Tooltip>
    </Box>
  );
};
