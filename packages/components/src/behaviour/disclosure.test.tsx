import { afterEach, describe, expect, it } from "vitest";
import { Disclosure } from "../disclosure.js";
import {
  clickCentreOf,
  settleMotion,
  waitFor,
} from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";

let page: ComponentTestRoot | undefined;
afterEach(() => {
  page?.unmount();
  page = undefined;
});

const Section = ({ open }: { readonly open: boolean }) => (
  <Disclosure title="Details" defaultOpen={open} testId="header">
    <text testId="body">Owner · Killua</text>
  </Disclosure>
);

const glyph = (root: ComponentTestRoot): unknown =>
  root.renderer.findByType("svg")[0]?.customProps?.["source"];

describe("Disclosure", () => {
  it("sets the title right after its triangle", () => {
    page = renderComponent(
      <div style={{ width: 300 }}>
        <Section open />
      </div>,
    );
    const triangle = page.renderer.findByType("svg")[0];
    const bounds = page.renderer.getElementBounds(triangle?.id ?? -1);
    const title = page.renderer
      .findByType("text")
      .map((text) => page?.renderer.getElementBounds(text.id))
      .find((box) => box !== null && box !== undefined && box.y < 30);
    expect(
      (title?.x ?? 999) - ((bounds?.x ?? 0) + (bounds?.width ?? 0)),
    ).toBeLessThanOrEqual(8);
  });

  it("opens on a press and mounts its body", () => {
    page = renderComponent(<Section open={false} />);
    expect(page.renderer.findByTestId("body")).toBeUndefined();
    clickCentreOf(page, "header");
    settleMotion(page);
    expect(page.renderer.findByTestId("body")).toBeDefined();
  });

  it("toggles with Enter from the header", async () => {
    const root = renderComponent(<Section open />);
    page = root;
    root.renderer.focusElement(root.renderer.findByTestId("header")?.id ?? -1);
    root.renderer.simulateKeystrokes("enter");
    await waitFor(() =>
      expect(root.renderer.findByTestId("body")).toBeUndefined(),
    );
  });

  it("swaps the triangle with the state", () => {
    const open = renderComponent(<Section open />);
    const down = glyph(open);
    open.unmount();
    page = renderComponent(<Section open={false} />);
    expect(down).toBeTypeOf("string");
    expect(glyph(page)).not.toEqual(down);
  });
});
