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
 *
 * The shared selected surface is measured, so these also guard its geometry: the
 * set used to paint the selected background on each trigger separately, which no
 * single element could move; a wrong origin (the rail's box instead of the box
 * its absolute children resolve against) or a stale box leaves the pill off its
 * trigger, and a pill that swallows the pointer makes the trigger unclickable.
 */

import * as Option from "effect/Option";
import type { PublicInstance } from "@gpuix/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  clickCentreOf,
  focusedTestId,
  requireBounds,
  settle,
} from "../internal/interaction.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
  type TestTheme,
} from "../internal/test-root.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs.js";

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

const focusTab = (root: ComponentTestRoot, testId: string): void => {
  root.renderer.focusElement(root.renderer.findByTestId(testId)?.id ?? -1);
};

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

describe("Tabs", () => {
  it("moves from the selection when no trigger reported focus", () => {
    const tabs = renderComponent(<Settings />);

    // A window's Tab traversal focuses a trigger without delivering onFocus, so
    // the list has no recorded row. A key from the rail itself must still move
    // from the selection rather than re-anchor at the first enabled tab.
    tabs.renderer.nativeSimulateKeyDown(
      tabs.renderer.findByTestId("list")?.id ?? -1,
      "right",
    );

    expect(focusedTestId(tabs)).toEqual(Option.some("tab-danger"));
    expect(tabs.renderer.findByTestId("panel-danger")).toBeDefined();

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

  it("paints the shared selected surface from whichever theme is active", () => {
    const assertTheme = (theme: TestTheme, card: string): void => {
      const tabs = renderComponent(<Settings />, theme);
      settle(tabs);

      expect(
        tabs.renderer.findByTestId("tabs-indicator")?.style.backgroundColor,
      ).toBe(card);
      expect(
        tabs.renderer.findByTestId("tab-profile")?.style.backgroundColor,
      ).toBeUndefined();

      tabs.unmount();
    };

    assertTheme("dark", darkTheme.colors.card);
    assertTheme("light", lightTheme.colors.card);
  });

  it("draws one selected surface exactly behind the selected trigger", () => {
    const tabs = renderComponent(<Settings />);
    settle(tabs);

    expect(requireBounds(tabs, "tabs-indicator")).toEqual(
      requireBounds(tabs, "tab-profile"),
    );
    // The surface takes no input: the trigger underneath keeps the click.
    expect(
      tabs.renderer.findByTestId("tabs-indicator")?.style.pointerEvents,
    ).toBe("none");
    expect(tabs.renderer.findByTestId("tabs-origin")?.style.pointerEvents).toBe(
      "none",
    );

    tabs.unmount();
  });

  it("lets a press on the surface reach the trigger under it", () => {
    const onProfileClick = vi.fn();
    const tabs = renderComponent(
      <Tabs defaultValue="profile">
        <TabsList testId="list">
          <TabsTrigger
            testId="tab-profile"
            value="profile"
            onClick={onProfileClick}
          >
            Profile
          </TabsTrigger>
          <TabsTrigger testId="tab-danger" value="danger">
            Danger
          </TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    settle(tabs);

    const surface = requireBounds(tabs, "tabs-indicator");
    tabs.renderer.nativeSimulateClick(
      surface.x + surface.width / 2,
      surface.y + surface.height / 2,
    );

    expect(onProfileClick).toHaveBeenCalledTimes(1);

    tabs.unmount();
  });

  it("moves the surface with the selection, not with focus", () => {
    const tabs = renderComponent(<Settings />);
    settle(tabs);
    const before = requireBounds(tabs, "tabs-indicator");

    clickCentreOf(tabs, "tab-danger");
    settle(tabs);

    const after = requireBounds(tabs, "tabs-indicator");
    expect(after).toEqual(requireBounds(tabs, "tab-danger"));
    expect(after.x).toBeGreaterThan(before.x);

    tabs.unmount();
  });

  it("puts the surface on a vertical rail's trigger too", () => {
    const tabs = renderComponent(<VerticalSettings />);
    settle(tabs);

    expect(requireBounds(tabs, "tabs-indicator")).toEqual(
      requireBounds(tabs, "tab-profile"),
    );

    tabs.unmount();
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
    settle(tabs);

    expect(tabs.renderer.findByTestId("panel-other")).toBeUndefined();

    tabs.unmount();
  });

  it("draws no surface for a value no trigger carries", () => {
    const tabs = renderComponent(
      <Tabs defaultValue="ghost">
        <TabsList testId="list">
          <TabsTrigger testId="tab-profile" value="profile">
            Profile
          </TabsTrigger>
        </TabsList>
        <TabsContent testId="panel-ghost" value="ghost">
          <text>Ghost</text>
        </TabsContent>
      </Tabs>,
    );
    settle(tabs);

    // The panel follows the value; the pill needs a measured trigger box.
    expect(tabs.renderer.findByTestId("panel-ghost")).toBeDefined();
    expect(tabs.renderer.findByTestId("tabs-indicator")).toBeUndefined();

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
});
