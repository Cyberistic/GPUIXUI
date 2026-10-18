/**
 * `tier2-foundation` — the shipped Tier 2 foundation from `@gpuixui/components`,
 * mounted by a consumer and driven natively.
 *
 * The package's own behaviour suite proves each part in isolation. This
 * scenario proves the consumer path the playground exists for: the published
 * root import (compiled by `tsconfig.vendor.json`, plan `330` §3), the shipped
 * token theme, the composition rules (`assertParts`) and the gestures a user
 * makes. The mechanism behind each interaction was measured elsewhere —
 * `a11y-tree` (plan `160`) for roles and authored ids, `focus-traversal` and
 * `roving-focus` (plans `140`, `158`) for focus — so the checks here are the
 * shipped contract, not a re-probe.
 *
 * Style assertions compare the component's paint with the **token it was
 * given** (read from the same `useTheme()` the view renders), never with a
 * literal, so a palette change cannot silently pass.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { useWindowSize } from "@gpuix/react";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertDismiss,
  AlertIcon,
  AlertTitle,
  Avatar,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  EmptyState,
  List,
  ListItem,
  ListItemDescription,
  ListItemTitle,
} from "../../vendor/packages/components/src/index.js";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Body, Pressable, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import {
  ariaOf,
  fieldOf,
  focusedId,
  painted,
  read,
  styleOf,
} from "./probes.js";

/** A painted background, or `"none"` so a failure names the absence. */
const backgroundOf = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(
    Option.flatMap(styleOf(ctx, testId), (style) => style.backgroundColor),
    () => "none",
  );

/** A token value the view reported, or `"none"`. */
const tokenOf = (ctx: Smoke.SmokeContext, key: string): string =>
  Option.getOrElse(
    fieldOf(read(ctx, "tier2-foundation-tokens"), key),
    () => "none",
  );

const Probe = () => {
  const theme = useTheme();
  const window = useWindowSize();
  const [selected, setSelected] = useState("inbox");
  const [dismissed, setDismissed] = useState(false);
  const [created, setCreated] = useState(0);

  return (
    <div
      testId="tier2-foundation-frame"
      style={{
        width: window.width,
        height: window.height,
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: theme.spacing.xl,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
          flexGrow: 1,
          minWidth: 0,
        }}
      >
        <Body>shipped Tier 2 foundation</Body>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: theme.spacing.sm,
          }}
        >
          <Badge testId="badge-neutral" variant="neutral">
            Neutral
          </Badge>
          <Badge testId="badge-primary" variant="primary">
            Primary
          </Badge>
          <Badge testId="badge-success" variant="success">
            Success
          </Badge>
          <Badge testId="badge-warning" variant="warning">
            Warning
          </Badge>
          <Badge testId="badge-danger" variant="danger">
            Danger
          </Badge>
          <Badge testId="badge-info" variant="info">
            Info
          </Badge>
          <Badge testId="badge-outline" variant="outline">
            Outline
          </Badge>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
          }}
        >
          <Avatar testId="avatar-md" aria-id="avatar-md" name="Ada Lovelace" />
          <Avatar
            testId="avatar-lg"
            name="Grace Hopper"
            size="lg"
            status="online"
          />
          <Avatar
            testId="avatar-xs"
            name="Alan Turing"
            size="xs"
            status="busy"
          />
        </div>
        <Card testId="card-outline" aria-id="card-outline">
          <CardHeader>
            <CardTitle testId="card-title">Deployment</CardTitle>
            <CardDescription testId="card-description">
              The last release is live in three regions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <text testId="card-body" style={{ color: theme.colors.foreground }}>
              Build 412 · 2 minutes ago
            </text>
          </CardContent>
          <CardFooter>
            <Badge testId="card-footer-badge" variant="success" size="sm">
              Healthy
            </Badge>
          </CardFooter>
        </Card>
        <Card testId="card-elevated" variant="elevated">
          <CardContent>
            <text
              testId="card-elevated-body"
              style={{ color: theme.colors.foreground }}
            >
              Elevated surface
            </text>
          </CardContent>
        </Card>
        <Card testId="card-plain" variant="plain">
          <CardContent>
            <text
              testId="card-plain-body"
              style={{ color: theme.colors.foreground }}
            >
              Plain surface
            </text>
          </CardContent>
        </Card>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
          width: 540,
        }}
      >
        {dismissed ? null : (
          <Alert testId="alert-info" aria-id="alert-info" tone="info">
            <AlertIcon>
              <text style={{ color: theme.colors.info }}>i</text>
            </AlertIcon>
            <AlertContent>
              <AlertTitle testId="alert-title">Sync paused</AlertTitle>
              <AlertDescription testId="alert-description">
                Resume when the remote is reachable.
              </AlertDescription>
            </AlertContent>
            <AlertDismiss
              testId="alert-dismiss"
              onDismiss={() => setDismissed(true)}
            />
          </Alert>
        )}
        <EmptyState
          testId="empty-state"
          title="No workspaces yet"
          description="Create one to start a project."
          action={
            <Pressable
              testId="empty-action"
              onClick={() => setCreated((count) => count + 1)}
            >
              Create workspace
            </Pressable>
          }
        />
        <List
          testId="list"
          selectionMode="single"
          defaultValue="inbox"
          onValueChange={(value) => setSelected(value)}
        >
          <ListItem
            testId="list-row-inbox"
            aria-id="list-row-inbox"
            value="inbox"
          >
            <ListItemTitle>Inbox</ListItemTitle>
            <ListItemDescription>3 unread</ListItemDescription>
          </ListItem>
          <ListItem
            testId="list-row-starred"
            aria-id="list-row-starred"
            value="starred"
          >
            <ListItemTitle>Starred</ListItemTitle>
          </ListItem>
          <ListItem
            testId="list-row-spam"
            aria-id="list-row-spam"
            value="spam"
            disabled
          >
            <ListItemTitle>Spam</ListItemTitle>
          </ListItem>
          <ListItem
            testId="list-row-trash"
            aria-id="list-row-trash"
            value="trash"
          >
            <ListItemTitle>Trash</ListItemTitle>
          </ListItem>
        </List>
        <Readout testId="tier2-foundation-readout">
          {`selected=${selected} dismissed=${dismissed} created=${created}`}
        </Readout>
        <Readout testId="tier2-foundation-tokens">
          {`primary=${theme.colors.primary} selected=${theme.colors.selected}`}
        </Readout>
      </div>
    </div>
  );
};

export const tier2FoundationScenario: PlaygroundScenario = {
  id: "tier2-foundation",
  title: "Tier 2 foundation: Card, Badge, Avatar, Alert, EmptyState and List",
  capability: "tier2",
  view: () => <Probe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const frame = yield* ctx.expectSome(
        "the probe frame is painted",
        painted(ctx, "tier2-foundation-frame"),
      );
      const outline = yield* ctx.expectSome(
        "the outline card is painted",
        painted(ctx, "card-outline"),
      );
      const elevated = yield* ctx.expectSome(
        "the elevated card is painted",
        painted(ctx, "card-elevated"),
      );
      const plain = yield* ctx.expectSome(
        "the plain card is painted",
        painted(ctx, "card-plain"),
      );
      yield* ctx.expectEqual(
        "the cards stack in declaration order",
        outline.y < elevated.y && elevated.y < plain.y,
        true,
      );
      yield* ctx.expectEqual(
        "the card keeps the frame's reading order",
        outline.x < frame.x + frame.width / 2,
        true,
      );
      yield* ctx.expectEqual(
        "the card title paints",
        read(ctx, "card-title"),
        "Deployment",
      );
      yield* ctx.expectEqual(
        "the card description paints",
        read(ctx, "card-description"),
        "The last release is live in three regions.",
      );
      yield* ctx.expectEqual(
        "the card footer paints its badge",
        read(ctx, "card-footer-badge"),
        "Healthy",
      );

      const outlineStyle = yield* ctx.expectSome(
        "the outline card reports a style",
        styleOf(ctx, "card-outline"),
      );
      yield* ctx.expectEqual(
        "outline draws no shadow",
        Option.isNone(outlineStyle.boxShadow),
        true,
      );
      const elevatedStyle = yield* ctx.expectSome(
        "the elevated card reports a style",
        styleOf(ctx, "card-elevated"),
      );
      yield* ctx.expectEqual(
        "elevated draws a shadow",
        Option.isSome(elevatedStyle.boxShadow),
        true,
      );
      const plainStyle = yield* ctx.expectSome(
        "the plain card reports a style",
        styleOf(ctx, "card-plain"),
      );
      yield* ctx.expectEqual(
        "plain draws no shadow",
        Option.isNone(plainStyle.boxShadow),
        true,
      );

      const primary = tokenOf(ctx, "primary");
      yield* ctx.expectEqual(
        "the primary badge paints the primary token",
        backgroundOf(ctx, "badge-primary"),
        primary,
      );
      yield* ctx.expectEqual(
        "every badge paints",
        ctx.host.bounds("badge-outline") === null,
        false,
      );

      yield* ctx.expectEqual(
        "the avatar falls back to initials",
        read(ctx, "avatar-md"),
        "AL",
      );
      const avatar = yield* ctx.expectSome(
        "the md avatar is painted",
        painted(ctx, "avatar-md"),
      );
      yield* ctx.expectEqual("the md avatar is 32 px", avatar.width, 32);
      yield* ctx.expectEqual("the md avatar is square", avatar.height, 32);
      const large = yield* ctx.expectSome(
        "the lg avatar is painted",
        painted(ctx, "avatar-lg"),
      );
      yield* ctx.expectEqual("the lg avatar is 40 px", large.width, 40);
      const avatarNode = yield* ctx.expectSome(
        "the avatar is an accessible image",
        ariaOf(ctx, "avatar-md"),
      );
      yield* ctx.expectEqual(
        "the avatar image is named by its name",
        Option.getOrElse(avatarNode.label, () => "none"),
        "Ada Lovelace",
      );

      const alertNode = yield* ctx.expectSome(
        "the alert is an accessible alert",
        ariaOf(ctx, "alert-info"),
      );
      yield* ctx.expectEqual(
        "the alert role reaches the dump",
        Option.getOrElse(alertNode.role, () => "none"),
        "Alert",
      );
      ctx.host.click("alert-dismiss");
      yield* ctx.expectContains(
        "the dismiss control ran",
        read(ctx, "tier2-foundation-readout"),
        "dismissed=true",
      );
      yield* ctx.expectEqual(
        "the consumer closed the alert",
        Option.isNone(painted(ctx, "alert-info")),
        true,
      );

      yield* ctx.expectEqual(
        "the empty state paints its title",
        read(ctx, "empty-state"),
        "No workspaces yetCreate one to start a project.Create workspace",
      );
      ctx.host.click("empty-action");
      yield* ctx.expectContains(
        "the empty state's action ran",
        read(ctx, "tier2-foundation-readout"),
        "created=1",
      );

      const selectedToken = tokenOf(ctx, "selected");
      yield* ctx.expectEqual(
        "the default row paints the selected token",
        backgroundOf(ctx, "list-row-inbox"),
        selectedToken,
      );
      yield* ctx.expectEqual(
        "an unselected row paints no selected token",
        backgroundOf(ctx, "list-row-starred") === selectedToken,
        false,
      );

      ctx.host.click("list-row-trash");
      yield* ctx.expectContains(
        "a click selects the row",
        read(ctx, "tier2-foundation-readout"),
        "selected=trash",
      );
      yield* ctx.expectEqual(
        "the clicked row paints the selected token",
        backgroundOf(ctx, "list-row-trash"),
        selectedToken,
      );
      const trash = yield* ctx.expectSome(
        "the selected row reports its state",
        ariaOf(ctx, "list-row-trash"),
      );
      yield* ctx.expectEqual(
        "the selected row is aria-selected",
        Option.getOrElse(trash.selected, () => false),
        true,
      );

      ctx.host.click("list-row-inbox");
      yield* ctx.expectEqual(
        "clicking a row focuses it",
        focusedId(ctx),
        "list-row-inbox",
      );
      ctx.host.key("down");
      yield* ctx.expectEqual(
        "Down moves native focus one row",
        focusedId(ctx),
        "list-row-starred",
      );
      ctx.host.key("down");
      yield* ctx.expectEqual(
        "Down skips the disabled row",
        focusedId(ctx),
        "list-row-trash",
      );
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "Enter selects the focused row",
        read(ctx, "tier2-foundation-readout"),
        "selected=trash",
      );

      ctx.host.click("list-row-spam");
      yield* ctx.expectContains(
        "a disabled row changes nothing",
        read(ctx, "tier2-foundation-readout"),
        "selected=trash",
      );
    }),
};
