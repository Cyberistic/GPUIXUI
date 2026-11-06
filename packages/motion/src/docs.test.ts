import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  fadeFromAnchor,
  presenceMotion,
  presenceStyle,
  presenceTiming,
  presenceTimingOf,
} from "./presence.js";
import {
  isMotionLevel,
  motionLevels,
  motionLevelOf,
  motionTiming,
  motionTimingOf,
  preferenceOf,
  reducedMotionOf,
} from "./timing.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

const sources = readdirSync(new URL(".", import.meta.url))
  .filter(
    (name) =>
      (name.endsWith(".ts") || name.endsWith(".tsx")) &&
      !name.includes(".test."),
  )
  .map((name) => ({ name, text: read(`./${name}`) }));
const readme = read("../README.md");
const documents = [...sources, { name: "README.md", text: readme }];

const namedMinors = (text: string): ReadonlyArray<string> =>
  [...text.matchAll(/GPUix (\d+\.\d+)/g)].map((match) => match[1] ?? "");

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
});

describe("the level table the timing seam describes", () => {
  it("names every level in the README", () => {
    const missing = Object.keys(motionLevels).filter(
      (level) => !readme.includes(`\`${level}\``),
    );
    expect(missing).toEqual([]);
  });

  it("teaches the duration entry point with the numbers it returns", () => {
    expect(readme).toContain("motionTimingOf");
    expect(readme).toContain(
      'motionTimingOf(240, { phase: "enter" }); // { duration: 0.24, ease: "easeOut" }',
    );
    expect(motionTimingOf(240, { phase: "enter" })).toEqual({
      duration: 0.24,
      ease: "easeOut",
    });

    expect(readme).toContain(
      "motionTimingOf(260, { ease: [0.22, 1, 0.36, 1] }); // the named curve",
    );
    expect(motionTimingOf(260, { ease: [0.22, 1, 0.36, 1] })).toEqual({
      duration: 0.26,
      ease: [0.22, 1, 0.36, 1],
    });
    expect(
      motionTimingOf(180, { phase: "exit", preference: "reduced" }),
    ).toEqual({ duration: 0 });
    expect(motionTimingOf(Number.NaN)).toEqual(motionTiming("normal"));

    expect(readme).toContain(
      "motionTimingOf(1e300); // the same house timing: no clock can schedule it",
    );
    expect(motionTimingOf(1e300)).toEqual(motionTiming("normal"));
  });

  it("teaches the level a store wrote with the answer it gets", () => {
    expect(readme).toContain(
      'motionLevelOf("elapsed"); // "normal" — a name this release dropped',
    );
    expect(motionLevelOf("elapsed")).toBe("normal");
    expect(readme).toContain(
      'motionTiming(motionLevelOf(saved)); // { duration: 0.32, ease: "easeInOut" }',
    );
    expect(motionTiming(motionLevelOf("slow"))).toEqual({
      duration: 0.32,
      ease: "easeInOut",
    });
    expect(readme).toContain(
      'isMotionLevel("toString"); // false — the table\'s own keys only',
    );
    expect(isMotionLevel("toString")).toBe(false);
  });
});

describe("the preference port the README teaches", () => {
  it("reads the preference through the timing's own policy", () => {
    const timing = sources.find(({ name }) => name === "timing.ts")?.text ?? "";
    expect(timing).toContain("override ?? preferenceOf(preference)");
    expect(readme).toContain(
      "Its preference is read through `preferenceOf` for the same\nreason the timings are",
    );

    const stored = ["Reduced", "true", "reduced", "animated", null];
    expect(stored.map((value) => reducedMotionOf(undefined, value))).toEqual(
      stored.map((value) => preferenceOf(value) === "reduced"),
    );
  });
});

const packageManifest: unknown = JSON.parse(read("../package.json"));
const packageName = isRecord(packageManifest)
  ? packageManifest["name"]
  : undefined;
const subpaths = isRecord(packageManifest)
  ? packageManifest["exports"]
  : undefined;

const exportKey = (specifier: string): string | undefined => {
  if (typeof packageName !== "string") return undefined;
  if (specifier === packageName) return ".";
  const prefix = `${packageName}/`;
  return specifier.startsWith(prefix)
    ? `.${specifier.slice(packageName.length)}`
    : undefined;
};

const moduleFile = (specifier: string): string | undefined => {
  if (!isRecord(subpaths)) return undefined;
  const key = exportKey(specifier);
  if (key === undefined) return undefined;
  const entry = subpaths[key];
  if (!isRecord(entry)) return undefined;
  const types = entry["types"];
  return typeof types === "string" ? types.replace(/^\.\//, "") : undefined;
};

const sibling = (file: string, specifier: string): string =>
  `${file.slice(0, file.lastIndexOf("/"))}/${specifier
    .replace(/^\.\//, "")
    .replace(/\.js$/, ".ts")}`;

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

interface ReadmeImport {
  readonly specifier: string;
  readonly names: ReadonlyArray<string>;
}

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
    expect(react).toContain(
      "retired.current !== undefined && sameCoast(retired.current, running)",
    );
    expect(react).toContain("if (ended) return;");
    expect(react).toContain("if (ended) {");
    expect(react).toContain(
      "publish(setFrame, settleBefore(motion, start, false));",
    );

    expect(readme).toContain("turning it **off** again holds the frame");
  });
});

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

const listedAt = (source: string, name: string): ReadonlyArray<string> => {
  const at = source.indexOf(`export const ${name} = `);
  return at === -1 ? [] : itemsIn(source, at);
};

const calledWith = (source: string, name: string): ReadonlyArray<string> => {
  const at = source.indexOf(`${name}(`);
  return at === -1 ? [] : itemsIn(source, at);
};

describe("the presence table the README teaches", () => {
  it("names every entry point the presence subpath exports", () => {
    const presence = sources.find(({ name }) => name === "presence.ts")?.text;
    expect(presence, "presence.ts was not read").toBeDefined();
    const exported = [
      ...(presence ?? "").matchAll(/^export const (\w+)/gm),
    ].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));

    expect(exported.length).toBeGreaterThanOrEqual(8);

    const missing = exported.filter((name) => !readme.includes(`\`${name}`));
    expect(missing).toEqual([]);
  });

  it("places the React half of the table in the package that publishes it", () => {
    const react = exportedNames("src/react.ts");
    expect(react.has("useSurfacePresence")).toBe(true);
    expect(react.has("useSurfaceTiming")).toBe(true);

    const section = readme.split("## The presence table")[1] ?? "";
    expect(section.length).toBeGreaterThan(0);
    expect(section).toContain("`useSurfacePresence`");
    expect(section).toContain("`useSurfaceTiming`");

    expect(readme).not.toMatch(
      /React half[^.]*stays with the package that owns a tree/,
    );
  });

  it("calls the composition entry point with the arguments it declares", () => {
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

    const frames = fadeFromAnchor("bottom", 4);
    const timing = presenceTiming("normal");
    expect(
      presenceMotion(frames, true, presenceTimingOf(undefined)).transition,
    ).toEqual({ duration: 0 });
    expect(presenceMotion(frames, true, timing)).toEqual({
      initial: { opacity: 0, top: -4 },
      animate: { opacity: 1, top: 0 },
      transition: { duration: 0.2, ease: "easeOut" },
    });
    expect(presenceMotion(frames, false, timing).transition).toEqual({
      duration: 0.2,
      ease: "easeIn",
    });

    expect(snippet).toContain("presenceStyle(presence.present)");
    expect(presenceStyle(true)).toEqual({ pointerEvents: "auto" });
    expect(presenceStyle(false)).toEqual({ pointerEvents: "none" });
  });

  it("paints the composition on the element that takes it", () => {
    const section = readme.split("A surface composes the table")[1] ?? "";
    const block = (section.match(/```tsx\n([\s\S]*?)```/) ?? [])[1] ?? "";
    expect(block).toContain("presenceMotion(");

    const painted = presenceMotion(
      fadeFromAnchor("bottom", 4),
      true,
      presenceTiming("normal"),
    );
    expect(Object.keys(painted)).toEqual(["initial", "animate", "transition"]);
    expect(block).toContain("{...presenceMotion(");
    expect(block).not.toContain("motion={presenceMotion(");

    expect(section).toContain("the same object is its `motion` prop");
  });
  it("holds a stored frame to the grammar the renderer validates", () => {
    const presence = sources.find(({ name }) => name === "presence.ts")?.text;
    expect(presence, "presence.ts was not read").toBeDefined();
    [
      "const RENDERABLE_MAX",
      "const readOpacity",
      "const readSize",
      "readOpacity(frame.opacity)",
      "readSize(frame.height)",
      "readInset(frame.top)",
      "readInset(frame.left)",
      "readInset(offset) ?? 0",
    ].forEach((marker) => expect(presence).toContain(marker));

    const section = readme.split("## The presence table")[1] ?? "";
    expect(section).toContain("32-bit float");
    expect(section).toContain("negative size");
    expect(section).toContain("opacity outside `0..1`");
  });
});

describe("the imports the README teaches", () => {
  it("reaches each symbol from the subpath that exports it", () => {
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
