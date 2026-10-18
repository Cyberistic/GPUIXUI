/**
 * `app-chrome` — the application shell: a toolbar, a two-pane body and a pinned
 * status bar (plan `350`).
 *
 * Three Tier 4 rows had no runtime evidence: status bars, toolbars and
 * breadcrumb navigation. Every ingredient was measured apart — a horizontal
 * scroller whose clipped children keep painted bounds (`tab-strip-overflow`),
 * a component-owned reveal (`data-grid-virtual`), a virtual-list anchor
 * (`scroll-into-view`) and the `Navigation`/`Link` roles (`tier2-navigation`) —
 * but no probe had built a shell around them. This one measures:
 *
 * - a `flexShrink: 0` status bar at the shell's bottom edge while two sibling
 *   panes scroll independently;
 * - a toolbar narrower than its item row: the trailing action keeps painted
 *   bounds while clipped and runs after one `renderer.scrollTo`;
 * - a breadcrumb that collapses its middle from app state, keeps the first and
 *   last segment, and activates each crumb by click or Enter.
 */
import { useRef, useState } from "react";
import { Effect, Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import { ariaOf, read, text } from "./probes.js";
import type { PlaygroundScenario } from "../types.js";

const SHELL_WIDTH = 640;
const SHELL_HEIGHT = 420;
const TOOLBAR_HEIGHT = 36;
const STATUS_HEIGHT = 24;
const BODY_HEIGHT = SHELL_HEIGHT - TOOLBAR_HEIGHT - STATUS_HEIGHT;
const TOOLBAR_VIEWPORT = 380;
const TOOLBAR_ROW_WIDTH = 720;
const TOOLBAR_MAX_PAN = TOOLBAR_VIEWPORT - TOOLBAR_ROW_WIDTH;
const SIDEBAR_WIDTH = 200;
const MAIN_WIDTH = SHELL_WIDTH - SIDEBAR_WIDTH;
const ROW_HEIGHT = 24;
const SIDEBAR_ROWS = 20;
const LIST_ROWS = 40;
const CRUMBS = ["Workspace", "Project", "src", "file.ts"] as const;
const COLLAPSED = 3;

/** One crumb, or the ellipsis that replaces a collapsed middle. */
type TrailItem =
  | { readonly kind: "crumb"; readonly index: number; readonly label: string }
  | { readonly kind: "gap" };

const crumb = (index: number): TrailItem => ({
  kind: "crumb",
  index,
  label: Option.getOrElse(Arr.get([...CRUMBS], index), () => ""),
});

/**
 * The trail to paint: every crumb up to `depth`, or — when collapsed — the
 * first and last with an ellipsis between them.
 *
 * The bug this guards: a collapse that hides the *last* segment (the current
 * page) or drops the root, which makes the trail useless for navigation.
 */
export const trailOf = (
  depth: number,
  collapsed: boolean,
): ReadonlyArray<TrailItem> =>
  collapsed && depth > COLLAPSED
    ? [crumb(0), { kind: "gap" }, crumb(depth - 1)]
    : Arr.map(Arr.range(0, depth - 1), crumb);

/** A breadcrumb segment: a focusable link with a click and an Enter path. */
const Crumb = ({
  item,
  onNavigate,
}: {
  readonly item: Extract<TrailItem, { kind: "crumb" }>;
  readonly onNavigate: (index: number) => void;
}) => {
  const theme = useTheme();
  return (
    <div
      testId={`crumb-${item.index}`}
      aria-id={`crumb-${item.index}`}
      aria-label={item.label}
      role="link"
      tabIndex={0}
      onClick={() => onNavigate(item.index)}
      onKeyDown={(event) =>
        Match.value(event.key).pipe(
          Match.when("enter", () => onNavigate(item.index)),
          Match.orElse(() => {}),
        )
      }
      style={{
        padding: 2,
        cursor: "pointer",
        borderRadius: theme.radius.sm,
        hover: { backgroundColor: theme.colors.border },
      }}
    >
      <text style={{ fontSize: 12, color: theme.colors.foreground }}>
        {item.label}
      </text>
    </div>
  );
};

const AppChromeProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const toolbar = useRef<PublicInstance | null>(null);
  const list = useRef<PublicInstance | null>(null);
  const sidebarRef = useRef<PublicInstance | null>(null);
  const [actions, setActions] = useState(0);
  const [sync, setSync] = useState(0);
  const [depth, setDepth] = useState<number>(CRUMBS.length);
  const [collapsed, setCollapsed] = useState(false);
  const [selected, setSelected] = useState(Option.none<number>());
  const [line, setLine] = useState(0);
  const [pane, setPane] = useState<"sidebar" | "main">("sidebar");
  const [toolbarX, setToolbarX] = useState(0);
  const [sidebarY, setSidebarY] = useState(0);

  const navigate = (index: number) => setDepth(index + 1);

  /** The list's post-scroll anchor; the payload lags a gesture (plan `300`). */
  const syncLine = (): void => {
    Option.match(Option.fromNullishOr(list.current?.id), {
      onNone: () => {},
      onSome: (id) =>
        Option.match(Option.fromNullishOr(renderer?.getListScrollTop?.(id)), {
          onNone: () => {},
          onSome: (value) =>
            setLine((current) => (current === (value[0] ?? 0) ? current : (value[0] ?? 0))),
        }),
    });
  };

  const syncSidebar = (): void => {
    Option.match(Option.fromNullishOr(sidebarRef.current?.id), {
      onNone: () => {},
      onSome: (id) =>
        Option.match(Option.fromNullishOr(renderer?.getScrollOffset?.(id)), {
          onNone: () => {},
          onSome: (offset) => setSidebarY(offset[1] ?? 0),
        }),
    });
  };

  const syncToolbar = (): void => {
    Option.match(Option.fromNullishOr(toolbar.current?.id), {
      onNone: () => {},
      onSome: (id) =>
        Option.match(Option.fromNullishOr(renderer?.getScrollOffset?.(id)), {
          onNone: () => {},
          onSome: (offset) => setToolbarX(offset[0] ?? 0),
        }),
    });
  };

  const panToolbar = (x: number): void => {
    Option.match(Option.fromNullishOr(toolbar.current?.id), {
      onNone: () => {},
      onSome: (id) => renderer?.scrollTo?.(id, x, 0),
    });
    setToolbarX(x);
  };

  const select = (id: number): void => {
    setSelected(Option.some(id));
    setPane("sidebar");
  };

  const pickLine = (index: number): void => {
    setLine(index);
    setPane("main");
  };

  const trail = trailOf(depth, collapsed);

  return (
    <div
      testId="chrome-frame"
      style={{ display: "flex", flexDirection: "column", gap: 8, width: 640 }}
    >
      <div
        testId="chrome-shell"
        style={{
          display: "flex",
          flexDirection: "column",
          width: SHELL_WIDTH,
          height: SHELL_HEIGHT,
          backgroundColor: theme.colors.background,
        }}
      >
        <div
          ref={toolbar}
          testId="chrome-toolbar"
          role="toolbar"
          aria-label="Workspace toolbar"
          onScroll={syncToolbar}
          style={{
            width: TOOLBAR_VIEWPORT,
            height: TOOLBAR_HEIGHT,
            overflowX: "scroll",
            overflowY: "hidden",
            backgroundColor: theme.colors.muted,
          }}
        >
          <div
            testId="chrome-toolbar-row"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              width: TOOLBAR_ROW_WIDTH,
              height: TOOLBAR_HEIGHT,
              paddingLeft: 4,
            }}
          >
            <div
              testId="chrome-trail"
              aria-id="chrome-trail"
              aria-label="Trail"
              role="navigation"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                flexShrink: 0,
              }}
            >
              {Arr.map(trail, (item, position) => (
                <div
                  key={position}
                  style={{ display: "flex", alignItems: "center", gap: 4 }}
                >
                  {position === 0 ? null : (
                    <text
                      style={{
                        fontSize: 12,
                        color: theme.colors.mutedForeground,
                      }}
                    >
                      /
                    </text>
                  )}
                  {item.kind === "crumb" ? (
                    <Crumb item={item} onNavigate={navigate} />
                  ) : (
                    <text
                      testId="chrome-gap"
                      style={{
                        fontSize: 12,
                        color: theme.colors.mutedForeground,
                      }}
                    >
                      …
                    </text>
                  )}
                </div>
              ))}
            </div>
            <Pressable
              testId="chrome-new"
              onClick={() => setActions((current) => current + 1)}
              style={{
                width: 44,
                height: 24,
                padding: 0,
                justifyContent: "center",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <text style={{ fontSize: 12, color: theme.colors.foreground }}>
                new
              </text>
            </Pressable>
            <Pressable
              testId="chrome-split"
              onClick={() => setActions((current) => current + 1)}
              style={{
                width: 44,
                height: 24,
                padding: 0,
                justifyContent: "center",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <text style={{ fontSize: 12, color: theme.colors.foreground }}>
                split
              </text>
            </Pressable>
            <Pressable
              testId="chrome-close"
              onClick={() => setActions((current) => current + 1)}
              style={{
                width: 44,
                height: 24,
                padding: 0,
                justifyContent: "center",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <text style={{ fontSize: 12, color: theme.colors.foreground }}>
                close
              </text>
            </Pressable>
            <div
              testId="chrome-separator"
              style={{
                width: theme.borderWidth.thin,
                height: 20,
                flexShrink: 0,
                backgroundColor: theme.colors.border,
              }}
            />
            <div
              testId="chrome-spacer"
              style={{ width: 300, height: TOOLBAR_HEIGHT, flexShrink: 0 }}
            />
            <Pressable
              testId="chrome-sync"
              onClick={() => setSync((current) => current + 1)}
              style={{
                width: 44,
                height: 24,
                padding: 0,
                justifyContent: "center",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <text style={{ fontSize: 12, color: theme.colors.foreground }}>
                sync
              </text>
            </Pressable>
          </div>
        </div>

        <div
          testId="chrome-body"
          style={{ display: "flex", height: BODY_HEIGHT }}
        >
          <div
            ref={sidebarRef}
            testId="chrome-sidebar"
            onScroll={syncSidebar}
            style={{
              width: SIDEBAR_WIDTH,
              height: BODY_HEIGHT,
              overflowY: "scroll",
              overflowX: "hidden",
              backgroundColor: theme.colors.card,
            }}
          >
            {Arr.map(Arr.range(0, SIDEBAR_ROWS - 1), (index) => (
              <div
                key={index}
                testId={`chrome-item-${index}`}
                tabIndex={0}
                role="listitem"
                onClick={() => select(index)}
                style={{
                  height: ROW_HEIGHT,
                  flexShrink: 0,
                  paddingLeft: theme.spacing.sm,
                  justifyContent: "center",
                  backgroundColor: Option.contains(selected, index)
                    ? theme.colors.accent
                    : theme.colors.card,
                  borderWidth: theme.borderWidth.thin,
                  borderColor: theme.colors.border,
                  hover: { backgroundColor: theme.colors.muted },
                }}
              >
                <text style={{ fontSize: 11, color: theme.colors.foreground }}>
                  {`item ${index}`}
                </text>
              </div>
            ))}
          </div>
          <div
            testId="chrome-main"
            style={{ width: MAIN_WIDTH, height: BODY_HEIGHT }}
          >
          <div
            testId="chrome-main-viewport"
            style={{ width: MAIN_WIDTH, height: BODY_HEIGHT }}
          >
            <virtual-list
              testId="chrome-list"
              ref={list}
              estimatedItemHeight={ROW_HEIGHT}
              onVisibleRange={syncLine}
              style={{ width: MAIN_WIDTH, height: BODY_HEIGHT }}
            >
              {Arr.map(Arr.range(0, LIST_ROWS - 1), (index) => (
                <div
                  key={index}
                  testId={`chrome-line-${index}`}
                  onClick={() => pickLine(index)}
                  style={{
                    height: ROW_HEIGHT,
                    backgroundColor:
                      line === index
                        ? theme.colors.muted
                        : theme.colors.background,
                    hover: { backgroundColor: theme.colors.muted },
                  }}
                >
                  <text
                    style={{ fontSize: 11, color: theme.colors.foreground }}
                  >
                    {`line ${index}`}
                  </text>
                </div>
              ))}
            </virtual-list>
          </div>
          </div>
        </div>

        <div
          testId="chrome-status"
          aria-id="chrome-status"
          aria-label="Status"
          role="status"
          style={{
            display: "flex",
            alignItems: "center",
            width: SHELL_WIDTH,
            height: STATUS_HEIGHT,
            flexShrink: 0,
            paddingLeft: theme.spacing.sm,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.muted,
          }}
        >
          <text
            testId="chrome-status-text"
            style={{ fontSize: 11, color: theme.colors.mutedForeground }}
          >
            {`pane=${pane} line=${line} sel=${Option.match(selected, {
              onNone: () => "none",
              onSome: (id) => `${id}`,
            })} actions=${actions} trail=${depth} sync=${sync} x=${toolbarX} y=${sidebarY}`}
          </text>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Pressable testId="chrome-pan-home" onClick={() => panToolbar(0)}>
          <text style={{ color: theme.colors.foreground }}>pan home</text>
        </Pressable>
        <Pressable
          testId="chrome-pan-end"
          onClick={() => panToolbar(TOOLBAR_MAX_PAN)}
        >
          <text style={{ color: theme.colors.foreground }}>pan end</text>
        </Pressable>
        <Pressable
          testId="chrome-collapse"
          onClick={() => setCollapsed((current) => !current)}
        >
          <text style={{ color: theme.colors.foreground }}>collapse</text>
        </Pressable>
      </div>

      <Readout testId="chrome-readout">
        {`depth=${depth} collapsed=${collapsed}`}
      </Readout>
    </div>
  );
};

const state = (ctx: Smoke.SmokeContext): string => read(ctx, "chrome-status-text");

const boundsOrFail = (
  ctx: Smoke.SmokeContext,
  testId: string,
  label: string,
) => ctx.expectSome(label, Option.fromNullishOr(ctx.host.bounds(testId)));

const paints = (ctx: Smoke.SmokeContext, needle: string): boolean =>
  Arr.some(ctx.host.paintedText(), Str.includes(needle));

const scrollY = (ctx: Smoke.SmokeContext, testId: string): number =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(ctx.host.scrollOffset(testId)),
      (value) => value.y,
    ),
    () => 0,
  );

const scrollX = (ctx: Smoke.SmokeContext, testId: string): number =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(ctx.host.scrollOffset(testId)),
      (value) => value.x,
    ),
    () => 0,
  );

export const appChromeScenario: PlaygroundScenario = {
  id: "app-chrome",
  title: "Application chrome: toolbar, pinned status bar and a breadcrumb trail",
  capability: "chrome",
  view: () => <AppChromeProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      // Shell geometry: the bar is at the bottom, the body fills the middle.
      const shell = yield* boundsOrFail(
        ctx,
        "chrome-shell",
        "the shell paints",
      );
      const toolbar = yield* boundsOrFail(
        ctx,
        "chrome-toolbar",
        "the toolbar paints",
      );
      const body = yield* boundsOrFail(ctx, "chrome-body", "the body paints");
      const status = yield* boundsOrFail(
        ctx,
        "chrome-status",
        "the status bar paints",
      );
      yield* ctx.expectNear(
        "the toolbar is the shell's top strip",
        toolbar.y,
        shell.y,
        1,
      );
      yield* ctx.expectNear(
        "the toolbar is 36 px tall",
        toolbar.height,
        36,
        1,
      );
      yield* ctx.expectNear(
        "the body starts under the toolbar",
        body.y,
        toolbar.y + TOOLBAR_HEIGHT,
        1,
      );
      yield* ctx.expectNear(
        "the body fills the space between the strips",
        body.height,
        360,
        1,
      );
      yield* ctx.expectNear(
        "the status bar is 24 px tall",
        status.height,
        24,
        1,
      );
      yield* ctx.expectNear(
        "the status bar sits at the shell's bottom edge",
        status.y + status.height,
        shell.y + SHELL_HEIGHT,
        1,
      );
      yield* ctx.expectEqual(
        "the shell starts idle",
        state(ctx),
        "pane=sidebar line=0 sel=none actions=0 trail=4 sync=0 x=0 y=0",
      );

      // The toolbar is narrower than its row: the trailing action is clipped
      // but addressable, and one pan reveals and runs it.
      const row = yield* boundsOrFail(
        ctx,
        "chrome-toolbar-row",
        "the toolbar row paints",
      );
      yield* ctx.expectNear(
        "the toolbar row is wider than the viewport",
        row.width,
        TOOLBAR_ROW_WIDTH,
        1,
      );
      const syncAtRest = yield* boundsOrFail(
        ctx,
        "chrome-sync",
        "the trailing action keeps painted bounds while clipped",
      );
      yield* ctx.expectEqual(
        "the trailing action starts past the toolbar's edge",
        syncAtRest.x >= toolbar.x + TOOLBAR_VIEWPORT,
        true,
      );
      ctx.host.click("chrome-pan-end");
      yield* ctx.expectEqual(
        "the toolbar pan reaches the far edge",
        scrollX(ctx, "chrome-toolbar"),
        TOOLBAR_MAX_PAN,
      );
      yield* ctx.expectContains(
        "the status bar reports the toolbar offset",
        state(ctx),
        `x=${TOOLBAR_MAX_PAN}`,
      );
      const syncPanned = yield* boundsOrFail(
        ctx,
        "chrome-sync",
        "the trailing action paints after the pan",
      );
      yield* ctx.expectNear(
        "the pan moves the trailing action by the offset",
        syncPanned.x,
        syncAtRest.x + TOOLBAR_MAX_PAN,
        1,
      );
      ctx.host.click("chrome-sync");
      yield* ctx.expectContains(
        "the revealed action runs once",
        state(ctx),
        "sync=1",
      );

      // A crumb is a focusable link; the trail collapses its middle only.
      ctx.host.click("chrome-pan-home");
      yield* ctx.expectEqual(
        "the toolbar pan returns to the start",
        scrollX(ctx, "chrome-toolbar"),
        0,
      );
      yield* ctx.expectEqual(
        "every crumb paints at rest",
        paints(ctx, "src") && paints(ctx, "file.ts"),
        true,
      );
      ctx.host.click("chrome-collapse");
      yield* ctx.expectEqual(
        "collapse hides the middle segment",
        paints(ctx, "src"),
        false,
      );
      yield* ctx.expectEqual(
        "collapse keeps the root and the current page",
        paints(ctx, "Workspace") && paints(ctx, "file.ts"),
        true,
      );
      ctx.host.click("chrome-collapse");
      yield* ctx.expectEqual(
        "expanding restores the middle segment",
        paints(ctx, "src"),
        true,
      );
      ctx.host.click("crumb-1");
      yield* ctx.expectContains(
        "a crumb truncates the trail to its depth",
        state(ctx),
        "trail=2",
      );
      yield* ctx.expectEqual(
        "the truncated trail drops the deeper crumbs",
        paints(ctx, "src") || paints(ctx, "file.ts"),
        false,
      );
      ctx.host.click("crumb-0");
      yield* ctx.expectEqual(
        "a crumb takes native focus",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.focused()),
          () => "none",
        ),
        "crumb-0",
      );
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "Enter activates the focused crumb",
        state(ctx),
        "trail=1",
      );

      // Two independent scrollers, one pinned bar.
      ctx.host.wheel("chrome-sidebar", 0, -100);
      yield* ctx.expectNear(
        "the sidebar wheel moves its own offset",
        scrollY(ctx, "chrome-sidebar"),
        -100,
        2,
      );
      yield* ctx.expectContains(
        "a sidebar wheel leaves the list line alone",
        state(ctx),
        "line=0",
      );
      const statusAfterSidebar = yield* boundsOrFail(
        ctx,
        "chrome-status",
        "the status bar still paints",
      );
      yield* ctx.expectNear(
        "the status bar does not move with the sidebar",
        statusAfterSidebar.y,
        status.y,
        1,
      );
      ctx.host.wheel("chrome-main-viewport", 0, -240);
      yield* ctx.expectContains(
        "the list wheel anchors the list",
        state(ctx),
        "line=10",
      );
      yield* ctx.expectNear(
        "the list wheel leaves the sidebar alone",
        scrollY(ctx, "chrome-sidebar"),
        -100,
        2,
      );
      const statusAfterList = yield* boundsOrFail(
        ctx,
        "chrome-status",
        "the status bar still paints after the list wheel",
      );
      yield* ctx.expectNear(
        "the status bar does not move with the list",
        statusAfterList.y,
        status.y,
        1,
      );

      // Input decides the active pane; the bar reports it.
      ctx.host.click("chrome-item-6");
      yield* ctx.expectContains(
        "a sidebar row selects and makes its pane active",
        state(ctx),
        "pane=sidebar",
      );
      yield* ctx.expectContains(
        "the sidebar selection reaches the bar",
        state(ctx),
        "sel=6",
      );
      ctx.host.click("chrome-line-12");
      yield* ctx.expectContains(
        "a line click makes the main pane active",
        state(ctx),
        "pane=main",
      );
      yield* ctx.expectContains(
        "the clicked line reaches the bar",
        state(ctx),
        "line=12",
      );
      ctx.host.click("chrome-new");
      yield* ctx.expectContains(
        "a toolbar action runs once",
        state(ctx),
        "actions=1",
      );

      // Accessibility: the trail, its crumbs and the bar are addressable.
      const trail = yield* ctx.expectSome(
        "the trail is exposed to assistive technology",
        ariaOf(ctx, "chrome-trail"),
      );
      yield* ctx.expectEqual(
        "the trail is a Navigation named Trail",
        `${text(trail.role)}:${text(trail.label)}`,
        "Navigation:Trail",
      );
      const statusNode = yield* ctx.expectSome(
        "the bar is exposed to assistive technology",
        ariaOf(ctx, "chrome-status"),
      );
      yield* ctx.expectEqual(
        "the bar is a Status named Status",
        `${text(statusNode.role)}:${text(statusNode.label)}`,
        "Status:Status",
      );
    }),
};
