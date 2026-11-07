import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import { inventory, type ComponentMeta } from "./inventory.js";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));

const texts = new Map<string, Option.Option<string>>();

let reads = 0;

const readText = (relative: string): Option.Option<string> => {
  const cached = texts.get(relative);
  if (cached !== undefined) return cached;
  reads += 1;
  const text = existsSync(join(packageRoot, relative))
    ? Option.some(readFileSync(join(packageRoot, relative), "utf8"))
    : Option.none();
  texts.set(relative, text);
  return text;
};

const LOCAL_IMPORT = /from "(\.{1,2}\/[^"]+)\.js"/g;

const resolveImport = (
  fromFile: string,
  specifier: string,
): Option.Option<string> => {
  const base = join(dirname(fromFile), Str.replace(/\.js$/, "")(specifier));
  return Arr.findFirst(
    [`${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`],
    (candidate) => existsSync(join(packageRoot, candidate)),
  );
};

const importsByFile = new Map<string, ReadonlyArray<string>>();

const importsOf = (file: string): ReadonlyArray<string> => {
  const cached = importsByFile.get(file);
  if (cached !== undefined) return cached;
  const imports = Option.match(readText(file), {
    onNone: () => [],
    onSome: (text) =>
      Arr.getSomes(
        Arr.map(Arr.fromIterable(Str.matchAll(LOCAL_IMPORT)(text)), (match) =>
          Option.flatMap(Option.fromNullishOr(match[1]), (specifier) =>
            resolveImport(file, specifier),
          ),
        ),
      ),
  });
  importsByFile.set(file, imports);
  return imports;
};

const MOTION_TARGET =
  /presenceMotion\(|useSurfaceTiming\(|useSurfacePresence\(|<AutoHeight|motion=\{/;

const reachesMotion = (file: string): boolean => {
  let visited: ReadonlyArray<string> = [];
  const walk = (current: string): boolean => {
    if (Arr.contains(visited, current)) return false;
    visited = Arr.append(visited, current);
    return Option.match(readText(current), {
      onNone: () => false,
      onSome: (text) =>
        MOTION_TARGET.test(text) || Arr.some(importsOf(current), walk),
    });
  };
  return walk(file);
};

interface RecordFile {
  readonly name: string;

  readonly file: string;
}

const COLLECTOR_IMPORT = /import \{ (\w+Meta) \} from "(\.{1,2}\/[^"]+)\.js";/g;

const collectRecordFiles = (): ReadonlyArray<RecordFile> => {
  const collector = Option.getOrElse(readText("src/inventory.ts"), () => "");
  return Arr.flatMap(
    Arr.fromIterable(Str.matchAll(COLLECTOR_IMPORT)(collector)),
    (match) => {
      const variable = match[1];
      const specifier = match[2];
      if (variable === undefined || specifier === undefined) return [];
      const module = resolveImport("src/inventory.ts", specifier);
      if (Option.isNone(module)) return [];
      const file = Arr.findFirst(
        [module.value, ...importsOf(module.value)],
        (candidate) =>
          Option.match(readText(candidate), {
            onNone: () => false,
            onSome: (text) => text.includes(`export const ${variable} =`),
          }),
      );
      if (Option.isNone(file)) return [];
      const declared = Option.match(readText(file.value), {
        onNone: () => undefined,
        onSome: (text) => /name: "([^"]+)"/.exec(text)?.[1],
      });
      return declared === undefined
        ? []
        : [{ name: declared, file: file.value }];
    },
  );
};

let recordFilesOnce: Option.Option<ReadonlyArray<RecordFile>> = Option.none();

const recordFiles = (): ReadonlyArray<RecordFile> =>
  Option.match(recordFilesOnce, {
    onNone: () => {
      const records = collectRecordFiles();
      recordFilesOnce = Option.some(records);
      return records;
    },
    onSome: (records) => records,
  });

const fileFor = (name: string): Option.Option<string> =>
  Option.map(
    Arr.findFirst(recordFiles(), (entry) => entry.name === name),
    (entry) => entry.file,
  );

const DENIALS: ReadonlyArray<string> = [
  "mounts and unmounts instantly",
  "mount and unmount instantly",
  "no height animation",
  "no slide animation",
  "pops into place",
  "not animated",
];

const denialsIn = (text: string): ReadonlyArray<string> =>
  Arr.filter(DENIALS, (phrase) => Str.includes(phrase)(text));

const record = (name: string): Option.Option<ComponentMeta> =>
  Arr.findFirst(inventory, (meta) => meta.name === name);

const limitationsOf = (name: string): ReadonlyArray<string> =>
  Option.match(record(name), {
    onNone: () => [],
    onSome: (meta) => meta.limitations,
  });

const mentions = (texts: ReadonlyArray<string>, needle: string): boolean =>
  Arr.some(texts, (text) => Str.includes(needle)(text));

const docPages = (): ReadonlyArray<string> =>
  Arr.filter(
    Arr.fromIterable(readdirSync(join(packageRoot, "docs"))),
    Str.endsWith(".mdx"),
  );

describe("the motion the records deny", () => {
  it("reads the tree it judges", () => {
    const records = recordFiles();
    expect(records.length).toBe(inventory.length);
    const names = Arr.map(records, (entry) => entry.name);
    expect(
      Arr.filter(names, (name, index) => names.indexOf(name) !== index),
    ).toEqual([]);
    expect(docPages().length).toBeGreaterThan(70);
    const unresolved = Arr.filter(
      docPages(),
      (page) =>
        !existsSync(
          join(packageRoot, "src", Str.replace(/\.mdx$/, ".tsx")(page)),
        ),
    );
    expect(unresolved).toEqual([]);
    const reaching = () =>
      Arr.filter(inventory, (meta) =>
        Option.match(fileFor(meta.name), {
          onNone: () => false,
          onSome: reachesMotion,
        }),
      );
    expect(reaching().length).toBeGreaterThan(30);

    const walk = () => {
      reaching();
      Arr.forEach(docPages(), (page) =>
        reachesMotion(`src/${Str.replace(/\.mdx$/, ".tsx")(page)}`),
      );
    };
    walk();
    const walked = reads;
    walk();
    expect(reads).toBe(walked);

    expect(walked).toBeLessThan(400);
    expect(walked).toBeGreaterThan(100);
  });

  it("denies no reveal the record's own source composes", () => {
    const problems = Arr.flatMap(inventory, (meta) => {
      const denials = denialsIn(meta.limitations.join("\n"));
      if (denials.length === 0) return [];
      return Option.match(fileFor(meta.name), {
        onNone: () => [`${meta.name}: no module declares its record`],
        onSome: (file) =>
          reachesMotion(file)
            ? [
                `${meta.name} (${file}): denies ${denials.join(", ")} while it composes the seam`,
              ]
            : [],
      });
    });

    expect(problems).toEqual([]);
  });

  it("publishes no page that denies the reveal its source composes", () => {
    const problems = Arr.getSomes(
      Arr.map(docPages(), (page) => {
        const file = Str.replace(/\.mdx$/, ".tsx")(page);
        const denials = Option.match(readText(`docs/${page}`), {
          onNone: () => [],
          onSome: denialsIn,
        });
        return denials.length === 0 || !reachesMotion(`src/${file}`)
          ? Option.none()
          : Option.some(`docs/${page}: denies ${denials.join(", ")}`);
      }),
    );

    expect(problems).toEqual([]);
  });

  it("records the reveal the accordion panel paints", () => {
    const source = Option.getOrElse(readText("src/accordion.tsx"), () => "");

    expect(source).toContain("<AutoHeight");
    expect(denialsIn(limitationsOf("Accordions").join("\n"))).toEqual([]);
    expect(mentions(limitationsOf("Accordions"), "measured height")).toBe(true);
  });

  it("records the reveal the reasoning panel paints", () => {
    const page = Option.getOrElse(readText("docs/message.mdx"), () => "");

    expect(Option.getOrElse(readText("src/message.tsx"), () => "")).toContain(
      "<CollapsibleContent",
    );
    expect(
      Option.getOrElse(readText("src/collapsible.tsx"), () => ""),
    ).toContain("<AutoHeight");
    expect(denialsIn(page)).toEqual([]);
    expect(denialsIn(limitationsOf("Message").join("\n"))).toEqual([]);
    expect(mentions(limitationsOf("Message"), "measured height")).toBe(true);
  });

  it("records the span the drawer slides, and the axis it travels on", () => {
    const source = Option.getOrElse(readText("src/drawer.tsx"), () => "");
    const page = Option.getOrElse(readText("docs/drawer.mdx"), () => "");

    expect(source).toContain("fadeFromSide(side, travel)");
    expect(source).toContain("isVertical(side) ? box.height : box.width");
    expect(source).toContain("overflow");
    expect(denialsIn(limitationsOf("Drawer").join("\n"))).toEqual([]);
    expect(mentions(limitationsOf("Drawer"), "own span")).toBe(true);
    expect(page).toContain("own span");
  });
});
