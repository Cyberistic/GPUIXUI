/**
 * `tier2-menu` — the shipped `DropdownMenu` and `ContextMenu` from
 * `@gpuixui/components`, mounted by a consumer and driven natively.
 *
 * The package's suite measures the rows and the shared menu core; this scenario
 * measures the consumer path: a click opens, the surface owns focus, arrows
 * move the highlight by native focus, a disabled row is skipped, Enter runs a
 * row once and returns focus, and a right click opens the context menu at the
 * pointer.
 *
 * Pointer placement and right-click delivery were measured by
 * `context-menu-pointer` (plan `164`); the nested dismiss stack by
 * `nested-layer-dismiss` (plan `187`). Measured facts: plan `330` §5.4.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
// Compiled by `tsconfig.vendor.json`; see the note in `tier2-dialog.tsx`.
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../vendor/packages/components/src/index.js";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Body, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import { focusedId, read } from "./probes.js";

const painted = (ctx: Smoke.SmokeContext, testId: string) =>
  Option.fromNullishOr(ctx.host.bounds(testId));

const MenuProbe = () => {
  const theme = useTheme();
  const [selected, setSelected] = useState("none");
  const [copies, setCopies] = useState(0);
  const [pastes, setPastes] = useState(0);

  return (
    <div
      testId="tier2-menu-frame"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
      }}
    >
      <Body>shipped Tier 2 menus</Body>
      <DropdownMenu>
        <DropdownMenuTrigger testId="menu-open">Actions</DropdownMenuTrigger>
        <DropdownMenuContent testId="menu-content" label="Actions">
          <DropdownMenuItem
            testId="menu-rename"
            onSelect={() => setSelected("Rename")}
          >
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem testId="menu-archive" disabled>
            Archive
          </DropdownMenuItem>
          <DropdownMenuItem
            testId="menu-delete"
            onSelect={() => setSelected("Delete")}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ContextMenu>
        <ContextMenuTrigger testId="menu-target">
          <Body>right click this surface</Body>
        </ContextMenuTrigger>
        <ContextMenuContent testId="context-content" label="Row actions">
          <ContextMenuItem
            testId="context-copy"
            onSelect={() => setCopies((count) => count + 1)}
          >
            Copy
          </ContextMenuItem>
          <ContextMenuItem
            testId="context-paste"
            onSelect={() => setPastes((count) => count + 1)}
          >
            Paste
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <Readout testId="tier2-menu-readout">
        {`selected=${selected} copies=${copies} pastes=${pastes}`}
      </Readout>
    </div>
  );
};

export const tier2MenuScenario: PlaygroundScenario = {
  id: "tier2-menu",
  title:
    "Tier 2 DropdownMenu and ContextMenu: open, arrows, activation, pointer",
  capability: "tier2",
  view: () => <MenuProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectEqual(
        "no menu is painted at rest",
        Option.isNone(painted(ctx, "menu-content")),
        true,
      );

      ctx.host.click("menu-open");
      yield* ctx.expectSome(
        "the dropdown surface is painted",
        painted(ctx, "menu-content"),
      );
      yield* ctx.expectEqual(
        "the menu surface owns focus",
        focusedId(ctx),
        "menu-content",
      );

      ctx.host.key("down");
      yield* ctx.expectEqual(
        "the first arrow landed on the first row",
        focusedId(ctx),
        "menu-rename",
      );
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "Enter ran the row exactly once",
        read(ctx, "tier2-menu-readout"),
        "selected=Rename",
      );
      yield* ctx.expectEqual(
        "the menu closed after activation",
        Option.isNone(painted(ctx, "menu-content")),
        true,
      );
      yield* ctx.expectEqual(
        "focus returned to the trigger",
        focusedId(ctx),
        "menu-open",
      );

      // A disabled row is skipped by the highlight, which is native focus.
      ctx.host.click("menu-open");
      ctx.host.key("down");
      ctx.host.key("down");
      yield* ctx.expectEqual(
        "the second arrow skipped the disabled row",
        focusedId(ctx),
        "menu-delete",
      );
      ctx.host.key("escape");
      yield* ctx.expectEqual(
        "Escape closed the menu",
        Option.isNone(painted(ctx, "menu-content")),
        true,
      );
      yield* ctx.expectEqual(
        "Escape returned focus to the trigger",
        focusedId(ctx),
        "menu-open",
      );

      // A right click opens the context menu at the pointer.
      const target = yield* ctx.expectSome(
        "the context target is painted",
        painted(ctx, "menu-target"),
      );
      ctx.host.rightClick("menu-target");
      const content = yield* ctx.expectSome(
        "the context menu is painted",
        painted(ctx, "context-content"),
      );
      yield* ctx.expectNear(
        "the context menu opens at the pointer's x",
        content.x,
        target.x + target.width / 2,
        12,
      );
      yield* ctx.expectNear(
        "the context menu opens at the pointer's y",
        content.y,
        target.y + target.height / 2,
        12,
      );

      ctx.host.click("context-copy");
      yield* ctx.expectContains(
        "a pressed row ran once",
        read(ctx, "tier2-menu-readout"),
        "copies=1",
      );
      yield* ctx.expectEqual(
        "selecting closed the context menu",
        Option.isNone(painted(ctx, "context-content")),
        true,
      );

      // Escape dismisses a pointer-opened context menu.
      ctx.host.rightClick("menu-target");
      yield* ctx.expectSome(
        "the context menu reopened",
        painted(ctx, "context-content"),
      );
      ctx.host.key("escape");
      yield* ctx.expectEqual(
        "Escape closed the context menu",
        Option.isNone(painted(ctx, "context-content")),
        true,
      );
    }),
};
