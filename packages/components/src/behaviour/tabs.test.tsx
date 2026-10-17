/**
 * Tabs behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a click that showed two panels at once; the active tab
 * painted with the wrong theme role; arrow keys that moved the highlight but not
 * real focus (or did not wrap); manual activation that selected on focus anyway,
 * so Enter was meaningless; a disabled tab that could be focused or clicked; and
 * a controlled tab set that changed its own panel when the consumer said no. A
 * caller `ref` on a trigger was discarded in favour of the internal one, and so
 * was a caller `onBlur`.
 */

import * as Option from "effect/Option";
import type { PublicInstance } from "@gpuix/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { clickCentreOf, focusedTestId } from "../internal/interaction.js";
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

describe("Tabs", () => {
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

    expect(tabs.renderer.findByTestId("panel-other")).toBeUndefined();

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
});
