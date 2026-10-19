/**
 * The Tier 1 set in one workflow.
 *
 * Not a gallery of swatches: this is the settings form an application would
 * actually ship — a labelled field set with live validation, a select, three
 * kinds of selection control, a save that shows progress, a loading state, and
 * a light/dark switch — so every primitive is exercised the way a consumer
 * would use it, including the composition between them.
 *
 * It needs the GPUix runtime to open a window; `main.tsx` is the mount
 * boundary. See `README.md` for the run command and for what is verified where.
 */

import { useEffect, useState, type ReactElement } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  CheckboxGroup,
  InfoTip,
  Input,
  Label,
  Progress,
  RadioGroup,
  ScrollArea,
  Select,
  Separator,
  Skeleton,
  Spacer,
  Spinner,
  Stack,
  Switch,
  Text,
  TextArea,
  ThemeProvider,
  type PrimitiveTheme,
} from "@gpuixui/primitives";
import * as Arr from "effect/Array";
import { darkTheme, lightTheme } from "@gpuixui/tokens";

type Mode = "light" | "dark";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AppProps {
  /** Which theme to open with. Defaults to `light`. */
  readonly initialMode?: Mode;
}

/** A form field with its visible name and its validation message. */
const Field = ({
  name,
  description,
  error,
  children,
}: {
  readonly name: string;
  readonly description?: string;
  readonly error?: string;
  readonly children: ReactElement;
}): ReactElement => (
  <Stack direction="column" gap="xs">
    <Label description={description} invalid={error !== undefined}>
      {name}
    </Label>
    {children}
    {error === undefined ? null : (
      <Text role="caption" tone="destructive">
        {error}
      </Text>
    )}
  </Stack>
);

/** A switch with a visible name and an optional explanation. */
const Toggle = ({
  name,
  description,
  checked,
  onValueChange,
}: {
  readonly name: string;
  readonly description: string;
  readonly checked: boolean;
  readonly onValueChange: (next: boolean) => void;
}): ReactElement => (
  <Stack direction="row" align="center" gap="md">
    <Stack direction="column" gap="2xs" grow>
      <Text role="label">{name}</Text>
      <Text role="caption" tone="muted">
        {description}
      </Text>
    </Stack>
    <Switch checked={checked} onValueChange={onValueChange} label={name} />
  </Stack>
);

/** The values the form opens with; Reset restores exactly these. */
const INITIAL = {
  workspace: "Acme Design",
  email: "",
  bio: "",
  plan: "team",
  density: "comfortable",
  digest: true,
  telemetry: false,
  terms: false,
} as const;

export const App = ({ initialMode = "light" }: AppProps): ReactElement => {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [workspace, setWorkspace] = useState<string>(INITIAL.workspace);
  const [email, setEmail] = useState<string>(INITIAL.email);
  const [bio, setBio] = useState<string>(INITIAL.bio);
  const [plan, setPlan] = useState<string>(INITIAL.plan);
  const [density, setDensity] = useState<string>(INITIAL.density);
  const [digest, setDigest] = useState<boolean>(INITIAL.digest);
  const [telemetry, setTelemetry] = useState<boolean>(INITIAL.telemetry);
  const [terms, setTerms] = useState<boolean>(INITIAL.terms);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // The form "arrives" over the first second, so the skeleton is a real state
  // rather than a swatch on a page.
  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(id);
  }, []);

  const theme: PrimitiveTheme = mode === "dark" ? darkTheme : lightTheme;
  const badEmail = email !== "" && !EMAIL.test(email);
  const canSave = workspace !== "" && !badEmail && terms;

  const save = (): void => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1400);
  };

  // Reset restores the form, not just the palette: a button labelled "Reset"
  // that only changed the theme would be the same class of lie as an invisible
  // consent label.
  const reset = (): void => {
    setMode(initialMode);
    setWorkspace(INITIAL.workspace);
    setEmail(INITIAL.email);
    setBio(INITIAL.bio);
    setPlan(INITIAL.plan);
    setDensity(INITIAL.density);
    setDigest(INITIAL.digest);
    setTelemetry(INITIAL.telemetry);
    setTerms(INITIAL.terms);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box tone="background" padding="xl" fullHeight>
        <Stack direction="column" gap="lg" fullHeight>
          <Stack direction="row" align="center" justify="between" gap="md">
            <Stack direction="column" gap="2xs">
              <Text role="h1">Settings</Text>
              <Text role="caption" tone="muted">
                Workspace preferences
              </Text>
            </Stack>
            <ButtonGroup>
              <Button
                size="sm"
                variant={mode === "light" ? "secondary" : "ghost"}
                onActivate={() => setMode("light")}
              >
                Light
              </Button>
              <Button
                size="sm"
                variant={mode === "dark" ? "secondary" : "ghost"}
                onActivate={() => setMode("dark")}
              >
                Dark
              </Button>
            </ButtonGroup>
          </Stack>

          <Separator orientation="horizontal" />

          <ScrollArea
            axis="vertical"
            label="Workspace settings"
            testId="settings-form"
            style={{ flexGrow: 1 }}
          >
            <Stack direction="column" gap="xl">
              {loading ? (
                <Stack direction="column" gap="sm">
                  <Skeleton height={20} width="40%" />
                  <Skeleton height={34} />
                  <Skeleton height={34} width="70%" />
                </Stack>
              ) : (
                <>
                  <Field
                    name="Workspace name"
                    description="Shown on invitations and in the app switcher."
                  >
                    <Input
                      testId="settings-workspace"
                      autoFocus
                      value={workspace}
                      onValueChange={setWorkspace}
                      label="Workspace name"
                      fullWidth
                    />
                  </Field>

                  <Field
                    name="Contact email"
                    description="Where notifications are delivered."
                    error={
                      badEmail
                        ? "Enter an address like you@example.com."
                        : undefined
                    }
                  >
                    <Input
                      value={email}
                      onValueChange={setEmail}
                      label="Contact email"
                      placeholder="you@example.com"
                      invalid={badEmail}
                      fullWidth
                    />
                  </Field>

                  <Field name="About this workspace">
                    <TextArea
                      value={bio}
                      onValueChange={setBio}
                      label="About this workspace"
                      placeholder="What is this workspace for?"
                      minRows={3}
                      maxRows={6}
                      autoFocus={false}
                      fullWidth
                    />
                  </Field>

                  <Field name="Plan">
                    <Select
                      value={plan}
                      onValueChange={setPlan}
                      label="Plan"
                      fullWidth
                      options={[
                        { value: "free", label: "Free — one member" },
                        { value: "team", label: "Team — up to 20 members" },
                        {
                          value: "enterprise",
                          label: "Enterprise — unlimited",
                        },
                        {
                          value: "legacy",
                          label: "Legacy (no longer sold)",
                          disabled: true,
                        },
                      ]}
                    />
                  </Field>

                  <Stack direction="column" gap="sm">
                    <Text role="label">Density</Text>
                    <RadioGroup
                      label="Density"
                      value={density}
                      onValueChange={setDensity}
                      options={[
                        { value: "compact", label: "Compact" },
                        {
                          value: "comfortable",
                          label: "Comfortable",
                          description: "The default for desktop apps.",
                        },
                        { value: "spacious", label: "Spacious" },
                      ]}
                    />
                  </Stack>

                  <Separator orientation="horizontal" />

                  <Stack direction="column" gap="lg">
                    <Stack direction="row" align="center" gap="xs">
                      <Text role="h3">Notifications</Text>
                      <InfoTip
                        content="Delivered by email; never your content."
                        label="Delivery method"
                      />
                    </Stack>
                    <Toggle
                      name="Weekly digest"
                      description="A summary every Monday morning."
                      checked={digest}
                      onValueChange={setDigest}
                    />
                    <Toggle
                      name="Anonymous telemetry"
                      description="Usage counts only, never your content."
                      checked={telemetry}
                      onValueChange={setTelemetry}
                    />
                  </Stack>

                  <CheckboxGroup
                    label="Terms"
                    value={terms ? ["terms"] : []}
                    onValueChange={(values) =>
                      setTerms(Arr.contains(values, "terms"))
                    }
                    options={[
                      {
                        value: "terms",
                        label: "I accept the terms",
                        description:
                          "Required before the workspace can be saved.",
                      },
                    ]}
                  />

                  {saving ? (
                    <Stack direction="column" gap="sm">
                      <Stack direction="row" align="center" gap="sm">
                        <Spinner size={theme.iconSize.md} />
                        <Text role="caption" tone="muted">
                          Saving your changes…
                        </Text>
                      </Stack>
                      <Progress
                        label="Saving"
                        value={undefined}
                        style={{ width: "100%" }}
                      />
                    </Stack>
                  ) : null}
                </>
              )}
            </Stack>
          </ScrollArea>

          <Separator orientation="horizontal" />

          <Stack direction="row" align="center" gap="sm">
            <Text role="caption" tone="muted">
              {badEmail
                ? "Fix the highlighted field to continue."
                : "Changes apply to every member."}
            </Text>
            <Spacer />
            <Button variant="outline" onActivate={reset}>
              Reset
            </Button>
            <Button
              variant="primary"
              disabled={!canSave}
              loading={saving}
              onActivate={save}
            >
              Save changes
            </Button>
          </Stack>
        </Stack>
      </Box>
    </ThemeProvider>
  );
};
