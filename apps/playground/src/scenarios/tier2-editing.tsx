/**
 * `tier2-editing` — the shipped Tier 2 input-centric components from
 * `@gpuixui/components`, mounted by a consumer and driven natively.
 *
 * The package's own suites prove each part; this scenario proves the consumer
 * path the playground exists for: the published root import through
 * `tsconfig.vendor.json` (plan `330` §3), the shipped token theme, and the
 * gestures a user makes. Mechanisms measured elsewhere are not re-probed:
 * modal focus and the Tab trap (`modal-focus-trap`, plan `155`), the native
 * editor (`text-entry`, plan `188`), pointer entry (`pointer-text-entry`, plan
 * `343`) and live key routing (`live-key-routing`, plan `345`).
 *
 * The Drawer is opened last: its surface is full-height by design, so anything
 * opened after it would sit behind the veil.
 *
 * The readout quotes the comment (`comment="@anna "`) because the trailing space
 * the mention contract inserts is part of what the steps assert.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useWindowSize } from "@gpuix/react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  HotkeyRecorder,
  InlineEdit,
  MentionInput,
  MentionInputItem,
  MentionInputList,
  TagInput,
  TagInputChip,
  TagInputField,
} from "../../vendor/packages/components/src/index.js";
import { Button } from "../../vendor/packages/components/src/internal/button.js";
import { useTheme } from "@gpuixui/tokens/react";
import { Body, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import {
  ariaOf,
  elementTypeOf,
  focusedId,
  node,
  painted,
  read,
  treeOf,
} from "./probes.js";

/** The people the comment field can mention. */
const people = ["ana", "anna", "joan"] as const;

/** The token list at rest; a `max` of three leaves room for two additions. */
const initialTags = ["design"] as const;

const Probe = () => {
  const theme = useTheme();
  const window = useWindowSize();
  const [name, setName] = useState("Docs");
  const [commits, setCommits] = useState(0);
  const [tags, setTags] = useState<ReadonlyArray<string>>([...initialTags]);
  const [hotkey, setHotkey] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [mentions, setMentions] = useState<ReadonlyArray<string>>([]);
  const [invites, setInvites] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const column = {
    display: "flex",
    flexDirection: "column" as const,
    gap: theme.spacing.lg,
    width: 460,
  };

  return (
    <div
      testId="tier2-editing-frame"
      style={{
        width: window.width,
        height: window.height,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
      }}
    >
      <Body>shipped Tier 2 editing controls</Body>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          gap: theme.spacing.xl,
          flexGrow: 1,
        }}
      >
        <div style={column}>
          <InlineEdit
            testId="ws-name"
            aria-id="ws-name"
            label="Workspace name"
            value={name}
            placeholder="Untitled"
            onCommit={(next) => {
              setName(next);
              setCommits((count) => count + 1);
            }}
          />
          <div
            testId="ws-elsewhere"
            tabIndex={0}
            style={{
              display: "flex",
              alignItems: "center",
              height: 28,
              paddingLeft: theme.spacing.sm,
              backgroundColor: theme.colors.muted,
              borderRadius: theme.radius.sm,
            }}
          >
            <text style={{ color: theme.colors.mutedForeground, fontSize: 12 }}>
              another field
            </text>
          </div>
          <TagInput label="Tags" value={tags} max={3} onValueChange={setTags}>
            {Arr.map(tags, (tag) => (
              <TagInputChip key={tag} testId={`chip-${tag}`} value={tag} />
            ))}
            <TagInputField testId="tag-field" placeholder="Add a tag" />
          </TagInput>
          <HotkeyRecorder
            testId="hotkey"
            label="Toggle palette"
            value={hotkey}
            onChange={setHotkey}
          />
        </div>
        <div style={column}>
          <MentionInput
            testId="comment"
            aria-id="comment"
            label="Comment"
            value={comment}
            onValueChange={setComment}
            onMention={(value) =>
              setMentions((current) => Arr.append(current, value))
            }
          >
            <MentionInputList>
              {Arr.map(people, (person) => (
                <MentionInputItem
                  key={person}
                  testId={`mention-${person}`}
                  aria-id={`mention-${person}`}
                  value={person}
                />
              ))}
            </MentionInputList>
          </MentionInput>
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger testId="drawer-open" aria-id="drawer-open">
              Invite teammate
            </DrawerTrigger>
            <DrawerContent
              testId="drawer-surface"
              side="right"
              size="md"
              label="Invite teammate"
            >
              <DrawerHeader>
                <DrawerTitle>Invite a teammate</DrawerTitle>
                <DrawerDescription>
                  They join this workspace as an editor.
                </DrawerDescription>
              </DrawerHeader>
              <DrawerFooter>
                <DrawerClose testId="drawer-cancel">Cancel</DrawerClose>
                <Button
                  testId="drawer-send"
                  variant="primary"
                  onClick={() => setInvites((count) => count + 1)}
                >
                  Send invite
                </Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
      <Readout testId="tier2-editing-readout">
        {`name=${name} commits=${commits} tags=${Arr.match(tags, {
          onEmpty: () => "none",
          onNonEmpty: (values) => Arr.join(values, ","),
        })} hotkey=${hotkey ?? "none"} comment="${comment}" mentions=${Arr.match(
          mentions,
          {
            onEmpty: () => "none",
            onNonEmpty: (values) => Arr.join(values, ","),
          },
        )} invites=${invites} drawer=${drawerOpen ? "open" : "closed"}`}
      </Readout>
    </div>
  );
};

export const tier2EditingScenario: PlaygroundScenario = {
  id: "tier2-editing",
  title:
    "Tier 2 editing: InlineEdit, TagInput, HotkeyRecorder, MentionInput and Drawer",
  capability: "tier2",
  view: () => <Probe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const frame = yield* ctx.expectSome(
        "the editing frame is painted",
        painted(ctx, "tier2-editing-frame"),
      );
      yield* ctx.expectEqual(
        "the frame fills the window width",
        frame.width,
        1280,
      );

      // 1. InlineEdit: a display/input swap, a commit and a discard.
      yield* ctx.expectEqual(
        "the name is a display control at rest",
        elementTypeOf(ctx, "ws-name"),
        "div",
      );
      ctx.host.click("ws-name");
      yield* ctx.expectEqual(
        "a press swaps the display for an input",
        elementTypeOf(ctx, "ws-name"),
        "input",
      );
      yield* ctx.expectEqual(
        "the swapped input takes native focus",
        focusedId(ctx),
        "ws-name",
      );
      ctx.host.key("cmd-a");
      ctx.host.key("d o c s");
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "Enter commits the draft once",
        read(ctx, "tier2-editing-readout"),
        "name=docs commits=1",
      );
      yield* ctx.expectEqual(
        "the committed control returns to its display",
        elementTypeOf(ctx, "ws-name"),
        "div",
      );
      yield* ctx.expectEqual(
        "the display takes focus back",
        focusedId(ctx),
        "ws-name",
      );

      ctx.host.click("ws-name");
      ctx.host.key("x");
      ctx.host.key("escape");
      yield* ctx.expectContains(
        "Escape discards the draft",
        read(ctx, "tier2-editing-readout"),
        "name=docs commits=1",
      );
      yield* ctx.expectEqual(
        "Escape leaves edit mode",
        elementTypeOf(ctx, "ws-name"),
        "div",
      );

      // The headless host does not dispatch React's `onBlur` for a native
      // focus change, so clicking away leaves the editor open here. A real
      // window does deliver it and commits (plan `555`, `live-tier2-editing`);
      // each harness asserts its own measured behaviour.
      ctx.host.click("ws-name");
      ctx.host.key("cmd-a");
      ctx.host.key("h a n d b o o k");
      ctx.host.click("ws-elsewhere");
      yield* ctx.expectContains(
        "focus leaving leaves the editor open",
        read(ctx, "tier2-editing-readout"),
        "name=docs commits=1",
      );
      yield* ctx.expectEqual(
        "the uncommitted editor is still mounted",
        elementTypeOf(ctx, "ws-name"),
        "input",
      );
      ctx.host.key("escape");

      // 2. TagInput: Enter, a typed comma, a duplicate, the cap, removal.
      ctx.host.click("tag-field");
      ctx.host.key("d e s i g n");
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "a duplicate token is ignored",
        read(ctx, "tier2-editing-readout"),
        "tags=design ",
      );
      yield* ctx.expectEqual(
        "the field keeps focus after Enter",
        focusedId(ctx),
        "tag-field",
      );
      ctx.host.key("d o c s ,");
      yield* ctx.expectContains(
        "a typed comma commits the token before it",
        read(ctx, "tier2-editing-readout"),
        "tags=design,docs ",
      );
      yield* ctx.expectSome(
        "the second chip paints",
        painted(ctx, "chip-docs"),
      );
      ctx.host.key("u i");
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "a third token fills the cap",
        read(ctx, "tier2-editing-readout"),
        "tags=design,docs,ui ",
      );
      ctx.host.key("p e r f");
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "max refuses the fourth token",
        read(ctx, "tier2-editing-readout"),
        "tags=design,docs,ui ",
      );

      const chip = yield* ctx.expectSome(
        "the first chip is painted",
        painted(ctx, "chip-design"),
      );
      // The removal control has no testId (the component authors it as the
      // chip's last child), so the gesture is the chip's own right edge:
      // 8 px padding + a 16 px control.
      ctx.host.clickWindow(chip.x + chip.width - 16, chip.y + chip.height / 2);
      yield* ctx.expectContains(
        "a chip's removal control removes that chip",
        read(ctx, "tier2-editing-readout"),
        "tags=docs,ui ",
      );
      yield* ctx.expectEqual(
        "the removed chip leaves the tree",
        Option.isNone(painted(ctx, "chip-design")),
        true,
      );

      // 3. HotkeyRecorder: record a chord, then clear it.
      yield* ctx.expectContains(
        "the unbound recorder paints its placeholder",
        read(ctx, "hotkey"),
        "Click to record",
      );
      ctx.host.click("hotkey");
      yield* ctx.expectContains(
        "a press starts recording",
        read(ctx, "hotkey"),
        "Press keys",
      );
      ctx.host.key("ctrl-shift-k");
      yield* ctx.expectContains(
        "the chord is recorded once",
        read(ctx, "tier2-editing-readout"),
        "hotkey=ctrl+shift+k",
      );
      ctx.host.click("hotkey-clear");
      yield* ctx.expectContains(
        "the clear control empties the chord",
        read(ctx, "tier2-editing-readout"),
        "hotkey=none",
      );
      yield* ctx.expectContains(
        "the recorder returns to its placeholder",
        read(ctx, "hotkey"),
        "Click to record",
      );

      // 4. MentionInput: open, narrow, highlight, insert, close.
      ctx.host.click("comment");
      ctx.host.key("@");
      yield* ctx.expectSome(
        "an at-sign opens every candidate",
        painted(ctx, "mention-ana"),
      );
      yield* ctx.expectSome(
        "the third candidate is offered too",
        painted(ctx, "mention-joan"),
      );
      ctx.host.key("a n");
      yield* ctx.expectSome(
        "a query keeps the start-of-name match",
        painted(ctx, "mention-ana"),
      );
      yield* ctx.expectEqual(
        "the first match starts highlighted",
        Option.getOrElse(
          Option.flatMap(ariaOf(ctx, "mention-ana"), (entry) => entry.selected),
          () => false,
        ),
        true,
      );
      ctx.host.key("down");
      yield* ctx.expectEqual(
        "Down moves the highlight",
        Option.getOrElse(
          Option.flatMap(
            ariaOf(ctx, "mention-anna"),
            (entry) => entry.selected,
          ),
          () => false,
        ),
        true,
      );
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "Enter inserts the highlighted name",
        read(ctx, "tier2-editing-readout"),
        'comment="@anna " mentions=anna',
      );
      yield* ctx.expectEqual(
        "inserting closes the candidate list",
        Option.isNone(painted(ctx, "mention-ana")),
        true,
      );
      ctx.host.key("@");
      ctx.host.key("z z z");
      yield* ctx.expectEqual(
        "a no-match query paints no candidate",
        Option.isNone(painted(ctx, "mention-ana")),
        true,
      );
      ctx.host.key("escape");

      // 5. Drawer: edge placement, focus, the trap, dismissal.
      yield* ctx.expectEqual(
        "the drawer is closed at rest",
        Option.isNone(painted(ctx, "drawer-surface")),
        true,
      );
      ctx.host.click("drawer-open");
      const surface = yield* ctx.expectSome(
        "the drawer opens on its trigger",
        painted(ctx, "drawer-surface"),
      );
      // The drawer's reported box is its content box: its left inset (24 px)
      // is counted twice at the right edge on 0.10.0 (plan 529 §6.3).
      yield* ctx.expectEqual(
        "the drawer's content edge is 23 px past the frame",
        surface.x + surface.width,
        frame.width + 23,
      );
      yield* ctx.expectEqual(
        "the md drawer keeps its width inside its borders",
        surface.width,
        398,
      );
      yield* ctx.expectEqual(
        "the drawer spans the window height inside its borders",
        surface.height,
        frame.height - 2,
      );
      yield* ctx.expectContains(
        "the consumer sees the open state",
        read(ctx, "tier2-editing-readout"),
        "drawer=open",
      );
      yield* ctx.expectEqual(
        "opening takes native focus on the surface",
        focusedId(ctx),
        "drawer-surface",
      );
      const tree = yield* treeOf(ctx);
      yield* node(ctx, tree, "Dialog", "Invite teammate");
      ctx.host.key("tab");
      yield* ctx.expectEqual(
        "Tab moves focus inside the surface",
        focusedId(ctx),
        "drawer-cancel",
      );
      ctx.host.key("escape");
      yield* ctx.expectEqual(
        "Escape closes the drawer",
        Option.isNone(painted(ctx, "drawer-surface")),
        true,
      );
      yield* ctx.expectEqual(
        "Escape returns focus to the trigger",
        focusedId(ctx),
        "drawer-open",
      );

      ctx.host.click("drawer-open");
      yield* ctx.expectSome(
        "the drawer reopens",
        painted(ctx, "drawer-surface"),
      );
      ctx.host.clickWindow(12, 12);
      yield* ctx.expectEqual(
        "a press on the veil closes the drawer",
        Option.isNone(painted(ctx, "drawer-surface")),
        true,
      );
      yield* ctx.expectContains(
        "dismissing reports the closed state",
        read(ctx, "tier2-editing-readout"),
        "drawer=closed",
      );
    }),
};
