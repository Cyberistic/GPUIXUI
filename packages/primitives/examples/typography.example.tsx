/**
 * Typography example: one release-notes entry.
 *
 * Every role in the scale appears in the place it belongs — a heading, running
 * body, a strong lead, labels, a caption, inline code and a code block — so the
 * page demonstrates hierarchy instead of listing font sizes. Tones carry
 * meaning too: muted for metadata, destructive for the breaking-change notice.
 * The release body is `selectable`, so content can be taken with the pointer
 * while chrome and metadata stay inert (plan `385`).
 */

import { Icon } from "@gpuixui/icons";
import type { ReactElement } from "react";
import { Box, Separator, Stack, Text, useTheme } from "../src/index.js";

/** A release-notes card using every typographic role and the common tones. */
export const TypographyExample = (): ReactElement => {
  const theme = useTheme();
  return (
    <Box
      tone="card"
      padding="lg"
      radius="md"
      border
      testId="typography-example"
      style={{ width: 460 }}
    >
      <Stack direction="column" gap="sm">
        <Stack direction="row" align="center" gap="xs">
          <Icon
            name="info"
            color={theme.colors.mutedForeground}
            size={theme.iconSize.sm}
          />
          <Text role="caption" tone="muted">
            Release notes · 17 October 2026
          </Text>
        </Stack>

        <Text role="h2">Version 0.10.0</Text>

        <Text role="bodyStrong">
          GPUIxUI now draws every Tier 1 primitive in the real GPUix runtime.
        </Text>

        <Text role="body" selectable>
          Layout, fields, selection controls, progress and tooltips share one
          theme and one keyboard contract. The docs site documents behaviour it
          has actually measured, and the playground runs the same components
          natively.
        </Text>

        <Text role="h3">Breaking change</Text>

        <Text role="body" tone="destructive">
          A textarea no longer accepts an onSubmit handler: the runtime would
          trade the newline for a submit.
        </Text>

        <Text role="label">Upgrade with</Text>

        <Text role="code">nub add @gpuixui/primitives@0.10.0</Text>

        <Separator orientation="horizontal" />

        <Text role="label" tone="muted">
          After upgrading
        </Text>

        <Text role="codeBlock">
          {
            "const price = await pricing.getPrice(100);\n// => 650 when surge pricing is on"
          }
        </Text>

        <Text role="caption" tone="muted">
          Read the migration note before upgrading a shipping application.
        </Text>
      </Stack>
    </Box>
  );
};
