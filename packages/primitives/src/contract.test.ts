/**
 * The Tier 1 component API contract, enforced (plan 090).
 *
 * `docs/component-api.md` is the accepted Tier 1–2 public API spec (ADR 0004,
 * plan 200). The integration branch recorded this package's adoption as the one
 * open row. This suite is that adoption: one record per public component — its
 * part, its module, its page and the state types its `style` props accept —
 * plus the rules that can only be checked across the set: no implementation
 * seam in the package root, a real declaration for every advertised state type,
 * the documented page sections, and the verified ARIA subset only.
 *
 * The parts table is data, so a new component fails here until it is recorded.
 */

import { Effect, FileSystem, Path } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as R from "effect/Record";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import * as Primitives from "./index.js";

/** One public component: its module, page and the state types its props accept. */
interface Part {
  readonly name: string;
  readonly page: string;
  readonly states: ReadonlyArray<string>;
}

/** The Tier 1 row of the contract's parts table, one line per exported part. */
const PARTS: ReadonlyArray<Part> = [
  { name: "ThemeProvider", page: "theme-provider", states: [] },
  { name: "Box", page: "box", states: [] },
  { name: "Grid", page: "grid", states: [] },
  { name: "Stack", page: "stack", states: [] },
  { name: "Separator", page: "separator", states: [] },
  { name: "Spacer", page: "spacer", states: [] },
  { name: "ScrollArea", page: "scroll-area", states: ["ScrollAreaState"] },
  { name: "Text", page: "text", states: [] },
  { name: "Label", page: "label", states: ["LabelState"] },
  { name: "Button", page: "button", states: ["ButtonState"] },
  { name: "IconButton", page: "icon-button", states: ["ButtonState"] },
  { name: "ButtonGroup", page: "button-group", states: [] },
  { name: "Toggle", page: "toggle", states: ["ToggleState"] },
  {
    name: "ToggleGroup",
    page: "toggle-group",
    states: ["ToggleGroupState", "ToggleItemState"],
  },
  { name: "Input", page: "input", states: ["FieldState"] },
  { name: "TextArea", page: "textarea", states: ["FieldState"] },
  { name: "NumberField", page: "number-field", states: ["FieldState"] },
  {
    name: "OTPField",
    page: "otp-field",
    states: ["OTPFieldState", "OTPCellState"],
  },
  { name: "Checkbox", page: "checkbox", states: ["CheckboxState"] },
  {
    name: "CheckboxGroup",
    page: "checkbox-group",
    states: ["CheckboxGroupState", "CheckboxRowState"],
  },
  {
    name: "RadioGroup",
    page: "radio-group",
    states: ["RadioGroupState", "RadioOptionState"],
  },
  { name: "Switch", page: "switch", states: ["SwitchState"] },
  { name: "Progress", page: "progress", states: [] },
  { name: "Meter", page: "meter", states: [] },
  {
    name: "Rating",
    page: "rating",
    states: ["RatingState", "RatingStarState"],
  },
  {
    name: "Slider",
    page: "slider",
    states: ["SliderState", "SliderThumbState"],
  },
  {
    name: "RangeSlider",
    page: "range-slider",
    states: ["RangeSliderState", "RangeSliderThumbState"],
  },
  { name: "Skeleton", page: "skeleton", states: [] },
  { name: "Spinner", page: "spinner", states: [] },
  {
    name: "Select",
    page: "select",
    states: ["SelectState", "SelectTriggerState"],
  },
  { name: "Tooltip", page: "tooltip", states: [] },
  { name: "InfoTip", page: "info-tip", states: [] },
];

/** Public PascalCase exports that are not components (plan 074's own allowlist). */
const NON_PARTS: ReadonlyArray<string> = ["MissingThemeProviderError"];

/** The API props `@gpuix/native` 0.10.0 maps (plan 020 §1.4, plan 203). */
const SUPPORTED_ARIA: ReadonlyArray<string> = [
  "aria-label",
  "aria-description",
  "aria-id",
  "aria-expanded",
  "aria-selected",
  "aria-valuetext",
  "aria-level",
];

/** The sections every component page must carry (plan 047's page contract). */
const REQUIRED_SECTIONS: ReadonlyArray<string> = [
  "## Usage",
  "## Keyboard",
  "## Accessibility",
  "## Theming",
  "## Limitations",
  "## Verification",
  "## Related",
];

/** A prop written as `name:` in an object or `name=` in JSX. */
const ARIA_PROP = /\b(aria-[a-z]+(?:-[a-z]+)*)\s*[:=]/g;

const isPascalCase = (name: string): boolean =>
  /^[A-Z][A-Za-z0-9]*$/.test(name);

/** A root export's value, looked up by a name read from the table. */
const exported = (name: string): Option.Option<unknown> =>
  Option.flatMap(
    Arr.findFirst(R.keys(Primitives), (key) => key === name),
    (key) => R.get(Primitives, key),
  );

const read = (relative: string) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    return yield* fileSystem.readFileString(
      path.join(import.meta.dirname, "..", relative),
    );
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

const readDir = (relative: string) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    return yield* fileSystem.readDirectory(
      path.join(import.meta.dirname, "..", relative),
    );
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

const readPage = (part: Part) => read(`docs/${part.page}.mdx`);

const readComponent = (file: string) => read(`src/components/${file}`);

/** Every `aria-*` prop in property position, with the line that wrote it. */
const ariaPropsIn = (
  file: string,
  body: string,
): ReadonlyArray<{
  readonly file: string;
  readonly line: number;
  readonly name: string;
}> =>
  Arr.flatMap(Str.split(body, "\n"), (line, index) =>
    Arr.map(
      Arr.filterMap(Array.from(line.matchAll(ARIA_PROP)), (match) =>
        Option.match(Option.fromNullishOr(match[1]), {
          onNone: () => Result.failVoid,
          onSome: Result.succeed,
        }),
      ),
      (name) => ({ file, line: index + 1, name }),
    ),
  );

const declares = (source: string, name: string): boolean =>
  new RegExp(`export (interface|type) ${name}\\b`).test(source);

describe("the part table", () => {
  it("records every public component", () => {
    const unrecorded = Arr.filter(
      Arr.filter(
        R.keys(Primitives),
        (name) => isPascalCase(name) && !Arr.contains(NON_PARTS, name),
      ),
      (name) => !Arr.some(PARTS, (part) => part.name === name),
    );
    expect(unrecorded).toStrictEqual([]);
  });

  it("exports every recorded part as a component", () => {
    const missing = Arr.filter(PARTS, (part) =>
      Option.match(exported(part.name), {
        onNone: () => true,
        onSome: (value) => !P.isFunction(value),
      }),
    );
    expect(Arr.map(missing, (part) => part.name)).toStrictEqual([]);
  });

  it("keeps implementation seams out of the package root", () => {
    const seams = Arr.filter(
      R.keys(Primitives),
      (name) => /^render[A-Z]/.test(name) || /[a-z]Parts$/.test(name),
    );
    expect(seams).toStrictEqual([]);
  });
});

describe("state types", () => {
  it("declares every advertised state type in a component module", async () => {
    const files = await Effect.runPromise(readDir("src/components"));
    const sources = await Effect.runPromise(
      Effect.forEach(
        Arr.filter(files, Str.endsWith(".tsx")),
        (file) => Effect.map(readComponent(file), (body) => ({ file, body })),
        { concurrency: 8 },
      ),
    );
    const missing = Arr.flatMap(PARTS, (part) =>
      Arr.filter(
        part.states,
        (state) => !Arr.some(sources, (source) => declares(source.body, state)),
      ).map((state) => `${part.name}: no declaration for ${state}`),
    );
    expect(missing).toStrictEqual([]);
  });

  it("names each state type on the page that documents the part", async () => {
    const pages = await Effect.runPromise(
      Effect.forEach(PARTS, readPage, { concurrency: 8 }),
    );
    const missing = Arr.flatMap(PARTS, (part, index) =>
      Arr.filter(
        part.states,
        (state) => !Str.includes(state)(pages[index] ?? ""),
      ).map((state) => `${part.page}.mdx does not name ${state}`),
    );
    expect(missing).toStrictEqual([]);
  });
});

describe("the documented page contract", () => {
  it("carries the sections every component page promises", async () => {
    const pages = await Effect.runPromise(
      Effect.forEach(PARTS, readPage, { concurrency: 8 }),
    );
    const missing = Arr.flatMap(PARTS, (part, index) => {
      const page = pages[index] ?? "";
      const sections = Arr.filter(
        REQUIRED_SECTIONS,
        (heading) => !Str.includes(heading)(page),
      );
      const props =
        Str.includes("## API")(page) || Str.includes("## Variants")(page)
          ? []
          : ["## API or ## Variants"];
      return Arr.map(
        Arr.appendAll(sections, props),
        (heading) => `${part.page}.mdx: ${heading}`,
      );
    });
    expect(missing).toStrictEqual([]);
  });
});

describe("the accessibility subset", () => {
  it("emits only the ARIA props the runtime maps", async () => {
    const files = await Effect.runPromise(readDir("src/components"));
    const bodies = await Effect.runPromise(
      Effect.forEach(
        Arr.filter(files, Str.endsWith(".tsx")),
        (file) => Effect.map(readComponent(file), (body) => ({ file, body })),
        { concurrency: 8 },
      ),
    );
    const unsupported = Arr.flatMap(bodies, ({ file, body }) =>
      Arr.filter(
        ariaPropsIn(file, body),
        (prop) => !Arr.contains(SUPPORTED_ARIA, prop.name),
      ).map((prop) => `${prop.file}:${prop.line} ${prop.name}`),
    );
    expect(unsupported).toStrictEqual([]);
  });
});
