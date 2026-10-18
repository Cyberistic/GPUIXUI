/**
 * The Tier 1 component API contract, enforced (plan 090).
 *
 * `docs/component-api.md` is the accepted Tier 1–2 public API spec (ADR 0004,
 * plan 200). The integration branch recorded this package's adoption as the one
 * open row. This suite is that adoption: one record per public component — its
 * part, its module, its page and the state types its `style` props accept —
 * plus the rules that can only be checked across the set: no implementation
 * seam in the package root, a real declaration for every advertised state type,
 * the documented page sections, an API table that names every prop the part
 * declares, and the verified ARIA subset only.
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
  "## API",
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
      return Arr.map(sections, (heading) => `${part.page}.mdx: ${heading}`);
    });
    expect(missing).toStrictEqual([]);
  });
});

/**
 * One exported type declaration the prop resolver can follow.
 *
 * Only the two shapes the package's props types use are modelled: an interface
 * with an optional `extends` clause, and a type alias whose assignment may be a
 * union, an `Omit<…>` intersection, an object literal, or a reference.
 */
interface Declaration {
  readonly kind: "interface" | "type";
  /** An interface's `extends` clause, without the keyword; empty for an alias. */
  readonly inherits: string;
  /** An interface's body, or a type alias's assignment. */
  readonly body: string;
}

/** The text between the `{` at `open` and the brace that closes it. */
const braceBody = (source: string, open: number): string => {
  const close = (index: number, depth: number): number => {
    const char = source[index];
    if (char === undefined) return source.length;
    if (char === "}") return depth === 1 ? index : close(index + 1, depth - 1);
    return close(index + 1, char === "{" ? depth + 1 : depth);
  };
  return source.slice(open + 1, close(open + 1, 1));
};

/** A type alias's right-hand side, up to the `;` at brace depth zero. */
const aliasBody = (source: string, from: number): string => {
  const close = (index: number, depth: number): number => {
    const char = source[index];
    if (char === undefined) return source.length;
    if (char === ";" && depth === 0) return index;
    return close(
      index + 1,
      char === "{" ? depth + 1 : char === "}" ? depth - 1 : depth,
    );
  };
  return source.slice(from, close(from, 0));
};

/** The declaration that starts at `header`: an interface body or an alias. */
const declarationAt = (
  source: string,
  kind: string,
  header: number,
): Declaration =>
  kind === "interface"
    ? (() => {
        const open = source.indexOf("{", header);
        return {
          kind: "interface",
          inherits: Str.replace(
            /^\s*extends\s*/,
            "",
          )(source.slice(header, open)),
          body: braceBody(source, open),
        };
      })()
    : {
        kind: "type",
        inherits: "",
        body: aliasBody(source, source.indexOf("=", header) + 1),
      };

/** Every exported type declaration in one source file, in source order. */
const declarationsIn = (
  source: string,
): ReadonlyArray<readonly [string, Declaration]> =>
  Arr.flatMap(
    Array.from(source.matchAll(/^(?:export )?(interface|type) (\w+)/gm)),
    (match) => {
      const name = match[2];
      if (name === undefined) return [];
      const header = (match.index ?? 0) + (match[0]?.length ?? 0);
      return [[name, declarationAt(source, match[1] ?? "", header)] as const];
    },
  );

/** A public prop declared on its own line at interface depth, quoted or not. */
const PROP_FIELD = /^ {2}(?:readonly\s+)?(?:"([^"]+)"|([A-Za-z][\w-]*))\??:/;

/** The field names a declaration body lists, in source order. */
const fieldsIn = (body: string): ReadonlyArray<string> =>
  Arr.getSomes(
    Arr.map(Str.split(body, "\n"), (line) => {
      const match = PROP_FIELD.exec(line);
      return Option.fromNullishOr(match?.[1] ?? match?.[2]);
    }),
  );

/** The props a `Pick<Props, "a" | "b">` alias names. */
const pickNamesIn = (body: string): ReadonlyArray<string> =>
  Arr.flatMap(
    Array.from(Str.trim(body).matchAll(/^Pick<[^,]+,([\s\S]+)>$/g)),
    (match) =>
      Arr.getSomes(
        Arr.map(Array.from((match[1] ?? "").matchAll(/"([^"]+)"/g)), (quoted) =>
          Option.fromNullishOr(quoted[1]),
        ),
      ),
  );

/**
 * The props a type declares, following aliases, unions and `Omit`.
 *
 * A base interface is followed too, except `TriggerHandlers`: the slot contract
 * is one thing documented once on the Button/Tooltip pages, not nine rows on
 * every control. `children` is composition, so the caller exempts it.
 */
const ownProps = (
  index: Readonly<Record<string, Declaration>>,
  name: string,
  seen: ReadonlyArray<string> = [],
): ReadonlyArray<string> => {
  if (Arr.contains(seen, name)) return [];
  const declaration = Option.getOrUndefined(R.get(index, name));
  if (declaration === undefined) return [];
  const next = Arr.append(seen, name);
  if (declaration.kind === "interface") {
    const own = fieldsIn(declaration.body);
    if (Str.includes("Omit<")(declaration.inherits)) return own;
    const bases = Arr.filter(
      Arr.map(Str.split(declaration.inherits, ","), Str.trim),
      Str.isNonEmpty,
    );
    return Arr.appendAll(
      own,
      Arr.flatMap(bases, (base) =>
        base === "TriggerHandlers" ? [] : ownProps(index, base, next),
      ),
    );
  }
  const assignment = Str.trim(declaration.body);
  if (!Str.includes("{")(assignment) && Str.includes("|")(assignment)) {
    const parts: ReadonlyArray<string> = Arr.filter(
      Str.split(assignment, "|"),
      (value: string) => Str.isNonEmpty(value),
    );
    return Arr.flatMap(parts, (part) => ownProps(index, Str.trim(part), next));
  }
  const omitted = /^Omit<(\w+),\s*([^>]+)>/.exec(assignment);
  if (omitted !== null) {
    const kept = Arr.filter(
      ownProps(index, omitted[1] ?? "", next),
      (prop) => !Str.includes(prop)(omitted[2] ?? ""),
    );
    const rest = Str.trim(
      Str.replace(/^&\s*/, "")(assignment.slice(omitted[0].length)),
    );
    return Arr.appendAll(
      kept,
      Str.startsWith("{")(rest)
        ? fieldsIn(braceBody(rest, 0))
        : ownProps(index, rest, next),
    );
  }
  return Str.startsWith("{")(assignment)
    ? fieldsIn(braceBody(assignment, 0))
    : ownProps(index, assignment, next);
};

/** The body of a level-two section, without its heading. */
const section = (markdown: string, heading: string): string => {
  const start = markdown.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const body = markdown.slice(start + heading.length + 3);
  const end = body.indexOf("\n## ");
  return end === -1 ? body : body.slice(0, end);
};

/** The first-cell prop names of every Markdown table row. */
const tableKeys = (markdown: string): ReadonlyArray<string> =>
  Arr.flatMap(Str.split(markdown, "\n"), (line) =>
    Option.match(Option.fromNullishOr(/^\| ([^|]+) \|/.exec(line)?.[1]), {
      onNone: () => [],
      onSome: (cell) =>
        Arr.map(Array.from(cell.matchAll(/`([^`]+)`/g)), (match) =>
          Str.trim(match[1] ?? ""),
        ),
    }),
  );

/** Every prop name an API section states: table rows and prose code spans. */
const documentedNames = (api: string): ReadonlyArray<string> => {
  const prose = Arr.filter(
    Str.split(api, "\n"),
    (line) => !Str.startsWith("|")(line),
  );
  const spans = Arr.flatMap(prose, (line) =>
    Arr.map(Array.from(line.matchAll(/`([^`]+)`/g)), (match) => match[1] ?? ""),
  );
  return Arr.appendAll(tableKeys(api), spans);
};

/** One source file read from the package. */
interface SourceFile {
  readonly file: string;
  readonly source: string;
}

/** Every non-test source file under `src/components` and `src/core`. */
const sourceFiles = () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = path.join(import.meta.dirname, "..");
    const dirs = ["src/components", "src/core"];
    const listed = yield* Effect.forEach(
      dirs,
      (dir) =>
        Effect.map(fs.readDirectory(path.join(root, dir)), (entries) =>
          Arr.map(entries, (entry) => ({ dir, file: entry })),
        ),
      { concurrency: 2 },
    );
    const selected = Arr.filter(
      Arr.flatten(listed),
      ({ file }) => /\.(ts|tsx)$/.test(file) && !/\.test\.tsx?$/.test(file),
    );
    return yield* Effect.forEach(
      selected,
      ({ dir, file }) =>
        Effect.map(fs.readFileString(path.join(root, dir, file)), (source) => ({
          file: `${dir}/${file}`,
          source,
        })),
      { concurrency: 8 },
    );
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

/** The declaration index, keyed by exported type name. */
const declarationIndex = (files: ReadonlyArray<SourceFile>) =>
  R.fromEntries(
    Arr.flatten(Arr.map(files, ({ source }) => declarationsIn(source))),
  );

describe("the API sections", () => {
  it("documents every prop each part declares", async () => {
    const index = declarationIndex(await Effect.runPromise(sourceFiles()));
    const pages = await Effect.runPromise(
      Effect.forEach(PARTS, readPage, { concurrency: 8 }),
    );
    const missing = Arr.flatMap(PARTS, (part, position) => {
      const declared = R.get(index, `${part.name}Props`);
      if (Option.isNone(declared)) {
        return [`${part.name}Props: no declaration in src/components`];
      }
      const documented = documentedNames(section(pages[position] ?? "", "API"));
      return Arr.filter(
        ownProps(index, `${part.name}Props`),
        (prop) => prop !== "children" && !Arr.contains(documented, prop),
      ).map((prop) => `${part.page}.mdx: ${part.name}.${prop}`);
    });
    expect(missing).toStrictEqual([]);
  });

  it("names only props that exist", async () => {
    const index = declarationIndex(await Effect.runPromise(sourceFiles()));
    const known = Arr.reduce(
      R.values(index),
      [] as ReadonlyArray<string>,
      (names, declaration) =>
        Arr.appendAll(
          Arr.appendAll(names, fieldsIn(declaration.body)),
          pickNamesIn(declaration.body),
        ),
    );
    const pages = await Effect.runPromise(
      Effect.forEach(PARTS, readPage, { concurrency: 8 }),
    );
    const unknown = Arr.flatMap(PARTS, (part, position) =>
      Arr.filter(
        tableKeys(section(pages[position] ?? "", "API")),
        (key) => !Arr.contains(known, key),
      ).map((key) => `${part.page}.mdx: ${key}`),
    );
    expect(unknown).toStrictEqual([]);
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
