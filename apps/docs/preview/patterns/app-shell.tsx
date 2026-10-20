/** @jsxImportSource @gpuix/react */
/**
 * The app-shell pattern, as a live scene (plan 615).
 *
 * A desktop window composed from the layout primitives: a title bar, a
 * collapsible navigation rail, one scrolling content region and a status bar.
 * The composition owns the rail's open flag and the deployment rows; the
 * primitives own their spacing, type and surfaces.
 *
 * It is not a docking layout. Resizable splits, panel groups and detachable
 * tabs belong to `packages/docking`, which does not ship yet; the page says so
 * instead of imitating a resizable pane.
 *
 * The gesture is one click: the rail starts collapsed so the first frame is a
 * real shell with a narrow rail, and pressing the toggle paints the navigation
 * labels. The smoke asserts `Activity` is absent before the click and present
 * after it, so a rail that painted its labels unconditionally fails the first
 * half.
 */
import { Avatar } from "@gpuixui/components/avatar";
import { Badge, type BadgeVariant } from "@gpuixui/components/badge";
import { Card, CardContent } from "@gpuixui/components/card";
import { Icon } from "@gpuixui/icons";
import {
  Box,
  Button,
  ScrollArea,
  Separator,
  Stack,
  Text,
  useTheme,
} from "@gpuixui/primitives";
import * as Arr from "effect/Array";
import { useState, type ReactElement } from "react";

const NAV_ITEMS = ["Overview", "Members", "Activity", "Settings"] as const;

interface Deployment {
  readonly name: string;
  readonly environment: string;
  readonly status: string;
  readonly tone: BadgeVariant;
  readonly detail: string;
}

const DEPLOYMENTS: ReadonlyArray<Deployment> = [
  {
    name: "storefront",
    environment: "Production",
    status: "Healthy",
    tone: "success",
    detail: "Deployed 4 minutes ago by Ada",
  },
  {
    name: "billing",
    environment: "Staging",
    status: "Needs review",
    tone: "warning",
    detail: "Two checks await approval",
  },
  {
    name: "docs",
    environment: "Preview",
    status: "Healthy",
    tone: "success",
    detail: "Built from the documentation branch",
  },
];

/** One deployment row: name, environment, status and the last event. */
const DeploymentCard = ({
  deployment,
}: {
  readonly deployment: Deployment;
}): ReactElement => (
  <Card variant="outline" style={{ width: "100%" }}>
    <CardContent>
      <Stack direction="row" justify="between" align="center" gap="md">
        <Stack direction="column" gap="2xs">
          <Text role="label">{deployment.name}</Text>
          <Text role="caption" tone="muted">
            {deployment.detail}
          </Text>
        </Stack>
        <Stack direction="row" gap="sm" align="center">
          <Text role="caption" tone="muted">
            {deployment.environment}
          </Text>
          <Badge variant={deployment.tone} size="sm">
            {deployment.status}
          </Badge>
        </Stack>
      </Stack>
    </CardContent>
  </Card>
);

/** The scene the preview document mounts. */
export const AppShell = (): ReactElement => {
  const theme = useTheme();
  const [navigationOpen, setNavigationOpen] = useState(false);

  return (
    <Box
      tone="background"
      fullWidth
      style={{
        height: 400,
        borderWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
      }}
    >
      <Box tone="background" padding="md">
        <Stack direction="row" align="center" justify="between" gap="md">
          <Stack direction="row" gap="sm" align="center">
            <Text role="bodyStrong">GPUIXUI</Text>
            <Badge variant="neutral" size="sm">
              Desktop
            </Badge>
          </Stack>
          <Stack direction="row" gap="sm" align="center">
            <Text role="caption" tone="muted">
              Atlas workspace
            </Text>
            <Avatar name="Ada Lovelace" size="sm" status="online" />
          </Stack>
        </Stack>
      </Box>

      <Separator orientation="horizontal" />

      <Stack direction="row" grow style={{ minHeight: 0 }}>
        <Box
          tone="muted"
          padding="sm"
          style={{ width: navigationOpen ? 176 : 48 }}
        >
          <Stack direction="column" gap="xs">
            <Button
              variant="ghost"
              size="sm"
              square
              label="Toggle navigation"
              testId="scene-shell-toggle"
              leading={
                <Icon
                  name="chevrons-up-down"
                  size="sm"
                  color={theme.colors.mutedForeground}
                />
              }
              onActivate={() => setNavigationOpen((open) => !open)}
            />
            {navigationOpen ? (
              <Stack direction="column" gap="2xs">
                {Arr.map(NAV_ITEMS, (item) => (
                  <Text
                    key={item}
                    role="label"
                    tone={item === "Overview" ? "primary" : "muted"}
                  >
                    {item}
                  </Text>
                ))}
              </Stack>
            ) : null}
          </Stack>
        </Box>

        <Separator orientation="vertical" />

        <Box tone="background" grow style={{ minHeight: 0 }}>
          <ScrollArea axis="vertical" style={{ flexGrow: 1, minHeight: 0 }}>
            <Stack
              direction="column"
              gap="md"
              style={{ padding: theme.spacing.lg }}
            >
              <Text role="h3">Deployments</Text>
              <Text role="caption" tone="muted">
                Three environments · last deploy 4 minutes ago
              </Text>
              {Arr.map(DEPLOYMENTS, (deployment) => (
                <DeploymentCard key={deployment.name} deployment={deployment} />
              ))}
            </Stack>
          </ScrollArea>
        </Box>
      </Stack>

      <Separator orientation="horizontal" />

      <Box tone="muted" padding="sm">
        <Stack direction="row" justify="between">
          <Text role="caption" tone="muted">
            Connected · 3 people
          </Text>
          <Text role="caption" tone="muted">
            ⌘K
          </Text>
        </Stack>
      </Box>
    </Box>
  );
};
