import { readFileSync, readdirSync } from "node:fs";
import {
  contrastRatio,
  elevationShadow,
  highContrastLightColors,
  lightTheme,
} from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { pageUrl, propsOf } from "./component-index";
import { packageCollections } from "./collection-routes";
import { inventory } from "./inventory-data";

/**
 * The curated component pages make claims the code owns: which runtime version
 * a gap was measured on, how many native behaviour tests prove the component,
 * whether the inventory calls it shipped — and how the component paints.
 *
 * Each drifted. After the 0.11.0 bump the pages still measured their gaps on
 * 0.10.0 — and the Button page said the runtime had no `focusVisible`, which
 * 0.11.0 paints. The Tabs page claimed 14 native tests where the suite runs 19,
 * and it went on saying selection was "painted per trigger" with "no measured
 * overlay" after `tabs-indicator` shipped as one measured, sliding surface. The
 * Button page said `COMPONENTS.md` listed Tier 1 as `todo` long after the rows
 * were `done`. A page that undersells or overstates the code is the same defect
 * in both directions.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string, base: URL = root): string =>
  readFileSync(new URL(path, base), "utf8");

/** The runtime the workspace installs, from the package catalogue. */
const pinnedRuntime = (): string => {
  const manifest: unknown = JSON.parse(read("package.json"));
  const catalog =
    typeof manifest === "object" &&
    manifest !== null &&
    "workspaces" in manifest
      ? manifest.workspaces
      : undefined;
  const versions =
    typeof catalog === "object" && catalog !== null && "catalog" in catalog
      ? catalog.catalog
      : undefined;
  const version =
    typeof versions === "object" &&
    versions !== null &&
    "@gpuix/native" in versions
      ? versions["@gpuix/native"]
      : undefined;
  return typeof version === "string" ? version : "";
};

interface CuratedPage {
  readonly file: string;
  /** The row in `COMPONENTS.md` this component's status comes from. */
  readonly row: string;
  /** The native suite that proves it, when the page prints a test count. */
  readonly suite?: string;
  /** The source the page's Dependencies table describes. */
  readonly source: string;
  /**
   * The package page this curated page displaces.
   *
   * A docs page is served at one URL, so a curated page whose name matches a
   * package page wins it: the package page is unreachable. Anything only the
   * package page documented is then documented nowhere on the site — which is
   * how `DropdownMenuCheckboxItem`'s two required props went missing.
   */
  readonly shadowed?: string;
}

const pages: ReadonlyArray<CuratedPage> = [
  {
    file: "button.mdx",
    row: "Buttons",
    source: "packages/primitives/src/components/Button.tsx",
  },
  {
    file: "card.mdx",
    row: "Cards",
    suite: "packages/components/src/behaviour/card.test.tsx",
    shadowed: "packages/components/docs/card.mdx",
    source: "packages/components/src/card.tsx",
  },
  {
    file: "command-menu.mdx",
    row: "Command menus",
    suite: "packages/components/src/behaviour/command-menu.test.tsx",
    shadowed: "packages/components/docs/command-menu.mdx",
    source: "packages/components/src/command-menu.tsx",
  },
  {
    file: "dialog.mdx",
    row: "Dialogs",
    suite: "packages/components/src/behaviour/dialog.test.tsx",
    shadowed: "packages/components/docs/dialog.mdx",
    source: "packages/components/src/dialog.tsx",
  },
  {
    file: "dropdown-menu.mdx",
    row: "Dropdown menus",
    suite: "packages/components/src/behaviour/dropdown-menu.test.tsx",
    shadowed: "packages/components/docs/dropdown-menu.mdx",
    source: "packages/components/src/dropdown-menu.tsx",
  },
  {
    file: "popover.mdx",
    row: "Popovers",
    suite: "packages/components/src/behaviour/popover.test.tsx",
    shadowed: "packages/components/docs/popover.mdx",
    source: "packages/components/src/popover.tsx",
  },
  {
    file: "tabs.mdx",
    row: "Tabs",
    suite: "packages/components/src/behaviour/tabs.test.tsx",
    shadowed: "packages/components/docs/tabs.mdx",
    source: "packages/components/src/tabs.tsx",
  },
];

const body = (page: CuratedPage): string =>
  read(`apps/docs/content/docs/components/${page.file}`);

/** The `## Status` section, which is where a page makes its claims. */
const status = (page: CuratedPage): string => {
  const text = body(page);
  const start = text.indexOf("## Status");
  return start === -1 ? "" : text.slice(start);
};

/** Every `it(` in a suite file: the native cases the page counts. */
const nativeCases = (suite: string): number =>
  (read(suite).match(/\bit\(/g) ?? []).length;

/** The `## Dependencies` table's package cells. */
const dependencies = (page: CuratedPage): ReadonlyArray<string> => {
  const text = body(page);
  const start = text.indexOf("## Dependencies");
  if (start === -1) return [];
  const end = text.indexOf("\n## ", start + 1);
  const section = text.slice(start, end === -1 ? undefined : end);

  return section
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .flatMap((line) => {
      const cell = line.replace(/^\|/, "").split("|")[0]?.trim();
      return cell === undefined || cell === "Package" || cell.startsWith("---")
        ? []
        : [cell.replace(/`/g, "")];
    });
};

/**
 * Every package a source imports. A relative import is this package's own code
 * (the table's `this package` row), `react` is a peer every component shares,
 * and an `effect` subpath is the `effect` package the table names.
 */
const importedPackages = (source: string): ReadonlyArray<string> =>
  [...source.matchAll(/(?:from\s+|import\s+)"([^"]+)"/g)]
    .flatMap((match) => (match[1] === undefined ? [] : [match[1]]))
    .filter(
      (specifier) =>
        !specifier.startsWith(".") &&
        !specifier.startsWith("node:") &&
        specifier !== "react" &&
        specifier !== "react-dom" &&
        specifier !== "react/jsx-runtime",
    )
    .map((specifier) =>
      specifier.startsWith("effect/") ? "effect" : specifier,
    )
    .filter((specifier, index, all) => all.indexOf(specifier) === index);

describe("the curated component pages", () => {
  it("name the runtime version their gaps were measured on", () => {
    const pinned = pinnedRuntime();

    expect(pinned).not.toBe("");
    expect(
      pages.filter((page) => !body(page).includes(`@gpuix/native@${pinned}`)),
    ).toEqual([]);
  });

  it("cite no version other than the pinned runtime", () => {
    const pinned = pinnedRuntime();
    const stale = pages.flatMap((page) =>
      [...body(page).matchAll(/\b(\d+\.\d+\.\d+)\b/g)]
        .flatMap((match) => (match[1] === undefined ? [] : [match[1]]))
        .filter((version) => version !== pinned)
        .map((version) => `${page.file}: ${version}`),
    );

    expect(stale).toEqual([]);
  });

  it("print the number of native cases their suite runs", () => {
    const wrong = pages.flatMap((page) => {
      if (page.suite === undefined) return [];
      const printed = /(\d+) native/.exec(status(page))?.[1];
      return printed === String(nativeCases(page.suite))
        ? []
        : [
            `${page.file}: says ${printed ?? "nothing"}, suite runs ${nativeCases(page.suite)}`,
          ];
    });

    expect(wrong).toEqual([]);
  });

  it("describe the selected surface the source paints", () => {
    // The Tabs page said selection was "painted per trigger", that the native
    // side had "no measured overlay", and that the surface "jumps between
    // triggers" — all three after `tabs-indicator` shipped as one measured,
    // sliding surface. The test count and the status cannot see a claim like
    // that, so the description is derived from the source and from the motion
    // package instead of trusted.
    const tabs = pages.find((page) => page.file === "tabs.mdx");
    expect(tabs, "the tabs page is not in the curated set").toBeDefined();
    if (tabs === undefined) return;

    const source = read(tabs.source);
    expect(source).toContain('testId="tabs-indicator"');
    expect(source).toContain("motion={{");
    expect(source).toContain("backgroundColor: theme.colors.selected");

    const level = /useSurfaceTiming\("([a-z]+)"\)/.exec(source)?.[1];
    expect(
      level,
      "tabs.tsx no longer names its surface timing level",
    ).toBeDefined();
    const duration = new RegExp(`\\b${level}\\b:\\s*(\\d+)`).exec(
      read("packages/motion/src/timing.ts"),
    )?.[1];
    expect(duration, `motionLevels has no ${level}`).toBeDefined();

    const text = body(tabs).replace(/\s+/g, " ");
    expect(text).not.toContain("painted per trigger");
    expect(text).not.toContain("no measured overlay");
    expect(text).not.toContain("jumps between");
    expect(text).toContain("`tabs-indicator`");
    expect(text).toContain("slides");
    expect(text).toContain(`\`${level}\`, ${duration} ms`);
  });

  it("hold the pill's colour role to the palette that forced it", () => {
    // The page says the pill paints `selected` rather than `card` because
    // `card` equals the rail's `background` in the high-contrast light theme.
    // If that palette moves, every other check stays green while the page
    // teaches a decision whose cause is gone.
    const ratio = contrastRatio(
      highContrastLightColors.card,
      highContrastLightColors.background,
    );
    expect(ratio, "the high-contrast light cards do not paint").toBeDefined();

    const tabs = pages.find((page) => page.file === "tabs.mdx");
    expect(tabs, "the tabs page is not in the curated set").toBeDefined();
    if (tabs === undefined) return;

    const text = body(tabs).replace(/\s+/g, " ");
    expect(text).toContain(
      "`card` equals the rail's `background` in the high-contrast light theme",
    );
    expect(text).toContain(`(${ratio?.toFixed(2)}:1)`);
  });

  it("derive a link's paint from the brand-text the registry registers", () => {
    // The page taught that `link` paints "the primary role". It does not: a
    // `primary` is a fill chosen to carry `primaryForeground`, and as text it is
    // under the 4.5:1 floor on most styles (4.30:1 on the base light theme's
    // pressed wash, 3.10:1 in macOS dark), so the primitives register
    // `text-brand` and the link paints `brandText(theme)`. A reader who tuned
    // `primary` for links would not get the colour the page promised.
    const button = pages.find((page) => page.file === "button.mdx");
    expect(button, "the button page is not in the curated set").toBeDefined();
    if (button === undefined) return;

    expect(read("packages/primitives/src/recipe/registry.ts")).toContain(
      '"text-brand": (theme) => ({ color: brandText(theme) })',
    );

    const text = body(button).replace(/\s+/g, " ");
    expect(text).toContain("`brandText(theme)`");
    expect(text).not.toContain("text in the primary role");
    expect(text).not.toContain("| `link` | `primary` |");
  });

  it("describe the card's edge, lift and fixed metrics", () => {
    // The package page the curated page replaces said the outline edge was the
    // `border` role, the elevated card painted `elevation.md`, and colour,
    // spacing, radius and type all came from the theme. The recipe says
    // otherwise: the outline edge is `border-input`, elevated is `shadow-sm`
    // (which the registry maps to `elevation.sm`), and `components` compiles
    // against the default registry's fixed metrics (ADR 0006) — so a platform
    // switch repaints a card and does not reshape it. Reading the recipe here
    // means the page and the compiled surface cannot disagree.
    const card = pages.find((page) => page.file === "card.mdx");
    expect(card, "the card page is not in the curated set").toBeDefined();
    if (card === undefined) return;

    const recipes = read("packages/tw/src/recipes.ts");
    const block =
      /export const CARD_VARIANTS = \{([\s\S]*?)\} as const;/.exec(
        recipes,
      )?.[1] ?? "";
    const variants = new Map(
      [...block.matchAll(/^\s*(\w+):\s*"([^"]*)",?$/gm)].map((match) => [
        match[1] ?? "",
        match[2] ?? "",
      ]),
    );

    expect(variants.get("outline")).toBe("border border-input");
    expect(variants.get("plain")).toBe("");

    const utility = /shadow-([a-z]+)/.exec(variants.get("elevated") ?? "")?.[1];
    expect(utility, "the elevated card paints no shadow").toBeDefined();

    const utilities = read("packages/tw/src/utilities.ts");
    const mapped = new RegExp(`\\b${utility ?? ""}:\\s*"([a-z]+)"`).exec(
      utilities,
    )?.[1];
    const level = (["sm", "md", "lg"] as const).find(
      (candidate) => candidate === mapped,
    );
    expect(
      level,
      `the registry maps shadow-${utility ?? ""} to ${mapped ?? "nothing"}`,
    ).toBeDefined();
    if (level === undefined) return;

    const shadow = elevationShadow(lightTheme, level);
    expect(shadow, `elevation.${level} paints no shadow`).toBeDefined();
    if (shadow === undefined) return;

    const radiusBlock =
      /const RADIUS: Readonly<Record<string, number>> = \{([\s\S]*?)\};/.exec(
        utilities,
      )?.[1] ?? "";
    const radius = /^\s*lg: (\d+),$/m.exec(radiusBlock)?.[1];
    expect(radius, "the fixed registry has no lg radius").toBeDefined();

    // The seam the card compiles through: fixed metrics, not theme density.
    const seam = read("packages/components/src/internal/recipe.ts");
    expect(seam).toContain("shadcn's fixed metrics");
    expect(seam).toMatch(/\*\*default\*\* registry/);

    const text = body(card).replace(/\s+/g, " ");
    expect(text).toContain("`input`");
    expect(text).toContain(`\`elevation.${level}\``);
    expect(text).toContain(`${shadow.offsetY}px offset`);
    expect(text).toContain(`${shadow.blurRadius}px blur`);
    expect(text).toContain(`${radius ?? ""}px`);
    expect(text).toContain("default registry");

    // The retracted claims: the package page taught a role and a lift the
    // recipe does not paint.
    expect(text).not.toContain("elevation.md");
    expect(text).not.toContain("radius.lg");
  });

  it("describe the two shadows the overlay surfaces paint", () => {
    // `@gpuixui/tw` writes `shadow-*` and `ring-*` through the one `boxShadow`
    // slot and applies the ring after the utilities, so a compiled overlay
    // recipe is a 1px `foreground` ring at 5% and **no lift**. The runtime
    // paints a shadow list, and `overlaySurfaceStyle` restores the theme's level
    // beside that edge — so the four curated overlay pages state two shadows,
    // and they taught "no lift" after the seam landed. The level is read from
    // the component that names it, so a page cannot describe a different one.
    const recipes = read("packages/tw/src/recipes.ts");
    const recipe = (name: string): string =>
      new RegExp(`export const ${name} =\\s*\\n?\\s*"([^"]+)"`).exec(
        recipes,
      )?.[1] ?? "";

    const premises = ["DIALOG_CONTENT", "POPOVER_CONTENT", "MENU_CONTENT"].map(
      (name) => {
        const value = recipe(name);
        return {
          name,
          named: value !== "",
          ringWins: value.lastIndexOf("ring-1") > value.indexOf("shadow-"),
        };
      },
    );
    expect(
      premises
        .filter((premise) => !premise.named)
        .map((premise) => premise.name),
      "the recipe table lost an overlay surface",
    ).toEqual([]);
    expect(
      premises.filter((premise) => !premise.ringWins).map((p) => p.name),
      "the recipe paints its elevation because the ring no longer comes last",
    ).toEqual([]);

    // The seam that puts the level back, and the components that name one.
    const seam = read("packages/components/src/internal/overlay.ts");
    expect(seam, "the overlay seam lost its elevation argument").toContain(
      "elevation?: ElevationLevel",
    );
    expect(
      seam,
      "the seam stopped restoring the level beside the edge",
    ).toContain("boxShadow: [shadow, ...painted]");

    const passedLevel = (source: string, surface: string): string => {
      const flat = source.replace(/\s+/g, " ");
      return (
        new RegExp(`overlaySurfaceStyle\\(${surface},[^()]*?"(sm|md|lg)"`).exec(
          flat,
        )?.[1] ?? ""
      );
    };

    const surfaces = [
      {
        file: "dialog.mdx",
        source: "packages/components/src/dialog.tsx",
        surface: "DIALOG_CONTENT",
      },
      {
        file: "popover.mdx",
        source: "packages/components/src/popover.tsx",
        surface: "POPOVER_CONTENT",
      },
      {
        file: "dropdown-menu.mdx",
        source: "packages/components/src/menu/surface.tsx",
        surface: "MENU_CONTENT",
      },
      {
        // The palette is the dialog's surface, so the level is the dialog's too.
        file: "command-menu.mdx",
        source: "packages/components/src/dialog.tsx",
        surface: "DIALOG_CONTENT",
      },
    ];

    const overlay = (file: string): string =>
      read(`apps/docs/content/docs/components/${file}`).replace(/\s+/g, " ");

    const unnamed = surfaces
      .filter(
        ({ source, surface }) => passedLevel(read(source), surface) === "",
      )
      .map(({ source, surface }) => `${source} names no level for ${surface}`);
    expect(unnamed, "an overlay surface paints no elevation level").toEqual([]);

    const stale = surfaces
      .filter(({ file, source, surface }) => {
        const level = passedLevel(read(source), surface);
        const page = overlay(file);
        return (
          page.includes(`elevation.${level}`) === false ||
          page.includes("has no lift") ||
          page.includes("elevation step")
        );
      })
      .map(({ file, source, surface }) => {
        const level = passedLevel(read(source), surface);
        return `${file}: does not state the theme's elevation.${level} that ${surface} paints`;
      });
    expect(stale).toEqual([]);

    expect(overlay("popover.mdx")).not.toContain("10% in the dark theme");
    expect(overlay("popover.mdx")).toContain("keyboardRing(theme)");
  });

  it("agree with the inventory row for the component", () => {
    const disagreeing = pages.flatMap((page) => {
      const row = inventory.rows.find(
        (candidate) => candidate.name === page.row,
      );
      return row !== undefined && status(page).includes(row.status)
        ? []
        : [
            `${page.file}: says ${status(page).slice(0, 60)}…, inventory says ${row?.status ?? "no row"}`,
          ];
    });

    expect(disagreeing).toEqual([]);
  });

  it("state the runtime support verdict the inventory records", () => {
    // The status word was held to the inventory; the support verdict beside it
    // was not, so a page could drop `partial` and read as a component the
    // runtime covers whole — the one claim the strip exists to prevent. The
    // verdict is the first word of the cell (`partial`, `yes`, `?`); the rest
    // of the cell is the note the page's prose expands.
    const verdict = (support: string): string =>
      support.trim().split(/\s+/)[0] ?? "";

    const missing = pages.flatMap((page) => {
      const row = inventory.rows.find(
        (candidate) => candidate.name === page.row,
      );
      if (row === undefined) return [`${page.file}: no inventory row`];
      const word = verdict(row.support);
      return status(page).includes(`\`${word}\``)
        ? []
        : [
            `${page.file}: does not name the ${word} runtime verdict its inventory row records`,
          ];
    });

    // Floors: every curated page is read, and each verdict is a real word.
    expect(pages.length).toBeGreaterThanOrEqual(4);
    expect(missing).toEqual([]);
  });

  it("list every package the component imports", () => {
    const missing = pages.flatMap((page) => {
      const listed = dependencies(page);
      return importedPackages(read(page.source))
        .filter((specifier) => !listed.includes(specifier))
        .map(
          (specifier) =>
            `${page.file}: imports ${specifier}, which its Dependencies table does not list`,
        );
    });

    expect(missing).toEqual([]);
  });
});

/** Every `packages/<pkg>/docs/*.mdx` page the site mounts, as a repo path. */
const packagePageFiles = (): ReadonlyArray<string> =>
  packageCollections.flatMap((collection) =>
    readdirSync(new URL(`${collection.dir}/`, root))
      .filter((name) => name.endsWith(".mdx"))
      .map((name) => `${collection.dir}/${name}`),
  );

/** The `## API…` section of a page, as text: tables and the prose beside them. */
const apiSection = (text: string): string => {
  const start = text.search(/^## (API|Props)\b/m);
  if (start === -1) return "";
  const rest = text.slice(start);
  const end = rest.indexOf("\n## ", 1);
  return end === -1 ? rest : rest.slice(0, end);
};

describe("the page a curated page displaces", () => {
  it("names exactly the package pages whose URL the curated folder takes", () => {
    // The site serves one page per URL, so a curated page whose name matches a
    // package page displaces it: the package page is not mounted anywhere. A
    // curated page that forgot it (or a package page that landed on one) hides
    // a whole page rather than a paragraph, so the set is derived from the
    // files rather than kept in the fixture.
    const curated = pages.map((page) => ({
      file: page.file,
      url: pageUrl(`content/docs/components/${page.file}`),
    }));
    const displaced = packagePageFiles().filter((file) => {
      const url = pageUrl(file);
      return curated.some((page) => page.url !== undefined && page.url === url);
    });
    const named = pages.flatMap((page) =>
      page.shadowed === undefined ? [] : [page.shadowed],
    );

    expect(curated.filter((page) => page.url === undefined)).toEqual([]);
    expect(named.toSorted()).toEqual(displaced.toSorted());
  });

  it("documents every prop the displaced page documents", () => {
    // `DropdownMenuCheckboxItem` is a required `checked` and `onCheckedChange`
    // row with two defaults of its own, and the curated page documented neither
    // — nor `leading`/`trailing`/`closeOnSelect`, nor the alignment offset. The
    // package page that says so is the one the curated page displaces, so the
    // props were documented nowhere a reader of this site can reach. A prop
    // counts as documented when the page's API section names it as a word: a
    // backticked name, a `name?:` inside a declaration the page prints, and a
    // plain `Props` cell are all the API. This is a presence check, not a
    // signature one — the row's type and default are the page's to state.
    const gaps = pages.flatMap((page) => {
      if (page.shadowed === undefined) return [];
      const documented = apiSection(body(page)).replaceAll("`", "");
      const named = (prop: string): boolean =>
        new RegExp(`(^|[^A-Za-z0-9_$])${prop}([^A-Za-z0-9_$]|$)`).test(
          documented,
        );
      return propsOf(read(page.shadowed))
        .props.filter((prop) => !named(prop))
        .map(
          (prop) =>
            `${page.file}: the displaced ${page.shadowed} documents \`${prop}\`, this page does not`,
        );
    });

    // Floors: the displacement is read, and the props are read from both sides.
    expect(
      pages.filter((page) => page.shadowed !== undefined).length,
    ).toBeGreaterThanOrEqual(5);
    expect(
      pages.reduce(
        (count, page) =>
          page.shadowed === undefined
            ? count
            : count + propsOf(read(page.shadowed)).props.length,
        0,
      ),
    ).toBeGreaterThan(30);
    expect(gaps).toEqual([]);
  });
});
