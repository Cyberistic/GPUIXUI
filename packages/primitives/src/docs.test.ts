import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Source } from "@gpuixui/testing";
import { lightTheme } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import * as primitives from "./index.js";
import { inventory } from "./inventory.js";
import { textAlignValue, TEXT_TONES } from "./core/style.js";
import { renderText } from "./components/Text.js";
import { hostProp } from "./components/testing/element.js";

const docsDir = new URL("../docs/", import.meta.url);
const repoRoot = new URL("../../../", import.meta.url);
const packageRoot = new URL("../", import.meta.url);

const read = (name: string): string =>
  readFileSync(fileURLToPath(new URL(name, docsDir)), "utf8");

const pages: ReadonlyArray<string> = Arr.filter(
  readdirSync(docsDir),
  Str.endsWith(".mdx"),
);

interface Section {
  readonly heading: string;
  readonly body: string;
}

const sections = (source: string): ReadonlyArray<Section> => {
  const lines = source.split("\n");
  const starts = Arr.filterMap(lines, (line, index) =>
    Str.startsWith("## ")(line) ? Result.succeed(index) : Result.failVoid,
  );

  return Arr.map(starts, (start, position) => ({
    heading: (lines[start] ?? "").slice("## ".length).trim(),
    body: lines
      .slice(start + 1, starts[position + 1] ?? lines.length)
      .join("\n")
      .trim(),
  }));
};

const bodyOf = (source: string, heading: string): Option.Option<string> =>
  Option.map(
    Arr.findFirst(sections(source), (section) => section.heading === heading),
    (section) => section.body,
  );

const probeRecord = (source: string, heading: string): string => {
  const marker = `### ${heading}`;
  const start = source.indexOf(marker);
  if (start < 0) return "";
  const rest = source.slice(start + marker.length);
  const end = rest.indexOf("\n### ");
  return end < 0 ? rest : rest.slice(0, end);
};

const documentedProps = (source: string): ReadonlyArray<string> =>
  Arr.flatMap(
    Option.getOrElse(bodyOf(source, "API"), () => "").split("\n"),
    (line) => {
      const cell = /^\|\s*([^|]*)/.exec(line)?.[1];
      return Arr.flatMap([...(cell ?? "").matchAll(/`([^`]+)`/g)], (match) =>
        Arr.filter(
          Arr.map((match[1] ?? "").split("/"), (name) => name.trim()),
          Str.isNonEmpty,
        ),
      );
    },
  );

const deniedProps = (source: string): ReadonlyArray<string> =>
  Arr.filterMap(
    [...source.matchAll(/[Tt]here is no `([^`]+)` prop/g)],
    (match) => Result.succeed(match[1] ?? ""),
  );

const firstCell = (line: string): string =>
  /^\|\s*([^|]*)/.exec(line)?.[1]?.trim() ?? "";

const rowNames = (line: string): ReadonlyArray<string> =>
  Arr.flatMap([...firstCell(line).matchAll(/`([^`]+)`/g)], (match) =>
    Arr.filter(Arr.map((match[1] ?? "").split("/"), Str.trim), Str.isNonEmpty),
  );

const propTableNames = (source: string): ReadonlyArray<string> => {
  interface Scan {
    readonly names: ReadonlyArray<string>;
    readonly inTable: boolean;
    readonly propTable: boolean;
    readonly header: boolean;
  }
  const start: Scan = {
    names: [],
    inTable: false,
    propTable: false,
    header: false,
  };
  return Arr.reduce(
    Option.getOrElse(bodyOf(source, "API"), () => "").split("\n"),
    start,
    (scan, line) => {
      if (!Str.startsWith("|")(line))
        return { ...scan, inTable: false, propTable: false, header: false };
      if (!scan.inTable)
        return {
          ...scan,
          inTable: true,
          propTable: firstCell(line) === "Prop",
          header: true,
        };

      if (scan.header) return { ...scan, header: false };
      return scan.propTable
        ? { ...scan, names: [...scan.names, ...rowNames(line)] }
        : scan;
    },
  ).names;
};

const RELATIVE_IMPORT = new RegExp('(?:from|import)\\s+"(\\.[^"]+)"', "g");

const resolveModule = (
  from: string,
  specifier: string,
): Option.Option<string> => {
  const base = fileURLToPath(
    new URL(Str.replace(/\.js$/, "")(specifier), pathToFileURL(from)),
  );
  return Option.map(
    Arr.findFirst([".ts", ".tsx"], (extension) =>
      existsSync(`${base}${extension}`),
    ),
    (extension) => `${base}${extension}`,
  );
};

const sourceClosure = (sources: ReadonlyArray<string>): string => {
  const visit = (
    file: string,
    seen: ReadonlySet<string>,
  ): ReadonlySet<string> =>
    seen.has(file)
      ? seen
      : Arr.reduce<RegExpMatchArray, ReadonlySet<string>>(
          Arr.fromIterable(
            readFileSync(file, "utf8").matchAll(RELATIVE_IMPORT),
          ),
          new Set([...seen, file]),
          (reached, match) =>
            Option.match(resolveModule(file, match[1] ?? ""), {
              onNone: () => reached,
              onSome: (next) => visit(next, reached),
            }),
        );
  const files = Arr.reduce<string, ReadonlySet<string>>(
    sources,
    new Set<string>(),
    (seen, source) => visit(fileURLToPath(new URL(source, packageRoot)), seen),
  );
  return Arr.join(
    Arr.map(Arr.fromIterable(files), (file) => readFileSync(file, "utf8")),
    "\n",
  );
};

const FORWARDED_HOST_PROPS = HashSet.fromIterable([
  "aria-expanded",
  "aria-selected",
]);

const declaresProp = (source: string, name: string): boolean => {
  const property = `(?:"${RegExp.escape(name)}"|${RegExp.escape(name)})`;
  return new RegExp(`(?:readonly\\s+${property}|${property}\\?)`).test(source);
};

const citedPlans = (source: string): ReadonlyArray<string> =>
  Arr.map(
    [...source.matchAll(/(?:\.agents\/slop\/)?plans\/[A-Za-z0-9._-]+\.md/g)],
    (match) => match[0],
  );

const planFile = (citation: string): string =>
  Str.startsWith(".agents/")(citation) ? citation : `.agents/slop/${citation}`;

const citedPlanNumbers = (source: string): ReadonlyArray<string> =>
  Arr.map(
    [...source.matchAll(/\bplans? (\d{3})\b/g)],
    (match) => match[1] ?? "",
  );

const existingPlanNumbers = (): HashSet.HashSet<string> =>
  HashSet.fromIterable(
    Arr.filterMap(
      readdirSync(fileURLToPath(new URL(".agents/slop/plans/", repoRoot)), {
        encoding: "utf8",
      }),
      (name) => {
        const match = /^(\d{3})-/.exec(name);
        return match === null
          ? Result.failVoid
          : Result.succeed(match[1] ?? "");
      },
    ),
  );

const TEXT_EXTENSIONS = [".ts", ".tsx", ".md", ".mdx"] as const;

const SKIPPED_DIRECTORIES = HashSet.fromIterable(["node_modules", "dist"]);

interface WorkstreamFile {
  readonly name: string;
  readonly source: string;
}

interface WorkstreamRoot {
  readonly prefix: string;
  readonly root: URL;
}

interface Scan {
  readonly entries: number;
  readonly files: ReadonlyArray<WorkstreamFile>;
}

interface Walk {
  readonly entries: number;
  readonly files: ReadonlyArray<{
    readonly name: string;
    readonly path: string;
  }>;
}

const WORKSTREAM_ROOTS: ReadonlyArray<WorkstreamRoot> = [
  { prefix: "packages/primitives/", root: packageRoot },
  { prefix: "packages/icons/", root: new URL("../../icons/", import.meta.url) },
];

const isTextFile = (name: string): boolean =>
  Arr.some(TEXT_EXTENSIONS, (extension) => Str.endsWith(extension)(name));

const walkTextFiles = (directory: string, relative = ""): Walk => {
  const entries = readdirSync(directory, { withFileTypes: true });
  const walks = Arr.map(entries, (entry): Walk => {
    if (entry.isDirectory() && !HashSet.has(SKIPPED_DIRECTORIES, entry.name)) {
      return walkTextFiles(
        `${directory}/${entry.name}`,
        `${relative}${entry.name}/`,
      );
    }
    if (!entry.isFile() || !isTextFile(entry.name)) {
      return { entries: 0, files: [] };
    }
    return {
      entries: 0,
      files: [
        {
          name: `${relative}${entry.name}`,
          path: `${directory}/${entry.name}`,
        },
      ],
    };
  });

  return {
    entries:
      Arr.length(entries) +
      Arr.reduce(walks, 0, (count, walk) => count + walk.entries),
    files: Arr.flatMap(walks, (walk) => walk.files),
  };
};

const scanRoot = (scan: Scan, { prefix, root }: WorkstreamRoot): Scan => {
  const walk = walkTextFiles(fileURLToPath(root));
  return {
    entries: scan.entries + walk.entries,
    files: [
      ...scan.files,
      ...Arr.map(walk.files, (file) => ({
        name: `${prefix}${file.name}`,
        source: readFileSync(file.path, "utf8"),
      })),
    ],
  };
};

const workstream: Scan = Arr.reduce(
  WORKSTREAM_ROOTS,
  { entries: 0, files: [] },
  scanRoot,
);

const existingPlans = existingPlanNumbers();

const importedNames = (source: string): ReadonlyArray<string> =>
  Arr.flatMap(
    [
      ...source.matchAll(
        /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+"@gpuixui\/primitives"/g,
      ),
    ],
    (match) =>
      Arr.filter(
        Arr.map((match[1] ?? "").split(","), (specifier) =>
          (
            specifier
              .trim()
              .replace(/^type\s+/, "")
              .split(/\s+as\s+/)[0] ?? ""
          ).trim(),
        ),
        Str.isNonEmpty,
      ),
  );

const REQUIRED = ["Usage", "API"] as const;

const problemsFor = (
  page: string,
  check: (source: string) => ReadonlyArray<string>,
): ReadonlyArray<string> =>
  Arr.map(check(read(page)), (problem) => `${page}: ${problem}`);

const contract: ReadonlyArray<{
  readonly check: (source: string) => ReadonlyArray<string>;
  readonly it: string;
}> = [
  {
    it: "covers the contract's sections, in order",
    check: (source) => {
      const headings = Arr.map(sections(source), (section) => section.heading);
      const present = Arr.filter(REQUIRED, (heading) =>
        Arr.contains(headings, heading),
      );

      return [
        ...Arr.map(
          Arr.filter(REQUIRED, (heading) => !Arr.contains(headings, heading)),
          (heading) => `no ${heading}`,
        ),
        ...(Arr.join(
          Arr.filter(headings, (heading) => Arr.contains(REQUIRED, heading)),
          " → ",
        ) === Arr.join(present, " → ")
          ? []
          : ["sections out of order"]),
      ];
    },
  },
  {
    it: "documents every prop in an API table with the contract's columns",
    check: (source) =>
      Option.match(bodyOf(source, "API"), {
        onNone: () => [],
        onSome: (api) =>
          api.includes("| Prop | Type | Default | Consequence |")
            ? []
            : ["no prop table in API"],
      }),
  },
  {
    it: "shows usage that imports the public package root",
    check: (source) =>
      Option.match(bodyOf(source, "Usage"), {
        onNone: () => [],
        onSome: (usage) =>
          usage.includes('from "@gpuixui/primitives"')
            ? []
            : ["usage does not import @gpuixui/primitives"],
      }),
  },
  {
    it: "opens with a YAML frontmatter carrying a title and a description",
    check: (source) => {
      const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(source)?.[1] ?? "";
      return [
        ...(frontmatter === "" ? ["no frontmatter"] : []),
        ...(/^title: .+/m.test(frontmatter) ? [] : ["no title"]),
        ...(/^description: .+/m.test(frontmatter) ? [] : ["no description"]),
      ];
    },
  },
];

describe("the primitives docs page contract", () => {
  it("has at least one page", () => {
    expect(Arr.length(pages)).toBeGreaterThan(0);
  });

  it("names every type role and tone it resolves", () => {
    const roles = Arr.filter(
      R.keys(lightTheme.typography),
      (key) => key !== "sans" && key !== "mono",
    );
    expect(
      hostProp(renderText({ role: "h2" }, lightTheme), "role"),
    ).toStrictEqual(Option.some("heading"));

    expect(read("text.mdx")).not.toContain("not a heading element");

    const catalogue = readFileSync(
      fileURLToPath(new URL(".agents/slop/COMPONENTS.md", repoRoot)),
      "utf8",
    );
    const row = Arr.findFirst(
      catalogue.split("\n"),
      (line) =>
        Str.startsWith("| Text / typography |")(line) &&
        Str.includes("| done |")(line),
    );
    const cell = Option.getOrElse(row, () => "");
    expect(
      Arr.filter([...roles, ...TEXT_TONES], (name) => !cell.includes(name)),
    ).toEqual([]);
  });

  it("imports only names the package exports", () => {
    expect(
      Arr.flatMap(pages, (page) =>
        Arr.filterMap(importedNames(read(page)), (name) =>
          name in primitives
            ? Result.failVoid
            : Result.succeed(
                `${page}: imports ${name}, which @gpuixui/primitives does not export`,
              ),
        ),
      ),
    ).toEqual([]);
  });

  it("says what a press on the words does to the control beside them", () => {
    const source = readFileSync(
      fileURLToPath(new URL("src/components/Label.tsx", packageRoot)),
      "utf8",
    );
    expect(source).toContain("renderer.focusElement?.(instance.id)");
    expect(source).not.toMatch(/\bdispatch\b|\.activate\b|\.toggle\b/);
  });

  it("moves the one floating tip on the house timing, and says so", () => {
    const page = read("tooltip.mdx");
    expect(page).toContain("| `reducedMotion` |");
    const sourceOf = (path: string): string =>
      readFileSync(fileURLToPath(new URL(path, packageRoot)), "utf8");

    const presence = sourceOf("src/core/presence.ts");
    expect(presence).toContain('from "@gpuixui/motion/presence"');
    expect(presence).toContain('presenceTiming("fast"');
    const tooltip = sourceOf("src/components/Tooltip.tsx");
    expect(tooltip).toContain("surfaceMotion(");
    expect(tooltip).toContain("useHeldOpen(");
    expect(sourceOf("package.json")).toContain(
      '"@gpuixui/motion": "workspace:*"',
    );

    const row = Arr.findFirst(
      inventory,
      (record) => record.name === "Tooltips",
    );
    const record = Option.getOrElse(row, () =>
      expect.fail("the inventory carries no Tooltips record"),
    );
    expect(
      Arr.some(record.limitations, Str.includes("motionLevels.fast")),
    ).toBe(true);
    expect(record.tests).toContain("src/core/presence.test.ts");
  });

  it("teaches the corner a stored radius name paints", () => {
    const sourceOf = (path: string): string =>
      readFileSync(fileURLToPath(new URL(path, packageRoot)), "utf8");
    const theme = sourceOf("src/core/theme.ts");
    expect(theme).toContain("export const isRadiusStep");
    expect(theme).toContain("export const radiusStep");
    expect(sourceOf("src/recipe/index.ts")).toContain(
      "radiusStep(spec.radius)",
    );
    expect(read("box.mdx")).toContain(
      "a stored name this release does not carry paints no corner",
    );
    expect(read("skeleton.mdx")).toContain(
      "a stored name this release does not carry keeps `sm`",
    );
    expect(read("scroll-area.mdx")).toContain(
      "a stored name this release does not carry paints no corner",
    );
  });

  Arr.forEach(contract, ({ it: title, check }) => {
    it(title, () => {
      expect(Arr.flatMap(pages, (page) => problemsFor(page, check))).toEqual(
        [],
      );
    });
  });

  it("teaches the alignment the runtime parses, not the API's name", () => {
    const row = Option.getOrElse(
      Arr.findFirst(
        read("text.mdx").split("\n"),
        (line) => firstCell(line) === "`align`",
      ),
      () => expect.fail("text.mdx has no align row"),
    );
    expect(row).toContain("`start` paints left");
    expect(row).toContain("`end` paints right");
    expect(textAlignValue("start")).toBe("left");
    expect(textAlignValue("end")).toBe("right");
  });

  it("keeps the words section its citations name, and the rules in it", () => {
    const words = Option.getOrElse(
      bodyOf(read("theme-provider.mdx"), "Words"),
      () => expect.fail("theme-provider.mdx has no ## Words section"),
    );
    const missing = Arr.filter(
      [
        "merge with the table above the provider",
        "written `null`",
        "shipped word",
        "JSON cannot carry the three sentences",
        "absence whole",
        "Only a function is a sentence",
      ],
      (phrase) => !words.includes(phrase),
    );
    expect(missing).toEqual([]);

    expect(read("README.md")).toContain("| `## Words` | no |");
  });

  it("documents the caller's className on every primitive page", () => {
    const withoutClassName = ["docs/select.mdx"];
    const missing = Arr.filterMap(inventory, (record) => {
      if (!Str.startsWith("docs/")(record.docs)) return Result.failVoid;
      if (Arr.contains(withoutClassName, record.docs)) return Result.failVoid;
      const path = fileURLToPath(new URL(record.docs, packageRoot));
      if (!existsSync(path))
        return Result.succeed(`${record.docs}: page does not exist`);
      const api = Option.getOrElse(
        bodyOf(readFileSync(path, "utf8"), "API"),
        () => "",
      );
      return Str.includes("`className`")(api)
        ? Result.failVoid
        : Result.succeed(
            `${record.docs}: the API section never names className`,
          );
    });
    expect(missing).toEqual([]);
  });

  it("does not deny a prop its own API table lists", () => {
    expect(
      Arr.flatMap(pages, (page) =>
        Arr.map(
          Arr.filter(deniedProps(read(page)), (name) =>
            Arr.contains(documentedProps(read(page)), name),
          ),
          (name) =>
            `${page}: says there is no ${name} prop, and its API table lists it`,
        ),
      ),
    ).toEqual([]);
  });

  it("keeps a caption's stored label when its child says nothing", () => {
    const parts = Arr.map(["Progress", "Meter"], (name) =>
      readFileSync(
        fileURLToPath(
          new URL(`../src/components/${name}.tsx`, import.meta.url),
        ),
        "utf8",
      ),
    );
    expect(
      Arr.filter(
        parts,
        (part) =>
          !part.includes("captionCopy(children, part.label)") ||
          part.includes("children ?? part.label"),
      ),
    ).toEqual([]);
    expect(
      Arr.filter(
        ["progress.mdx", "meter.mdx"],
        (page) =>
          !read(page).includes(
            "a caption child that says nothing falls back to it",
          ),
      ),
    ).toEqual([]);
  });

  it("names the one opt-out a busy word has, and how a bar's words differ", () => {
    const silent = Arr.filter(
      ["button.mdx", "toggle.mdx", "icon-button.mdx"],
      (page) => !read(page).includes("a blank one silences both"),
    );
    expect(silent).toEqual([]);
    expect(read("progress.mdx")).toContain("a blank answer keeps the default");
    expect(read("meter.mdx")).toContain("a blank answer keeps the number");
  });

  it("paints a silent spinner as decoration, not an unnamed status", () => {
    const spinnerSource = readFileSync(
      fileURLToPath(new URL("../src/components/Spinner.tsx", import.meta.url)),
      "utf8",
    );
    expect(spinnerSource).toContain("const name = accessibleName(");
    expect(spinnerSource).toMatch(
      /role=\{name === undefined \? "presentation" : "status"\}/,
    );
    expect(read("spinner.mdx")).toContain("paints the ring as decoration");
    expect(read("spinner.mdx")).toContain("no node to walk into");
  });

  it("keeps a slider's own words when its formatter says nothing", () => {
    const painter = readFileSync(
      fileURLToPath(new URL("../src/components/Slider.tsx", import.meta.url)),
      "utf8",
    );
    const announcement = painter
      .slice(painter.indexOf("export const sliderValueText"))
      .split("\n\n")[0];
    expect(announcement).toContain("spokenText");
    expect(announcement).not.toContain("formatValue?.(value) ??");
    const unstated = Arr.filter(["slider.mdx", "range-slider.mdx"], (page) => {
      const text = read(page).replaceAll("*", "");
      return !text.includes("a blank answer keeps the number");
    });
    expect(unstated).toEqual([]);
  });

  it("keeps a control's own sentence when the table's says nothing", () => {
    const rating = readFileSync(
      fileURLToPath(new URL("../src/components/Rating.tsx", import.meta.url)),
      "utf8",
    );
    expect(rating).toContain("spokenSentence");
    expect(rating).not.toContain("aria-label={messages.starName(");
    const otp = readFileSync(
      fileURLToPath(new URL("../src/components/OTPField.tsx", import.meta.url)),
      "utf8",
    );
    const cell = otp
      .slice(otp.indexOf("export const otpCellLabel"))
      .split("\n\n")[0];
    expect(cell).toContain("spokenSentence");
    expect(cell).not.toContain(
      "messages.codeDigit(index, accessibleName(label))",
    );
    const messages = readFileSync(
      fileURLToPath(new URL("../src/core/messages.ts", import.meta.url)),
      "utf8",
    );
    const ends = messages
      .slice(messages.indexOf("const spokenEnd"))
      .split("\n\n")[0];
    expect(ends).toContain("spokenSentence");
    expect(ends).not.toContain("): string =>\n  end(");
    expect(ends).toContain("end(label, side)");

    expect(
      readFileSync(
        fileURLToPath(new URL("../README.md", import.meta.url)),
        "utf8",
      ),
    ).toContain("`spokenSentence`");
  });

  it("keeps a control's own state word when the table's says nothing", () => {
    const messages = readFileSync(
      fileURLToPath(new URL("../src/core/messages.ts", import.meta.url)),
      "utf8",
    );
    const helper = (name: string): string => {
      const start = messages.indexOf(`export const ${name} = (`);
      const end = messages.indexOf("\n\nexport", start);
      return messages.slice(start, end === -1 ? undefined : end);
    };
    expect(
      Arr.filter(
        [
          "selectionWord",
          "pressWord",
          "starWord",
          "busyWord",
          "indeterminateWord",
        ],
        (name) => !helper(name).includes("spokenWord"),
      ),
    ).toEqual([]);
    const readComponent = (path: string): string =>
      readFileSync(
        fileURLToPath(new URL(`../src/components/${path}`, import.meta.url)),
        "utf8",
      );

    expect(readComponent("Button.tsx")).toContain("busyWord(messages.loading)");
    expect(readComponent("Toggle.tsx")).toContain("busyWord(messages.loading)");
    expect(readComponent("Spinner.tsx")).toContain(
      "busyWord(messages.loading)",
    );
    expect(readComponent("Progress.tsx")).toContain(
      "indeterminateWord(messages.loading)",
    );

    expect(readComponent("ScrollArea.tsx")).toContain(
      "spokenWord(messages.scrollRegion, defaultMessages.scrollRegion)",
    );
    expect(
      readFileSync(
        fileURLToPath(new URL("../README.md", import.meta.url)),
        "utf8",
      ),
    ).toContain("`spokenWord`");
  });

  it("lists only props its module graph declares", () => {
    const problems = Arr.flatMap(inventory, (record) => {
      const declared = sourceClosure(record.source);
      const page = readFileSync(
        fileURLToPath(new URL(record.docs, packageRoot)),
        "utf8",
      );
      return Arr.filter(
        propTableNames(page),
        (name) =>
          !HashSet.has(FORWARDED_HOST_PROPS, name) &&
          !declaresProp(declared, name),
      ).map(
        (name) =>
          `${record.docs}: lists ${name}, which its module graph never declares`,
      );
    });

    expect(problems).toEqual([]);
  });

  it("forwards a tooltip's trigger pair from every control that takes one", () => {
    const controls = [
      { name: "Button", file: "Button.tsx" },
      { name: "IconButton", file: "IconButton.tsx" },
      { name: "Toggle", file: "Toggle.tsx" },
      { name: "Checkbox", file: "Checkbox.tsx" },
      { name: "Switch", file: "Switch.tsx" },
    ] as const;
    const sourceOf = (file: string): string =>
      readFileSync(
        fileURLToPath(new URL(`../src/components/${file}`, import.meta.url)),
        "utf8",
      );
    expect(
      Arr.filter(
        Arr.map(controls, ({ name, file }) => ({
          name,
          forwards: sourceOf(file).includes("TooltipTriggerProps"),
        })),
        (control) => !control.forwards,
      ),
    ).toEqual([]);
  });

  it("keeps the fields' missing cap out of the API, with its evidence named", () => {
    const input = read("input.mdx");
    const evidence = readFileSync(
      fileURLToPath(
        new URL("../runtime/fields.runtime.test.tsx", import.meta.url),
      ),
      "utf8",
    );

    expect({
      applied: evidence.includes(
        "applies a value the field's owner pushes mid-edit",
      ),
      refused: evidence.includes(
        "cannot take back an edit that leaves the owner's value where it was",
      ),
      offered: documentedProps(input).includes("maxLength"),
    }).toEqual({
      applied: true,
      refused: true,
      offered: false,
    });
  });

  it("announces the hint a field paints, and says what the hint answers", () => {
    const source = (path: string): string =>
      readFileSync(fileURLToPath(new URL(path, packageRoot)), "utf8");
    const rule = source("src/core/a11y.ts");
    const input = source("src/components/Input.tsx");
    const number = source("src/components/NumberField.tsx");
    const evidence = source("runtime/labelling.runtime.test.tsx");
    const catalogue = readFileSync(
      fileURLToPath(new URL(".agents/slop/COMPONENTS.md", repoRoot)),
      "utf8",
    );
    const row = Option.getOrElse(
      Arr.findFirst(catalogue.split("\n"), (line) =>
        Str.startsWith("| Text inputs |")(line),
      ),
      () => "",
    );
    const announcement =
      "announced as the field's description while the box is empty";

    expect({
      pages: Arr.filter(
        ["input.mdx", "textarea.mdx", "number-field.mdx"],
        (page) => !read(page).includes(announcement),
      ),

      rule: rule.includes("export const fieldHelp"),
      empty: rule.includes("value.length === 0"),
      hostless: !input.includes("placeholder: props.placeholder"),
      input: input.includes(
        '"aria-description": fieldHelp(props, state.current)',
      ),
      number: number.includes("description: fieldHelp(props, text)"),

      row: row.includes(announcement),
      retracted: row.includes("reads as a label beside the field"),

      measured: evidence.includes(
        "announces the hint a field paints, while the box is empty",
      ),
    }).toEqual({
      pages: [],
      rule: true,
      empty: true,
      hostless: true,
      input: true,
      number: true,
      row: true,
      retracted: false,
      measured: true,
    });
  });

  it("paints the number it holds, and leaves Home and End to the text host", () => {
    const page = read("number-field.mdx");
    const api = Option.getOrElse(bodyOf(page, "API"), () => "");
    const evidence = readFileSync(
      fileURLToPath(
        new URL("../runtime/number-field.runtime.test.tsx", import.meta.url),
      ),
      "utf8",
    );

    expect({
      precision: api.includes("rounds and pads the text"),
      retracted: page.includes("jump to the ends"),
      paintCase: evidence.includes(
        "paints the number it holds, including the decimals its step needs",
      ),
      keyCase: evidence.includes(
        "hears no Home or End in a window, because the text host owns them",
      ),
    }).toEqual({
      precision: true,
      retracted: false,
      paintCase: true,
      keyCase: true,
    });
  });

  it("is indexed by the package's own page table", () => {
    const index = read("README.md");
    const linked = Arr.filterMap(
      Arr.filter(index.split("\n"), Str.startsWith("| [")),
      (line) =>
        Option.match(
          Option.fromNullishOr(/\]\(([^)]+\.mdx)\)/.exec(line)?.[1]),
          {
            onNone: () => Result.failVoid,
            onSome: Result.succeed,
          },
        ),
    );

    expect([
      ...Arr.filter(pages, (page) => !Arr.contains(linked, page)).map(
        (page) => `${page}: not linked from docs/README.md`,
      ),
      ...Arr.filter(linked, (target) => !Arr.contains(pages, target)).map(
        (target) => `${target}: linked but missing`,
      ),
    ]).toEqual([]);
  });

  it("tints the glyph the icon-button page and example show from a theme role", () => {
    const files = [
      { name: "docs/icon-button.mdx", source: read("icon-button.mdx") },
      {
        name: "examples/icon-button.example.tsx",
        source: readFileSync(
          fileURLToPath(
            new URL("../examples/icon-button.example.tsx", import.meta.url),
          ),
          "utf8",
        ),
      },
    ];
    Arr.forEach(files, ({ name, source }) => {
      expect(source, name).not.toMatch(/color="#[0-9A-Fa-f]{3,8}"/);
      expect(source, name).toContain("useTheme()");
    });
  });

  it("pairs a display format with a reading of it", () => {
    const page = read("number-field.mdx");
    const api = Option.getOrElse(bodyOf(page, "API"), () => "");
    const runtime = readFileSync(
      fileURLToPath(
        new URL("../runtime/number-field.runtime.test.tsx", import.meta.url),
      ),
      "utf8",
    );
    const core = readFileSync(
      fileURLToPath(new URL("./core/number.test.ts", import.meta.url)),
      "utf8",
    );
    expect({
      row: api.includes("| `parseValue` |"),
      displayOnly: api.includes("display-only"),
      retracted: page.includes("display and parsing"),
      edited: runtime.includes("reads back the display format"),
      controlled: runtime.includes(
        "keeps a grouped draft the controlled owner",
      ),
      unit: core.includes('describe("parseNumberText"'),
    }).toEqual({
      row: true,
      displayOnly: true,
      retracted: false,
      edited: true,
      controlled: true,
      unit: true,
    });
  });

  it("states the invalid state the checkbox group paints", () => {
    const api = Option.getOrElse(
      bodyOf(read("checkbox-group.mdx"), "API"),
      () => "",
    );
    expect(api).not.toContain("paints every box and its ring destructive");
    expect(api).toContain("empty box's border");
    expect(api).toContain("focus ring");
  });

  it("describes a group option's caption the way the shared row paints it", () => {
    const row = readFileSync(
      fileURLToPath(new URL("../src/components/group.tsx", import.meta.url)),
      "utf8",
    );
    expect(row).toContain('"flex flex-row items-center gap-sm"');
    Arr.forEach(
      ["checkbox-group.mdx", "radio-group.mdx", "toggle-group.mdx"],
      (page) => {
        const text = read(page);
        expect(text, page).toContain("a caption beside the name");
        expect(text, page).not.toContain("under the name");
      },
    );
  });

  it("addresses the thumb a range slider's reader last used, and says so", () => {
    const page = read("range-slider.mdx");
    expect(page).toContain("| `ref` / `aria-id` |");
    expect(page).toContain("thumb that holds the tab stop");
    expect(page).toContain("the start while neither holds focus");
    expect(page).toContain("never the track's");
    expect(page).toContain("wrap the slider");
    expect(page).not.toContain("land on the track");

    const catalogue = readFileSync(
      fileURLToPath(new URL("../README.md", import.meta.url)),
      "utf8",
    );

    expect(Str.replace(/\s+/g, " ")(catalogue)).toContain(
      "part that holds its tab stop",
    );

    const painter = readFileSync(
      fileURLToPath(new URL("../src/components/Slider.tsx", import.meta.url)),
      "utf8",
    );
    expect(painter).toContain(
      "const addressedIndex = Option.getOrElse(focus.focusedIndex, () => 0);",
    );
    expect(painter).toContain(
      "addressed ? mergeRefs(register, props.ref) : register",
    );
    expect(painter).toContain(
      '"aria-id": addressed ? props["aria-id"] : undefined',
    );
    expect(painter).toContain(
      "onLayout: addressed ? props.onLayout : undefined",
    );

    const runtime = readFileSync(
      fileURLToPath(
        new URL("../runtime/address.runtime.test.tsx", import.meta.url),
      ),
      "utf8",
    );
    expect(runtime).toContain(
      "moves a range slider's address to the end the reader last used",
    );
  });

  it("gives both value controls their second axis", () => {
    Arr.forEach(["slider.mdx", "range-slider.mdx"], (page) => {
      const source = read(page);
      expect(source, page).toContain("| `orientation` |");
      expect(source, page).toContain('"horizontal" \\| "vertical"');
      expect(source, page).toContain("needs a definite height");
    });
    const painter = readFileSync(
      fileURLToPath(new URL("../src/components/Slider.tsx", import.meta.url)),
      "utf8",
    );
    expect(painter).toContain("sliderTrackClass(size, orientation)");
    expect(painter).toContain("sliderRailClass(part.orientation)");
    expect(painter).toContain("sliderThumbClass(size, invalid, orientation)");
    expect(painter).toContain("verticalPointerValue");
    expect(painter).toContain("Arr.reverse(flattenParts(children))");
  });

  it("lifts a box by the level it was stored with, and says so", () => {
    const page = read("box.mdx");
    expect(page).toContain("| `elevation` |");
    expect(page).toContain("stored level name");
    expect(page).toContain("default lift");
    expect(page).toContain("paints none");

    const catalogue = readFileSync(
      fileURLToPath(new URL("../README.md", import.meta.url)),
      "utf8",
    );
    expect(catalogue).toContain("`elevationLevel`");
    expect(catalogue).toContain("`boxClass`");
    expect(catalogue).toContain("flat");

    const painter = readFileSync(
      fileURLToPath(new URL("../src/recipe/index.ts", import.meta.url)),
      "utf8",
    );
    expect(painter).toContain("elevationClass(spec.elevation)");
    expect(painter).not.toContain("ELEVATION_SHADOW[spec.elevation]");
  });

  it("fills for a spacer's stored step, and says so", () => {
    const page = read("spacer.mdx");
    expect(page).toContain("| `size` |");
    expect(page).toContain("spacing step");
    expect(page).toContain("none (flexible)");
    expect(page).toContain("stored step");
    expect(page).toContain("spaceStep");

    const catalogue = readFileSync(
      fileURLToPath(new URL("../README.md", import.meta.url)),
      "utf8",
    );
    expect(catalogue).toContain("`isSpaceStep`/`spaceStep`");
    expect(catalogue).toContain("flexible filler");

    const painter = readFileSync(
      fileURLToPath(
        new URL("../src/components/Separator.tsx", import.meta.url),
      ),
      "utf8",
    );
    expect(painter).toContain("spaceStep(theme, size)");
    expect(painter).not.toContain("theme.spacing[size]");
  });

  it("keeps a restored toolbar's gap, and says so", () => {
    const page = read("button-group.mdx");
    expect(page).toContain("| `gap` |");
    expect(page).toContain("spaceStep");
    expect(page).toContain("documented default");
    expect(page).toContain("| `ref` |");
    expect(page).toContain("| `aria-id` |");
    expect(page).toContain("| `onLayout` |");

    const painter = readFileSync(
      fileURLToPath(
        new URL("../src/components/ButtonGroup.tsx", import.meta.url),
      ),
      "utf8",
    );
    expect(painter).toContain(`spaceStep(theme, gap) ?? "sm"`);
    expect(painter).not.toContain("buttonGroupClass(shape, gap");
  });

  it("paints the value a number field holds when its formatter says nothing", () => {
    expect(read("number-field.mdx")).toContain("is no answer");

    const catalogue = readFileSync(
      fileURLToPath(new URL("../README.md", import.meta.url)),
      "utf8",
    );
    expect(catalogue).toContain("`numberDisplay`");
    expect(catalogue).toContain("empty input");

    const painter = readFileSync(
      fileURLToPath(
        new URL("../src/components/NumberField.tsx", import.meta.url),
      ),
      "utf8",
    );
    expect(painter).toContain(
      "numberDisplay(value, props.precision, props.formatValue)",
    );
    expect(painter).not.toContain("props.formatValue?.(value) ??");

    const seam = readFileSync(
      fileURLToPath(new URL("../src/core/number.ts", import.meta.url)),
      "utf8",
    );
    expect(seam).toContain(
      "visibleCopy(formatValue?.(value)) ?? displayNumber(value, precision)",
    );
  });

  it("keeps the record of the keys the shipped number field answers", () => {
    const page = read("number-field.mdx");
    expect(page).not.toContain("`Home`/`End` read the swapped range");

    const suite = readFileSync(
      fileURLToPath(
        new URL("../runtime/number-field.runtime.test.tsx", import.meta.url),
      ),
      "utf8",
    );
    expect(suite).toContain("hears no Home or End in a window");
  });

  it("keeps the window that painted the vertical slider registered and recorded", () => {
    const registry = readFileSync(
      fileURLToPath(new URL("apps/playground/src/live/registry.ts", repoRoot)),
      "utf8",
    );
    const fixture = readFileSync(
      fileURLToPath(
        new URL("apps/playground/src/live/vertical-slider.ts", repoRoot),
      ),
      "utf8",
    );
    const record = readFileSync(
      fileURLToPath(new URL("apps/playground/README.md", repoRoot)),
      "utf8",
    );
    const height = Option.getOrElse(
      Option.map(
        Option.fromNullishOr(
          /VERTICAL_SLIDER_HEIGHT = (\d+);/.exec(fixture)?.[1],
        ),
        Number.parseFloat,
      ),
      () => Number.NaN,
    );

    const track = `${lightTheme.density.controlHeight.md} × ${height}`;
    const rail = `${lightTheme.spacing.xs} × ${
      height - lightTheme.iconSize.md
    }`;

    const probeRecord = (source: string): string => {
      const heading = "### `slider-vertical-lifecycle`";
      const start = source.indexOf(heading);
      if (start < 0) return "";
      const rest = source.slice(start + heading.length);
      const end = rest.indexOf("\n### ");
      return end < 0 ? rest : rest.slice(0, end);
    };
    const measured = probeRecord(record);
    const catalogue = readFileSync(
      fileURLToPath(new URL(".agents/slop/COMPONENTS.md", repoRoot)),
      "utf8",
    );
    const row = (label: string): string =>
      Option.getOrElse(
        Arr.findFirst(catalogue.split("\n"), (line) =>
          Str.startsWith(`| ${label} |`)(line),
        ),
        () => "",
      );

    expect({
      registered: registry.includes('id: "slider-vertical-lifecycle"'),
      fixture:
        fixture.includes("thumbCentreAt") && fixture.includes("inkBounds"),
      length: Number.isFinite(height) && height > 0,
      recorded: measured.includes(track) && measured.includes(rail),
      sliderRow: row("Slider").includes("`slider-vertical-lifecycle`"),
      rangeRow: row("Range slider").includes("`slider-vertical-lifecycle`"),
    }).toEqual({
      registered: true,
      fixture: true,
      length: true,
      recorded: true,
      sliderRow: true,
      rangeRow: true,
    });
  });

  it("keeps the window that drove a scroll region from the keyboard registered and recorded", () => {
    const registry = readFileSync(
      fileURLToPath(new URL("apps/playground/src/live/registry.ts", repoRoot)),
      "utf8",
    );
    const fixture = readFileSync(
      fileURLToPath(
        new URL("apps/playground/src/live/keyboard-scroll.ts", repoRoot),
      ),
      "utf8",
    );
    const record = readFileSync(
      fileURLToPath(new URL("apps/playground/README.md", repoRoot)),
      "utf8",
    );
    const scene = readFileSync(
      fileURLToPath(new URL("../src/core/scroll.ts", import.meta.url)),
      "utf8",
    );
    const painter = readFileSync(
      fileURLToPath(
        new URL("../src/components/ScrollArea.tsx", import.meta.url),
      ),
      "utf8",
    );

    const rowSeam = readFileSync(
      fileURLToPath(new URL("../src/core/theme.ts", import.meta.url)),
      "utf8",
    );

    const declared = (pattern: string): number =>
      Option.getOrElse(
        Option.map(
          Option.fromNullishOr(new RegExp(pattern).exec(fixture)?.[1]),
          Number.parseFloat,
        ),
        () => Number.NaN,
      );

    const measured = probeRecord(record, "`keyboard-scroll-lifecycle`");
    const checks = /(\d+) checks/.exec(measured)?.[1] ?? "";

    const line = lightTheme.density.rowHeight;
    const vertical = declared(
      "VERTICAL_VIEWPORT = \\{ width: \\d+, height: (\\d+) \\}",
    );
    const rows = declared("VERTICAL_ROWS = (\\d+)");
    const rowHeight = declared("VERTICAL_ROW_HEIGHT = (\\d+)");
    const field = declared("FIELD_SLOT = (\\d+)");
    const side = declared(
      "HORIZONTAL_VIEWPORT = \\{ width: (\\d+), height: \\d+ \\}",
    );
    const columns = declared("HORIZONTAL_COLUMNS = (\\d+)");
    const column = declared("HORIZONTAL_COLUMN_WIDTH = (\\d+)");
    const fixtureNumbers = [
      vertical,
      rows,
      rowHeight,
      field,
      side,
      columns,
      column,
    ];
    const firstPage = -(line + vertical);
    const sidePage = -(line + side);
    const verticalEnd = vertical - (rows * rowHeight + field);
    const sideEnd = side - columns * column;
    const catalogue = readFileSync(
      fileURLToPath(new URL(".agents/slop/COMPONENTS.md", repoRoot)),
      "utf8",
    );
    const row = Option.getOrElse(
      Arr.findFirst(catalogue.split("\n"), (line) =>
        Str.startsWith("| Scrollable containers | done |")(line),
      ),
      () => "",
    );

    expect({
      registered: registry.includes('id: "keyboard-scroll-lifecycle"'),
      geometry:
        Arr.every(fixtureNumbers, Number.isFinite) && line > 0 && column > line,
      arithmetic:
        firstPage === -192 &&
        sidePage === -352 &&
        verticalEnd === -320 &&
        sideEnd === -1120,
      recorded:
        Str.isNonEmpty(checks) &&
        measured.includes("density.rowHeight") &&
        measured.includes(`${firstPage}`) &&
        measured.includes(`${sidePage}`) &&
        measured.includes(`${verticalEnd}`) &&
        measured.includes(`${sideEnd}`),
      source:
        scene.includes("current + direction * metrics.line") &&
        painter.includes("line: rowHeightOf(theme)") &&
        rowSeam.includes("theme.density?.rowHeight"),
      row:
        row.includes("`keyboard-scroll-lifecycle`") &&
        row.includes("one theme row per arrow"),
    }).toEqual({
      registered: true,
      geometry: true,
      arithmetic: true,
      recorded: true,
      source: true,
      row: true,
    });
  });

  it("keeps the window that measured a rating's inks registered and recorded", () => {
    const registry = readFileSync(
      fileURLToPath(new URL("apps/playground/src/live/registry.ts", repoRoot)),
      "utf8",
    );
    const fixture = readFileSync(
      fileURLToPath(new URL("apps/playground/src/live/rating.ts", repoRoot)),
      "utf8",
    );
    const record = readFileSync(
      fileURLToPath(new URL("apps/playground/README.md", repoRoot)),
      "utf8",
    );
    const measured = probeRecord(record, "`rating-lifecycle`");
    const checks = Option.getOrElse(
      Option.map(
        Option.fromNullishOr(/(\d+) checks/.exec(measured)?.[1]),
        Number.parseInt,
      ),
      () => 0,
    );
    const declared = Option.getOrElse(
      Option.fromNullishOr(/RATING_CHECKS = (\d+)/.exec(fixture)?.[1]),
      () => "",
    );

    const counts = ["196", "270", "168", "98", "274", "282"];
    const catalogue = readFileSync(
      fileURLToPath(new URL(".agents/slop/COMPONENTS.md", repoRoot)),
      "utf8",
    );
    const row = Option.getOrElse(
      Arr.findFirst(catalogue.split("\n"), (line) =>
        Str.startsWith("| Rating | done |")(line),
      ),
      () => "",
    );
    expect({
      registered: registry.includes('id: "rating-lifecycle"'),
      counted: declared === `${checks}` && checks > 0,
      recorded: Arr.every(counts, (count) => measured.includes(`**${count}**`)),
      row:
        row.includes("`rating-lifecycle`") &&
        row.includes(`${checks} checks`) &&
        row.includes("clipped glyph") &&
        Arr.every(counts, (count) => row.includes(`**${count}**`)),
    }).toEqual({
      registered: true,
      counted: true,
      recorded: true,
      row: true,
    });
  });

  it("names only package paths that exist", () => {
    const missing = Arr.flatMap(workstream.files, (file) =>
      Arr.filterMap(
        [...file.source.matchAll(/packages\/([a-z0-9-]+)/g)],
        (match) => {
          const name = match[1] ?? "";
          return existsSync(
            fileURLToPath(new URL(`packages/${name}`, repoRoot)),
          )
            ? Result.failVoid
            : Result.succeed(
                `${file.name}: names packages/${name}, which does not exist`,
              );
        },
      ),
    );
    expect(missing).toEqual([]);
  });

  it("cites only plans that exist", () => {
    const missing = [
      ...Arr.flatMap(workstream.files, (file) =>
        Arr.map(
          Arr.filter(
            citedPlans(file.source),
            (path) =>
              !existsSync(fileURLToPath(new URL(planFile(path), repoRoot))),
          ),
          (path) => `${file.name}: cites ${path}, which does not exist`,
        ),
      ),
      ...Arr.flatMap(workstream.files, (file) =>
        Arr.map(
          Arr.filter(
            citedPlanNumbers(file.source),
            (number) => !HashSet.has(existingPlans, number),
          ),
          (number) =>
            `${file.name}: cites plan ${number}, which does not exist`,
        ),
      ),
    ];

    expect(missing).toEqual([]);
  });

  it("walks the tree without reading package-manager or build output", () => {
    expect(
      workstream.entries,
      `${workstream.entries} entries read for ${Arr.length(workstream.files)} files`,
    ).toBeLessThan(Arr.length(workstream.files) * 2);
    expect(Arr.length(workstream.files)).toBeGreaterThanOrEqual(150);
    expect(
      Arr.filter(workstream.files, (file) =>
        /(^|\/)(node_modules|dist)\//.test(file.name),
      ),
    ).toEqual([]);

    const names = Arr.map(workstream.files, (file) => file.name);
    expect(Arr.some(names, Str.startsWith("packages/icons/"))).toBe(true);
    expect(Arr.some(names, Str.startsWith("packages/primitives/docs/"))).toBe(
      true,
    );
  });

  it("splits the press route from the keyboard route", () => {
    const page = read("button.mdx");
    const api = Option.getOrElse(bodyOf(page, "API"), () => "");

    expect({
      row: api.includes("`onClick` is the **pointer** route"),
      keyboard: api.includes("a keyboard activation never runs it"),
    }).toEqual({
      row: true,
      keyboard: true,
    });
  });

  it("states the activation a window measured, both halves of it", () => {
    const decision = readFileSync(
      fileURLToPath(new URL("../src/core/keyboard.ts", import.meta.url)),
      "utf8",
    );
    const painter = readFileSync(
      fileURLToPath(new URL("../src/components/Button.tsx", import.meta.url)),
      "utf8",
    );
    const registry = readFileSync(
      fileURLToPath(new URL("apps/playground/src/live/registry.ts", repoRoot)),
      "utf8",
    );
    const record = readFileSync(
      fileURLToPath(new URL("apps/playground/README.md", repoRoot)),
      "utf8",
    );
    const measured = probeRecord(record, "`button-activation-lifecycle`");
    const checks = /(\d+) checks/.exec(measured)?.[1] ?? "";
    const catalogue = readFileSync(
      fileURLToPath(new URL(".agents/slop/COMPONENTS.md", repoRoot)),
      "utf8",
    );
    const row = Option.getOrElse(
      Arr.findFirst(catalogue.split("\n"), (line) =>
        Str.startsWith("| Buttons | done |")(line),
      ),
      () => "",
    );

    expect({
      registered: registry.includes('id: "button-activation-lifecycle"'),
      recorded:
        Str.isNonEmpty(checks) &&
        measured.includes("last=click") &&
        measured.includes("keyDown:enter") &&
        measured.includes("keyUp:space") &&
        measured.includes("tabIndex: -1") &&
        measured.includes("focusElement"),
      decision:
        decision.includes('ENTER_KEY = "enter"') &&
        decision.includes('SPACE_KEY = "space"') &&
        decision.includes("if (held) return false;") &&
        decision.includes('return phase === "down";') &&
        decision.includes('return phase === "up";'),
      stops: painter.includes("disabled === true ? -1 : 0"),
      row: row.includes("`button-activation-lifecycle`"),
    }).toEqual({
      registered: true,
      recorded: true,
      decision: true,
      stops: true,
      row: true,
    });
  });

  it("keeps the reveal probe that a traversal cannot give a scrolled control", () => {
    const fixture = readFileSync(
      fileURLToPath(
        new URL("apps/playground/src/live/focus-reveal.ts", repoRoot),
      ),
      "utf8",
    );
    const registry = readFileSync(
      fileURLToPath(new URL("apps/playground/src/live/registry.ts", repoRoot)),
      "utf8",
    );
    const catalogue = readFileSync(
      fileURLToPath(new URL(".agents/slop/COMPONENTS.md", repoRoot)),
      "utf8",
    );
    const paneHeight = Number(
      /FOCUS_REVEAL_PANE = \{ width: (\d+), height: (\d+) \}/.exec(
        fixture,
      )?.[2] ?? Number.NaN,
    );
    const count = (name: string): number =>
      Number(new RegExp(`${name} = (\\d+);`).exec(fixture)?.[1] ?? Number.NaN);
    const rows = count("FOCUS_REVEAL_ROWS");
    const row = count("FOCUS_REVEAL_ROW");

    const below = (rows - 1) * row - paneHeight;

    const firstReveal = paneHeight - (paneHeight / row + 1) * row;
    const end = -(rows * row - paneHeight);
    const rowOf = (label: string): string =>
      Option.getOrElse(
        Arr.findFirst(catalogue.split("\n"), (line) =>
          Str.startsWith(`| ${label} | done |`)(line),
        ),
        () => "",
      );

    expect({
      registered: registry.includes('id: "focus-reveal-lifecycle"'),
      geometry:
        Number.isFinite(below) && Number.isFinite(firstReveal) && end < 0,
      row: rowOf("Scrollable containers").includes("`focus-reveal-lifecycle`"),
    }).toEqual({
      registered: true,
      geometry: true,
      row: true,
    });
  });
  it("documents the tooltip provider's own props, and no others", () => {
    const api = Option.getOrElse(bodyOf(read("tooltip.mdx"), "API"), () => "");
    const start = api.indexOf("### TooltipProvider");
    const documented = Arr.flatMap(
      Arr.filter((start < 0 ? "" : api.slice(start)).split("\n"), (line) =>
        line.startsWith("|"),
      ),
      rowNames,
    );
    const declared = Source.propsOf("TooltipProviderProps", types);

    expect({
      section: start >= 0,
      extra: Arr.filter(documented, (name) => !Arr.contains(declared, name)),
      missing: Arr.filter(declared, (name) => !Arr.contains(documented, name)),
    }).toEqual({ section: true, extra: [], missing: [] });
  });

  it("defaults an animated control's reduced motion from the provider", () => {
    const pages = [
      "button.mdx",
      "icon-button.mdx",
      "progress.mdx",
      "skeleton.mdx",
      "spinner.mdx",
      "switch.mdx",
      "toggle.mdx",
      "tooltip.mdx",
    ];
    const rows = (page: string): ReadonlyArray<string> =>
      Arr.filter(
        read(page).split("\n"),
        (line) =>
          line.startsWith("| `reducedMotion` |") && !line.includes("`—`"),
      );
    expect({
      stale: Arr.filter(pages, (page) =>
        Arr.some(rows(page), (row) => !row.includes("the motion provider")),
      ),
    }).toEqual({ stale: [] });
  });
});

const PAGE_PROPS: Readonly<Record<string, ReadonlyArray<string>>> = {
  "box.mdx": ["BoxProps"],
  "button-group.mdx": ["ButtonGroupProps"],
  "button.mdx": ["ButtonProps"],
  "checkbox-group.mdx": ["CheckboxGroupProps"],
  "checkbox.mdx": ["CheckboxProps"],
  "grid.mdx": ["GridProps"],
  "icon-button.mdx": ["IconButtonProps"],
  "input.mdx": ["InputProps"],
  "label.mdx": ["LabelProps"],
  "meter.mdx": ["MeterProps"],
  "number-field.mdx": ["NumberFieldProps"],
  "otp-field.mdx": ["OTPFieldProps"],
  "progress.mdx": ["ProgressProps"],
  "radio-group.mdx": ["RadioGroupProps"],
  "range-slider.mdx": ["RangeSliderProps"],
  "rating.mdx": ["RatingProps"],
  "scroll-area.mdx": ["ScrollAreaProps", "ScrollAreaViewportProps"],
  "select.mdx": ["SelectProps"],
  "separator.mdx": ["SeparatorProps"],
  "skeleton.mdx": ["SkeletonProps"],
  "slider.mdx": ["SliderProps"],
  "spacer.mdx": ["SpacerProps"],
  "spinner.mdx": ["SpinnerProps"],
  "stack.mdx": ["StackProps"],
  "switch.mdx": ["SwitchProps"],
  "text.mdx": ["TextProps"],
  "textarea.mdx": ["TextAreaProps"],
  "theme-provider.mdx": ["ThemeProviderProps", "MessagesProviderProps"],
  "toggle-group.mdx": ["SingleToggleGroupProps", "MultipleToggleGroupProps"],
  "toggle.mdx": ["ToggleProps"],
  "tooltip.mdx": ["TooltipProps", "TooltipProviderProps"],
};

const types = Source.indexProps([
  { pkg: "primitives", dir: new URL("./", import.meta.url) },
]);

describe("the primitives API tables", () => {
  it("documents every prop a component declares", () => {
    const pageSet = HashSet.fromIterable(pages);
    const problems = [
      ...Arr.flatMap(R.keys(PAGE_PROPS), (page) =>
        HashSet.has(pageSet, page) ? [] : [`${page}: no such docs page`],
      ),
      ...Arr.flatMap(pages, (page) => {
        const names = PAGE_PROPS[page];
        if (names === undefined) return [`${page}: no props type is mapped`];
        const documented = HashSet.fromIterable(propTableNames(read(page)));
        return Arr.flatMap(names, (name) => {
          const props = Source.propsOf(name, types);
          if (props.length === 0)
            return [`${page}: ${name} declares no prop this suite can read`];
          return Arr.filterMap([...new Set(props)], (prop) =>
            HashSet.has(documented, prop)
              ? Result.failVoid
              : Result.succeed(`${page}: ${name}.${prop} has no API row`),
          );
        });
      }),
    ];

    expect(problems).toEqual([]);
  });

  it("holds the code a stored form wrote to the field's own read", () => {
    const rule = readFileSync(
      fileURLToPath(new URL("src/core/otp.ts", packageRoot)),
      "utf8",
    );
    const stored = "a stored value that is not text is no code";
    const rows = (prop: string): string =>
      Option.getOrElse(
        Arr.findFirst(read("otp-field.mdx").split("\n"), (line) =>
          Str.startsWith(`| \`${prop}\` |`)(line),
        ),
        () => "",
      );
    expect({
      guarded: rule.includes('storedText(value) ?? ""'),
      code: rule.includes("export const normalizeOtp = (value: unknown"),
      value: rows("value").includes(stored),
      initial: rows("defaultValue").includes(stored),

      count: rule.includes("storedNumber(length)"),
      length: rows("length").includes(
        "a stored value that is not a number is six",
      ),
    }).toEqual({
      guarded: true,
      code: true,
      value: true,
      initial: true,
      count: true,
      length: true,
    });
  });

  it("reads a composed props type through extends, an alias and Omit", () => {
    const button = Source.propsOf("ButtonProps", types);
    expect({
      own: Arr.contains(Source.propsOf("TextProps", types), "truncate"),
      parent: Arr.contains(button, "onFocus"),
      alias: Arr.contains(Source.propsOf("TextAreaProps", types), "minRows"),
      omitted: Arr.contains(Source.propsOf("TextAreaProps", types), "onSubmit"),

      runtime: Arr.contains(button, "aria-expanded"),
    }).toEqual({
      own: true,
      parent: true,
      alias: true,
      omitted: false,
      runtime: false,
    });
  });
});
