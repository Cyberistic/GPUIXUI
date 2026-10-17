/**
 * Tier 4 probe: `workspace-restore`.
 *
 * GPUix has no storage primitive, so a workspace is app-owned data: serialise
 * it, kill the tree, decode it and put it back. This probe does exactly that —
 * the split width, both tab lists, the active tab and a `<virtual-list>` anchor
 * survive a keyed remount — and records what does **not** survive (native
 * focus). It closes plan `166`'s two open gaps: restoring an anchor after a
 * remount, and `scrollToItem`'s `offsetInItem`.
 *
 * Measured facts: plan `167` §8.
 */
import { useLayoutEffect, useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import { SplitPane } from "../panels/split-pane.js";
import { TabStrip } from "../panels/tab-strip.js";
import type { PlaygroundScenario } from "../types.js";
import {
  DEFAULT_WORKSPACE,
  decodeWorkspace,
  describeWorkspace,
  encodeWorkspace,
  snapshotWorkspace,
  WorkspaceState,
  type RuntimeAnchor,
} from "./workspace-state.js";

const ROWS = 200;
const ROW_HEIGHT = 32;
const VIEWPORT = 260;

/** The anchor a freshly mounted list must apply, once. */
interface RestoreAnchor {
  readonly index: number;
  readonly offset: number;
}

/** The fields a save/restore round trip owns; the anchor comes from the list. */
type Editable = Pick<WorkspaceState, "split" | "tabsA" | "tabsB" | "active">;

/**
 * The list, plus the one-shot scroll a restore asks for.
 *
 * The effect runs on mount only (the component is remounted by the keyed
 * subtree, so a new anchor arrives as a new mount). An inline ref callback would
 * re-run on every render and snap a user's later scroll back.
 */
const RestorableList = ({
  restore,
  onListId,
}: {
  readonly restore: Option.Option<RestoreAnchor>;
  readonly onListId: (id: Option.Option<number>) => void;
}) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const listId = useRef<Option.Option<number>>(Option.none());
  const [selected, setSelected] = useState(0);

  useLayoutEffect(() => {
    Option.match(restore, {
      onNone: () => {},
      onSome: (anchor) =>
        Option.match(listId.current, {
          onNone: () => {},
          onSome: (id) =>
            renderer?.scrollToItem?.(id, anchor.index, anchor.offset),
        }),
    });
  }, [renderer, restore]);

  return (
    <virtual-list
      testId="wr-list"
      ref={(instance: PublicInstance | null) => {
        const id = Option.map(
          Option.fromNullishOr(instance),
          (element) => element.id,
        );
        listId.current = id;
        onListId(id);
      }}
      style={{ height: VIEWPORT }}
    >
      {Array.from({ length: ROWS }, (_, index) => (
        <div
          key={index}
          testId={`wr-row-${index}`}
          tabIndex={0}
          role="option"
          aria-selected={selected === index}
          onClick={() => setSelected(index)}
          style={{
            height: ROW_HEIGHT,
            display: "flex",
            alignItems: "center",
            padding: 6,
            backgroundColor:
              selected === index
                ? theme.colors.accent
                : theme.colors.background,
            hover: { backgroundColor: theme.colors.muted },
          }}
        >
          <text style={{ color: theme.colors.foreground }}>
            {`row ${index}`}
          </text>
        </div>
      ))}
    </virtual-list>
  );
};

const WorkspaceRestoreProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const listId = useRef<Option.Option<number>>(Option.none());
  const [live, setLive] = useState<WorkspaceState>(DEFAULT_WORKSPACE);
  const [saved, setSaved] = useState<Option.Option<string>>(Option.none());
  const [restore, setRestore] = useState<Option.Option<RestoreAnchor>>(
    Option.none(),
  );
  const [generation, setGeneration] = useState(0);

  const next = (
    state: WorkspaceState,
    fields: Partial<Editable>,
  ): WorkspaceState =>
    new WorkspaceState({
      split: fields.split ?? state.split,
      tabsA: fields.tabsA ?? state.tabsA,
      tabsB: fields.tabsB ?? state.tabsB,
      active: fields.active ?? state.active,
      anchorIndex: state.anchorIndex,
      anchorOffset: state.anchorOffset,
    });

  const patch = (fields: Partial<Editable>) =>
    setLive((state) => next(state, fields));

  const move = (id: string, from: string) =>
    setLive((state) =>
      from === "a"
        ? next(state, {
            tabsA: state.tabsA.filter((tab) => tab !== id),
            tabsB: [...state.tabsB, id],
            active: id,
          })
        : next(state, {
            tabsA: [...state.tabsA, id],
            tabsB: state.tabsB.filter((tab) => tab !== id),
            active: id,
          }),
    );

  const runtimeAnchor = (): Option.Option<RuntimeAnchor> =>
    Option.match(listId.current, {
      onNone: () => Option.none<RuntimeAnchor>(),
      onSome: (id) =>
        Option.map(
          Option.fromNullishOr(renderer?.getListScrollTop?.(id) ?? null),
          (value) => [value[0] ?? 0, value[1] ?? 0, value[2] ?? 0] as const,
        ),
    });

  const save = () => {
    const anchor = Option.getOrElse(
      runtimeAnchor(),
      () => [live.anchorIndex, live.anchorOffset, VIEWPORT] as const,
    );
    setSaved(Option.some(encodeWorkspace(snapshotWorkspace(live, anchor))));
  };

  const reset = () => {
    setLive(DEFAULT_WORKSPACE);
    setRestore(Option.none());
    setGeneration((value) => value + 1);
  };

  const applySaved = () =>
    Option.match(saved, {
      onNone: () => {},
      onSome: (json) =>
        Option.match(decodeWorkspace(json), {
          onNone: () => {},
          onSome: (state) => {
            setLive(state);
            setRestore(
              Option.some({
                index: state.anchorIndex,
                offset: state.anchorOffset,
              }),
            );
            setGeneration((value) => value + 1);
          },
        }),
    });

  const savedText = Option.match(saved, {
    onNone: () => "saved=false",
    onSome: (json) =>
      Option.match(decodeWorkspace(json), {
        onNone: () => "saved=invalid",
        onSome: (state) =>
          `saved ${describeWorkspace(state)} anchor=${state.anchorIndex},${
            state.anchorOffset
          }`,
      }),
  });

  const strip = (pane: string, tabs: ReadonlyArray<string>) => (
    <TabStrip
      testIdPrefix="wr-tab-"
      pane={pane}
      tabs={tabs}
      active={live.active}
      onSelect={(active) => patch({ active })}
      onMove={move}
    />
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 680,
        height: 360,
        padding: 8,
        backgroundColor: theme.colors.background,
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        <Pressable testId="wr-save" onClick={save}>
          <text style={{ color: theme.colors.foreground }}>save</text>
        </Pressable>
        <Pressable testId="wr-reset" onClick={reset}>
          <text style={{ color: theme.colors.foreground }}>reset</text>
        </Pressable>
        <Pressable testId="wr-restore" onClick={applySaved}>
          <text style={{ color: theme.colors.foreground }}>restore</text>
        </Pressable>
      </div>
      <Readout testId="wr-live">{describeWorkspace(live)}</Readout>
      <Readout testId="wr-saved">{savedText}</Readout>
      <div key={generation} style={{ height: 240 }}>
        <SplitPane
          id="wr"
          initial={live.split}
          min={160}
          max={480}
          onResize={(split) => patch({ split })}
          primary={
            <div style={{ height: "100%", backgroundColor: theme.colors.card }}>
              {strip("a", live.tabsA)}
            </div>
          }
          secondary={
            <div
              style={{
                height: "100%",
                backgroundColor: theme.colors.background,
              }}
            >
              {strip("b", live.tabsB)}
              <RestorableList
                restore={restore}
                onListId={(id) => {
                  listId.current = id;
                }}
              />
            </div>
          }
        />
      </div>
    </div>
  );
};

const liveState = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text("wr-live")), () => "");

const savedState = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text("wr-saved")), () => "");

const anchorOf = (
  ctx: Smoke.SmokeContext,
): Option.Option<readonly [number, number, number]> =>
  Option.fromNullishOr(ctx.host.listScrollTop("wr-list"));

const painted = (ctx: Smoke.SmokeContext, row: number): boolean =>
  Arr.some(ctx.host.paintedText(), (line) => line === `row ${row}`);

const focused = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.focused()), () => "none");

export const workspaceRestoreScenario: PlaygroundScenario = {
  id: "workspace-restore",
  title: "Workspace: save and restore panels, tabs and scroll",
  capability: "workspace",
  view: () => <WorkspaceRestoreProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectContains(
        "the workspace starts at its defaults",
        liveState(ctx),
        "split=320 tabsA=one,two tabsB=none active=one",
      );
      yield* ctx.expectContains(
        "nothing is saved yet",
        savedState(ctx),
        "saved=false",
      );
      const initial = yield* ctx.expectSome(
        "the list reports an anchor",
        anchorOf(ctx),
      );
      yield* ctx.expectEqual("the list starts at the top", initial[0], 0);
      yield* ctx.expectEqual("row 0 is painted", painted(ctx, 0), true);
      yield* ctx.expectEqual(
        "row 120 is not painted",
        painted(ctx, 120),
        false,
      );

      ctx.host.drag("wr-divider", 80, 0, 6);
      ctx.host.drag("wr-tab-one", 200, 0, 8);
      ctx.host.scrollToItem("wr-list", 120, 16);
      yield* ctx.expectContains(
        "the workspace can be changed",
        liveState(ctx),
        "split=400 tabsA=two tabsB=one active=one",
      );
      const changed = yield* ctx.expectSome(
        "the changed list reports an anchor",
        anchorOf(ctx),
      );
      yield* ctx.expectEqual("the in-row offset was applied", changed[1], 16);

      ctx.host.click("wr-row-120");
      yield* ctx.expectEqual(
        "a workspace row can take focus",
        focused(ctx),
        "wr-row-120",
      );

      ctx.host.click("wr-save");
      const saved = savedState(ctx);
      yield* ctx.expectContains("the split was saved", saved, "split=400");
      yield* ctx.expectContains(
        "the tab layout was saved",
        saved,
        "tabsA=two tabsB=one",
      );
      yield* ctx.expectContains("the anchor was saved", saved, "anchor=120,16");

      ctx.host.click("wr-reset");
      yield* ctx.expectContains(
        "a reset loses the workspace",
        liveState(ctx),
        "split=320 tabsA=one,two tabsB=none active=one",
      );
      const afterReset = yield* ctx.expectSome(
        "the reset list reports an anchor",
        anchorOf(ctx),
      );
      yield* ctx.expectEqual(
        "the reset anchor is at the top",
        afterReset[0],
        0,
      );
      yield* ctx.expectContains(
        "a reset keeps the saved workspace",
        savedState(ctx),
        "split=400",
      );

      ctx.host.click("wr-restore");
      ctx.host.advance(0);
      yield* ctx.expectContains(
        "restore brings the split and tabs back",
        liveState(ctx),
        "split=400 tabsA=two tabsB=one active=one",
      );
      const restored = yield* ctx.expectSome(
        "the restored list reports an anchor",
        anchorOf(ctx),
      );
      yield* ctx.expectEqual("the restored index is exact", restored[0], 120);
      yield* ctx.expectEqual("the restored offset is exact", restored[1], 16);
      yield* ctx.expectEqual(
        "the restored row is painted",
        painted(ctx, 120),
        true,
      );
      yield* ctx.expectEqual(
        "the restored list is not at the top",
        painted(ctx, 0),
        false,
      );

      yield* ctx.expectEqual(
        "focus is not restored",
        focused(ctx) === "wr-row-120",
        false,
      );
      ctx.host.click("wr-row-120");
      yield* ctx.expectEqual(
        "the restored list accepts input",
        focused(ctx),
        "wr-row-120",
      );

      ctx.host.click("wr-restore");
      ctx.host.advance(0);
      yield* ctx.expectContains(
        "a second restore is idempotent",
        liveState(ctx),
        "split=400 tabsA=two tabsB=one active=one",
      );
      const again = yield* ctx.expectSome(
        "the second restored list reports an anchor",
        anchorOf(ctx),
      );
      yield* ctx.expectEqual(
        "the second restore keeps the index",
        again[0],
        120,
      );
    }),
};
