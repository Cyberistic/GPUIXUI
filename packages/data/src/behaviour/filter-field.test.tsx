/**
 * The filter field's hint, in the real GPUix renderer.
 *
 * The bug this guards: a placeholder is copy as often as a literal — a locale
 * table with a missing row answers `""`, and a saved preference can arrive as
 * whitespace — and `placeholder = "Filter…"` as a destructuring default only
 * covers an **absent** prop. A blank hint therefore reached `<input>` as `""`,
 * the field painted no hint while the package documented `Filter…` as its
 * default, and a `"   "` hint laid out a full empty line (measured on
 * `@gpuix/native@0.11.0`: `""` is 0px tall, `"   "` is 16px). The toolbar's
 * search field already reads its hint through `visibleCopy` for the same
 * reason; the filter field is the sibling that did not.
 */

import { afterEach, describe, expect, it } from "vitest";
import { paintedText } from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import {
  DEFAULT_FILTER_PLACEHOLDER,
  TableFilterField,
} from "../filter/field.js";

let root: DataTestRoot | undefined;

const mount = (placeholder: string): DataTestRoot => {
  root = renderData(
    <TableFilterField
      value=""
      placeholder={placeholder}
      onValueChange={() => {}}
    />,
  );
  settle(root);
  return root;
};

afterEach(() => {
  root?.unmount();
  root = undefined;
});

describe("a filter field whose stored hint is blank", () => {
  it("paints the hint the page documents", () => {
    expect(paintedText(mount(""))).toContain(DEFAULT_FILTER_PLACEHOLDER);
  });

  it("keeps the hint a caller writes", () => {
    expect(paintedText(mount("Find a file"))).toContain("Find a file");
  });
});
