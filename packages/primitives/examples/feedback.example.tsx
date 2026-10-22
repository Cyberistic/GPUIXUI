/**
 * Feedback example: a metric card that is still loading.
 *
 * The three loading surfaces in their real roles — a skeleton for content that
 * has not arrived, a spinner for work in progress, and a tooltip that explains
 * a metric without occupying the card. The trigger is the icon action a reader
 * would reach for: `IconButton` forwards the trigger pair, so the tip opens on
 * hover — the window's only open path — and its text is the trigger's
 * description.
 */

import { Icon } from "@gpuixui/icons";
import type { ReactElement } from "react";
import {
  Box,
  IconButton,
  Skeleton,
  Spinner,
  Stack,
  Text,
  Tooltip,
  useTheme,
} from "../src/index.js";

/** A loading revenue card with a tooltip on the metric's definition. */
export const FeedbackExample = (): ReactElement => {
  const theme = useTheme();
  return (
    <Box
      tone="card"
      padding="lg"
      radius="md"
      border
      testId="feedback-example"
      style={{ width: 360 }}
    >
      <Stack direction="column" gap="md">
        <Stack direction="row" align="center" justify="between" gap="sm">
          <Stack direction="row" align="center" gap="xs">
            <Text role="h3">Revenue</Text>
            <Tooltip
              content="Booked revenue, net of refunds."
              side="bottom"
              testId="feedback-example-tooltip"
            >
              <IconButton
                testId="feedback-example-tooltip-trigger"
                size="sm"
                label="Revenue definition"
                icon={
                  <Icon
                    name="info"
                    color={theme.colors.mutedForeground}
                    size={theme.iconSize.sm}
                  />
                }
              />
            </Tooltip>
          </Stack>
          <Spinner size={theme.iconSize.sm} label="Refreshing revenue" />
        </Stack>

        <Stack direction="column" gap="sm">
          <Skeleton height={36} width="45%" />
          <Skeleton height={14} width="70%" />
        </Stack>

        <Stack direction="column" gap="xs">
          <Skeleton height={12} />
          <Skeleton height={12} width="85%" />
          <Skeleton height={12} width="92%" />
        </Stack>

        <Stack direction="row" align="center" gap="xs">
          <Icon
            name="clock"
            color={theme.colors.mutedForeground}
            size={theme.iconSize.xs}
          />
          <Text role="caption" tone="muted">
            Last updated 2 minutes ago
          </Text>
        </Stack>
      </Stack>
    </Box>
  );
};
