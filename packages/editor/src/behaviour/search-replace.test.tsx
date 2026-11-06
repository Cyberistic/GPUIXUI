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

  it("announces the match count as a named status", () => {
    const search = render(
      <Harness initial="cat cat" onChange={() => undefined} />,
    );
    const statuses = (): ReadonlyArray<unknown> =>
      Object.values(search.renderer.getA11yTree().nodes ?? {}).flatMap((node) =>
        node.aria?.role === "Status" && node.aria.label !== undefined
          ? [node.aria.label]
          : [],
      );
    typeInto(search, "search-replace-find", "cat");
    expect(statuses()).toEqual(["1 / 2"]);
    typeInto(search, "search-replace-find", "z");
    expect(statuses()).toEqual(["No matches"]);
    search.unmount();
  });

  it("says nothing about a count before a query", () => {
    const search = render(
      <Harness initial="cat cat" onChange={() => undefined} />,
    );
    expect(text(search)).not.toContain("No matches");
    expect(
      search.renderer.findByTestId("search-replace-count"),
    ).toBeUndefined();

    typeInto(search, "search-replace-find", "z");
    expect(text(search)).toContain("No matches");
    expect(
      search.renderer.findByTestId("search-replace-count")?.customProps,
    ).toMatchObject({ "aria-label": "No matches" });
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
    const search = render(
      <SearchReplace
        value={null as unknown as string}
        onValueChange={() => undefined}
      />,
    );
    typeInto(search, "search-replace-find", "cat");
    expect(text(search)).toContain("No matches");

    press(search, "search-replace-replace-all");
    expect(text(search)).toContain("No matches");
    search.unmount();
  });

  it("reads a blank name as the default, never an unnamed control", () => {
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

    const stored = render(
      <SearchReplace
        value="cat cat"
        onValueChange={() => undefined}
        findLabel={42 as unknown as string}
        nextLabel={42 as unknown as string}
      />,
    );
    expect(
      stored.renderer.findByTestId("search-replace-find")?.customProps?.[
        "aria-label"
      ],
    ).toBe("Find");
    const storedActions = Object.values(
      stored.renderer.getA11yTree().nodes ?? {},
    ).flatMap((node) =>
      node.aria?.role === "Button" && node.aria.label !== undefined
        ? [node.aria.label]
        : [],
    );
    expect(storedActions).toContain("Next match");
    stored.unmount();
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

  it("starts a changed query at its first match", () => {
    const search = render(
      <Harness initial="aa aa aa" onChange={() => undefined} />,
    );
    const field = search.renderer.findByTestId("search-replace-find");
    typeInto(search, "search-replace-find", "a");
    expect(text(search)).toContain("1 / 6");
    [0, 1, 2].forEach(() =>
      search.renderer.nativeSimulateKeyDown(field?.id ?? -1, "f3"),
    );
    expect(text(search)).toContain("4 / 6");

    typeInto(search, "search-replace-find", "a");
    expect(text(search)).toContain("1 / 3");
    expect(text(search)).not.toContain("3 / 3");

    search.renderer.nativeSimulateKeyDown(field?.id ?? -1, "f3");
    expect(text(search)).toContain("2 / 3");
    search.unmount();
  });

  it("starts a changed option at its first match", () => {
    const search = render(
      <Harness initial="aa aa aa" onChange={() => undefined} />,
    );
    typeInto(search, "search-replace-find", "aa");
    expect(text(search)).toContain("1 / 3");
    const field = search.renderer.findByTestId("search-replace-find");
    [0, 1].forEach(() =>
      search.renderer.nativeSimulateKeyDown(field?.id ?? -1, "f3"),
    );
    expect(text(search)).toContain("3 / 3");

    press(search, "search-replace-case");
    expect(text(search)).toContain("1 / 3");
    search.unmount();
  });
});
