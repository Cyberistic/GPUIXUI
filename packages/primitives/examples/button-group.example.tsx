/**
 * ButtonGroup example: a command row and a stacked action set.
 *
 * The group is layout only — it clusters related commands under one name and
 * owns the shape, while each `Button` owns its own activation. The two axes are
 * shown together because they are the two shapes the component has: a toolbar
 * row of commands, and a full-width stack of secondary actions in a settings
 * card. A selected segmented control is `ToggleGroup`, not this.
 */

import { useState, type ReactElement } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Separator,
  Stack,
  Text,
} from "../src/index.js";

/** A document card with a toolbar row and a vertical action stack. */
export const ButtonGroupExample = (): ReactElement => {
  const [last, setLast] = useState("No action yet.");

  return (
    <Box
      tone="card"
      padding="lg"
      radius="md"
      border
      testId="button-group-example"
      style={{ width: 420 }}
    >
      <Stack direction="column" gap="md">
        <Stack direction="column" gap="2xs">
          <Text role="h3">Document actions</Text>
          <Text role="caption" tone="muted">
            Related commands share one shape; the axis follows the layout.
          </Text>
        </Stack>

        <ButtonGroup mode="attached" label="Editing commands">
          <Button variant="ghost" onActivate={() => setLast("Undid the edit.")}>
            Undo
          </Button>
          <Button variant="ghost" onActivate={() => setLast("Redid the edit.")}>
            Redo
          </Button>
          <Button
            variant="primary"
            onActivate={() => setLast("Saved the file.")}
          >
            Save
          </Button>
        </ButtonGroup>

        <Separator orientation="horizontal" />

        <Stack direction="column" gap="2xs">
          <Text role="label">Ownership</Text>
          <Text role="caption" tone="muted">
            These actions cannot be undone from this screen.
          </Text>
        </Stack>

        <ButtonGroup
          mode="attached"
          orientation="vertical"
          label="Ownership actions"
        >
          <Button
            variant="secondary"
            onActivate={() => setLast("Asked the owner to transfer access.")}
          >
            Transfer ownership
          </Button>
          <Button
            variant="secondary"
            testId="button-group-example-archive"
            onActivate={() => setLast("Archived the document.")}
          >
            Archive document
          </Button>
          <Button
            variant="destructive"
            onActivate={() => setLast("Deleted the document.")}
          >
            Delete document
          </Button>
        </ButtonGroup>

        <Text role="caption" tone="muted" testId="button-group-example-last">
          {last}
        </Text>
      </Stack>
    </Box>
  );
};
