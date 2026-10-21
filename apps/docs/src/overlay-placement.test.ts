import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as Schema from "effect/Schema";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { installedNativeRoot } from "./lib/native-declarations.testing";
import {
  installedFloatingDeclarations,
  installedFloatingLayerSource,
  installedTooltipSource,
} from "./lib/react-declarations.testing";
import {
  placementAbsences,
  placementAbsenceSubjects,
  placementProps,
  placementSurfaces,
  placementSurfaceViolations as violations,
  type ComponentSourceFile,
} from "./lib/placement";
import { placementSearchEntry } from "./lib/placement-search";
import {
  LayerMapping,
  PlacementAbsences,
  PlacementMatrix,
  PlacementProps,
} from "./components/placement-tables";
import { generatedSearchEntries, search } from "./lib/search";

/**
 * Guards the Overlay placement page (plan 636). The bug being prevented is a
 * placement model with no owner: measured 2026-10-21, `placement` reached
 * Spinner's limitations, `positioning` Select's, `collision` Dropdown menu's,
 * `side offset` Preview card's, `fit` the Architecture page, `anchor point`
 * Slider's keyboard section, and `reposition`/`repositioning` returned nothing,
 * although every floating surface is placed by the same five props.
 *
 * These cases fail when the installed `@gpuix/react` adds, renames or removes a
 * placement prop, changes a default, changes the `<anchored>` translation,
 * moves a component onto or off `usePlacement`, changes the tooltip's own
 * default, or when the page loses a section, a table or its search entry.
 * `node:fs` is a test-only boundary import, as in `events.test.ts`: the docs
 * bundle must never import the runtime.
 */
const source = (path: string): string =>
  readFileSync(new URL(`../content/docs/${path}`, import.meta.url), "utf8");

const PAGE = source("overlay-placement.mdx");
const META = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Struct({ pages: Schema.Array(Schema.String) })),
)(source("meta.json"));
const MDX_REGISTRY = readFileSync(
  new URL("./components/mdx.tsx", import.meta.url),
  "utf8",
);

const PACKAGES_ROOT = new URL("../../../packages/", import.meta.url);

const componentSources = (): ReadonlyArray<ComponentSourceFile> => {
  const root = new URL("components/src/", PACKAGES_ROOT);
  const read = (
    directory: URL,
    prefix: string,
  ): ReadonlyArray<ComponentSourceFile> =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = new URL(
        `${entry.name}${entry.isDirectory() ? "/" : ""}`,
        directory,
      );
      const relative = `${prefix}${entry.name}`;
      if (entry.isDirectory()) return read(path, `${relative}/`);
      if (!/\.tsx?$/u.test(entry.name) || /\.test\.tsx?$/u.test(entry.name)) {
        return [];
      }
      return [
        {
          path: `packages/components/src/${relative}`,
          source: readFileSync(path, "utf8"),
        },
      ];
    });
  return read(root, "");
};

const NATIVE_ROOT = installedNativeRoot();

const realInput = {
  reactDeclarations: installedFloatingDeclarations(),
  reactLayer: installedFloatingLayerSource(),
  nativeDeclarations: readFileSync(join(NATIVE_ROOT, "dist/host.d.ts"), "utf8"),
  runtimeTooltip: installedTooltipSource(),
  usePlacementSource: readFileSync(
    new URL("components/src/internal/use-placement.ts", PACKAGES_ROOT),
    "utf8",
  ),
  components: componentSources(),
};

const messages = (
  overrides: Partial<typeof realInput> = {},
): ReadonlyArray<string> => violations({ ...realInput, ...overrides });

/** A component file's source, replaced in the real input. */
const withComponentSource = (
  path: string,
  edit: (source: string) => string,
): ReadonlyArray<ComponentSourceFile> =>
  realInput.components.map((file) =>
    file.path === path ? { path, source: edit(file.source) } : file,
  );

describe("the placement surface", () => {
  it("agrees with the installed declarations and every component source", () => {
    expect(messages()).toEqual([]);
  });

  it("documents all five placement props once, with a type and a default", () => {
    expect(placementProps.map((row) => row.name)).toEqual([
      "side",
      "sideOffset",
      "align",
      "alignOffset",
      "collisionPadding",
    ]);
    expect(
      placementProps.every(
        (row) => row.type.length > 0 && row.default.length > 0,
      ),
    ).toBe(true);
  });

  it("names every component file that places a surface", () => {
    const measured = placementSurfaces.filter(
      (row) => row.correction === "measured",
    );
    expect(measured.map((row) => row.surface)).toEqual([
      "PopoverContent",
      "DropdownMenuContent",
      "ComboboxContent",
    ]);
  });

  it("fails when the runtime drops a documented prop", () => {
    const changed = messages({
      reactDeclarations: realInput.reactDeclarations.replace(
        /\n\s*align\?: FloatingAlign;/u,
        "",
      ),
    });
    expect(changed.join("\n")).toContain(
      "align is documented and not declared on FloatingContentProps",
    );
  });

  it("fails when the runtime adds a placement prop", () => {
    const changed = messages({
      reactDeclarations: realInput.reactDeclarations.replace(
        "    collisionPadding?: number;",
        "    collisionPadding?: number;\n    arrow?: number;",
      ),
    });
    expect(changed.join("\n")).toContain(
      "FloatingContentProps.arrow is declared and not documented",
    );
  });

  it("fails by name when the layer changes a default", () => {
    const changed = messages({
      reactLayer: realInput.reactLayer.replace(
        "collisionPadding = 8",
        "collisionPadding = 4",
      ),
    });
    expect(changed.join("\n")).toContain(
      "collisionPadding defaults to 4; the page says 8",
    );
  });

  it("fails when the layer stops passing a mapped value", () => {
    const changed = messages({
      reactLayer: realInput.reactLayer.replace('fit: "snap"', 'fit: "switch"'),
    });
    expect(changed.join("\n")).toContain(
      'the layer no longer passes fit: "snap"',
    );
  });

  it("fails when a component stops using the mechanism its row claims", () => {
    const changed = messages({
      components: withComponentSource(
        "packages/components/src/preview-card.tsx",
        (component) => `usePlacement(${component}`,
      ),
    });
    expect(changed.join("\n")).toContain(
      "packages/components/src/preview-card.tsx is documented as pass-through and its source does not pass a caller's side and align to FloatingLayer",
    );
  });

  it("fails when a component file places a surface with no row", () => {
    const changed = messages({
      components: [
        ...realInput.components,
        {
          path: "packages/components/src/new-surface.tsx",
          source: "const placement = usePlacement({});",
        },
      ],
    });
    expect(changed.join("\n")).toContain(
      "packages/components/src/new-surface.tsx places a surface and has no placement row",
    );
  });

  it("fails when the installed tooltip stops defaulting to the centre", () => {
    const changed = messages({
      runtimeTooltip: realInput.runtimeTooltip.replace(
        'align = "center"',
        'align = "start"',
      ),
    });
    expect(changed.join("\n")).toContain(
      'TooltipContent no longer defaults align to "center"',
    );
  });

  it("fails when the runtime gains the arrow the page denies", () => {
    const changed = messages({
      nativeDeclarations: realInput.nativeDeclarations.replace(
        "    occlude?: boolean;",
        "    occlude?: boolean;\n    arrow?: number;",
      ),
    });
    expect(changed.join("\n")).toContain(
      "AnchoredProps declares an arrow, which the page says does not exist",
    );
  });

  it("fails when the hook starts tracking the window", () => {
    const changed = messages({
      usePlacementSource: `${realInput.usePlacementSource}\nwindow.addEventListener("resize", () => {});\n`,
    });
    expect(changed.join("\n")).toContain(
      "addEventListener appears in use-placement.ts, which the page says measures once per open",
    );
  });

  it("proves every row's source still places the surface it claims", () => {
    const packageRows = placementSurfaces.filter((row) =>
      row.source.startsWith("packages/"),
    );
    expect(packageRows.length).toBeGreaterThan(0);
    expect(
      packageRows.filter(
        (row) =>
          !realInput.components.some(
            (file) =>
              file.path === row.source &&
              (file.source.includes("usePlacement(") ||
                file.source.includes("FloatingLayer") ||
                file.source.includes("<anchored")),
          ),
      ),
    ).toEqual([]);
  });
});

describe("the Overlay placement page", () => {
  it("is ordered directly after Accessibility", () => {
    const index = META.pages.indexOf("overlay-placement");
    expect(index).toBeGreaterThan(0);
    expect(META.pages[index - 1]).toBe("accessibility");
  });

  it("registers every generated table", () => {
    const tags = [
      "PlacementProps",
      "LayerMapping",
      "PlacementMatrix",
      "PlacementAbsences",
    ];
    expect(tags.filter((tag) => !MDX_REGISTRY.includes(tag))).toEqual([]);
    expect(tags.filter((tag) => !PAGE.includes(`<${tag} />`))).toEqual([]);
  });

  it("keeps every section the page promises", () => {
    const headings = [
      "## The placement props",
      "## What the layer asks the runtime for",
      "## Which components correct it",
      "## The two measured defects",
      "### The centre line",
      "### The window edge",
      "## Choosing a side",
      "## One-shot measurement",
      "## What is not supported",
      "## Evidence on this site",
      "## Related",
    ];
    expect(headings.filter((heading) => !PAGE.includes(heading))).toEqual([]);
  });

  it("includes both real sources", () => {
    const includes = [
      "packages/components/src/internal/placement.ts",
      "packages/components/src/internal/use-placement.ts",
    ];
    expect(includes.filter((path) => !PAGE.includes(path))).toEqual([]);
  });

  it("renders every declared row, not an empty table", () => {
    const props = renderToStaticMarkup(createElement(PlacementProps));
    const mapping = renderToStaticMarkup(createElement(LayerMapping));
    const matrix = renderToStaticMarkup(createElement(PlacementMatrix));
    const absences = renderToStaticMarkup(createElement(PlacementAbsences));

    expect(props.match(/data-placement-prop=/gu)).toHaveLength(
      placementProps.length,
    );
    expect(mapping.match(/data-placement-mapping=/gu)).toHaveLength(9);
    expect(matrix.match(/data-placement-surface=/gu)).toHaveLength(
      placementSurfaces.length,
    );
    expect(absences.match(/data-placement-absence=/gu)).toHaveLength(
      placementAbsences.length,
    );
    expect(placementAbsenceSubjects).toEqual(
      placementAbsences.map((absence) => absence.subject),
    );
  });

  it("carries a compiled example and no placeholder", () => {
    expect(PAGE).toContain("```tsx");
    expect(PAGE).toContain('side="top"');
    expect(PAGE).toContain("collisionPadding={12}");
    expect(PAGE).not.toMatch(/\bTODO\b|\bplaceholder\b|\bcoming soon\b/iu);
  });

  it("links the pages that own the neighbouring subjects", () => {
    const links = [
      "/docs/component-api#layering",
      "/docs/native-elements",
      "/docs/components/popover",
      "/docs/components/preview-card",
      "/docs/components/tooltip",
      "/docs/components/context-menu",
      "/docs/window",
      "/docs/automation",
    ];
    expect(links.filter((link) => !PAGE.includes(link))).toEqual([]);
  });
});

describe("the Overlay placement search document", () => {
  it("is one of the generated documents", () => {
    expect(generatedSearchEntries).toContain(placementSearchEntry);
  });

  it("promotes distinctive names, not plain placement words", () => {
    expect(placementSearchEntry.names).toContain("sideOffset");
    expect(placementSearchEntry.names).toContain("collisionPadding");
    expect(placementSearchEntry.names).toContain("FloatingContentProps");
    expect(placementSearchEntry.names).not.toContain("side");
    expect(placementSearchEntry.names).not.toContain("fit");
    expect(placementSearchEntry.names).not.toContain("AnchoredProps");
  });

  it("indexes the measured defects and the absences", () => {
    expect(placementSearchEntry.index.content).toContain("flips once");
    expect(placementSearchEntry.index.content).toContain(
      "A custom anchor element",
    );
  });
});

describe(
  "a reader's placement query reaches the page",
  { timeout: 120_000 },
  () => {
    it.each([
      "placement",
      "positioning",
      "overlay placement",
      "overlay position",
      "side",
      "align",
      "side offset",
      "sideOffset",
      "align offset",
      "alignOffset",
      "collision",
      "collision padding",
      "flip",
      "snap",
      "fit",
      "off screen",
      "anchor point",
      "reposition",
      "repositioning",
    ])("%s → /docs/overlay-placement", async (query) => {
      const [first] = await search(query);
      expect(first?.url).toBe("/docs/overlay-placement");
    });

    it.each([
      ["position", "/docs/styling"],
      ["anchored", "/docs/native-elements"],
      ["anchor", "/docs/native-elements"],
      ["popover placement", "/docs/components/popover"],
      ["tooltip placement", "/docs/components/tooltip"],
      ["layering", "/docs/component-api#layering"],
      ["z-index", "/docs/component-api#layering"],
      ["overlay", "/docs/component-api"],
      ["outside click", "/docs/component-api"],
      ["drawer", "/docs/components/drawer"],
      ["window edge", "/docs/window"],
    ])("%s keeps %s", async (query, url) => {
      const [first] = await search(query);
      expect(first?.url).toBe(url);
    });
  },
);
