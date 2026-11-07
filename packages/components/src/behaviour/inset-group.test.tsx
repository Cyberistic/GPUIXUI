import { Switch } from "@gpuixui/primitives";
import { afterEach, describe, expect, it } from "vitest";
import { InsetGroup, InsetGroupRow } from "../inset-group.js";
import { requireBounds } from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";

let page: ComponentTestRoot | undefined;
afterEach(() => {
  page?.unmount();
  page = undefined;
});

const Pane = () => (
  <div style={{ width: 400 }}>
    <InsetGroup title="Notifications">
      <InsetGroupRow
        testId="row-a"
        label="Show previews"
        control={<Switch label="a" testId="a" />}
      />
      <InsetGroupRow
        testId="row-b"
        label="Badge app icon"
        control={<Switch label="b" testId="b" />}
      />
      <InsetGroupRow
        testId="row-c"
        label="Sounds"
        control={<Switch label="c" testId="c" />}
      />
    </InsetGroup>
  </div>
);

describe("InsetGroup", () => {
  it("draws exactly one hairline between rows", () => {
    const root = renderComponent(<Pane />);
    page = root;
    const [a, b, c] = ["row-a", "row-b", "row-c"].map((id) =>
      requireBounds(root, id),
    );
    const bottom = (box: typeof a) => (box?.y ?? 0) + (box?.height ?? 0);

    expect((b?.y ?? 0) - bottom(a)).toBe(1);
    expect((c?.y ?? 0) - bottom(b)).toBe(1);
  });

  it("insets the hairline when asked, and keeps exactly one", () => {
    page = renderComponent(
      <div style={{ width: 400 }}>
        <InsetGroup title="General" insetDividers>
          <InsetGroupRow testId="first" label="One" />
          <InsetGroupRow testId="second" label="Two" />
        </InsetGroup>
      </div>,
    );
    const first = requireBounds(page, "first");
    const second = requireBounds(page, "second");
    expect(second.y).toBe(first.y + first.height + 1);
  });

  it("lines every control up on the trailing edge", () => {
    page = renderComponent(<Pane />);
    const rights = ["a", "b", "c"].map((id) => {
      const box = requireBounds(page as ComponentTestRoot, id);
      return box.x + box.width;
    });
    expect(new Set(rights).size).toBe(1);
    const row = requireBounds(page, "row-a");
    expect(row.x + row.width - (rights[0] ?? 0)).toBe(12);
  });
});
