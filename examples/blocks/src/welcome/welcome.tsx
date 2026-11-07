/** @jsxImportSource @gpuix/react */
import { Icon } from "@gpuixui/icons";
import { Button, Stack, Text } from "@gpuixui/primitives";
import { Window } from "@gpuixui/shell";
import type { PlatformName } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import { useState } from "react";
import { MARK } from "../desktop/taskbar.js";
import { steps } from "./data.js";
import { stepAfter } from "./logic.js";

export const Welcome = ({
  platform,
  onImport = () => undefined,
}: {
  readonly platform?: PlatformName;

  readonly onImport?: () => void;
}) => {
  const theme = useTheme();
  const [step, setStep] = useState(0);
  const current = steps[step] ?? steps[0];
  return (
    <Window
      testId="welcome"
      toolbarStyle="compact"
      {...(platform === undefined ? {} : { platform })}
    >
      <Stack
        direction="column"
        gap="lg"
        style={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: theme.spacing.xl,
        }}
      >
        <img src={MARK} style={{ width: 72, height: 72 }} />
        <Text role="h2" testId="step-title">
          {current?.title}
        </Text>
        <Stack direction="column" gap="md" style={{ width: 420 }}>
          {Arr.map(current?.features ?? [], (feature) => (
            <Stack
              key={feature.title}
              direction="row"
              gap="md"
              style={{ alignItems: "center" }}
            >
              <Icon
                name={feature.icon}
                size={theme.iconSize.xl}
                color={theme.colors.primary}
              />
              <Stack direction="column">
                <Text role="bodyStrong">{feature.title}</Text>
                <Text tone="muted">{feature.line}</Text>
              </Stack>
            </Stack>
          ))}
        </Stack>
        <Stack direction="row" gap="sm">
          <Button variant="outline" testId="import" onActivate={onImport}>
            Import…
          </Button>
          <Button
            testId="continue"
            onActivate={() => setStep(stepAfter(step, steps.length))}
          >
            Continue
          </Button>
        </Stack>
        <Text
          tone="muted"
          testId={`step-${step + 1}`}
        >{`Step ${step + 1} of ${steps.length}`}</Text>
      </Stack>
    </Window>
  );
};
