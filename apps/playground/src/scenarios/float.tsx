/**
 * Tier 4 probe: `float-tab` — a detachable tab as an in-window floating panel.
 *
 * GPUix 0.10.0 exposes one application window and no `openWindow` (plan `172`),
 * so a detached tab cannot become an OS window. This probe measures the honest
 * alternative, which no earlier scenario covered:
 *
 * - a captured tab drag released **outside** its dock tears the tab out;
 * - an absolutely positioned panel paints at the release point and **above**
 *   the dock (child order is 0.10.0's only stacking model) and takes its click;
 * - its title bar drags it by the pointer delta, and a component-owned clamp
 *   keeps it on the app surface;
 * - it owns native focus, closes on Escape and hands focus back to the dock;
 * - its tab docks back, and an emptied window is pruned;
 * - it is part of the app-owned restore payload.
 *
 * The model is pure (`panels/float.ts`); measured facts: plan `194` §8.
 */
import { useCallback, useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import {
  activate,
  describeDock,
  emptyGroup,
  groups,
  type DockNode,
  type Rectangle,
} from "../panels/dock.js";
import {
  FLOAT_HEIGHT,
  FLOAT_WIDTH,
  clampFloat,
  decodeWorkspace,
  dockFloat,
  encodeWorkspace,
  tearOff,
  type FloatWindow,
} from "../panels/float.js";
import type { PlaygroundScenario } from "../types.js";

/** The probe's app surface; all float coordinates are local to it. */
const APP_WIDTH = 900;
const APP_HEIGHT = 480;

/** A drag starts moving the tab only after this much pointer movement. */
const DRAG_THRESHOLD = 8;

/** A point in window coordinates, as GPUI reports input. */
interface Point {
  readonly x: number;
  readonly y: number;
}

/** The in-flight tab drag. */
interface TabDrag {
  readonly tabId: string;
  readonly start: Point;
  readonly last: Point;
}

/** The in-flight title-bar drag, anchored at the press. */
interface TitleGrab {
  readonly start: Point;
  readonly x: number;
  readonly y: number;
}

const INITIAL_DOCK: DockNode = {
  kind: "group",
  id: "main",
  title: "Main panel",
  tabs: [
    { id: "alpha", title: "Alpha" },
    { id: "beta", title: "Beta" },
    { id: "gamma", title: "Gamma" },
  ],
  active: "alpha",
};

const inside = (box: Rectangle, point: Point): boolean =>
  point.x >= box.x &&
  point.x <= box.x + box.width &&
  point.y >= box.y &&
  point.y <= box.y + box.height;

const FloatProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const [dock, setDock] = useState<DockNode>(INITIAL_DOCK);
  const [float, setFloat] = useState<Option.Option<FloatWindow>>(Option.none());
  const [saved, setSaved] = useState<Option.Option<string>>(Option.none());
  const [notice, setNotice] = useState("none");
  const [opened, setOpened] = useState(0);
  const [body, setBody] = useState(0);
  const [dockBody, setDockBody] = useState(0);
  const [docked, setDocked] = useState(0);
  const [closed, setClosed] = useState("none");
  const [drag, setDrag] = useState<Option.Option<TabDrag>>(Option.none());
  const [windowDrag, setWindowDrag] = useState<Option.Option<TabDrag>>(
    Option.none(),
  );
  const [grab, setGrab] = useState<Option.Option<TitleGrab>>(Option.none());
  const appInstance = useRef<Option.Option<number>>(Option.none());
  const dockInstance = useRef<Option.Option<number>>(Option.none());
  const activeTabInstance = useRef<Option.Option<number>>(Option.none());

  const appRef = useCallback((instance: PublicInstance | null) => {
    appInstance.current = Option.map(
      Option.fromNullishOr(instance),
      (element) => element.id,
    );
  }, []);
  const dockRef = useCallback((instance: PublicInstance | null) => {
    dockInstance.current = Option.map(
      Option.fromNullishOr(instance),
      (element) => element.id,
    );
  }, []);
  const activeTabRef = useCallback((instance: PublicInstance | null) => {
    activeTabInstance.current = Option.map(
      Option.fromNullishOr(instance),
      (element) => element.id,
    );
  }, []);

  const boxOf = (id: Option.Option<number>): Option.Option<Rectangle> =>
    Option.flatMap(id, (value) =>
      Option.fromNullishOr(renderer?.getElementBounds?.(value)),
    );

  const appBox = () => boxOf(appInstance.current);
  const group = Option.getOrElse(Arr.head(groups(dock)), () => emptyGroup());

  const pointOf = (event: {
    readonly x?: number | null;
    readonly y?: number | null;
  }): Point => ({ x: event.x ?? 0, y: event.y ?? 0 });

  const focusDockActive = () =>
    Option.match(activeTabInstance.current, {
      onNone: () => {},
      onSome: (id) => {
        renderer?.focusElement?.(id);
      },
    });

  const close = (reason: string) => {
    setFloat(Option.none());
    setClosed(reason);
    focusDockActive();
  };

  const tearOffTab = (current: TabDrag) => {
    const app = appBox();
    const surface = boxOf(dockInstance.current);
    if (Option.isSome(app) && Option.isSome(surface)) {
      const bounds = app.value;
      Option.match(
        tearOff(
          dock,
          float,
          current.tabId,
          { x: current.last.x - bounds.x, y: current.last.y - bounds.y },
          { width: bounds.width, height: bounds.height },
        ),
        {
          onNone: () => {},
          onSome: (next) => {
            setDock(next.dock);
            setFloat(Option.some(next.float));
            setOpened((count) => count + 1);
            setNotice("opened");
          },
        },
      );
    } else {
      setNotice("missing-surface");
    }
  };

  const tabPressed =
    (tabId: string) => (event: { x?: number | null; y?: number | null }) => {
      const point = pointOf(event);
      setDrag(Option.some({ tabId, start: point, last: point }));
    };

  const tabMoved = (event: { x?: number | null; y?: number | null }) =>
    Option.match(drag, {
      onNone: () => {},
      onSome: (current) =>
        setDrag(Option.some({ ...current, last: pointOf(event) })),
    });

  const tabReleased = () =>
    Option.match(drag, {
      onNone: () => {},
      onSome: (current) => {
        const travelled =
          Math.abs(current.last.x - current.start.x) > DRAG_THRESHOLD ||
          Math.abs(current.last.y - current.start.y) > DRAG_THRESHOLD;
        const outside = Option.match(boxOf(dockInstance.current), {
          onNone: () => false,
          onSome: (box) => !inside(box, current.last),
        });
        if (travelled && outside) {
          tearOffTab(current);
        } else {
          setDock(activate(dock, group.id, current.tabId));
        }
        setDrag(Option.none());
      },
    });

  const titlePressed = (event: { x?: number | null; y?: number | null }) => {
    const point = pointOf(event);
    Option.match(float, {
      onNone: () => {},
      onSome: (window) =>
        setGrab(Option.some({ start: point, x: window.x, y: window.y })),
    });
  };

  const titleMoved = (event: { x?: number | null; y?: number | null }) => {
    const point = pointOf(event);
    Option.match(grab, {
      onNone: () => {},
      onSome: (current) =>
        Option.match(float, {
          onNone: () => {},
          onSome: (window) =>
            Option.match(appBox(), {
              onNone: () => {},
              onSome: (app) =>
                setFloat(
                  Option.some(
                    clampFloat(
                      { width: app.width, height: app.height },
                      {
                        ...window,
                        x: current.x + point.x - current.start.x,
                        y: current.y + point.y - current.start.y,
                      },
                    ),
                  ),
                ),
            }),
        }),
    });
  };

  const titleReleased = () => setGrab(Option.none());

  const windowTabPressed =
    (window: FloatWindow, tabId: string) =>
    (event: { x?: number | null; y?: number | null }) => {
      const point = pointOf(event);
      setFloat(Option.some({ ...window, active: tabId }));
      setWindowDrag(Option.some({ tabId, start: point, last: point }));
    };

  const windowTabMoved = (event: { x?: number | null; y?: number | null }) =>
    Option.match(windowDrag, {
      onNone: () => {},
      onSome: (current) =>
        setWindowDrag(Option.some({ ...current, last: pointOf(event) })),
    });

  const windowTabReleased = () =>
    Option.match(windowDrag, {
      onNone: () => {},
      onSome: (current) => {
        const travelled =
          Math.abs(current.last.x - current.start.x) > DRAG_THRESHOLD ||
          Math.abs(current.last.y - current.start.y) > DRAG_THRESHOLD;
        if (travelled) {
          Option.match(float, {
            onNone: () => {},
            onSome: (window) => {
              const next = dockFloat(dock, window, group.id);
              setDock(next.dock);
              setFloat(next.float);
              setDocked((count) => count + 1);
              setNotice("docked");
            },
          });
        }
        setWindowDrag(Option.none());
      },
    });

  const save = () => {
    setSaved(Option.some(encodeWorkspace(dock, float)));
    setNotice("saved");
  };

  const restore = () =>
    Option.match(saved, {
      onNone: () => setNotice("none"),
      onSome: (json) =>
        Option.match(decodeWorkspace(json), {
          onNone: () => setNotice("invalid"),
          onSome: (value) => {
            setDock(value.dock);
            setFloat(value.float);
            setNotice("restored");
          },
        }),
    });

  const stateText = Option.match(float, {
    onNone: () => "float=none",
    onSome: (window) =>
      `float=${window.active} x=${Math.round(window.x)} y=${Math.round(
        window.y,
      )}`,
  });

  const floatView = Option.match(float, {
    onNone: () => null,
    onSome: (window) => (
      <div
        testId="float-window"
        role="region"
        aria-label="Floating panel"
        style={{
          position: "absolute",
          left: window.x,
          top: window.y,
          width: window.width,
          height: window.height,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          backgroundColor: theme.colors.card,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: theme.colors.muted,
          }}
        >
          <div
            testId="float-title"
            role="group"
            aria-label="Panel title bar"
            onMouseDown={titlePressed}
            onMouseMove={titleMoved}
            onMouseUp={titleReleased}
            style={{
              flexGrow: 1,
              padding: 4,
              cursor: "pointer",
            }}
          >
            <text style={{ color: theme.colors.foreground }}>
              {window.title}
            </text>
          </div>
          <div
            testId="float-close"
            role="button"
            aria-label="Close floating panel"
            tabIndex={0}
            onClick={() => close("button")}
            style={{ padding: 4, cursor: "pointer" }}
          >
            <text style={{ color: theme.colors.mutedForeground }}>close</text>
          </div>
        </div>
        <div style={{ display: "flex", gap: 2, padding: 4 }}>
          {window.tabs.map((tab) => (
            <div
              key={tab.id}
              testId={`float-window-tab-${tab.id}`}
              role="tab"
              aria-selected={window.active === tab.id}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "escape") close("escape");
              }}
              onMouseDown={windowTabPressed(window, tab.id)}
              onMouseMove={windowTabMoved}
              onMouseUp={windowTabReleased}
              style={{
                padding: 4,
                borderRadius: 4,
                cursor: "pointer",
                backgroundColor:
                  window.active === tab.id
                    ? theme.colors.background
                    : theme.colors.muted,
              }}
            >
              <text style={{ color: theme.colors.foreground }}>
                {tab.title}
              </text>
            </div>
          ))}
        </div>
        <div
          testId="float-window-body"
          onClick={() => setBody((count) => count + 1)}
          style={{ flexGrow: 1, minHeight: 0, padding: 6 }}
        >
          <Readout testId="float-window-label">{`float:${
            window.active === "" ? "none" : window.active
          }`}</Readout>
        </div>
      </div>
    ),
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        backgroundColor: theme.colors.background,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Readout testId="float-dock-state">{describeDock(dock)}</Readout>
        <Readout testId="float-state">{stateText}</Readout>
        <Readout testId="float-saved">{`saved=${
          Option.isSome(saved) ? "yes" : "no"
        } notice=${notice}`}</Readout>
        <Pressable testId="float-save" onClick={save}>
          <text>save</text>
        </Pressable>
        <Pressable testId="float-restore" onClick={restore}>
          <text>restore</text>
        </Pressable>
      </div>
      <div
        testId="float-app"
        ref={appRef}
        style={{
          position: "relative",
          width: APP_WIDTH,
          height: APP_HEIGHT,
          overflow: "hidden",
          backgroundColor: theme.colors.background,
        }}
      >
        <div
          testId="float-dock"
          ref={dockRef}
          style={{
            height: 220,
            display: "flex",
            flexDirection: "column",
            backgroundColor: theme.colors.card,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
          }}
        >
          <div
            role="tablist"
            aria-label="Main panel"
            style={{ display: "flex", gap: 2, padding: 4 }}
          >
            {group.tabs.map((tab) => (
              <div
                key={tab.id}
                testId={`float-tab-${tab.id}`}
                ref={group.active === tab.id ? activeTabRef : undefined}
                role="tab"
                aria-selected={group.active === tab.id}
                tabIndex={0}
                onClick={() =>
                  setDock((current) => activate(current, group.id, tab.id))
                }
                onMouseDown={tabPressed(tab.id)}
                onMouseMove={tabMoved}
                onMouseUp={tabReleased}
                style={{
                  padding: 4,
                  borderRadius: 4,
                  cursor: "pointer",
                  backgroundColor:
                    group.active === tab.id
                      ? theme.colors.card
                      : theme.colors.muted,
                  hover: { backgroundColor: theme.colors.card },
                }}
              >
                <text style={{ color: theme.colors.foreground }}>
                  {tab.title}
                </text>
              </div>
            ))}
          </div>
          <div
            testId="float-dock-body"
            onClick={() => setDockBody((count) => count + 1)}
            style={{ flexGrow: 1, minHeight: 0, padding: 6 }}
          >
            <Readout testId="float-dock-label">{`dock:${group.active}`}</Readout>
          </div>
        </div>
        {floatView}
      </div>
      <Readout testId="float-log">{`opened=${opened} body=${body} dockBody=${dockBody} docked=${docked} closed=${closed}`}</Readout>
    </div>
  );
};

export const floatScenario: PlaygroundScenario = {
  id: "float-tab",
  title: "Detachable tab: an in-window floating panel",
  capability: "float",
  view: () => <FloatProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const read = (testId: string): string =>
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.text(testId)),
          () => "none",
        );
      const boxOf = (testId: string) =>
        ctx.expectSome(
          `bounds of ${testId}`,
          Option.fromNullishOr(ctx.host.bounds(testId)),
        );
      const near = (label: string, actual: number, expected: number) =>
        ctx.expectNear(label, actual, expected, 1);
      const absent = (label: string, testId: string) =>
        ctx.expectEqual(
          label,
          Option.isNone(Option.fromNullishOr(ctx.host.bounds(testId))),
          true,
        );
      const focused = () =>
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.focused()),
          () => "none",
        );

      const app = yield* boxOf("float-app");

      yield* ctx.expectContains(
        "no float before a tear-off",
        read("float-state"),
        "float=none",
      );
      yield* ctx.expectContains(
        "the dock starts with three tabs",
        read("float-dock-state"),
        "main=alpha,beta,gamma@alpha",
      );
      yield* absent("the float is not painted", "float-window");

      const tearOff = (id: string, x: number, y: number) => {
        ctx.host.press(`float-tab-${id}`);
        ctx.host.movePointer(app.x + x / 2, app.y + y / 2);
        ctx.host.movePointer(app.x + x, app.y + y);
        ctx.host.releasePointer(app.x + x, app.y + y);
      };

      const moveBy = (deltaX: number, deltaY: number) =>
        Effect.gen(function* () {
          const title = yield* boxOf("float-title");
          const x = title.x + title.width / 2 + deltaX;
          const y = title.y + title.height / 2 + deltaY;
          ctx.host.press("float-title");
          ctx.host.movePointer(x, y);
          ctx.host.releasePointer(x, y);
        });

      tearOff("alpha", 560, 320);
      yield* ctx.expectContains(
        "the tab left the dock",
        read("float-dock-state"),
        "main=beta,gamma@beta",
      );
      yield* ctx.expectContains(
        "the float holds the torn tab",
        read("float-state"),
        "float=alpha x=560 y=320",
      );
      const opened = yield* boxOf("float-window");
      yield* near("the float paints at the release x", opened.x, app.x + 560);
      yield* near("the float paints at the release y", opened.y, app.y + 320);
      yield* absent("the torn tab is gone from the strip", "float-tab-alpha");
      yield* ctx.expectContains(
        "one tear-off was counted",
        read("float-log"),
        "opened=1",
      );

      yield* moveBy(-360, -260);
      const overDock = yield* boxOf("float-window");
      yield* near("the title drag moved x exactly", overDock.x, app.x + 200);
      yield* near("the title drag moved y exactly", overDock.y, app.y + 60);

      ctx.host.clickWindow(app.x + 260, app.y + 180);
      yield* ctx.expectContains(
        "a click on the overlap reaches the float",
        read("float-log"),
        "body=1",
      );
      yield* ctx.expectContains(
        "the dock body under it does not take the click",
        read("float-log"),
        "dockBody=0",
      );

      yield* moveBy(2000, 2000);
      const clamped = yield* boxOf("float-window");
      yield* near(
        "the clamp pins the right edge",
        clamped.x,
        app.x + APP_WIDTH - FLOAT_WIDTH,
      );
      yield* near(
        "the clamp pins the bottom edge",
        clamped.y,
        app.y + APP_HEIGHT - FLOAT_HEIGHT,
      );
      yield* ctx.expectEqual(
        "the window stays inside the app surface",
        clamped.x + clamped.width <= app.x + APP_WIDTH &&
          clamped.y + clamped.height <= app.y + APP_HEIGHT,
        true,
      );

      ctx.host.click("float-window-tab-alpha");
      yield* ctx.expectEqual(
        "the float tab holds native focus",
        focused(),
        "float-window-tab-alpha",
      );
      ctx.host.key("escape");
      yield* ctx.expectContains(
        "Escape closed the float",
        read("float-state"),
        "float=none",
      );
      yield* ctx.expectContains(
        "the close reason is Escape",
        read("float-log"),
        "closed=escape",
      );
      yield* ctx.expectEqual(
        "focus returned to the dock's active tab",
        focused(),
        "float-tab-beta",
      );

      tearOff("beta", 540, 320);
      yield* ctx.expectContains(
        "the second tear-off opened a float",
        read("float-state"),
        "float=beta",
      );
      ctx.host.press("float-window-tab-beta");
      ctx.host.movePointer(app.x + 100, app.y + 20);
      ctx.host.releasePointer(app.x + 100, app.y + 20);
      yield* ctx.expectContains(
        "the tab is back in the dock",
        read("float-dock-state"),
        "main=gamma,beta@beta",
      );
      yield* ctx.expectContains(
        "the emptied float is pruned",
        read("float-state"),
        "float=none",
      );
      yield* ctx.expectContains(
        "one re-dock was counted",
        read("float-log"),
        "docked=1",
      );
      yield* absent("the pruned float is not painted", "float-window");

      tearOff("gamma", 420, 300);
      yield* ctx.expectContains(
        "a float is open for the accessibility check",
        read("float-state"),
        "float=gamma x=420 y=300",
      );
      const nodes = Option.match(Option.fromNullishOr(ctx.host.a11y()), {
        onNone: () => [],
        onSome: (tree) =>
          Arr.getSomes(Arr.map(R.values(tree.nodes), (entry) => entry.aria)),
      });
      const hasRole = (node: Smoke.A11yNode, role: string): boolean =>
        Option.match(node.role, {
          onNone: () => false,
          onSome: (value) => value === role,
        });
      const hasLabel = (node: Smoke.A11yNode, label: string): boolean =>
        Option.match(node.label, {
          onNone: () => false,
          onSome: (value) => value === label,
        });
      yield* ctx.expectEqual(
        "the panel is an announced region",
        Arr.some(
          nodes,
          (node) => hasRole(node, "Region") && hasLabel(node, "Floating panel"),
        ),
        true,
      );
      yield* ctx.expectEqual(
        "the float tab is announced as a tab",
        Arr.some(nodes, (node) => hasRole(node, "Tab")),
        true,
      );
      yield* ctx.expectEqual(
        "the close control is a labelled button",
        Arr.some(
          nodes,
          (node) =>
            hasRole(node, "Button") && hasLabel(node, "Close floating panel"),
        ),
        true,
      );

      ctx.host.click("float-save");
      yield* ctx.expectContains(
        "the workspace was saved",
        read("float-saved"),
        "saved=yes",
      );
      yield* moveBy(180, 40);
      const moved = yield* boxOf("float-window");
      yield* near(
        "the float moved away from the saved point",
        moved.x,
        app.x + 600,
      );
      ctx.host.click("float-restore");
      yield* ctx.expectContains(
        "the restored float is the saved tab",
        read("float-state"),
        "float=gamma x=420 y=300",
      );
      const restored = yield* boxOf("float-window");
      yield* near("the restored x is exact", restored.x, app.x + 420);
      yield* near("the restored y is exact", restored.y, app.y + 300);

      ctx.host.click("float-close");
      yield* ctx.expectContains(
        "the close button closed the float",
        read("float-state"),
        "float=none",
      );
      yield* ctx.expectContains(
        "the close reason is the button",
        read("float-log"),
        "closed=button",
      );
      yield* ctx.expectContains(
        "a closed float drops its tab rather than restoring it",
        read("float-dock-state"),
        "main=beta@beta",
      );

      ctx.host.screenshot(
        "apps/playground/.artifacts/screenshots/float-tab.png",
      );
    }),
};
