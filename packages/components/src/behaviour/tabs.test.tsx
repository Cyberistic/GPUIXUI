/**
 * Tabs behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a click that showed two panels at once; the active tab
 * painted with the wrong theme role; arrow keys that moved the highlight but not
 * real focus (or did not wrap); manual activation that selected on focus anyway,
 * so Enter was meaningless; a disabled tab that could be focused or clicked; and
 * a controlled tab set that changed its own panel when the consumer said no. A
 * caller `ref` on a trigger was discarded in favour of the internal one, and so
 * was a caller `onBlur`. A vertical tab set could move along the wrong axis,
 * stay laid out horizontally, react to Left/Right, or bypass manual activation.
 * Space selected on key down instead of on release. The visible panel was named
 * by its internal value (`profile`) instead of the tab's label (`Profile`), so a
 * screen reader heard an opaque id for the only region the tab set revealed.
 * A selected value that named a removed tab kept painting its panel, so the tab
 * set revealed a region no trigger could select.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import type { StateStyle } from "@gpuix/react/floating";
import { createRef, useCallback, useLayoutEffect, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { nodesWithRole } from "../internal/a11y.js";
import { clickCentreOf, focusedTestId } from "../internal/interaction.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
  type TestTheme,
} from "../internal/test-root.js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type TabsTriggerState,
} from "../tabs.js";

/** Three settings panels with the middle tab disabled. */
const Settings = ({
  activation,
  value,
  onValueChange,
}: {
  readonly activation?: "automatic" | "manual";
  readonly value?: string;
  readonly onValueChange?: (value: string) => void;
}) => (
  <Tabs
    defaultValue="profile"
    activation={activation}
    value={value}
    onValueChange={onValueChange}
    testId="tabs-root"
  >
    <TabsList testId="list">
      <TabsTrigger testId="tab-profile" value="profile">
        Profile
      </TabsTrigger>
      <TabsTrigger testId="tab-billing" value="billing" disabled>
        Billing
      </TabsTrigger>
      <TabsTrigger testId="tab-danger" value="danger">
        Danger
      </TabsTrigger>
    </TabsList>
    <TabsContent testId="panel-profile" value="profile">
      <text>Profile panel</text>
    </TabsContent>
    <TabsContent testId="panel-billing" value="billing">
      <text>Billing panel</text>
    </TabsContent>
    <TabsContent testId="panel-danger" value="danger">
      <text>Danger panel</text>
    </TabsContent>
  </Tabs>
);

/** A tab whose label the app can edit, to prove the panel name follows it. */
const NamedTabs = ({ label }: { readonly label: string }) => (
  <Tabs defaultValue="profile" testId="named-tabs">
    <TabsList testId="named-list">
      <TabsTrigger testId="named-profile" value="profile">
        {label}
      </TabsTrigger>
      <TabsTrigger testId="named-billing" value="billing">
        Billing
      </TabsTrigger>
    </TabsList>
    <TabsContent testId="named-panel" value="profile">
      <text>Profile panel</text>
    </TabsContent>
    <TabsContent testId="named-other" value="billing">
      <text>Billing panel</text>
    </TabsContent>
  </Tabs>
);

const focusTab = (root: ComponentTestRoot, testId: string): void => {
  root.renderer.focusElement(root.renderer.findByTestId(testId)?.id ?? -1);
};

/**
 * Tabs built from data, so a test can rerender a different set (plan 511).
 * `Claim` is rendered first inside a container because the runtime keeps one
 * child at the root (measured in plan 510).
 */
const dynamicTabs = (
  values: ReadonlyArray<string>,
  {
    disabled = [],
    activation,
    tabStyle,
  }: {
    readonly disabled?: ReadonlyArray<string>;
    readonly activation?: "automatic" | "manual";
    readonly tabStyle?: (value: string) => StateStyle<TabsTriggerState>;
  } = {},
) => (
  <Tabs defaultValue="a" activation={activation} testId="tabs">
    <TabsList testId="list">
      {Arr.map(values, (value) => (
        <TabsTrigger
          key={value}
          testId={`tab-${value}`}
          value={value}
          disabled={Arr.contains(value)(disabled)}
          style={tabStyle?.(value)}
        >
          {value.toUpperCase()}
        </TabsTrigger>
      ))}
    </TabsList>
    {Arr.map(values, (value) => (
      <TabsContent key={value} testId={`panel-${value}`} value={value}>
        <text>{value}</text>
      </TabsContent>
    ))}
  </Tabs>
);

/** A control that claims focus in the same update as the tabs change. */
const Claim = ({ claim }: { readonly claim: boolean }) => {
  const renderer = useGpuix().renderer;
  const [instance, setInstance] = useState<Option.Option<PublicInstance>>(
    Option.none(),
  );
  const attach = useCallback(
    (next: PublicInstance | null) => setInstance(Option.fromNullishOr(next)),
    [],
  );
  useLayoutEffect(() => {
    if (claim) {
      Option.match(instance, {
        onNone: () => undefined,
        onSome: (element) => renderer?.focusElement?.(element.id),
      });
    }
  }, [claim, instance, renderer]);
  return (
    <div testId="claim" tabIndex={0} ref={attach}>
      <text>claim</text>
    </div>
  );
};

const claimingTabs = (
  values: ReadonlyArray<string>,
  claim: boolean,
  disabled: ReadonlyArray<string> = [],
  tabStyle?: (value: string) => StateStyle<TabsTriggerState>,
) => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    <Claim claim={claim} />
    {dynamicTabs(values, { disabled, tabStyle })}
  </div>
);

/** The same three tabs on the vertical axis, with the middle one disabled. */
const VerticalSettings = ({
  activation,
}: {
  readonly activation?: "automatic" | "manual";
}) => (
  <Tabs
    defaultValue="profile"
    orientation="vertical"
    activation={activation}
    testId="tabs-root"
  >
    <TabsList testId="vertical-list">
      <TabsTrigger testId="tab-profile" value="profile">
        Profile
      </TabsTrigger>
      <TabsTrigger testId="tab-billing" value="billing" disabled>
        Billing
      </TabsTrigger>
      <TabsTrigger testId="tab-danger" value="danger">
        Danger
      </TabsTrigger>
    </TabsList>
    <TabsContent testId="panel-profile" value="profile">
      <text>Profile panel</text>
    </TabsContent>
    <TabsContent testId="panel-danger" value="danger">
      <text>Danger panel</text>
    </TabsContent>
  </Tabs>
);

/** Three tabs selected on A, with native focus starting on B and no onFocus. */
const AutoFocusedTabs = () => (
  <Tabs defaultValue="a">
    <TabsList>
      <TabsTrigger testId="tab-a" value="a">
        One
      </TabsTrigger>
      <TabsTrigger testId="tab-b" value="b" autoFocus>
        Two
      </TabsTrigger>
      <TabsTrigger testId="tab-c" value="c">
        Three
      </TabsTrigger>
    </TabsList>
    <TabsContent value="a">
      <text>First panel</text>
    </TabsContent>
    <TabsContent value="b">
      <text>Second panel</text>
    </TabsContent>
    <TabsContent value="c">
      <text>Third panel</text>
    </TabsContent>
  </Tabs>
);

describe("Tabs", () => {
  it("starts an arrow move from the focused tab without a React focus event", () => {
    const tabs = renderComponent(<AutoFocusedTabs />);

    // `autoFocus` sets native focus but never runs React's `onFocus` (plan 140);
    // the focused state follows the prop instead (plan 388), so the ring is
    // painted on the first commit.
    expect(focusedTestId(tabs)).toEqual(Option.some("tab-b"));
    expect(tabs.renderer.findByTestId("tab-b")?.style.boxShadow).toBeDefined();

    tabs.renderer.simulateKeystrokes("right");

    expect(tabs.renderer.getPaintedText()).toContain("Third panel");
    expect(
      tabs.renderer.findByTestId("tab-c")?.customProps?.["aria-selected"],
    ).toBe(true);

    tabs.unmount();
  });

  it("shows only the panel of the clicked tab", () => {
    const tabs = renderComponent(<Settings />);

    expect(tabs.renderer.findByTestId("panel-profile")).toBeDefined();
    expect(tabs.renderer.findByTestId("panel-danger")).toBeUndefined();

    clickCentreOf(tabs, "tab-danger");

    expect(tabs.renderer.findByTestId("panel-profile")).toBeUndefined();
    expect(tabs.renderer.findByTestId("panel-danger")).toBeDefined();
    expect(tabs.renderer.getAllText()).toContain("Danger panel");

    tabs.unmount();
  });

  it("paints the selected tab from whichever theme is active", () => {
    const assertTheme = (theme: TestTheme, card: string): void => {
      const tabs = renderComponent(<Settings />, theme);

      expect(
        tabs.renderer.findByTestId("tab-profile")?.style.backgroundColor,
      ).toBe(card);
      expect(
        tabs.renderer.findByTestId("tab-danger")?.style.backgroundColor,
      ).toBeUndefined();

      tabs.unmount();
    };

    assertTheme("dark", darkTheme.colors.card);
    assertTheme("light", lightTheme.colors.card);
  });

  it("moves focus and the selection with the arrow keys, wrapping", () => {
    const tabs = renderComponent(<Settings />);
    focusTab(tabs, "tab-profile");

    tabs.renderer.simulateKeystrokes("right");

    // Billing is disabled, so the move lands on Danger.
    expect(focusedTestId(tabs)).toEqual(Option.some("tab-danger"));
    expect(tabs.renderer.findByTestId("panel-danger")).toBeDefined();
    expect(tabs.renderer.findByTestId("panel-profile")).toBeUndefined();

    tabs.renderer.simulateKeystrokes("right");

    expect(focusedTestId(tabs)).toEqual(Option.some("tab-profile"));
    expect(tabs.renderer.findByTestId("panel-profile")).toBeDefined();

    tabs.unmount();
  });

  it("waits for Enter before switching in manual activation", () => {
    const tabs = renderComponent(<Settings activation="manual" />);
    focusTab(tabs, "tab-profile");

    tabs.renderer.simulateKeystrokes("right");

    expect(focusedTestId(tabs)).toEqual(Option.some("tab-danger"));
    expect(tabs.renderer.findByTestId("panel-profile")).toBeDefined();
    expect(tabs.renderer.findByTestId("panel-danger")).toBeUndefined();

    tabs.renderer.simulateKeystrokes("enter");

    expect(tabs.renderer.findByTestId("panel-danger")).toBeDefined();

    tabs.unmount();
  });

  it("selects Space on release, not on press", () => {
    const tabs = renderComponent(<Settings activation="manual" />);
    focusTab(tabs, "tab-profile");

    tabs.renderer.simulateKeystrokes("right");
    const target = tabs.renderer.findByTestId("tab-danger");
    expect(target).toBeDefined();
    if (target === undefined) return;

    tabs.renderer.nativeSimulateKeyDown(target.id, "space");
    expect(tabs.renderer.findByTestId("panel-profile")).toBeDefined();

    tabs.renderer.nativeSimulateKeyUp(target.id, "space");
    expect(tabs.renderer.findByTestId("panel-danger")).toBeDefined();

    tabs.unmount();
  });

  it("never focuses or selects a disabled tab", () => {
    const tabs = renderComponent(<Settings />);

    clickCentreOf(tabs, "tab-billing");

    expect(tabs.renderer.findByTestId("panel-profile")).toBeDefined();
    expect(
      tabs.renderer.findByTestId("tab-billing")?.customProps,
    ).toMatchObject({
      "aria-selected": false,
      tabIndex: -1,
    });

    tabs.unmount();
  });

  it("jumps to the first and last enabled tab with Home and End", () => {
    const tabs = renderComponent(<Settings />);
    focusTab(tabs, "tab-danger");

    tabs.renderer.simulateKeystrokes("home");

    expect(focusedTestId(tabs)).toEqual(Option.some("tab-profile"));
    expect(tabs.renderer.findByTestId("panel-profile")).toBeDefined();

    tabs.renderer.simulateKeystrokes("end");

    expect(focusedTestId(tabs)).toEqual(Option.some("tab-danger"));
    expect(tabs.renderer.findByTestId("panel-danger")).toBeDefined();

    tabs.unmount();
  });

  it("reports a controlled change without switching the panel itself", () => {
    const onValueChange = vi.fn();
    const tabs = renderComponent(
      <Settings value="profile" onValueChange={onValueChange} />,
    );

    clickCentreOf(tabs, "tab-danger");

    expect(onValueChange).toHaveBeenCalledWith("danger");
    expect(tabs.renderer.findByTestId("panel-profile")).toBeDefined();
    expect(tabs.renderer.findByTestId("panel-danger")).toBeUndefined();
    expect(
      tabs.renderer.findByTestId("tab-profile")?.customProps,
    ).toMatchObject({
      "aria-selected": true,
    });

    tabs.unmount();
  });

  it("does not report a press on the already selected uncontrolled tab", () => {
    const onValueChange = vi.fn();
    const tabs = renderComponent(<Settings onValueChange={onValueChange} />);

    clickCentreOf(tabs, "tab-profile");
    expect(onValueChange).not.toHaveBeenCalled();

    clickCentreOf(tabs, "tab-danger");
    expect(onValueChange.mock.calls).toEqual([["danger"]]);

    tabs.unmount();
  });

  it("takes a panel with its trigger when that tab is removed", () => {
    const removable = (showBilling: boolean) => (
      <Tabs defaultValue="billing">
        <TabsList testId="list">
          <TabsTrigger testId="tab-profile" value="profile">
            Profile
          </TabsTrigger>
          {showBilling ? (
            <TabsTrigger testId="tab-billing" value="billing">
              Billing
            </TabsTrigger>
          ) : null}
        </TabsList>
        <TabsContent testId="panel-profile" value="profile">
          <text>Profile</text>
        </TabsContent>
        <TabsContent testId="panel-billing" value="billing">
          <text>Billing</text>
        </TabsContent>
      </Tabs>
    );
    const tabs = renderComponent(removable(true));

    expect(tabs.renderer.findByTestId("panel-billing")).toBeDefined();

    tabs.rerender(removable(false));
    expect(tabs.renderer.findByTestId("panel-billing")).toBeUndefined();
    expect(tabs.renderer.findByTestId("panel-profile")).toBeUndefined();

    tabs.rerender(removable(true));
    expect(tabs.renderer.findByTestId("panel-billing")).toBeDefined();

    tabs.unmount();
  });

  it("renders no panel when the controlled value has no trigger", () => {
    const tabs = renderComponent(
      <Tabs value="other">
        <TabsList testId="list">
          <TabsTrigger testId="tab-profile" value="profile">
            Profile
          </TabsTrigger>
        </TabsList>
        <TabsContent testId="panel-other" value="other">
          <text>Other</text>
        </TabsContent>
      </Tabs>,
    );

    expect(tabs.renderer.findByTestId("panel-other")).toBeUndefined();
    expect(
      tabs.renderer.findByTestId("tab-profile")?.customProps,
    ).toMatchObject({
      "aria-selected": false,
    });

    tabs.unmount();
  });

  it("keeps the panel of a disabled selected tab", () => {
    const tabs = renderComponent(
      <Tabs defaultValue="billing">
        <TabsList testId="list">
          <TabsTrigger testId="tab-billing" value="billing" disabled>
            Billing
          </TabsTrigger>
          <TabsTrigger testId="tab-profile" value="profile">
            Profile
          </TabsTrigger>
        </TabsList>
        <TabsContent testId="panel-billing" value="billing">
          <text>Billing</text>
        </TabsContent>
        <TabsContent testId="panel-profile" value="profile">
          <text>Profile</text>
        </TabsContent>
      </Tabs>,
    );

    expect(tabs.renderer.findByTestId("panel-billing")).toBeDefined();
    expect(tabs.renderer.findByTestId("panel-profile")).toBeUndefined();

    tabs.unmount();
  });

  it("renders no panel for a value that matches nothing", () => {
    const tabs = renderComponent(
      <Tabs defaultValue="profile">
        <TabsList testId="list">
          <TabsTrigger testId="tab-profile" value="profile">
            Profile
          </TabsTrigger>
        </TabsList>
        <TabsContent testId="panel-other" value="other">
          <text>Other</text>
        </TabsContent>
      </Tabs>,
    );

    expect(tabs.renderer.findByTestId("panel-other")).toBeUndefined();

    tabs.unmount();
  });

  it("names the panel by its trigger, not its value", () => {
    const tabs = renderComponent(<Settings />);

    expect(
      Arr.map(nodesWithRole(tabs.renderer, "tabpanel"), (node) => node.name),
    ).toEqual(["Profile"]);

    tabs.unmount();
  });

  it("keeps the caller's panel name ahead of the trigger's", () => {
    const tabs = renderComponent(
      <Tabs defaultValue="profile">
        <TabsList testId="list">
          <TabsTrigger testId="tab-profile" value="profile">
            Profile
          </TabsTrigger>
        </TabsList>
        <TabsContent
          testId="panel-profile"
          value="profile"
          aria-label="Account profile"
        >
          <text>Profile panel</text>
        </TabsContent>
      </Tabs>,
    );

    expect(
      Arr.map(nodesWithRole(tabs.renderer, "tabpanel"), (node) => node.name),
    ).toEqual(["Account profile"]);

    tabs.unmount();
  });

  it("falls back to the value when the trigger has no plain-text name", () => {
    const tabs = renderComponent(
      <Tabs defaultValue="profile">
        <TabsList testId="list">
          <TabsTrigger testId="tab-profile" value="profile">
            <div>
              <text>Profile</text>
            </div>
          </TabsTrigger>
        </TabsList>
        <TabsContent testId="panel-profile" value="profile">
          <text>Profile panel</text>
        </TabsContent>
      </Tabs>,
    );

    expect(
      Arr.map(nodesWithRole(tabs.renderer, "tabpanel"), (node) => node.name),
    ).toEqual(["profile"]);

    tabs.unmount();
  });

  it("renames the panel when a trigger's label changes, keeping tab order", () => {
    const tabs = renderComponent(<NamedTabs label="Profile" />);

    expect(
      Arr.map(nodesWithRole(tabs.renderer, "tabpanel"), (node) => node.name),
    ).toEqual(["Profile"]);

    tabs.rerender(<NamedTabs label="Account" />);

    expect(
      Arr.map(nodesWithRole(tabs.renderer, "tabpanel"), (node) => node.name),
    ).toEqual(["Account"]);
    expect(
      Arr.map(nodesWithRole(tabs.renderer, "tab"), (node) => node.name),
    ).toEqual(["Account", "Billing"]);

    tabs.unmount();
  });

  it("keeps a tab's position when it is disabled and enabled again", () => {
    const onValueChange = vi.fn();
    const Dynamic = ({
      disabled,
    }: {
      readonly disabled: ReadonlyArray<string>;
    }) => (
      <Tabs defaultValue="a" onValueChange={onValueChange} testId="order-tabs">
        <TabsList testId="order-list">
          {Arr.map(["a", "b", "c"], (value) => (
            <TabsTrigger
              key={value}
              testId={`order-${value}`}
              value={value}
              disabled={Arr.contains(value)(disabled)}
            >
              {value.toUpperCase()}
            </TabsTrigger>
          ))}
        </TabsList>
        {Arr.map(["a", "b", "c"], (value) => (
          <TabsContent
            key={value}
            testId={`order-panel-${value}`}
            value={value}
          >
            <text>{value}</text>
          </TabsContent>
        ))}
      </Tabs>
    );

    const tabs = renderComponent(<Dynamic disabled={[]} />);
    focusTab(tabs, "order-a");
    tabs.rerender(<Dynamic disabled={["b"]} />);
    tabs.rerender(<Dynamic disabled={[]} />);
    focusTab(tabs, "order-a");
    tabs.renderer.simulateKeystrokes("right");

    // Registration must update in place: a re-register would append B after C,
    // so the arrow would land on C instead.
    expect(onValueChange.mock.calls).toEqual([["b"]]);
    expect(tabs.renderer.findByTestId("order-panel-b")).toBeDefined();

    tabs.unmount();
  });

  it("feeds both the internal and the caller's trigger ref", () => {
    const ref = createRef<PublicInstance>();
    const tabs = renderComponent(
      <Tabs defaultValue="profile">
        <TabsList testId="list">
          <TabsTrigger ref={ref} testId="tab-profile" value="profile">
            Profile
          </TabsTrigger>
          <TabsTrigger testId="tab-danger" value="danger">
            Danger
          </TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    expect(ref.current?.id).toBe(tabs.renderer.findByTestId("tab-profile")?.id);

    // The internal ref still carries the roving tab stop.
    focusTab(tabs, "tab-profile");
    tabs.renderer.simulateKeystrokes("right");
    expect(focusedTestId(tabs)).toEqual(Option.some("tab-danger"));

    tabs.unmount();
  });

  it("runs a caller onBlur when focus leaves a trigger", () => {
    const onBlur = vi.fn();
    const tabs = renderComponent(
      <Tabs defaultValue="profile">
        <TabsList testId="list">
          <TabsTrigger testId="tab-profile" value="profile" onBlur={onBlur}>
            Profile
          </TabsTrigger>
          <TabsTrigger testId="tab-danger" value="danger">
            Danger
          </TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    focusTab(tabs, "tab-profile");
    focusTab(tabs, "tab-danger");

    expect(onBlur).toHaveBeenCalledTimes(1);

    tabs.unmount();
  });

  it("moves along the vertical axis and selects with Down and Up", () => {
    const tabs = renderComponent(<VerticalSettings />);
    focusTab(tabs, "tab-profile");

    tabs.renderer.simulateKeystrokes("down");

    // Billing is disabled, so the move lands on Danger.
    expect(focusedTestId(tabs)).toEqual(Option.some("tab-danger"));
    expect(tabs.renderer.findByTestId("panel-danger")).toBeDefined();
    expect(tabs.renderer.findByTestId("panel-profile")).toBeUndefined();

    tabs.renderer.simulateKeystrokes("down");

    expect(focusedTestId(tabs)).toEqual(Option.some("tab-profile"));
    expect(tabs.renderer.findByTestId("panel-profile")).toBeDefined();

    tabs.renderer.simulateKeystrokes("up");

    expect(focusedTestId(tabs)).toEqual(Option.some("tab-danger"));

    tabs.unmount();
  });

  it("ignores Left and Right in a vertical tab set", () => {
    const tabs = renderComponent(<VerticalSettings />);
    focusTab(tabs, "tab-profile");

    tabs.renderer.simulateKeystrokes("right");

    expect(focusedTestId(tabs)).toEqual(Option.some("tab-profile"));
    expect(tabs.renderer.findByTestId("panel-profile")).toBeDefined();

    tabs.renderer.simulateKeystrokes("left");

    expect(focusedTestId(tabs)).toEqual(Option.some("tab-profile"));
    expect(tabs.renderer.findByTestId("panel-profile")).toBeDefined();

    tabs.unmount();
  });

  it("lays a vertical tab set in a row with a column rail", () => {
    const vertical = renderComponent(<VerticalSettings />);

    expect(
      vertical.renderer.findByTestId("tabs-root")?.style.flexDirection,
    ).toBe("row");
    expect(
      vertical.renderer.findByTestId("vertical-list")?.style.flexDirection,
    ).toBe("column");

    vertical.unmount();

    const horizontal = renderComponent(<Settings />);

    expect(
      horizontal.renderer.findByTestId("tabs-root")?.style.flexDirection,
    ).toBe("column");
    expect(horizontal.renderer.findByTestId("list")?.style.flexDirection).toBe(
      "row",
    );

    horizontal.unmount();
  });

  it("waits for Enter before switching in a vertical manual set", () => {
    const tabs = renderComponent(<VerticalSettings activation="manual" />);
    focusTab(tabs, "tab-profile");

    tabs.renderer.simulateKeystrokes("down");

    expect(focusedTestId(tabs)).toEqual(Option.some("tab-danger"));
    expect(tabs.renderer.findByTestId("panel-profile")).toBeDefined();
    expect(tabs.renderer.findByTestId("panel-danger")).toBeUndefined();

    tabs.renderer.simulateKeystrokes("enter");

    expect(tabs.renderer.findByTestId("panel-danger")).toBeDefined();

    tabs.unmount();
  });

  it("reflects autoFocus in its focus state", () => {
    // The runtime focuses `autoFocus` after React's effects, so `onFocus` never
    // runs; the ring, `TabsTriggerState.focused` and the roving highlight must
    // still follow it (plan 388).
    const states: Array<boolean> = [];
    const tabs = renderComponent(
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger
            testId="tab-danger"
            value="danger"
            autoFocus
            style={(state) => {
              states.push(state.focused);
              return {};
            }}
          >
            Danger
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile">Profile panel</TabsContent>
        <TabsContent value="danger">Danger panel</TabsContent>
      </Tabs>,
    );

    expect(focusedTestId(tabs)).toEqual(Option.some("tab-danger"));
    expect(states.at(-1)).toBe(true);
    expect(
      tabs.renderer.findByTestId("tab-danger")?.style.boxShadow,
    ).toBeDefined();

    tabs.unmount();
  });

  /**
   * A tab that changes (plan 511). The bug these guard, measured: a focused tab
   * that turned disabled kept native focus and the focus ring while the tab stop
   * moved off it. The handover must not change the selection or steal focus the
   * consumer claimed in the same update.
   */
  it("takes focus and the ring off a tab that becomes disabled", () => {
    const tabs = renderComponent(dynamicTabs(["a", "b", "c"]));

    focusTab(tabs, "tab-b");
    tabs.rerender(dynamicTabs(["a", "b", "c"], { disabled: ["b"] }));

    expect(tabs.renderer.findByTestId("tab-a")?.customProps?.tabIndex).toBe(0);
    expect(tabs.renderer.findByTestId("tab-b")?.customProps?.tabIndex).toBe(-1);
    expect(
      tabs.renderer.findByTestId("tab-b")?.style.boxShadow,
    ).toBeUndefined();
    expect(focusedTestId(tabs)).toEqual(Option.some("tab-a"));
    expect(tabs.renderer.findByTestId("tab-a")?.customProps).toMatchObject({
      "aria-selected": true,
    });
    expect(tabs.renderer.findByTestId("tab-b")?.customProps).toMatchObject({
      "aria-selected": false,
    });

    tabs.unmount();
  });

  it("hands focus to the selected tab when the focused tab is removed", () => {
    const tabs = renderComponent(dynamicTabs(["a", "b", "c"]));

    clickCentreOf(tabs, "tab-c");
    focusTab(tabs, "tab-b");
    tabs.rerender(dynamicTabs(["a", "c"]));

    expect(tabs.renderer.findByTestId("tab-c")?.customProps?.tabIndex).toBe(0);
    expect(focusedTestId(tabs)).toEqual(Option.some("tab-c"));
    expect(tabs.renderer.findByTestId("tab-c")?.customProps).toMatchObject({
      "aria-selected": true,
    });

    tabs.unmount();
  });

  it("never steals focus a consumer claimed in the same update", () => {
    const highlighted = new Map<string, boolean>();
    const tabs = renderComponent(
      claimingTabs(["a", "b", "c"], false, [], (value) => (state) => {
        highlighted.set(value, state.highlighted);
        return {};
      }),
    );

    focusTab(tabs, "tab-b");
    tabs.rerender(
      claimingTabs(["a", "b", "c"], true, ["b"], (value) => (state) => {
        highlighted.set(value, state.highlighted);
        return {};
      }),
    );

    expect(focusedTestId(tabs)).toEqual(Option.some("claim"));
    expect(tabs.renderer.findByTestId("tab-a")?.customProps?.tabIndex).toBe(0);
    expect(
      tabs.renderer.findByTestId("tab-b")?.style.boxShadow,
    ).toBeUndefined();
    // A disabled tab is not the highlight, even though it was last focused.
    expect(highlighted.get("b")).toBe(false);

    tabs.unmount();
  });

  it("does not change the selection when it hands focus over", () => {
    const tabs = renderComponent(
      dynamicTabs(["a", "b", "c"], { activation: "manual" }),
    );

    focusTab(tabs, "tab-b");
    tabs.rerender(
      dynamicTabs(["a", "b", "c"], {
        activation: "manual",
        disabled: ["b"],
      }),
    );

    expect(focusedTestId(tabs)).toEqual(Option.some("tab-a"));
    expect(tabs.renderer.findByTestId("tab-a")?.customProps).toMatchObject({
      "aria-selected": true,
    });
    expect(tabs.renderer.findByTestId("tab-b")?.customProps).toMatchObject({
      "aria-selected": false,
    });

    tabs.unmount();
  });

  it("does not select the tab it lands on when the tab stop has to move", () => {
    const tabs = renderComponent(dynamicTabs(["a", "b", "c"]));

    focusTab(tabs, "tab-b");
    tabs.rerender(dynamicTabs(["a", "b", "c"], { disabled: ["a", "b"] }));

    expect(focusedTestId(tabs)).toEqual(Option.some("tab-c"));
    expect(tabs.renderer.findByTestId("tab-a")?.customProps).toMatchObject({
      "aria-selected": true,
    });
    expect(tabs.renderer.findByTestId("tab-c")?.customProps).toMatchObject({
      "aria-selected": false,
    });

    tabs.unmount();
  });
});
