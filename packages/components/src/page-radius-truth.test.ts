/**
 * The radius a page teaches, held to the painter that draws it.
 *
 * The bug these guard: `packages/components` compiles its resting appearance
 * from `@gpuixui/tw` against the registry's **fixed** shadcn scale (ADR 0006),
 * so a recipe's `rounded-md` is 6px on every platform — while nine pages still
 * said the part used the theme's `radius.md`/`radius.lg`/`radius.sm`, which a
 * platform style moves (Windows `md` is 4, macOS `lg` is 10). A reader who
 * tuned the role the page named repainted nothing; the Tabs page, for one,
 * taught `radius.md` for a rail whose `TABS_LIST` is `rounded-md`.
 *
 * The other direction is held too. Pagination is painted by the package's
 * `Button`, which is a translation of the primitives' action recipe: that
 * recipe names one radius utility, and the page must print the pixel corner it
 * compiles to rather than a theme role the registry never reads.
 *
 * The sweep is closed by the last case: every page whose `## Theming` names a
 * `radius.*` role must be declared here, so a new page cannot teach one
 * without saying which file reads it.
 *
 * `node:fs` is a test-time repository read, the boundary `docs.test.ts` and
 * `card-page.test.ts` already use.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { platformTheme } from "@gpuixui/tokens";
import {
  COMBOBOX_CONTENT,
  COMBOBOX_TRIGGER,
  DATE_PICKER_CONTENT,
  DATE_PICKER_TRIGGER,
  FIELD_INPUT,
  HOTKEY_RECORDER,
  HOTKEY_RECORDER_CLEAR,
  KEYCAP,
  MENTION_INPUT_FIELD,
  MENTION_INPUT_LIST,
  NAVIGATION_MENU_CONTENT,
  PREVIEW_CARD_CONTENT,
  TABS_LIST,
  TIME_PICKER_ROOT,
  TOAST_CARD,
  cn,
} from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import { recipeStyle } from "./internal/recipe.js";
import { darkTheme, lightTheme } from "./internal/theme.js";

const docsDirectory = fileURLToPath(new URL("../docs/", import.meta.url));
const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

/** One part a recipe compiles, and the corner it paints. */
interface FixedPart {
  /** How the page names the part, for a failure message. */
  readonly part: string;
  readonly recipe: string;
  /** The pixel corner the fixed registry compiles for that utility. */
  readonly pixels: number;
}

/** One part painted from the theme's radius group, and the file that reads it. */
interface ThemePart {
  readonly part: string;
  /** A source file under `src/`. */
  readonly file: string;
  readonly step: "sm" | "md" | "lg" | "xl";
}

/**
 * The radius utility the primitives' action recipe paints, read from its source.
 *
 * A page button is that action, so the corner comes from this one class and not
 * from a number a page may keep after the recipe moves. The components package
 * cannot import an unexported recipe constant, and the subpath publishes the
 * component rather than its classes, so the source is the boundary the painter
 * exposes — the same read this suite already does for a page's painter.
 */
const primitiveActionRadius = (): string => {
  const source = readFileSync(
    new URL("../../primitives/src/recipe/index.ts", import.meta.url),
    "utf8",
  );
  const base = /const BUTTON_BASE =\s*"([^"]*)"/.exec(source)?.[1];
  expect(
    base,
    "the primitives' action recipe is not BUTTON_BASE",
  ).toBeDefined();
  const radius = base === undefined ? undefined : /\brounded-[\w-]+/.exec(base);
  expect(radius?.[0], "BUTTON_BASE names no radius").toBeDefined();
  return radius?.[0] ?? "";
};

interface PageClaim {
  readonly page: string;
  readonly fixed: ReadonlyArray<FixedPart>;
  readonly theme?: ReadonlyArray<ThemePart>;
}

const claims: ReadonlyArray<PageClaim> = [
  {
    page: "combobox.mdx",
    fixed: [
      { part: "trigger", recipe: COMBOBOX_TRIGGER, pixels: 6 },
      { part: "popup", recipe: COMBOBOX_CONTENT, pixels: 6 },
    ],
  },
  {
    page: "command-menu.mdx",
    fixed: [],
    theme: [{ part: "surface", file: "command-menu.tsx", step: "md" }],
  },
  {
    page: "date-picker.mdx",
    fixed: [
      { part: "trigger", recipe: DATE_PICKER_TRIGGER, pixels: 6 },
      { part: "calendar surface", recipe: DATE_PICKER_CONTENT, pixels: 6 },
    ],
  },
  {
    page: "field.mdx",
    fixed: [{ part: "input", recipe: FIELD_INPUT, pixels: 6 }],
  },
  {
    page: "hotkey-recorder.mdx",
    fixed: [
      { part: "field", recipe: HOTKEY_RECORDER, pixels: 6 },
      { part: "clear control", recipe: HOTKEY_RECORDER_CLEAR, pixels: 4 },
    ],
  },
  {
    page: "keyboard-shortcuts.mdx",
    fixed: [{ part: "keycap", recipe: KEYCAP, pixels: 4 }],
  },
  {
    page: "mention-input.mdx",
    fixed: [
      { part: "field", recipe: MENTION_INPUT_FIELD, pixels: 6 },
      { part: "list", recipe: MENTION_INPUT_LIST, pixels: 6 },
    ],
  },
  {
    page: "navigation-menu.mdx",
    fixed: [{ part: "panel", recipe: NAVIGATION_MENU_CONTENT, pixels: 8 }],
  },
  {
    page: "pagination.mdx",
    fixed: [
      { part: "page button", recipe: primitiveActionRadius(), pixels: 6 },
    ],
  },
  {
    page: "preview-card.mdx",
    fixed: [{ part: "surface", recipe: PREVIEW_CARD_CONTENT, pixels: 8 }],
  },
  {
    page: "tabs.mdx",
    fixed: [{ part: "rail", recipe: TABS_LIST, pixels: 6 }],
  },
  {
    page: "time-picker.mdx",
    fixed: [{ part: "field group", recipe: TIME_PICKER_ROOT, pixels: 6 }],
  },
  {
    page: "toast.mdx",
    fixed: [{ part: "card", recipe: TOAST_CARD, pixels: 6 }],
  },
];

const pageText = (claim: PageClaim): string => read(`../docs/${claim.page}`);

/** A page's `## Theming` section, flattened for a prose assertion. */
const theming = (claim: PageClaim): string => {
  const text = pageText(claim);
  const start = text.indexOf("\n## Theming\n");
  expect(start, `${claim.page} has no Theming section`).toBeGreaterThanOrEqual(
    0,
  );
  const rest = text.slice(start + 1);
  const end = rest.indexOf("\n## ");
  return (end < 0 ? rest : rest.slice(0, end)).replace(/\s+/g, " ");
};

/** Every `radius.<step>` a page's Theming section names. */
const namedSteps = (claim: PageClaim): ReadonlyArray<string> =>
  Arr.flatMap(
    Arr.fromIterable(theming(claim).matchAll(/`radius\.(\w+)`/g)),
    (match) => (match[1] === undefined ? [] : [match[1]]),
  );

/** One page's Theming section, or `undefined` when the page has none. */
const sectionOf = (file: string): string | undefined => {
  const text = readFileSync(`${docsDirectory}${file}`, "utf8");
  const start = text.indexOf("\n## Theming\n");
  if (start < 0) return undefined;
  const rest = text.slice(start + 1);
  const end = rest.indexOf("\n## ");
  return end < 0 ? rest : rest.slice(0, end);
};

describe("the radius each page teaches", () => {
  it("paints a fixed part on the registry's step on every platform", () => {
    const mac = platformTheme(lightTheme, "darwin");
    const wrong = Arr.flatMap(claims, (claim) =>
      Arr.flatMap(claim.fixed, (part) => {
        const light = recipeStyle(cn(part.recipe), lightTheme).borderRadius;
        const dark = recipeStyle(cn(part.recipe), darkTheme).borderRadius;
        const macStyle = recipeStyle(cn(part.recipe), mac).borderRadius;
        return light === part.pixels &&
          dark === part.pixels &&
          macStyle === part.pixels
          ? []
          : [
              `${claim.page}: ${part.part} paints ${String(light)}/${String(dark)}/${String(macStyle)}, not ${part.pixels}`,
            ];
      }),
    );

    expect(wrong).toEqual([]);
  });

  it("names the fixed pixel corner, not the theme's radius group", () => {
    const wrong = Arr.flatMap(claims, (claim) => {
      const text = theming(claim);
      const declared = Arr.map(claim.theme ?? [], (part) => part.step);
      const stray = Arr.filter(
        namedSteps(claim),
        (step) => !Arr.contains(declared, step),
      );
      // A part whose pixel corner the page never prints is as wrong as a role
      // it should not name: the reader cannot find the number either way.
      const unprinted = Arr.filter(
        claim.fixed,
        (part) => !Str.includes(`${part.pixels}px`)(text),
      );
      return [
        ...Arr.map(stray, (step) => `${claim.page}: teaches radius.${step}`),
        ...Arr.map(
          unprinted,
          (part) => `${claim.page}: never prints ${part.part}'s pixel corner`,
        ),
      ];
    });

    expect(wrong).toEqual([]);
  });

  it("reads the theme's radius only where the painter does", () => {
    const wrong = Arr.flatMap(claims, (claim) =>
      Arr.filterMap(claim.theme ?? [], (part) => {
        const source = read(`./${part.file}`);
        return Str.includes(`theme.radius.${part.step}`)(source)
          ? Result.failVoid
          : Result.succeed(
              `${claim.page}: ${part.file} never reads theme.radius.${part.step}`,
            );
      }),
    );

    expect(wrong).toEqual([]);
  });

  it("declares every page whose Theming section names a radius role", () => {
    const pages = Arr.filter(
      Arr.fromIterable(readdirSync(docsDirectory)),
      (file) => Str.endsWith(".mdx")(file),
    );
    const undeclared = Arr.filter(pages, (file) => {
      const declared = Arr.some(claims, (entry) => entry.page === file);
      if (declared) return false;
      const section = sectionOf(file);
      return section !== undefined && /`radius\.(sm|md|lg|xl)`/.test(section);
    });

    expect(undeclared).toEqual([]);
  });
});
