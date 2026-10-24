/**
 * The shipped pagination screen, mounted in the real renderer.
 *
 * An example no suite mounts is the screen a reader copies without knowing
 * whether it runs: the registry test proves the file is registered, and this
 * proves the screen paints and that its own arrows move the page. The filter
 * case is the rule a reader can lose without noticing — narrowing a set from a
 * later page returns to the first page of the narrowed set.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { afterEach, describe, expect, it } from "vitest";
import { TablePaginationExample } from "../../examples/table-pagination.example.js";
import {
  clickCentreOf,
  paintedText,
  typeInto,
} from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";

let root: DataTestRoot | undefined;

afterEach(() => {
  root?.unmount();
  root = undefined;
});

/** The screen's readout, found by the words it opens with. */
const readout = (testRoot: DataTestRoot): string =>
  Option.getOrElse(
    Arr.findFirst(testRoot.renderer.getAllText(), Str.startsWith("Page ")),
    () => {
      throw new Error("behaviour: the pagination readout is not painted");
    },
  );

const press = (testRoot: DataTestRoot, testId: string): void => {
  clickCentreOf(testRoot, testId);
  testRoot.renderer.flush();
};

describe("the shipped pagination example", () => {
  it("paints its first page and moves to the second", () => {
    root = renderData(<TablePaginationExample />);
    settle(root);

    expect(readout(root)).toContain("Page 1 of 4 · 6 rows");
    expect(paintedText(root)).toContain("Task 01");
    expect(paintedText(root)).not.toContain("Task 07");

    press(root, "pagination-next");
    expect(readout(root)).toContain("Page 2 of 4 · 6 rows");
    expect(paintedText(root)).toContain("Task 07");
    expect(paintedText(root)).not.toContain("Task 01");
  });

  it("returns to the first page when its filter narrows the set", () => {
    root = renderData(<TablePaginationExample />);
    settle(root);

    press(root, "pagination-next");
    press(root, "pagination-next");
    expect(readout(root)).toContain("Page 3 of 4");

    typeInto(root, "pagination-filter", "gra");
    root.renderer.flush();
    expect(readout(root)).toContain("Page 1 of 2");
    expect(paintedText(root)).toContain("Task 01");
    expect(paintedText(root)).not.toContain("Task 02");
  });
});
