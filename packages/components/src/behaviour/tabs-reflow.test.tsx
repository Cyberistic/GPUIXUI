/**
 * The tab pill after a reflow, in the real GPUix renderer.
 *
 * The bug these guard: a layout event reports a **size** change, not a move, so
 * the trigger the pill was under never re-reported when a sibling before it grew
 * or a trigger was inserted — the pill stayed at the x its tab had left (measured
 * `42` against `197`, and `5` against `139`). The rail re-reads its origin probe
 * and every trigger from the renderer in one pass after any measurement, the row
 * set or the caller's rail class changes, so both boxes come from one paint.
 *
 * These live beside `tabs.test.tsx` rather than in it because they hold a
 * measurement contract, the way `presence-contract.test.ts` holds the pointer
 * rule, and the Tabs record's native count is the interaction suite's.
 */

import { describe, expect, it } from "vitest";
import { requireBounds, settleMotion } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs.js";

describe("the tab pill after a reflow", () => {
  it("stays under a tab a growing sibling pushed along", () => {
    const Growing = ({ first }: { readonly first: string }) => (
      <Tabs defaultValue="danger" testId="growing-root">
        <TabsList testId="growing-list">
          <TabsTrigger testId="growing-profile" value="profile">
            {first}
          </TabsTrigger>
          <TabsTrigger testId="growing-danger" value="danger">
            Danger
          </TabsTrigger>
        </TabsList>
        <TabsContent testId="growing-panel" value="danger">
          <text>Danger panel</text>
        </TabsContent>
      </Tabs>
    );

    const tabs = renderComponent(<Growing first="P" />);
    settleMotion(tabs);
    settleMotion(tabs);
    expect(requireBounds(tabs, "tabs-indicator")).toEqual(
      requireBounds(tabs, "growing-danger"),
    );
    const before = requireBounds(tabs, "growing-danger").x;

    tabs.rerender(<Growing first="A much longer profile tab" />);
    settleMotion(tabs);
    settleMotion(tabs);

    // The selected tab really moved; the pill moved with it.
    expect(requireBounds(tabs, "growing-danger").x).toBeGreaterThan(before);
    expect(requireBounds(tabs, "tabs-indicator")).toEqual(
      requireBounds(tabs, "growing-danger"),
    );

    tabs.unmount();
  });

  it("stays under its tab when a trigger appears before it", () => {
    // The row set is the other reflow path: an inserted trigger shifts the
    // selected one without resizing it, so only a fresh read can place the pill.
    const Growing = ({ extra }: { readonly extra: boolean }) => (
      <Tabs defaultValue="danger" testId="insert-root">
        <TabsList testId="insert-list">
          {extra ? (
            <TabsTrigger testId="insert-files" value="files">
              Files and folders
            </TabsTrigger>
          ) : null}
          <TabsTrigger testId="insert-danger" value="danger">
            Danger
          </TabsTrigger>
        </TabsList>
        <TabsContent testId="insert-panel" value="danger">
          <text>Danger panel</text>
        </TabsContent>
      </Tabs>
    );

    const tabs = renderComponent(<Growing extra={false} />);
    settleMotion(tabs);
    settleMotion(tabs);
    const before = requireBounds(tabs, "insert-danger").x;

    tabs.rerender(<Growing extra />);
    settleMotion(tabs);
    settleMotion(tabs);

    expect(requireBounds(tabs, "insert-danger").x).toBeGreaterThan(before);
    expect(requireBounds(tabs, "tabs-indicator")).toEqual(
      requireBounds(tabs, "insert-danger"),
    );

    tabs.unmount();
  });
});
