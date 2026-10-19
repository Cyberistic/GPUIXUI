/**
 * Form example: a project-creation form.
 *
 * A controlled form, not a field sampler: every value lives in the caller, the
 * save button shows the busy state the library supports, and the progress bar
 * appears only while the request is in flight. `Label` carries the visible name
 * and each control carries the same name for assistive technology, because the
 * runtime has no `aria-labelledby` (see `docs/label.mdx`).
 */

import { useState, type ReactElement } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  IconButton,
  Input,
  Label,
  Progress,
  Select,
  Stack,
  Text,
  TextArea,
} from "../src/index.js";

const REGIONS = [
  {
    label: "Europe",
    options: [{ value: "eu-west", label: "Europe — West" }],
  },
  {
    label: "Americas and Asia",
    options: [
      { value: "us-east", label: "United States — East" },
      { value: "ap-south", label: "Asia — South" },
      { value: "legacy", label: "Legacy region (read-only)", disabled: true },
    ],
  },
] as const;

/** A form with four controls, a byte-sized progress state and a busy action. */
export const FormExample = (): ReactElement => {
  const [name, setName] = useState("Atlas");
  const [owner, setOwner] = useState("");
  const [notes, setNotes] = useState("");
  const [region, setRegion] = useState("eu-west");
  const [saving, setSaving] = useState(false);

  return (
    <Box
      tone="card"
      padding="lg"
      radius="md"
      border
      testId="form-example"
      style={{ width: 440 }}
    >
      <Stack direction="column" gap="md">
        <Stack direction="row" justify="between" align="start" gap="sm">
          <Stack direction="column" gap="2xs">
            <Text role="h3">Project settings</Text>
            <Text role="caption" tone="muted">
              You can change these after the project is created.
            </Text>
          </Stack>
          <IconButton
            icon="refresh"
            label="Reset form"
            variant="ghost"
            size="sm"
            onActivate={() => {
              setName("Atlas");
              setOwner("");
              setNotes("");
              setRegion("eu-west");
              setSaving(false);
            }}
            testId="form-example-reset"
          />
        </Stack>

        <Stack direction="column" gap="2xs">
          <Label required description="Shown in the workspace switcher.">
            Project name
          </Label>
          <Input
            value={name}
            onValueChange={setName}
            label="Project name"
            placeholder="Atlas"
            autoFocus
            fullWidth
            testId="form-example-name"
          />
        </Stack>

        <Stack direction="column" gap="2xs">
          <Label description="The person who receives access requests.">
            Owner email
          </Label>
          <Input
            value={owner}
            onValueChange={setOwner}
            label="Owner email"
            placeholder="you@example.com"
            fullWidth
          />
        </Stack>

        <Stack direction="column" gap="2xs">
          <Label>Region</Label>
          <Select
            value={region}
            onValueChange={setRegion}
            label="Region"
            fullWidth
            options={REGIONS}
          />
        </Stack>

        <Stack direction="column" gap="2xs">
          <Label description="Markdown is not interpreted.">Description</Label>
          <TextArea
            value={notes}
            onValueChange={setNotes}
            label="Description"
            placeholder="What is this project for?"
            minRows={3}
            maxRows={6}
            fullWidth
          />
        </Stack>

        {saving ? (
          <Progress label="Creating project" value={62} tone="success" />
        ) : null}

        <ButtonGroup
          mode="separated"
          gap="sm"
          label="Form actions"
          style={{ justifyContent: "flex-end" }}
        >
          <Button
            variant="ghost"
            onActivate={() => {
              setSaving(false);
              setName("Atlas");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={saving}
            onActivate={() => setSaving(true)}
            testId="form-example-save"
          >
            Create project
          </Button>
        </ButtonGroup>

        <Text role="caption" tone="muted">
          Region cannot be changed later without recreating the project.
        </Text>
      </Stack>
    </Box>
  );
};
