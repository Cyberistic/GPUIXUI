/**
 * Tooltip example: the release actions of a draft.
 *
 * The composition a consumer copies: each action is a focusable control with a
 * `Tooltip` around it, so the tip opens on hover and on keyboard focus and the
 * same string is the control's `aria-description` while the tip is closed
 * (plans `341`, `345`, `347`). The publish action is caller-owned state, so the
 * example proves an interaction inside the wrapped control still works.
 */

import { useState, type ReactElement } from "react";
import {
  Box,
  Button,
  IconButton,
  Separator,
  Stack,
  Text,
  Toggle,
  Tooltip,
} from "../src/index.js";

/** Release actions: a publish, a destructive delete, and a changelog toggle. */
export const TooltipExample = (): ReactElement => {
  const [published, setPublished] = useState(false);
  const [changelog, setChangelog] = useState(true);

  return (
    <Box
      tone="card"
      padding="lg"
      radius="md"
      border
      testId="tooltip-example"
      style={{ width: 460 }}
    >
      <Stack direction="column" gap="md">
        <Text role="h3">Release 0.10.0</Text>
        <Text role="caption" tone="muted">
          Hover or focus an action to read its tip.
        </Text>

        <Stack direction="row" align="center" gap="sm">
          <Tooltip
            content="Make this release available to everyone."
            side="bottom"
            testId="tooltip-example-publish-tip"
          >
            <Button
              testId="tooltip-example-publish"
              onActivate={() => setPublished(true)}
              disabled={published}
            >
              {published ? "Published" : "Publish"}
            </Button>
          </Tooltip>

          <Tooltip
            content="Delete this draft permanently."
            side="bottom"
            testId="tooltip-example-delete-tip"
          >
            <IconButton
              testId="tooltip-example-delete"
              icon="trash"
              label="Delete release"
              variant="destructive"
              onActivate={() => setPublished(false)}
            />
          </Tooltip>

          <Tooltip
            content="Include the generated notes in the release."
            side="top"
            testId="tooltip-example-changelog-tip"
          >
            <Toggle
              testId="tooltip-example-changelog"
              label="Changelog"
              variant="outline"
              pressed={changelog}
              onPressedChange={setChangelog}
            >
              Changelog
            </Toggle>
          </Tooltip>
        </Stack>

        <Separator orientation="horizontal" />

        <Text role="caption" tone="muted" testId="tooltip-example-status">
          {published
            ? "Published to the stable channel."
            : "Draft — publish when the notes are ready."}
        </Text>
      </Stack>
    </Box>
  );
};
