/** @jsxImportSource @gpuix/react */
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
