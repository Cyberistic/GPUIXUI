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
