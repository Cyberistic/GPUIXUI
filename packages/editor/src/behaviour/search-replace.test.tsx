/**
 * `SearchReplace` in the real renderer.
 *
 * The bugs guarded: a case or whole-word toggle that changes the match count
 * but not the replacement (the count and a replace-all must agree on the same
 * ranges); a toggle the reader cannot reach; a default that silently matched a
 * different case than the count reported; and a **disabled** bar that still
 * stepped its match, because a read-only host keeps receiving keys.
 */

import { useState, type ReactNode } from "react";
import { createTestRoot } from "@gpuix/react/testing";
import { darkTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { afterEach, describe, expect, it } from "vitest";
import { SearchReplace } from "../search/search-replace.js";

interface Root {
  readonly renderer: ReturnType<typeof createTestRoot>["renderer"];
  readonly unmount: () => void;
  readonly rerender: (node: ReactNode) => void;
}

let current: Root | undefined;

const render = (node: ReactNode): Root => {
  const root = createTestRoot({ width: 1000, height: 700 });
  const rerender = (next: ReactNode): void => {
    root.render(<ThemeProvider theme={darkTheme}>{next}</ThemeProvider>);
  };
  rerender(node);
  const mounted: Root = {
    renderer: root.renderer,
    unmount: () => {
      root.unmount();
      current = undefined;
    },
    rerender,
  };
  current = mounted;
  return mounted;
};

afterEach(() => {
  current?.unmount();
});

const text = (root: Root): string => root.renderer.getAllText().join("\n");

const boundsOf = (
  root: Root,
  testId: string,
): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} => {
  const element = root.renderer.findByTestId(testId);
  const bounds = root.renderer.getElementBounds(element?.id ?? -1);
  if (element == null || bounds == null) {
    throw new Error(`no painted ${testId} to measure`);
  }
  return bounds;
};

const press = (root: Root, testId: string): void => {
  const bounds = boundsOf(root, testId);
  root.renderer.nativeSimulateClick(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
    0,
  );
};

const typeInto = (root: Root, testId: string, keys: string): void => {
  const field = root.renderer.findByTestId(testId);
  root.renderer.focusElement(field?.id ?? -1);
  root.renderer.simulateKeystrokes(keys);
};

/** A controlled document, so a replacement is read back the way a caller sees it. */
const Harness = ({
  initial,
  onChange,
}: {
  readonly initial: string;
  readonly onChange: (value: string) => void;
}) => {
  const [value, setValue] = useState(initial);
  return (
    <SearchReplace
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
};

describe("SearchReplace", () => {
  it("matches by case and whole word through the bar's toggles", () => {
    const changes: string[] = [];
    const search = render(
      <Harness
        initial="Cat concatenate cat"
        onChange={(value) => changes.push(value)}
      />,
    );

    typeInto(search, "search-replace-find", "cat");
    expect(text(search)).toContain("1 / 2");

    press(search, "search-replace-case");
    expect(text(search)).toContain("1 / 3");

    press(search, "search-replace-word");
    expect(text(search)).toContain("1 / 2");

    press(search, "search-replace-replace-all");
    expect(changes.at(-1)).toBe(" concatenate ");
    search.unmount();
  });

  it("steps matches from the replacement field too", () => {
    const search = render(
      <Harness initial="cat cat" onChange={() => undefined} />,
    );

    typeInto(search, "search-replace-find", "cat");
    expect(text(search)).toContain("1 / 2");
    const field = search.renderer.findByTestId("search-replace-replace");
    search.renderer.nativeSimulateKeyDown(field?.id ?? -1, "f3");
    expect(text(search)).toContain("2 / 2");
    search.unmount();
  });

  it("refuses to step the match once the bar is disabled", () => {
    const search = render(
      <SearchReplace value="cat cat" onValueChange={() => undefined} />,
    );
    typeInto(search, "search-replace-find", "cat");
    expect(text(search)).toContain("1 / 2");

    search.rerender(
      <SearchReplace
        value="cat cat"
        onValueChange={() => undefined}
        disabled
      />,
    );
    const field = search.renderer.findByTestId("search-replace-find");
    search.renderer.nativeSimulateKeyDown(field?.id ?? -1, "f3");
    expect(text(search)).toContain("1 / 2");
    search.unmount();
  });

  it("reads a stored document that is not text as an empty one", () => {
    // The bug guarded: `value` is a document restored from storage as often as
    // a literal, and a saved record writes `null` where it carried no text.
    // `findRanges` called `text.indexOf` on it the moment the reader typed, so
    // the bar threw out of the render instead of reporting no matches — the
    // rule `CodeEditor` and `MarkdownEditor` already follow through `draftOf`.
    const search = render(
      <SearchReplace
        value={null as unknown as string}
        onValueChange={() => undefined}
      />,
    );
    typeInto(search, "search-replace-find", "cat");
    expect(text(search)).toContain("No matches");
    // The replace-all route is disabled with no match, and must stay inert.
    press(search, "search-replace-replace-all");
    expect(text(search)).toContain("No matches");
    search.unmount();
  });

  it("reads a blank name as the default, never an unnamed control", () => {
    // The bug guarded: a destructuring default covers only `undefined`, so a
    // name a table or a saved record handed over blank reached `aria-label`
    // untouched — the two fields announced nothing and the four actions were
    // named by their arrow glyph or by no words at all.
    const search = render(
      <SearchReplace
        value="cat cat"
        onValueChange={() => undefined}
        findLabel=""
        replaceFieldLabel="   "
        replaceLabel=""
        replaceAllLabel="  "
        nextLabel=""
        previousLabel="   "
      />,
    );
    const nameOf = (testId: string): unknown =>
      search.renderer.findByTestId(testId)?.customProps?.["aria-label"];
    expect(nameOf("search-replace-find")).toBe("Find");
    expect(nameOf("search-replace-replace")).toBe("Replace with");
    const actions = Object.values(
      search.renderer.getA11yTree().nodes ?? {},
    ).flatMap((node) =>
      node.aria?.role === "Button" && node.aria.label !== undefined
        ? [node.aria.label]
        : [],
    );
    ["Previous match", "Next match", "Replace", "Replace all"].forEach((name) =>
      expect(actions).toContain(name),
    );
    search.unmount();
  });

  it("replaces the active match with the replacement field's text", () => {
    const changes: string[] = [];
    const search = render(
      <Harness initial="cat cat" onChange={(value) => changes.push(value)} />,
    );

    typeInto(search, "search-replace-find", "cat");
    typeInto(search, "search-replace-replace", "dog");
    press(search, "search-replace-replace-one");
    expect(changes.at(-1)).toBe("dog cat");
    search.unmount();
  });
});
