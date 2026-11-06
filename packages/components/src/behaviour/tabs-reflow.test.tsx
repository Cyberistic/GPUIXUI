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

    expect(requireBounds(tabs, "growing-danger").x).toBeGreaterThan(before);
    expect(requireBounds(tabs, "tabs-indicator")).toEqual(
      requireBounds(tabs, "growing-danger"),
    );

    tabs.unmount();
  });

  it("stays under its tab when a trigger appears before it", () => {
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
