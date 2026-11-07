import * as Option from "effect/Option";
import {
  contrastFloors,
  contrastRatio,
  decorativeFloor,
  getTheme,
} from "@gpuixui/tokens";
import type { PublicInstance } from "@gpuix/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  clickCentreOf,
  focusedTestId,
  requireBounds,
  settleMotion,
} from "../internal/interaction.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
  type TestTheme,
} from "../internal/test-root.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs.js";
import type { TabsOrientation } from "../tabs.js";
import type { TabsActivation } from "../tabs/logic.js";

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

  it("paints the selected surface in a role a reader can see on the rail", () => {
    const assertTheme = (mode: TestTheme, active: typeof lightTheme): void => {
      const tabs = renderComponent(<Settings />, mode);
      settleMotion(tabs);

      const pill = String(
        tabs.renderer.findByTestId("tabs-indicator")?.style.backgroundColor,
      );
      const rail = String(
        tabs.renderer.findByTestId("list")?.style.backgroundColor,
      );
      const label = String(
        tabs.renderer.findByTestId("tab-profile")?.style.color,
      );

      expect(pill).toBe(active.colors.selected);
      expect(rail).toBe(active.colors.background);
      expect(label).toBe(active.colors.foreground);
      expect(
        tabs.renderer.findByTestId("tab-profile")?.style.backgroundColor,
      ).toBeUndefined();

      expect(contrastRatio(pill, rail) ?? 0).toBeGreaterThanOrEqual(
        decorativeFloor,
      );

      expect(contrastRatio(label, pill) ?? 0).toBeGreaterThanOrEqual(
        contrastFloors.body,
      );

      tabs.unmount();
    };

    assertTheme("dark", darkTheme);
    assertTheme("light", lightTheme);
  });

  it("does not go back to the card role, which the high-contrast rail shares", () => {
    const high = getTheme("light", "high");

    expect(contrastRatio(high.colors.card, high.colors.background) ?? 0).toBe(
      1,
    );
    expect(
      contrastRatio(high.colors.selected, high.colors.background) ?? 0,
    ).toBeGreaterThanOrEqual(decorativeFloor);
  });

  it("draws one selected surface exactly behind the selected trigger", () => {
    const tabs = renderComponent(<Settings />);
    settleMotion(tabs);

    expect(requireBounds(tabs, "tabs-indicator")).toEqual(
      requireBounds(tabs, "tab-profile"),
    );

    expect(
      tabs.renderer.findByTestId("tabs-indicator")?.style.pointerEvents,
    ).toBe("none");
    expect(tabs.renderer.findByTestId("tabs-origin")?.style.pointerEvents).toBe(
      "none",
    );

    tabs.unmount();
  });

  it("follows the rail when the window moves it, not the origin it first reported", () => {
    const Shifted = ({
      inset,
      danger,
    }: {
      readonly inset: number;
      readonly danger: string;
    }) => (
      <div style={{ paddingLeft: inset, paddingTop: inset }}>
        <Tabs defaultValue="danger" testId="shifted-root">
          <TabsList testId="shifted-list">
            <TabsTrigger testId="shifted-profile" value="profile">
              Profile
            </TabsTrigger>
            <TabsTrigger testId="shifted-danger" value="danger">
              {danger}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    );

    const tabs = renderComponent(<Shifted inset={0} danger="Danger" />);
    settleMotion(tabs);
    expect(requireBounds(tabs, "tabs-indicator")).toEqual(
      requireBounds(tabs, "shifted-danger"),
    );

    tabs.rerender(<Shifted inset={120} danger="Danger!" />);
    settleMotion(tabs);
    settleMotion(tabs);

    expect(requireBounds(tabs, "tabs-indicator")).toEqual(
      requireBounds(tabs, "shifted-danger"),
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
    settleMotion(tabs);

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
    settleMotion(tabs);
    const before = requireBounds(tabs, "tabs-indicator");

    clickCentreOf(tabs, "tab-danger");
    settleMotion(tabs);

    const after = requireBounds(tabs, "tabs-indicator");
    expect(after).toEqual(requireBounds(tabs, "tab-danger"));
    expect(after.x).toBeGreaterThan(before.x);

    tabs.unmount();
  });

  it("puts the surface on a vertical rail's trigger too", () => {
    const tabs = renderComponent(<VerticalSettings />);
    settleMotion(tabs);

    expect(requireBounds(tabs, "tabs-indicator")).toEqual(
      requireBounds(tabs, "tab-profile"),
    );

    tabs.unmount();
  });

  it("paints and moves a stored orientation name as the documented horizontal set", () => {
    // @ts-expect-error — an axis a store wrote, not the union the props declare.
    const stored: TabsOrientation = "diagonal";

    const tabs = renderComponent(
      <Tabs defaultValue="profile" orientation={stored} testId="tabs-root">
        <TabsList testId="list">
          <TabsTrigger testId="tab-profile" value="profile">
            Profile
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
      </Tabs>,
    );

    try {
      focusTab(tabs, "tab-profile");
      tabs.renderer.simulateKeystrokes("right");

      expect(focusedTestId(tabs)).toEqual(Option.some("tab-danger"));
      expect(tabs.renderer.findByTestId("panel-danger")).toBeDefined();
      expect(tabs.renderer.findByTestId("panel-profile")).toBeUndefined();

      expect(tabs.renderer.findByTestId("tabs-root")?.style.flexDirection).toBe(
        "column",
      );
    } finally {
      tabs.unmount();
    }
  });

  it("reads a stored activation name as automatic", () => {
    // @ts-expect-error — a policy a store wrote, not the union the props declare.
    const stored: TabsActivation = "eager";

    const tabs = renderComponent(
      <Tabs defaultValue="profile" activation={stored}>
        <TabsList testId="list">
          <TabsTrigger testId="tab-profile" value="profile">
            Profile
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
      </Tabs>,
    );

    try {
      focusTab(tabs, "tab-profile");
      tabs.renderer.simulateKeystrokes("right");

      expect(focusedTestId(tabs)).toEqual(Option.some("tab-danger"));
      expect(tabs.renderer.findByTestId("panel-danger")).toBeDefined();
      expect(tabs.renderer.findByTestId("panel-profile")).toBeUndefined();
    } finally {
      tabs.unmount();
    }
  });

  it("moves focus and the selection with the arrow keys, wrapping", () => {
    const tabs = renderComponent(<Settings />);
    focusTab(tabs, "tab-profile");

    tabs.renderer.simulateKeystrokes("right");

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
    settleMotion(tabs);

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
    settleMotion(tabs);

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

describe("TabsList variant", () => {
  const tree = (variant: "pill" | "line") => (
    <Tabs defaultValue="one">
      <TabsList variant={variant} testId="list">
        <TabsTrigger testId="one" value="one">
          One
        </TabsTrigger>
        <TabsTrigger testId="two" value="two">
          Two
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  it("draws the line variant's indicator as a thin bar under the chosen tab", () => {
    const root = renderComponent(tree("line"));
    settleMotion(root);
    const bar = requireBounds(root, "tabs-indicator");
    const tab = requireBounds(root, "one");
    expect(bar.height).toBe(2);
    expect(bar.y + bar.height).toBeCloseTo(tab.y + tab.height, 0);
    expect(bar.width).toBeCloseTo(tab.width, 0);
    root.unmount();
  });

  it("keeps the pill variant's indicator the height of the tab", () => {
    const root = renderComponent(tree("pill"));
    settleMotion(root);
    expect(requireBounds(root, "tabs-indicator").height).toBeCloseTo(
      requireBounds(root, "one").height,
      0,
    );
    root.unmount();
  });
});
