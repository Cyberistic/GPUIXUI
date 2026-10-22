/**
 * Form example: a project-creation form.
 *
 * A controlled form, not a field sampler: every value lives in the caller, the
 * save button shows the busy state the library supports, and the progress bars
 * appear only while the request is in flight — one reporting work buffered
 * ahead of the value. Each field's copy is written once and spread into both the
 * visible `Label` and the control, because the runtime has neither
 * `aria-labelledby` nor `aria-describedby` (see `docs/label.mdx`).
 */

import { useState, type ReactElement } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Input,
  Label,
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
  Select,
  Stack,
  Text,
  TextArea,
} from "../src/index.js";

const REGIONS = [
  { value: "eu-west", label: "Europe — West" },
  { value: "us-east", label: "United States — East" },
  { value: "ap-south", label: "Asia — South" },
  { value: "legacy", label: "Legacy region (read-only)", disabled: true },
] as const;

/**
 * One field's copy, written once.
 *
 * The `Label` paints `description`; the field's own prop is what assistive
 * technology hears, because 0.11.0 has neither `aria-labelledby` nor
 * `aria-describedby` to connect the two nodes.
 */
const copy = (label: string, description: string) => ({ label, description });

const NAME = copy("Project name", "Shown in the workspace switcher.");
const OWNER = copy("Owner email", "The person who receives access requests.");
const NOTES = copy("Description", "Markdown is not interpreted.");

/** A project name longer than this is refused by the action, not the field. */
const NAME_LIMIT = 60;

/** Whether the name is past the length the action accepts. */
const overLimit = (name: string): boolean => name.length > NAME_LIMIT;

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
        <Stack direction="column" gap="2xs">
          <Text role="h3">Project settings</Text>
          <Text role="caption" tone="muted">
            You can change these after the project is created.
          </Text>
        </Stack>

        <Stack direction="column" gap="2xs">
          <Label description={NAME.description}>{NAME.label}</Label>
          <Input
            value={name}
            onChange={setName}
            {...NAME}
            placeholder="Atlas"
            autoFocus
            fullWidth
            invalid={overLimit(name)}
            testId="form-example-name"
          />
          {/* The runtime applies a field's `value` only when it changed, so a
              cap cannot take the sixty-first character back; the form counts and
              refuses instead (`docs/input.mdx` §Theming). */}
          <Text
            role="caption"
            tone={overLimit(name) ? "destructive" : "muted"}
            testId="form-example-name-count"
          >
            {`${name.length} of ${NAME_LIMIT} characters`}
          </Text>
        </Stack>

        <Stack direction="column" gap="2xs">
          <Label description={OWNER.description}>{OWNER.label}</Label>
          <Input
            value={owner}
            onChange={setOwner}
            {...OWNER}
            placeholder="you@example.com"
            fullWidth
          />
        </Stack>

        <Stack direction="column" gap="2xs">
          <Label>Region</Label>
          <Select
            value={region}
            onChange={setRegion}
            label="Region"
            fullWidth
            options={REGIONS}
          />
        </Stack>

        <Stack direction="column" gap="2xs">
          <Label description={NOTES.description}>{NOTES.label}</Label>
          <TextArea
            value={notes}
            onChange={setNotes}
            {...NOTES}
            placeholder="What is this project for?"
            minRows={3}
            maxRows={6}
            fullWidth
          />
        </Stack>

        {saving ? (
          <Stack direction="column" gap="sm">
            <Progress
              label="Creating project"
              value={62}
              tone="success"
              formatValue={(percent) => `${percent}% complete`}
            >
              <Stack direction="row" justify="between">
                <ProgressLabel />
                <ProgressValue />
              </Stack>
              <ProgressTrack>
                <ProgressIndicator />
              </ProgressTrack>
            </Progress>
            {/* A download's held-ahead share: the segment between the value
                and the buffer is what is already received. */}
            <Progress value={42} buffer={78} label="Uploading assets" />
          </Stack>
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
            disabled={overLimit(name)}
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
