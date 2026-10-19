/**
 * A control that becomes disabled is inert in the real GPUix renderer.
 *
 * The bug these guard (plan 680): a focusable part seeds `focused` from
 * `autoFocus` and follows React `focus`/`blur`, but 0.10.0 delivers no `blur`
 * for the native focus a part keeps when it turns disabled (plans 536/540).
 * A `Button`, a clicked `TabsTrigger`, an accordion header, a collapsible
 * trigger, an inline edit, a recording hotkey field and a colour swatch each
 * kept painting `focusRing`, and the hotkey field still read "Press keys…".
 * A disabled control must paint no focus ring and keep no in-progress state
 * (plan 394's inert contract); re-enabling never fabricates focus.
 *
 * Each case proves the ring is painted while enabled, then rerenders the same
 * tree with the part disabled and asserts the ring is gone.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../accordion.js";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../collapsible.js";
import { HotkeyRecorder } from "../hotkey-recorder.js";
import { InlineEdit } from "../inline-edit.js";
import { Button, IconButton } from "../internal/button.js";
import { useFocusState } from "../internal/focus.js";
import { clickCentreOf, focusedTestId } from "../internal/interaction.js";
import { focusRing, useTheme } from "../internal/theme.js";
import { renderComponent } from "../internal/test-root.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs.js";

/** The focus ring a part paints, or `undefined`. */
const ring = (
  root: ReturnType<typeof renderComponent>,
  testId: string,
): unknown => root.renderer.findByTestId(testId)?.style.boxShadow;

const tabSet = (disabled: boolean) => (
  <Tabs defaultValue="a">
    <TabsList>
      <TabsTrigger testId="tab-a" value="a">
        A
      </TabsTrigger>
      <TabsTrigger testId="tab-b" value="b" disabled={disabled}>
        B
      </TabsTrigger>
    </TabsList>
    <TabsContent value="a">A panel</TabsContent>
    <TabsContent value="b">B panel</TabsContent>
  </Tabs>
);

const accordion = (disabled: boolean) => (
  <Accordion type="single" collapsible defaultValue="one">
    <AccordionItem value="one" disabled={disabled}>
      <AccordionTrigger testId="trigger-one" autoFocus>
        One
      </AccordionTrigger>
      <AccordionContent testId="content-one">
        <text>Body one</text>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="two">
      <AccordionTrigger testId="trigger-two">Two</AccordionTrigger>
      <AccordionContent testId="content-two">
        <text>Body two</text>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);

const collapsible = (disabled: boolean) => (
  <Collapsible>
    <CollapsibleTrigger testId="trigger" autoFocus disabled={disabled}>
      Details
    </CollapsibleTrigger>
    <CollapsibleContent testId="content">
      <text>Body</text>
    </CollapsibleContent>
  </Collapsible>
);

const inlineEdit = (disabled: boolean) => (
  <InlineEdit
    testId="edit"
    label="Name"
    value="Ada"
    autoFocus
    disabled={disabled}
    onCommit={() => undefined}
  />
);

/**
 * The shared focus rule, observed through a real host: a disabled part paints
 * no ring even when it was seeded focused. This is the mechanism `ColorPicker`
 * uses for its swatches and HEX field; the picker's own swatch case cannot be
 * staged here because 0.10.0 delivers no React focus for `focusElement` or a
 * click on a `div role="button"` (the plan-522 swatch ring case is one of the
 * recorded plan-540 focus failures).
 */
const FocusProbe = ({ disabled }: { readonly disabled: boolean }) => {
  const theme = useTheme();
  const [focused] = useFocusState(true, disabled);
  return (
    <div
      testId="probe"
      style={focused ? { ...focusRing(theme) } : { height: 20 }}
    />
  );
};

describe("a control disabled while focused", () => {
  it("takes the ring off Button and IconButton", () => {
    const button = renderComponent(
      <Button testId="action" autoFocus>
        Save
      </Button>,
    );
    expect(ring(button, "action")).toBeDefined();
    button.rerender(
      <Button testId="action" autoFocus disabled>
        Save
      </Button>,
    );
    expect(ring(button, "action")).toBeUndefined();
    expect(button.renderer.findByTestId("action")?.customProps?.tabIndex).toBe(
      -1,
    );
    button.unmount();

    const icon = renderComponent(
      <IconButton testId="close" label="Close" autoFocus>
        ✕
      </IconButton>,
    );
    expect(ring(icon, "close")).toBeDefined();
    icon.rerender(
      <IconButton testId="close" label="Close" autoFocus disabled>
        ✕
      </IconButton>,
    );
    expect(ring(icon, "close")).toBeUndefined();
    icon.unmount();
  });

  it("takes the ring off a clicked tab that becomes disabled", () => {
    const tabs = renderComponent(tabSet(false));

    // A click is the path that sets React's `focused` (plan 511's existing case
    // used a native-only focus move, so it never painted a ring to lose).
    clickCentreOf(tabs, "tab-b");
    expect(ring(tabs, "tab-b")).toBeDefined();

    tabs.rerender(tabSet(true));

    expect(ring(tabs, "tab-b")).toBeUndefined();
    expect(tabs.renderer.findByTestId("tab-b")?.customProps?.tabIndex).toBe(-1);
    // The plan-511 handover still moves native focus to a live tab.
    expect(focusedTestId(tabs)).toEqual(Option.some("tab-a"));

    tabs.unmount();
  });

  it("takes the ring off an accordion header whose section becomes disabled", () => {
    const view = renderComponent(accordion(false));
    expect(ring(view, "trigger-one")).toBeDefined();

    view.rerender(accordion(true));

    expect(ring(view, "trigger-one")).toBeUndefined();
    expect(
      view.renderer.findByTestId("trigger-one")?.customProps?.tabIndex,
    ).toBe(-1);

    view.unmount();
  });

  it("takes the ring off a collapsible trigger that becomes disabled", () => {
    const view = renderComponent(collapsible(false));
    expect(ring(view, "trigger")).toBeDefined();

    view.rerender(collapsible(true));

    expect(ring(view, "trigger")).toBeUndefined();
    expect(view.renderer.findByTestId("trigger")?.customProps?.tabIndex).toBe(
      -1,
    );

    view.unmount();
  });

  it("takes the ring off an inline edit that becomes disabled", () => {
    const view = renderComponent(inlineEdit(false));
    expect(ring(view, "edit")).toBeDefined();

    view.rerender(inlineEdit(true));

    expect(ring(view, "edit")).toBeUndefined();
    expect(view.renderer.findByTestId("edit")?.customProps?.tabIndex).toBe(-1);

    view.unmount();
  });

  it("stops a recording hotkey field and takes its ring", () => {
    const view = renderComponent(
      <HotkeyRecorder
        testId="recorder"
        label="Toggle command palette"
        value={null}
        autoFocus
        onChange={() => undefined}
      />,
    );
    expect(ring(view, "recorder")).toBeDefined();

    clickCentreOf(view, "recorder");
    expect(view.renderer.getAllText()).toContain("Press keys…");

    view.rerender(
      <HotkeyRecorder
        testId="recorder"
        label="Toggle command palette"
        value={null}
        autoFocus
        disabled
        onChange={() => undefined}
      />,
    );

    expect(ring(view, "recorder")).toBeUndefined();
    expect(view.renderer.getAllText()).not.toContain("Press keys…");
    expect(view.renderer.findByTestId("recorder")?.customProps?.tabIndex).toBe(
      -1,
    );

    view.unmount();
  });

  it("drops the seeded focus a disabled part would otherwise paint", () => {
    const view = renderComponent(<FocusProbe disabled={false} />);
    expect(ring(view, "probe")).toBeDefined();

    view.rerender(<FocusProbe disabled />);

    expect(ring(view, "probe")).toBeUndefined();

    view.unmount();
  });
});
