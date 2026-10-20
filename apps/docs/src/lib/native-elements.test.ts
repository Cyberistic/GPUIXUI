import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  installedJsxRuntimeDeclarations,
  installedNativeDeclarations,
  packageElementSources,
} from "./native-declarations.testing";
import {
  absentElements,
  elementTypeNames,
  interfaceFieldsIn,
  jsxIntrinsicNames,
  nativeElementViolations,
  nativeElements,
  ownProps,
  virtualListProps,
} from "./native-elements";
import { roadmapTargets } from "./roadmap.generated";
import { search } from "./search";
import { source } from "./source";

/**
 * Guards plan 626. The bug: the site documented how a host element is styled
 * and which props it inherits, but never which JSX tags exist, so `img`,
 * `image element`, `svg element`, `render markdown`, `intrinsic elements` and
 * `jsx` reached Avatar, Architecture, Scrollable containers or nothing
 * (measured 2026-10-20 at `eb85c6b4`), while `error boundary` reached Inline
 * validation and `onUncaughtError` returned nothing.
 *
 * Every row is authored in `native-elements.ts`; these tests compare it with
 * the installed `@gpuix/native` declarations, the installed `@gpuix/react` JSX
 * runtime, the package source and the roadmap. The assertions fail when a tag
 * or prop the runtime adds is left undocumented, when a row invents a tag or a
 * prop the runtime does not declare, when a "no component ships" row is false,
 * when an absence becomes an element, and when the page or its search
 * vocabulary drifts from the data.
 */
const appDirectory = fileURLToPath(new URL("../../", import.meta.url));
const page = readFileSync(
  join(appDirectory, "content/docs/native-elements.mdx"),
  "utf8",
);
const declarations = installedNativeDeclarations().join("\n");
const jsxRuntime = installedJsxRuntimeDeclarations();
const renderedTags = [
  ...new Set(
    nativeElements
      .map((element) => element.tag)
      .filter((tag) =>
        packageElementSources().some((text) =>
          new RegExp(`<${tag}(?=[\\s>/])`, "u").test(text),
        ),
      ),
  ),
];
const roadmapNames = roadmapTargets.map((target) => target.name);

const violations = (input?: {
  readonly elements?: typeof nativeElements;
  readonly absent?: typeof absentElements;
}) =>
  nativeElementViolations({
    declarations,
    jsxRuntime,
    elements: input?.elements ?? nativeElements,
    absent: input?.absent ?? absentElements,
    renderedTags,
    roadmapNames,
  });

describe("the declaration parsers", () => {
  it("reads the ElementType union", () => {
    expect(
      elementTypeNames('export type ElementType = "div" | "text";'),
    ).toEqual(["div", "text"]);
    expect(elementTypeNames("export type Other = string;")).toEqual([]);
  });

  it("reads the JSX intrinsic keys, including a quoted hyphenated tag", () => {
    const fixture = `  interface IntrinsicElements {
    div: Props
    "virtual-list": VirtualListProps
  }
}`;
    expect(jsxIntrinsicNames(fixture)).toEqual(["div", "virtual-list"]);
    expect(jsxIntrinsicNames("interface Other { div: Props }")).toEqual([]);
  });

  it("reads an interface's own fields, not its parent's", () => {
    const fixture = `interface Base {
  alpha?: string;
  beta?: number;
}
interface Derived extends Base {
  beta?: number;
  gamma?: boolean;
}`;
    expect(ownProps(fixture, "Derived", ["Base"])).toEqual(["gamma"]);
  });

  it("skips a nested object's fields", () => {
    const fixture = `interface AnchoredProps extends Base {
    position?: {
        x: number;
        y: number;
    };
    side?: "top" | "bottom";
}`;
    expect(interfaceFieldsIn(fixture, "AnchoredProps")).toEqual([
      "position",
      "side",
    ]);
  });

  it("reads the virtual list's shared and union props", () => {
    const fixture = `export type VirtualListShared = {
  alignment?: "top" | "bottom";
  role?: string;
  testId?: string;
};
export type VirtualListProps = (VirtualListShared & {
  itemCount?: never;
  estimatedItemHeight?: number;
}) | (VirtualListShared & {
  itemCount: number;
  estimatedItemHeight: number;
  windowStart?: number;
});`;
    expect(virtualListProps(fixture)).toEqual([
      "alignment",
      "itemCount",
      "estimatedItemHeight",
      "windowStart",
    ]);
  });
});

describe("the installed element catalogue", () => {
  it("agrees with the installed declarations, the JSX runtime and the source", () => {
    expect(violations()).toEqual([]);
  });

  it("fails by name when a documented tag does not exist", () => {
    expect(
      violations({
        elements: [
          ...nativeElements,
          {
            tag: "button",
            paints: "A button.",
            props: [],
            composedBy: ["Button"],
          },
        ],
      }),
    ).toContain("button is documented but ElementType does not declare it");
  });

  it("fails by name when an undocumented element appears", () => {
    expect(
      violations({
        elements: nativeElements.filter((row) => row.tag !== "diff"),
      }),
    ).toContain("diff is an element but undocumented");
  });

  it("fails by name when a prop is renamed on one side", () => {
    expect(
      violations({
        elements: nativeElements.map((row) =>
          row.tag === "img"
            ? { ...row, props: ["src", "objectFit", "description"] }
            : row,
        ),
      }),
    ).toEqual(
      expect.arrayContaining([
        "img: description is documented but ImgProps does not declare it",
        "img: alt is declared by ImgProps but undocumented",
      ]),
    );
  });

  it("fails when a no-component row is false", () => {
    expect(
      violations({
        elements: nativeElements.map((row) =>
          row.tag === "markdown" ? { ...row, composedBy: ["Card"] } : row,
        ),
      }),
    ).toContain(
      "markdown: the table names Card, but no package source renders it",
    );
  });

  it("fails when a composed row has lost its source", () => {
    expect(
      violations({
        elements: nativeElements.map((row) =>
          row.tag === "textarea" ? { ...row, composedBy: [] } : row,
        ),
      }),
    ).toContain(
      "textarea: the table says no component renders it, but the package source does",
    );
  });

  it("fails when an absence becomes a real element", () => {
    expect(
      violations({
        absent: [
          ...absentElements,
          { tag: "div", replacement: "Nothing.", owner: "/docs/styling" },
        ],
      }),
    ).toContain(
      "div: the page says it is absent, but ElementType now declares it",
    );
  });

  it("fails when a row names a roadmap target the repository does not track", () => {
    expect(
      violations({
        elements: nativeElements.map((row) =>
          row.tag === "canvas" ? { ...row, roadmap: "Canvas painting" } : row,
        ),
      }),
    ).toContain("canvas: the roadmap has no target named Canvas painting");
  });
});

describe("the page", () => {
  it("mounts both tables and keeps every section", () => {
    expect(page).toContain("<NativeElementsTable />");
    expect(page).toContain("<AbsentElements />");
    const missing = [
      "## The twelve elements",
      "## What has no component",
      "## Images",
      "## Vector graphics",
      "## Code, diffs and markdown",
      "## Virtual lists",
      "## Floating layers",
      "## What is not an element",
      "## Writing your own element",
    ].filter((heading) => !page.includes(heading));
    expect(missing).toEqual([]);
  });

  it("names every element and every replacement owner", () => {
    const description =
      page
        .slice(0, page.indexOf("\n---", 3))
        .split("\n")
        .find((line) => line.startsWith("description:"))
        ?.slice("description:".length)
        .trim()
        .slice(1, -1) ?? "";
    const unnamed = nativeElements
      .map((element) => element.tag)
      .filter((tag) => !description.toLowerCase().includes(tag));
    expect(unnamed).toEqual([]);

    const urls = new Set(source.getPages().map((served) => served.url));
    const missing = absentElements
      .filter((row) => !urls.has(row.owner))
      .map((row) => row.tag);
    expect(missing).toEqual([]);
  });

  it("names the roadmap target for every element with no component", () => {
    const missing = nativeElements
      .filter((element) => element.composedBy.length === 0)
      .flatMap((element) =>
        element.roadmap === undefined ? [] : [element.roadmap],
      )
      .filter((target) => !page.includes(target));
    expect(missing).toEqual([]);
  });
});

/**
 * The measured vocabulary (plan 626 §8). A row fails when its page alias, its
 * promoted name or the page description is removed, which is the whole point:
 * none of these words appears as a name anywhere else.
 */
const owned: ReadonlyArray<readonly [string, string]> = [
  ["image element", "/docs/native-elements"],
  ["svg element", "/docs/native-elements"],
  ["canvas", "/docs/native-elements"],
  ["render markdown", "/docs/native-elements"],
  ["markdown element", "/docs/native-elements"],
  ["diff element", "/docs/native-elements"],
  ["code element", "/docs/native-elements"],
  ["intrinsic elements", "/docs/native-elements"],
  ["virtual-list", "/docs/native-elements"],
  ["error boundary", "/docs/troubleshooting"],
  ["uncaught error", "/docs/troubleshooting"],
];

/** Words that belong to another page, and must keep it. */
const regressions: ReadonlyArray<readonly [string, string]> = [
  ["input", "/docs/components/text-input"],
  ["text", "/docs/components/text"],
  ["mono", "/docs/typography"],
  ["font size", "/docs/typography"],
  ["diff viewer", "/docs/roadmap"],
  ["syntax highlighting", "/docs/roadmap"],
  ["image preview", "/docs/roadmap"],
  ["error", "/docs/components/inline-validation"],
  ["virtual-list-window", "/docs/capabilities"],
];

describe("search", { timeout: 120_000 }, () => {
  it("names the element catalogue from the words a reader types", async () => {
    const wrong: string[] = [];
    for (const [query, url] of owned) {
      const [first] = await search(query, 2);
      if (first?.url !== url)
        wrong.push(`${query} → ${first?.url ?? "nothing"}`);
    }
    expect(wrong).toEqual([]);
  });

  it("keeps every plain word with its owner", async () => {
    const wrong: string[] = [];
    for (const [query, url] of regressions) {
      const [first] = await search(query, 2);
      if (first?.url !== url)
        wrong.push(`${query} → ${first?.url ?? "nothing"}`);
    }
    expect(wrong).toEqual([]);
  });

  it("finds the runtime's uncaught-error handler", async () => {
    const [first] = await search("onUncaughtError", 2);
    expect(first?.url).toBe("/docs/troubleshooting");
  });
});
