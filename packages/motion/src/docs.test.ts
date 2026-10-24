/**
 * The runtime the package documents, and the preference verdict it quotes.
 *
 * The bugs these guard: the README and the hook JSDoc still said "GPUix 0.10"
 * after the workspace moved to 0.11.0, the timing seam said the capability
 * matrix "records the detection as unverified" while the record marks it `not
 * supported`, and that same header said the library ships "four levels" while
 * `motionLevels` has five. A reader of the package was told the wrong runtime,
 * a softer verdict than the repo measured, and a shorter table than it ships.
 *
 * The facts are derived from the workspace catalog, the capability record and
 * `motionLevels`, so the guard fails in both directions: a pin bump without the
 * docs, or a docs edit that drifts from the pin.
 */

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  fadeFromAnchor,
  presenceMotion,
  presenceStyle,
  presenceTiming,
  presenceTimingOf,
} from "./presence.js";
import { motionLevels, motionTiming, motionTimingOf } from "./timing.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

/** A JSON object, narrowed without asserting a shape. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A catalog entry, failing when the manifest does not carry it. */
const catalogVersion = (
  catalog: Record<string, unknown>,
  name: string,
): string => {
  const version = catalog[name];
  if (typeof version !== "string" || version.length === 0) {
    throw new Error(`docs: the workspace catalog has no "${name}" pin`);
  }
  return version;
};

const manifest: unknown = JSON.parse(read("../../../package.json"));
const workspaces = isRecord(manifest) ? manifest["workspaces"] : undefined;
const catalog = isRecord(workspaces) ? workspaces["catalog"] : undefined;
if (!isRecord(catalog)) {
  throw new Error("docs: the root manifest carries no workspace catalog");
}

const reactMinor = catalogVersion(catalog, "@gpuix/react");
const nativeMinor = catalogVersion(catalog, "@gpuix/native");
const [major = "", minor = ""] = reactMinor.split(".");
const pinnedMinor = `${major}.${minor}`;

/** Every source file in the package, so a comment cannot drift alone. */
const sources = readdirSync(new URL(".", import.meta.url))
  .filter(
    (name) =>
      (name.endsWith(".ts") || name.endsWith(".tsx")) &&
      !name.includes(".test."),
  )
  .map((name) => ({ name, text: read(`./${name}`) }));
const readme = read("../README.md");
const documents = [...sources, { name: "README.md", text: readme }];

/** The `GPUix <major>.<minor>` claims in a document. */
const namedMinors = (text: string): ReadonlyArray<string> =>
  [...text.matchAll(/GPUix (\d+\.\d+)/g)].map((match) => match[1] ?? "");

/** The `@gpuix/react@<version>` / `@gpuix/native@<version>` claims. */
const namedReleases = (text: string): ReadonlyArray<string> =>
  [...text.matchAll(/@gpuix\/(?:react|native)@(\d+\.\d+\.\d+)/g)].map(
    (match) => match[1] ?? "",
  );

describe("the runtime the motion package documents", () => {
  it("pins one renderer release for the React binding and its binding package", () => {
    expect(nativeMinor).toBe(reactMinor);
    expect(pinnedMinor).toMatch(/^\d+\.\d+$/);
  });

  it("names that release wherever a document names one", () => {
    const driftedMinors = documents.flatMap(({ name, text }) =>
      namedMinors(text)
        .filter((version) => version !== pinnedMinor)
        .map((version) => `${name}: GPUix ${version} (pinned ${pinnedMinor})`),
    );
    const driftedReleases = documents.flatMap(({ name, text }) =>
      namedReleases(text)
        .filter((version) => version !== reactMinor)
        .map(
          (version) => `${name}: @gpuix/*@${version} (pinned ${reactMinor})`,
        ),
    );

    expect(driftedMinors).toEqual([]);
    expect(driftedReleases).toEqual([]);
    // A document that names no runtime at all cannot satisfy the rule above.
    expect(documents.some(({ text }) => namedMinors(text).length > 0)).toBe(
      true,
    );
  });
});

describe("the reduced-motion verdict the package quotes", () => {
  const record = read("../../../docs/gpuix-capabilities.md");
  const verdict =
    record.match(/^\| Reduced-motion detection \| ([^|]+) \|/m)?.[1]?.trim() ??
    "";

  it("is the verdict the capability record measures", () => {
    expect(verdict).toBe("not supported");
  });

  it("is quoted by the seam that owns the preference, not softened", () => {
    const seam = read("../../components/src/motion.tsx");
    [
      sources.find(({ name }) => name === "timing.ts")?.text ?? "",
      seam,
    ].forEach((text) => {
      expect(text).toContain(verdict);
      expect(text).not.toContain("unverified");
    });
  });
});

describe("the level table the timing seam describes", () => {
  const numberWords = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
  ] as const;
  const count = Object.keys(motionLevels).length;

  it("counts its levels with the word the table has", () => {
    const timing = sources.find(({ name }) => name === "timing.ts")?.text ?? "";
    const claimed = timing.match(/named: (\w+) levels/)?.[1] ?? "";
    expect(claimed).toBe(numberWords[count] ?? `${count}`);
  });

  it("names every level in the README", () => {
    const missing = Object.keys(motionLevels).filter(
      (level) => !readme.includes(`\`${level}\``),
    );
    expect(missing).toEqual([]);
  });

  it("teaches the duration entry point with the numbers it returns", () => {
    // The bug this guards: `motionTimingOf` shipped as the timing a surface
    // outside the level table builds (`@gpuixui/components`' toast moves on
    // 220 ms in and 180 ms out) and the package README never named it, so the
    // one entry point a consumer with its own feel needs was documented only on
    // the site. The printed calls are evaluated rather than trusted, so a
    // duration or a reduced branch that changes fails this page by name.
    expect(readme).toContain("motionTimingOf");
    expect(readme).toContain(
      'motionTimingOf(220, { phase: "enter" }); // { duration: 0.22, ease: "easeOut" }',
    );
    expect(motionTimingOf(220, { phase: "enter" })).toEqual({
      duration: 0.22,
      ease: "easeOut",
    });
    expect(
      motionTimingOf(180, { phase: "exit", preference: "reduced" }),
    ).toEqual({ duration: 0 });
    expect(motionTimingOf(Number.NaN)).toEqual(motionTiming("normal"));
  });
});

/** The package's own manifest: the subpaths a consumer may import. */
const packageManifest: unknown = JSON.parse(read("../package.json"));
const packageName = isRecord(packageManifest)
  ? packageManifest["name"]
  : undefined;
const subpaths = isRecord(packageManifest)
  ? packageManifest["exports"]
  : undefined;

/**
 * The key a specifier matches in the manifest's `exports`.
 *
 * A package's root is written `"."` in its manifest and as the bare package
 * name in an import, so the two spellings are mapped here rather than in every
 * case below.
 */
const exportKey = (specifier: string): string | undefined => {
  if (typeof packageName !== "string") return undefined;
  if (specifier === packageName) return ".";
  const prefix = `${packageName}/`;
  return specifier.startsWith(prefix)
    ? `.${specifier.slice(packageName.length)}`
    : undefined;
};

/** The file a specifier resolves to, or none when the package declares it not. */
const moduleFile = (specifier: string): string | undefined => {
  if (!isRecord(subpaths)) return undefined;
  const key = exportKey(specifier);
  if (key === undefined) return undefined;
  const entry = subpaths[key];
  if (!isRecord(entry)) return undefined;
  const types = entry["types"];
  return typeof types === "string" ? types.replace(/^\.\//, "") : undefined;
};

/** A re-exported path, resolved from the file that names it. */
const sibling = (file: string, specifier: string): string =>
  `${file.slice(0, file.lastIndexOf("/"))}/${specifier
    .replace(/^\.\//, "")
    .replace(/\.js$/, ".ts")}`;

/**
 * The names a module exports — its own declarations, its named re-exports and
 * everything an `export *` brings in, since the barrel is how the README
 * reaches the physics modules.
 */
const exportedNames = (
  file: string,
  seen: ReadonlySet<string> = new Set(),
): ReadonlySet<string> => {
  const text = read(`../${file}`);
  const declared = [
    ...text.matchAll(
      /^export\s+(?:declare\s+)?(?:abstract\s+)?(?:const|let|var|class|function|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm,
    ),
  ].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));
  const restated = [...text.matchAll(/^export\s+(?:type\s+)?\{([^}]*)\}/gm)]
    .flatMap((match) => (match[1] ?? "").split(","))
    .flatMap((entry) => {
      const exported = entry
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)
        .pop();
      return exported === undefined || exported.length === 0 ? [] : [exported];
    });
  const visited = new Set(seen).add(file);
  const inherited = [...text.matchAll(/^export\s+\*\s+from\s+"([^"]+)"/gm)]
    .map((match) => sibling(file, match[1] ?? ""))
    .filter((nested) => !visited.has(nested))
    .flatMap((nested) => [...exportedNames(nested, visited)]);
  return new Set([...declared, ...restated, ...inherited]);
};

/** A named import the README teaches, with the module it comes from. */
interface ReadmeImport {
  readonly specifier: string;
  readonly names: ReadonlyArray<string>;
}

/**
 * Every `import { … } from "@gpuixui/motion…"` line in the README.
 *
 * The bug this guards: the hook example imported `layoutSpring` from
 * `@gpuixui/motion/react`, which exports the hooks and their option types and
 * nothing else, so the first line a consumer copied out of the package's own
 * README failed to compile — while the site's pages split the same import
 * correctly, so no reader of the docs could see it. The README is the package's
 * public surface, so the import paths are resolved here rather than trusted.
 */
const readmeImports: ReadonlyArray<ReadmeImport> = [
  ...readme.matchAll(
    /^import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+"(@gpuixui\/motion[^"]*)";?$/gm,
  ),
].map((match) => ({
  specifier: match[2] ?? "",
  names: (match[1] ?? "")
    .split(",")
    .map(
      (entry) =>
        entry
          .trim()
          .replace(/^type\s+/, "")
          .split(/\s+as\s+/)
          .shift() ?? "",
    )
    .filter((name) => name.length > 0),
}));

describe("the reduced coast the README teaches", () => {
  const react = sources.find(({ name }) => name === "react.ts")?.text ?? "";

  it("projects a release from the frame on screen, not the mounted offset", () => {
    // The bug this guards: the reduced branch projected from `offset`, so a
    // reader whose coast had rested was sent back to where the gesture began by
    // the next release — or by a release of `0`. The rule lives in `coastRest`,
    // and both the frame it paints and the run it retires read it.
    expect(react).toContain(
      "const resting = ended ? motion.current : coastRest(running, motion.current);",
    );
    expect(react).toContain(
      "const destination = coastRest(running, motion.current);",
    );
    expect(readme).toMatch(
      /A coast's projected rest is read \*\*from the\s+frame on screen\*\*/,
    );
  });

  it("holds a gesture the reduced preference already ended", () => {
    // The bug this guards: retiring the reduced run was not enough — the effect
    // re-ran when the preference turned off and launched the same declaration
    // from the frame it ended on, so a coast the reader watched finish replayed.
    // The ended declaration is recognised by the reference the reduced branch
    // records, and both branches hold it rather than releasing it again.
    expect(react).toContain(
      "retired.current !== undefined && sameCoast(retired.current, running)",
    );
    expect(react).toContain("if (ended) return;");
    expect(react).toContain("if (ended) {");
    expect(react).toContain(
      "publish(setFrame, settleBefore(motion, start, false));",
    );
    // The package README is where a consumer meets the rule, so the hold is
    // stated there rather than only in the source.
    expect(readme).toContain("turning it **off** again holds the frame");
  });
});

/**
 * The items between the parentheses of the first `(` at or after `from`.
 *
 * A bracket scan is the one place an index walk says more than a combinator: a
 * call's arguments contain a call of their own — `fadeFromAnchor("bottom", 4)`
 * is one argument — and a character class cannot track that depth. A signature's
 * parameter list has the same shape, so both are read by this one scan.
 */
const itemsIn = (source: string, from: number): ReadonlyArray<string> => {
  const open = source.indexOf("(", from);
  if (open === -1) return [];
  const items: string[] = [];
  let depth = 0;
  let start = open + 1;
  for (let index = open; index < source.length; index += 1) {
    const character = source[index] ?? "";
    if (character === "(") depth += 1;
    else if (character === ")") {
      depth -= 1;
      if (depth === 0) {
        items.push(source.slice(start, index));
        break;
      }
    } else if (character === "," && depth === 1) {
      items.push(source.slice(start, index));
      start = index + 1;
    }
  }
  return items.map((item) => item.trim()).filter((item) => item.length > 0);
};

/** The parameters an `export const <name> =` declaration lists. */
const listedAt = (source: string, name: string): ReadonlyArray<string> => {
  const at = source.indexOf(`export const ${name} = `);
  return at === -1 ? [] : itemsIn(source, at);
};

/** The arguments a document's first `<name>(` call passes. */
const calledWith = (source: string, name: string): ReadonlyArray<string> => {
  const at = source.indexOf(`${name}(`);
  return at === -1 ? [] : itemsIn(source, at);
};

describe("the presence table the README teaches", () => {
  it("names every entry point the presence subpath exports", () => {
    // The bug this guards: `presenceMotion` — the one composition that turns
    // the frames and the timing into the runtime's `motion` prop — shipped on
    // `@gpuixui/motion/presence` and was taught only by the components package's
    // seam, so a consumer painting its own surface could not learn it from the
    // package it imports. Every runtime export of the table is named here.
    const presence = sources.find(({ name }) => name === "presence.ts")?.text;
    expect(presence, "presence.ts was not read").toBeDefined();
    const exported = [
      ...(presence ?? "").matchAll(/^export const (\w+)/gm),
    ].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));
    // A scan that read nothing cannot satisfy the rule vacuously.
    expect(exported.length).toBeGreaterThanOrEqual(8);
    // A bullet may print the call (`presenceTiming(level, preference)`), so the
    // name is matched at the start of a code span rather than alone.
    const missing = exported.filter((name) => !readme.includes(`\`${name}`));
    expect(missing).toEqual([]);
  });

  it("places the React half of the table in the package that publishes it", () => {
    // The bug this guards: the mounted window and the surface timing moved into
    // this package when the presence table was shared — `@gpuixui/motion/react`
    // publishes `useSurfacePresence` and `useSurfaceTiming` — but the README
    // still said the React half "stays with the package that owns a tree" and
    // taught neither hook. A consumer painting its own surface was told the one
    // hook that keeps a leaving box mounted lived somewhere else, and the
    // package that owns it documented neither.
    const react = exportedNames("src/react.ts");
    expect(react.has("useSurfacePresence")).toBe(true);
    expect(react.has("useSurfaceTiming")).toBe(true);

    // The presence section is where a consumer looks for the table's halves.
    const section = readme.split("## The presence table")[1] ?? "";
    expect(section.length).toBeGreaterThan(0);
    expect(section).toContain("`useSurfacePresence`");
    expect(section).toContain("`useSurfaceTiming`");

    // And the React half is not sent to another package.
    expect(readme).not.toMatch(
      /React half[^.]*stays with the package that owns a tree/,
    );
  });

  it("calls the composition entry point with the arguments it declares", () => {
    // The bug this guards: the README's three-step composition — the only
    // example a consumer of `@gpuixui/motion/presence` copies for a surface of
    // its own — passed the whole presence object as `present` and named no
    // timing, while `presenceMotion` declares `(frames, present, timing)`. A
    // reader got a type error, and past it an object that is always truthy where
    // the phase belongs and an empty transition, so the surface never ran its
    // exit and never moved on its level.
    const presence = sources.find(({ name }) => name === "presence.ts")?.text;
    expect(presence, "presence.ts was not read").toBeDefined();
    const declared = listedAt(presence ?? "", "presenceMotion").map(
      (parameter) => parameter.split(":")[0]?.trim() ?? "",
    );
    expect(declared).toEqual(["frames", "present", "timing"]);

    const snippet = readme.split("A surface composes the table")[1] ?? "";
    expect(snippet.length).toBeGreaterThan(0);
    const called = calledWith(snippet, "presenceMotion");
    expect(called).toHaveLength(declared.length);
    expect(called[1]).toBe("presence.present");
    expect(called[2]).toBe("presence.timing");
    expect(called[0]).toMatch(/fadeFromAnchor\(|fadeFromSide\(|fadeFrom\(/);

    // The third argument is the journey: without a timing the composition hands
    // the runtime no transition at all, which is the call the page used to teach.
    const frames = fadeFromAnchor("bottom", 4);
    const timing = presenceTiming("normal");
    expect(
      presenceMotion(frames, true, presenceTimingOf(undefined)).transition,
    ).toEqual({});
    expect(presenceMotion(frames, true, timing)).toEqual({
      initial: { opacity: 0, top: -4 },
      animate: { opacity: 1, top: 0 },
      transition: { duration: 0.2, ease: "easeOut" },
    });
    expect(presenceMotion(frames, false, timing).transition).toEqual({
      duration: 0.2,
      ease: "easeIn",
    });

    // And the pointer rule is the seam's, not a literal the page restates.
    expect(snippet).toContain("presenceStyle(presence.present)");
    expect(presenceStyle(true)).toEqual({ pointerEvents: "auto" });
    expect(presenceStyle(false)).toEqual({ pointerEvents: "none" });
  });
});

describe("the imports the README teaches", () => {
  it("reaches each symbol from the subpath that exports it", () => {
    // A floor: deleting the snippets must not make the rule vacuous.
    expect(readmeImports.length).toBeGreaterThanOrEqual(4);
    const failures = readmeImports.flatMap(({ specifier, names }) => {
      const file = moduleFile(specifier);
      if (file === undefined) {
        return [`${specifier} is not a declared export of the package`];
      }
      const declared = exportedNames(file);
      return names
        .filter((name) => !declared.has(name))
        .map((name) => `${specifier} does not export \`${name}\``);
    });
    expect(failures).toEqual([]);
  });

  it("places every hook of the React entry in the layout table", () => {
    const hooks = [...exportedNames("src/react.ts")].filter((name) =>
      /^use[A-Z]/.test(name),
    );
    const row =
      readme.split("\n").find((line) => line.startsWith("| `react.ts`")) ?? "";
    const missing = hooks.filter((hook) => !row.includes(`\`${hook}\``));
    expect(hooks.length).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });
});
