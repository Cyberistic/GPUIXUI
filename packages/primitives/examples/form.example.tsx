/** @jsxImportSource @gpuix/react */
import { useRef, useState, type ReactElement } from "react";
import type { PublicInstance } from "@gpuix/react";
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

const copy = (label: string, description: string) => ({ label, description });

const NAME = copy("Project name", "Shown in the workspace switcher.");
const OWNER = copy("Owner email", "The person who receives access requests.");
const NOTES = copy("Description", "Markdown is not interpreted.");

const NAME_LIMIT = 60;

const overLimit = (name: string): boolean => name.length > NAME_LIMIT;

export const FormExample = (): ReactElement => {
  const [name, setName] = useState("Atlas");
  const [owner, setOwner] = useState("");
  const [notes, setNotes] = useState("");
  const [region, setRegion] = useState("eu-west");
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<PublicInstance>(null);
  const ownerRef = useRef<PublicInstance>(null);

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
          <Label target={nameRef} description={NAME.description}>
            {NAME.label}
          </Label>
          <Input
            ref={nameRef}
            value={name}
            onChange={setName}
            {...NAME}
            placeholder="Atlas"
            autoFocus
            fullWidth
            invalid={overLimit(name)}
            testId="form-example-name"
          />
          {}
          <Text
            role="caption"
            tone={overLimit(name) ? "destructive" : "muted"}
            testId="form-example-name-count"
          >
            {`${name.length} of ${NAME_LIMIT} characters`}
          </Text>
        </Stack>

        <Stack direction="column" gap="2xs">
          <Label target={ownerRef} description={OWNER.description}>
            {OWNER.label}
          </Label>
          <Input
            ref={ownerRef}
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
            {}
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
