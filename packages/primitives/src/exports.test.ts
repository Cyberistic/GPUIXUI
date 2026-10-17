/**
 * The package's own bar, enforced: every public component has a page, and every
 * page is indexed.
 *
 * MISSION requires code + test + example + docs page + inventory row for every
 * component, but nothing checked the docs half — a new export could ship with no
 * page and every gate stayed green (plan 074). This test reads the real package
 * root and the real `docs/` directory, so it fails by name.
 */

import { Effect, FileSystem, Path } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as R from "effect/Record";
import * as Str from "effect/String";
import * as Primitives from "./index.js";

/** Every public component, and the page that documents it. */
const PAGES: Readonly<Record<string, string>> = {
  Box: "box",
  Button: "button",
  ButtonGroup: "button-group",
  Checkbox: "checkbox",
  CheckboxGroup: "checkbox-group",
  Grid: "grid",
  InfoTip: "info-tip",
  Input: "input",
  Label: "label",
  Meter: "meter",
  NumberField: "number-field",
  OTPField: "otp-field",
  Progress: "progress",
  RadioGroup: "radio-group",
  RangeSlider: "range-slider",
  Rating: "rating",
  ScrollArea: "scroll-area",
  Select: "select",
  Separator: "separator",
  Skeleton: "skeleton",
  Slider: "slider",
  Spacer: "spacer",
  Spinner: "spinner",
  Stack: "stack",
  Switch: "switch",
  Text: "text",
  TextArea: "textarea",
  ThemeProvider: "theme-provider",
  Toggle: "toggle",
  ToggleGroup: "toggle-group",
  Tooltip: "tooltip",
};

/** Public PascalCase exports that are not components and own no page. */
const NOT_COMPONENTS: ReadonlyArray<string> = ["MissingThemeProviderError"];

const isPascalCase = (name: string): boolean =>
  /^[A-Z][A-Za-z0-9]*$/.test(name);

const componentNames = Arr.filter(R.keys(Primitives), isPascalCase);

const isKnown = (name: string): boolean =>
  R.has(PAGES, name) || Arr.contains(NOT_COMPONENTS, name);

const read = (relative: string) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    return yield* fileSystem.readFileString(
      path.join(import.meta.dirname, "..", relative),
    );
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

const readDocsIndex = () => read("docs/README.md");

const readPage = (slug: string) => read(`docs/${slug}.mdx`);

describe("public exports", () => {
  it("documents every component-shaped export or names it as not a component", () => {
    expect(Arr.filter(componentNames, (name) => !isKnown(name))).toStrictEqual(
      [],
    );
  });

  it("exports every documented component as a value", () => {
    const exported = R.keys(Primitives);
    const notExported = Arr.filter(
      R.keys(PAGES),
      (name) => !Arr.contains(exported, name),
    );
    expect(notExported).toStrictEqual([]);
  });
});

describe("documentation pages", () => {
  it("has a page for every component, with the documented frontmatter", async () => {
    const pages = await Effect.runPromise(
      Effect.forEach(R.keys(PAGES), (name) => readPage(PAGES[name] ?? name), {
        concurrency: 8,
      }),
    );
    const bad = Arr.filter(pages, (page) => !Str.includes("title:")(page));
    expect(bad).toStrictEqual([]);
    expect(
      Arr.filter(pages, (page) => !Str.includes("description:")(page)),
    ).toStrictEqual([]);
  });

  it("indexes every page in docs/README.md", async () => {
    const index = await Effect.runPromise(readDocsIndex());
    const missing = Arr.filter(
      R.values(PAGES),
      (slug) => !Str.includes(`](${slug}.mdx)`)(index),
    );
    expect(missing).toStrictEqual([]);
  });

  it("has no page that the docs index forgot", async () => {
    const pages = await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        return yield* fs.readDirectory(
          path.join(import.meta.dirname, "..", "docs"),
        );
      }).pipe(
        Effect.provide(NodeFileSystem.layer),
        Effect.provide(NodePath.layer),
      ),
    );
    const index = await Effect.runPromise(readDocsIndex());
    const unindexed = Arr.filter(
      pages,
      (file) =>
        Str.endsWith(".mdx")(file) &&
        file !== "README.md" &&
        !Str.includes(`](${file})`)(index),
    );
    expect(unindexed).toStrictEqual([]);
  });
});
