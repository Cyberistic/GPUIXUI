/**
 * Pagination behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: previous/next staying pressable at the first and last
 * page (even when a caller passes `disabled={false}`); `onPageChange` reporting
 * an index instead of the page number, a fractional page, or firing on the
 * current page; a fractional page count exposing a page that does not exist; an
 * ellipsis that was a focus stop; a current page that was not painted with the
 * primary role; a root that ignored the parts the caller composed; and a single
 * hidden page reached through an ellipsis instead of being rendered.
 *
 * Bare items (plan 756): a `PaginationItem` rendered outside the window forwarded
 * its own `page` straight to `onPageChange`, so an impossible `9` in a 5-page
 * control reached the app and a fractional `2.9` was reported un-truncated —
 * although every other control had reported only real pages since plan 611.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { nodesNamed } from "../internal/a11y.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import { clickCentreOf } from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
  type TestTheme,
} from "../internal/test-root.js";
import {
  Pagination,
  PaginationItem,
  PaginationList,
  PaginationNext,
  PaginationPrevious,
  type PaginationProps,
} from "../pagination.js";

/** The default composition a caller writes. */
const Pager = (props: PaginationProps) => (
  <Pagination {...props}>
    <PaginationPrevious testId="prev" />
    <PaginationList />
    <PaginationNext testId="next" />
  </Pagination>
);

/** The button element a visible label sits in. */
const buttonFor = (root: ComponentTestRoot, label: string) => {
  const text = root.renderer.findByText(label);
  if (text?.parentId == null) return undefined;
  return root.renderer.getElement(text.parentId);
};

/** Click the centre of the label's own bounds; the press bubbles to the button. */
const clickLabel = (root: ComponentTestRoot, label: string): void => {
  const text = root.renderer.findByText(label);
  if (text === undefined) throw new Error(`behaviour: no text "${label}"`);
  const bounds = root.renderer.getElementBounds(text.id);
  if (bounds === null) throw new Error(`behaviour: "${label}" is not laid out`);
  root.renderer.nativeSimulateClick(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
};

describe("Pagination", () => {
  it("disables previous on the first page and next on the last", () => {
    const first = renderComponent(
      <Pager page={1} pageCount={10} onPageChange={vi.fn()} />,
    );

    expect(first.renderer.findByTestId("prev")?.customProps?.tabIndex).toBe(-1);
    expect(first.renderer.findByTestId("next")?.customProps?.tabIndex).toBe(0);
    expect(first.renderer.findByType("svg")).toHaveLength(2);

    first.unmount();

    const last = renderComponent(
      <Pager page={10} pageCount={10} onPageChange={vi.fn()} />,
    );

    expect(last.renderer.findByTestId("prev")?.customProps?.tabIndex).toBe(0);
    expect(last.renderer.findByTestId("next")?.customProps?.tabIndex).toBe(-1);

    last.unmount();
  });

  it("reports the page number a click lands on", () => {
    const onPageChange = vi.fn();
    const pager = renderComponent(
      <Pager page={5} pageCount={10} onPageChange={onPageChange} />,
    );

    clickLabel(pager, "4");

    expect(onPageChange).toHaveBeenCalledWith(4);

    pager.unmount();
  });

  it("does nothing when the current page is pressed", () => {
    const onPageChange = vi.fn();
    const pager = renderComponent(
      <Pager page={5} pageCount={10} onPageChange={onPageChange} />,
    );

    clickLabel(pager, "5");

    expect(onPageChange).not.toHaveBeenCalled();

    pager.unmount();
  });

  it("steps with previous and next", () => {
    const onPageChange = vi.fn();
    const pager = renderComponent(
      <Pager page={5} pageCount={10} onPageChange={onPageChange} />,
    );

    clickCentreOf(pager, "prev");
    clickCentreOf(pager, "next");

    expect(onPageChange.mock.calls).toEqual([[4], [6]]);

    pager.unmount();
  });

  it("leaves the ellipsis out of the tab order", () => {
    const pager = renderComponent(
      <Pager page={5} pageCount={10} onPageChange={vi.fn()} />,
    );
    const ellipsis = pager.renderer.findByText("…");

    expect(ellipsis).toBeDefined();
    expect(ellipsis?.customProps?.tabIndex).toBeUndefined();

    pager.unmount();
  });

  it("renders a single hidden page instead of an ellipsis", () => {
    const seven = renderComponent(
      <Pager page={4} pageCount={7} onPageChange={vi.fn()} />,
    );

    // All seven numbers fit, so there is no gap to mark.
    expect(seven.renderer.findByText("…")).toBeUndefined();
    expect(seven.renderer.findByText("2")).toBeDefined();
    expect(seven.renderer.getAllText()).toContain("7");

    seven.unmount();

    const eight = renderComponent(
      <Pager page={4} pageCount={8} onPageChange={vi.fn()} />,
    );

    // Page 2 is the only page the start gap would hide, so it is drawn; the end
    // gap still hides pages 6 and 7 behind one ellipsis.
    expect(eight.renderer.findByText("2")).toBeDefined();
    expect(
      eight.renderer.getAllText().filter((text) => text === "…"),
    ).toHaveLength(1);
    expect(eight.renderer.getAllText()).toContain("8");

    eight.unmount();
  });

  it("renders every page when the sibling count is not a number", () => {
    const pager = renderComponent(
      <Pager
        page={5}
        pageCount={10}
        siblingCount={Number.NaN}
        onPageChange={vi.fn()}
      />,
    );

    // A malformed cap is no cap: the current page and every sibling stay.
    expect(buttonFor(pager, "5")?.style.backgroundColor).toBeDefined();
    expect(pager.renderer.findByText("…")).toBeUndefined();
    expect(pager.renderer.getAllText()).toEqual(
      expect.arrayContaining([
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
      ]),
    );

    pager.unmount();
  });

  it("activates a page from Enter on the focused button", () => {
    const onPageChange = vi.fn();
    const pager = renderComponent(
      <Pager page={5} pageCount={10} onPageChange={onPageChange} />,
    );
    pager.renderer.focusElement(buttonFor(pager, "4")?.id ?? -1);

    pager.renderer.simulateKeystrokes("enter");

    expect(onPageChange).toHaveBeenCalledWith(4);

    pager.unmount();
  });

  it("composes the caller's click with every page change", () => {
    const onClick = vi.fn();
    const onPageChange = vi.fn();
    const pager = renderComponent(
      <Pagination page={5} pageCount={10} onPageChange={onPageChange}>
        <PaginationPrevious testId="prev" onClick={onClick} />
        <PaginationItem page={4} testId="page-4" onClick={onClick} />
        <PaginationNext testId="next" onClick={onClick} />
      </Pagination>,
    );

    clickCentreOf(pager, "prev");
    clickCentreOf(pager, "page-4");
    clickCentreOf(pager, "next");

    expect(onClick).toHaveBeenCalledTimes(3);
    expect(onPageChange.mock.calls).toEqual([[4], [4], [6]]);

    pager.unmount();
  });

  it("still reports a click on the current page", () => {
    const onClick = vi.fn();
    const onPageChange = vi.fn();
    const pager = renderComponent(
      <Pagination page={5} pageCount={10} onPageChange={onPageChange}>
        <PaginationItem page={5} testId="page-5" onClick={onClick} />
      </Pagination>,
    );

    clickCentreOf(pager, "page-5");

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onPageChange).not.toHaveBeenCalled();

    pager.unmount();
  });

  it("renders nothing when there are no pages", () => {
    const pager = renderComponent(
      <Pager testId="pager" page={1} pageCount={0} onPageChange={vi.fn()} />,
    );

    expect(pager.renderer.findByTestId("pager")).toBeUndefined();

    pager.unmount();
  });

  it("paints the current page with the primary role in both themes", () => {
    const assertTheme = (theme: TestTheme, primary: string): void => {
      const pager = renderComponent(
        <Pager page={5} pageCount={10} onPageChange={vi.fn()} />,
        theme,
      );

      expect(buttonFor(pager, "5")?.style.backgroundColor).toBe(primary);
      expect(buttonFor(pager, "4")?.style.backgroundColor).toBeUndefined();

      pager.unmount();
    };

    assertTheme("dark", darkTheme.colors.primary);
    assertTheme("light", lightTheme.colors.primary);
  });

  it("renders the parts in the order the caller composed them", () => {
    const pager = renderComponent(
      <Pagination page={5} pageCount={10} onPageChange={vi.fn()}>
        <PaginationPrevious />
        <PaginationItem page={7} />
        <PaginationList />
        <PaginationNext />
      </Pagination>,
    );

    const texts = pager.renderer.getAllText();
    expect(texts.indexOf("Prev")).toBeGreaterThanOrEqual(0);
    expect(texts.indexOf("7")).toBeGreaterThan(texts.indexOf("Prev"));
    expect(texts.indexOf("7")).toBeLessThan(texts.indexOf("1"));
    expect(texts.indexOf("Next")).toBeGreaterThan(texts.indexOf("10"));

    pager.unmount();
  });

  it("lets an item outside the list read the root's page", () => {
    const onPageChange = vi.fn();
    const pager = renderComponent(
      <Pagination page={5} pageCount={10} onPageChange={onPageChange}>
        <PaginationList />
        <PaginationItem page={5} testId="extra-current" />
        <PaginationItem page={7} testId="extra-next" />
      </Pagination>,
    );

    clickCentreOf(pager, "extra-current");
    expect(onPageChange).not.toHaveBeenCalled();
    expect(
      pager.renderer.findByTestId("extra-current")?.style.backgroundColor,
    ).toBe(darkTheme.colors.primary);

    clickCentreOf(pager, "extra-next");
    expect(onPageChange).toHaveBeenCalledWith(7);

    pager.unmount();
  });

  it("keeps a bare item naming a page the control does not have inert", () => {
    const onPageChange = vi.fn();
    const onClick = vi.fn();
    const pager = renderComponent(
      <Pagination page={1} pageCount={5} onPageChange={onPageChange}>
        <PaginationList />
        <PaginationItem page={9} testId="page-nine" onClick={onClick}>
          9
        </PaginationItem>
      </Pagination>,
    );

    clickCentreOf(pager, "page-nine");

    // An inert control reports nothing and runs no caller handler.
    expect(onPageChange).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
    expect(
      pager.renderer.findByTestId("page-nine")?.customProps?.tabIndex,
    ).toBe(-1);
    expect(
      Option.getOrUndefined(
        Option.flatMap(
          Option.fromNullishOr(nodesNamed(pager.renderer, "Page 9")[0]),
          (node) => node.description,
        ),
      ),
    ).toBe("Disabled");

    pager.unmount();
  });

  it("truncates a fractional bare item to its whole page", () => {
    const onPageChange = vi.fn();
    const pager = renderComponent(
      <Pagination page={1} pageCount={10} onPageChange={onPageChange}>
        <PaginationList />
        <PaginationItem page={2.9} testId="page-odd">
          2.9
        </PaginationItem>
      </Pagination>,
    );

    expect(
      pager.renderer.findByTestId("page-odd")?.customProps?.["aria-label"],
    ).toBe("Page 2");
    clickCentreOf(pager, "page-odd");

    expect(onPageChange).toHaveBeenCalledWith(2);

    pager.unmount();
  });

  it("keeps Previous inert on page one when the caller passes disabled={false}", () => {
    const onPageChange = vi.fn();
    const pager = renderComponent(
      <Pagination page={1} pageCount={10} onPageChange={onPageChange}>
        <PaginationPrevious testId="prev" disabled={false} />
        <PaginationList />
        <PaginationNext testId="next" />
      </Pagination>,
    );

    expect(pager.renderer.findByTestId("prev")?.customProps?.tabIndex).toBe(-1);
    clickCentreOf(pager, "prev");

    expect(onPageChange).not.toHaveBeenCalled();

    pager.unmount();
  });

  it("keeps Next inert on the last page when the caller passes disabled={false}", () => {
    const onPageChange = vi.fn();
    const pager = renderComponent(
      <Pagination page={10} pageCount={10} onPageChange={onPageChange}>
        <PaginationPrevious testId="prev" />
        <PaginationList />
        <PaginationNext testId="next" disabled={false} />
      </Pagination>,
    );

    expect(pager.renderer.findByTestId("next")?.customProps?.tabIndex).toBe(-1);
    clickCentreOf(pager, "next");

    expect(onPageChange).not.toHaveBeenCalled();

    pager.unmount();
  });

  it("normalises a fractional page and count", () => {
    const onPageChange = vi.fn();
    const pager = renderComponent(
      <Pagination page={1.5} pageCount={5.9} onPageChange={onPageChange}>
        <PaginationPrevious testId="prev" />
        <PaginationList />
        <PaginationNext testId="next" />
      </Pagination>,
    );

    expect(pager.renderer.getAllText()).not.toContain("6");
    expect(buttonFor(pager, "1")?.customProps?.["aria-selected"]).toBe(true);
    expect(pager.renderer.findByTestId("prev")?.customProps?.tabIndex).toBe(-1);

    clickCentreOf(pager, "next");

    expect(onPageChange.mock.calls).toEqual([[2]]);

    pager.unmount();
  });

  it("stops Next at the whole page count", () => {
    const onPageChange = vi.fn();
    const pager = renderComponent(
      <Pagination page={5} pageCount={5.9} onPageChange={onPageChange}>
        <PaginationPrevious testId="prev" />
        <PaginationList />
        <PaginationNext testId="next" />
      </Pagination>,
    );

    expect(pager.renderer.getAllText()).not.toContain("6");
    expect(pager.renderer.findByTestId("next")?.customProps?.tabIndex).toBe(-1);
    clickCentreOf(pager, "next");

    expect(onPageChange).not.toHaveBeenCalled();

    pager.unmount();
  });
});
