import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  fadeFrom,
  fadeFromAnchor,
  fadeFromSide,
  fadeOnly,
} from "@gpuixui/motion/presence";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import { indicatorBox } from "./tabs/indicator.js";

const packageRoot = new URL("../", import.meta.url);

interface Source {
  readonly path: string;
  readonly body: string;
}

interface Scan {
  readonly sources: ReadonlyArray<Source>;
  readonly failures: ReadonlyArray<string>;
}

const empty: Scan = { sources: [], failures: [] };

const vanished = (error: unknown): boolean =>
  P.isObject(error) && "code" in error && error.code === "ENOENT";

const merge = (left: Scan, right: Scan): Scan => ({
  sources: [...left.sources, ...right.sources],
  failures: [...left.failures, ...right.failures],
});

const failure = (path: string, error: unknown): Scan =>
  vanished(error)
    ? empty
    : { sources: [], failures: [`${path}: ${String(error)}`] };

const readEntry = (path: string): Scan =>
  Result.match(
    Result.try(() =>
      readFileSync(fileURLToPath(new URL(path, packageRoot)), "utf8"),
    ),
    {
      onSuccess: (body) => ({ sources: [{ path, body }], failures: [] }),
      onFailure: (error) => failure(path, error),
    },
  );

const scan = (relative: string): Scan => {
  const directory = fileURLToPath(new URL(relative, packageRoot));
  return Result.match(
    Result.try(() => readdirSync(directory, { withFileTypes: true })),
    {
      onSuccess: (entries) =>
        Arr.reduce(entries, empty, (scanned, entry) => {
          const path = `${relative}${entry.name}`;
          if (entry.isDirectory()) return merge(scanned, scan(`${path}/`));
          if (!/\.tsx?$/.test(entry.name)) return scanned;
          if (Str.includes(".test.")(entry.name)) return scanned;
          return merge(scanned, readEntry(path));
        }),
      onFailure: (error) => failure(relative, error),
    },
  );
};

const motionSource = (file: string): string =>
  readFileSync(
    fileURLToPath(new URL(`../../motion/src/${file}`, import.meta.url)),
    "utf8",
  );

const seamBody = (): string =>
  Option.getOrElse(
    Option.map(
      Arr.findFirst(sources, (source) => source.path === timingSeam),
      (source) => source.body,
    ),
    () => {
      throw new Error(`presence contract: ${timingSeam} was not read`);
    },
  );

const { sources, failures } = scan("src/");

const floating = Arr.filter(sources, ({ body }) => {
  return (
    Str.includes("useSurfacePresence(")(body) &&
    (Str.includes("<FloatingLayer")(body) || Str.includes("<anchored")(body))
  );
});

const guard = /presenceStyle\(/;
const occludeGuard = /occlude=\{(?:presence\.)?present\}/;

const neverLeaves = /useSurfacePresence\(\s*true\b/;

const inlineGuard =
  /pointerEvents:\s*(?:presence\.)?present\s*\?\s*"auto"\s*:\s*"none"/;

const tags = (body: string, host: string): ReadonlyArray<string> => {
  const opening = new RegExp(`^${host}[\\s>]`);
  return Arr.filterMap(Str.split("<")(body), (chunk) =>
    opening.test(chunk)
      ? Option.match(Arr.head(Str.split(">")(chunk)), {
          onNone: () => Result.failVoid,
          onSome: Result.succeed,
        })
      : Result.failVoid,
  );
};

describe("the pointer contract", () => {
  it("reads every listed source, tolerating only a vanished entry", () => {
    expect(readEntry("src/__vanished_between_listing_and_read__.tsx")).toEqual(
      empty,
    );
    expect(readEntry("src/alert.tsx").sources).toHaveLength(1);

    expect(failures).toEqual([]);

    expect(sources.length).toBeGreaterThan(100);
  });

  it("covers every floating surface, so the rule cannot pass on an empty tree", () => {
    expect(Arr.length(floating)).toBeGreaterThanOrEqual(6);
  });

  it("a floating surface takes no press while it leaves", () => {
    const offenders = Arr.filterMap(floating, ({ path, body }) =>
      guard.test(body) ? Result.failVoid : Result.succeed(path),
    );
    expect(offenders).toEqual([]);
  });

  it("every surface that stays painted for an exit takes no press", () => {
    const mounted = Arr.filter(
      sources,
      ({ body }) =>
        (Str.includes("useSurfacePresence(")(body) ||
          Str.includes("presenceMotion(")(body)) &&
        !neverLeaves.test(body),
    );

    expect(Arr.length(mounted)).toBeGreaterThanOrEqual(10);
    const offenders = Arr.filterMap(mounted, ({ path, body }) =>
      guard.test(body) ? Result.failVoid : Result.succeed(path),
    );
    expect(offenders).toEqual([]);
  });

  it("keeps the guard in one home", () => {
    const copies = Arr.filterMap(sources, ({ path, body }) =>
      inlineGuard.test(body) ? Result.succeed(path) : Result.failVoid,
    );
    expect(copies).toEqual([]);
    expect(
      motionSource("presence.ts").match(
        /pointerEvents: present \? "auto" : "none"/g,
      ),
    ).toHaveLength(1);
    expect(seamBody()).toContain('from "@gpuixui/motion/presence"');
  });

  it("a pointer-placed host drops its occlusion with its presence", () => {
    const offenders = Arr.flatMap(floating, ({ path, body }) => {
      return Arr.filterMap(tags(body, "anchored"), (tag) =>
        Str.includes("occlude")(tag) &&
        Str.includes("deferred")(tag) &&
        !occludeGuard.test(tag)
          ? Result.succeed(`${path}: <anchored occlude> is not conditional`)
          : Result.failVoid,
      );
    });
    expect(offenders).toEqual([]);
  });
});

const inlineDelay = /\.\.\.timing(?:\.\w+)?\s*,\s*delay\s*:/;

const staggered = ["src/reveal.tsx", "src/avatar-group.tsx"] as const;
const timingSeam = "src/internal/presence.tsx";
const retiredDelayCopies = ["groupEntering", "unitTransition"] as const;

describe("the house timing", () => {
  it("gains a delay in one place, so the reduced rule has one home", () => {
    const offenders = Arr.filterMap(sources, ({ path, body }) =>
      inlineDelay.test(body) ? Result.succeed(path) : Result.failVoid,
    );
    expect(offenders).toEqual([]);
    expect(motionSource("presence.ts")).toContain("export const delayedTiming");
    expect(seamBody()).toContain("delayedTiming");
  });

  it("is composed by every staggered arrival", () => {
    const missing = Arr.filterMap(staggered, (file) => {
      const source = Arr.findFirst(
        sources,
        (candidate) => candidate.path === file,
      );
      return Option.match(source, {
        onNone: () => Result.succeed(`${file}: not read`),
        onSome: ({ body }) =>
          Str.includes("delayedTiming(")(body)
            ? Result.failVoid
            : Result.succeed(`${file}: does not compose delayedTiming`),
      });
    });
    expect(missing).toEqual([]);
    Arr.forEach(retiredDelayCopies, (name) => {
      expect(
        Arr.filter(sources, ({ body }) => Str.includes(name)(body)),
      ).toEqual([]);
    });
  });

  it("still drops the delay with a journey the timing cannot run, so the rule cannot pass by deletion", () => {
    const shared = motionSource("presence.ts");
    expect(Str.includes("export const delayedTiming")(shared)).toBe(true);

    expect(Str.includes("milliseconds(timing?.duration) === 0")(shared)).toBe(
      true,
    );
    expect(Str.includes("const wait = waitSeconds(delayMs)")(shared)).toBe(
      true,
    );
    expect(Str.includes("delay: wait")(shared)).toBe(true);
  });
});

describe("the shared presence table", () => {
  it("is composed by this package's seam, not restated", () => {
    const seam = seamBody();
    expect(seam).toContain('from "@gpuixui/motion/presence"');

    expect(seam).toContain('from "@gpuixui/motion/react/presence"');
    expect(seam).not.toMatch(/from "@gpuixui\/motion\/react";/);
    expect(seam).not.toContain("export const fadeFrom");
    expect(seam).not.toContain("export const presenceStyle");
    expect(seam).not.toContain("const milliseconds");
  });
});

const movements: ReadonlyArray<{
  readonly path: string;
  readonly level: string;
}> = [
  { path: "src/tabs.tsx", level: "normal" },
  { path: "src/carousel.tsx", level: "fast" },
];

const sourceOf = (path: string): string =>
  Option.getOrElse(
    Option.map(
      Arr.findFirst(sources, (source) => source.path === path),
      (source) => source.body,
    ),
    () => {
      throw new Error(`presence contract: ${path} was not read`);
    },
  );

describe("the movement between resting states", () => {
  it("reads the standard phase in one place, under the provider's preference", () => {
    const seam = seamBody();
    expect(seam).toContain(
      'motionTiming(level, { phase: "standard", preference })',
    );
    expect(seam).toContain("export const useMoveTiming = (");
    expect(seam).toContain("moveTiming(level, useMotionPreference())");

    expect(seam).toContain("export { useSurfacePresence, useSurfaceTiming");
  });

  it("is composed by both movements, at the level their records print", () => {
    const missing = Arr.filter(
      movements,
      ({ path, level }) =>
        !Str.includes(`useMoveTiming("${level}")`)(sourceOf(path)),
    );
    expect(missing).toEqual([]);
  });

  it("no longer reads the arrival curve for a movement", () => {
    const arriving = Arr.filter(movements, ({ path }) =>
      Str.includes("timing.enter")(sourceOf(path)),
    );
    expect(arriving).toEqual([]);
  });
});

const runtimeHost = Arr.findFirst(
  [
    readEntry(
      "../../apps/playground/node_modules/@gpuix/native/dist/host.d.ts",
    ),
    readEntry("../../apps/docs/node_modules/@gpuix/native/dist/host.d.ts"),
  ],
  (read) => read.sources.length === 1,
);

const motionFieldsIn = (typings: string): ReadonlyArray<string> => {
  const declared = Option.flatMap(
    Option.fromNullishOr(
      /export interface MotionStyle \{([\s\S]*?)\n\}/.exec(typings),
    ),
    (match) => Option.fromNullishOr(match[1]),
  );
  return Option.getOrElse(
    Option.map(declared, (fields) =>
      Arr.filterMap(Str.split("\n")(fields), (line) =>
        Option.match(
          Option.fromNullishOr(/^\s+(\w+)\?: number;$/.exec(line)?.[1]),
          {
            onNone: () => Result.failVoid,
            onSome: Result.succeed,
          },
        ),
      ),
    ),
    () => [],
  );
};

const motionFields = (): ReadonlyArray<string> =>
  Option.getOrElse(
    Option.map(runtimeHost, (read) =>
      motionFieldsIn(
        Option.getOrElse(
          Option.map(Arr.head(read.sources), (source) => source.body),
          () => "",
        ),
      ),
    ),
    () => [],
  );

const unrepresentable = [
  "transform",
  "transformOrigin",
  "rotate",
  "scale",
  "translate",
  "skew",
  "filter",
] as const;

const unrepresentableIn = (
  fields: ReadonlyArray<string>,
): ReadonlyArray<string> =>
  Arr.filter(unrepresentable, (name) => Arr.contains(fields, name));

const sides = ["top", "right", "bottom", "left"] as const;

describe("the motion grammar", () => {
  it("reads the runtime's animatable fields, so the row's limit is the runtime's", () => {
    expect(Option.isSome(runtimeHost)).toBe(true);
    Arr.forEach(Option.toArray(runtimeHost), (read) => {
      expect(read.failures).toEqual([]);
      expect(read.sources).toHaveLength(1);
    });
    expect(motionFields()).toEqual([
      "width",
      "height",
      "opacity",
      "top",
      "right",
      "bottom",
      "left",
      "borderRadius",
    ]);
    expect(unrepresentableIn(motionFields())).toEqual([]);

    const patched = [
      "export interface MotionStyle {",
      "    width?: number;",
      "    transform?: number;",
      "    rotate?: number;",
      "}",
    ].join("\n");
    expect(unrepresentableIn(motionFieldsIn(patched))).toEqual([
      "transform",
      "rotate",
    ]);
  });

  it("keeps every frame the seam paints inside that grammar", () => {
    const frames = [
      fadeFrom("top", 8),
      fadeFrom("left", 8),
      fadeOnly,
      ...Arr.map(sides, (side) => fadeFromSide(side, 12)),
      ...Arr.map(sides, (side) => fadeFromAnchor(side, 4)),
    ];
    const painted = Arr.flatMap(frames, (frame) =>
      Arr.flatMap(Object.values(frame), (phase) => Object.keys(phase)),
    );
    expect(painted.length).toBeGreaterThan(6);
    const fields = motionFields();
    expect(
      Arr.filter(painted, (field) => !Arr.contains(fields, field)),
    ).toEqual([]);
  });

  it("makes each movement the inventory promises a painter", () => {
    const fields = motionFields();
    const presenceKeys = Arr.flatMap([fadeFrom("top", 8), fadeOnly], (frames) =>
      Arr.flatMap(Object.values(frames), (frame) => Object.keys(frame)),
    );
    const pill = Object.keys(
      indicatorBox(
        { x: 10, y: 20, width: 100, height: 40 },
        { x: 15, y: 20, width: 50, height: 30 },
      ),
    );

    const painted = [
      ["opacity", presenceKeys],
      ["size", pill],
      ["position", [...presenceKeys, ...pill]],
    ] as const;
    Arr.forEach(painted, ([movement, keys]) => {
      expect(movement.length).toBeGreaterThan(0);
      expect(keys.length).toBeGreaterThan(0);

      expect(Arr.filter(keys, (key) => !Arr.contains(fields, key))).toEqual([]);
    });
    expect(presenceKeys).toContain("opacity");
    expect(pill).toContain("width");
    expect(pill).toContain("height");
    expect(pill).toContain("left");
  });

  it("holds the Motion row to that grammar, and to the suites it cites", () => {
    const inventory = readEntry("../../.agents/slop/COMPONENTS.md");
    expect(inventory.failures).toEqual([]);
    const row = Option.getOrElse(
      Option.map(
        Arr.findFirst(
          Str.split("\n")(
            Option.getOrElse(
              Option.map(Arr.head(inventory.sources), (source) => source.body),
              () => "",
            ),
          ),
          (line) => Str.startsWith("| Motion |")(line),
        ),
        (line) => line,
      ),
      () => "",
    );
    expect(row).not.toEqual("");
    expect(row).toContain("presence-contract.test.ts");

    expect(row).toContain("timing.test.ts");
    expect(
      readFileSync(
        new URL("../../motion/src/timing.test.ts", import.meta.url),
        "utf8",
      ),
    ).toContain("reducedMotionOf");

    const text = Str.toLowerCase(row);
    Arr.forEach(["opacity", "size", "position", "radius"], (claim) => {
      expect(text).toContain(claim);
    });
    expect(text).toContain("transform");
    expect(row).toContain("MotionStyle");
  });
});

const readsTimingDuration = (body: string): boolean =>
  Str.includes("timing.enter.duration")(body) ||
  Str.includes("timing.exit.duration")(body);

const windowConversion = /(?:transitionWindowMs|exitWindowMs)\(/;

const holdsForTiming = (body: string): boolean =>
  Str.includes("setTimeout")(body) &&
  (windowConversion.test(body) || readsTimingDuration(body));

const handBuiltWindow = (body: string): boolean =>
  Arr.some(
    Str.split("\n")(body),
    (line) => Str.includes(".duration")(line) && Str.includes("* 1000")(line),
  );

describe("the hold window", () => {
  it("is the seam's conversion, so a delayed run keeps its box", () => {
    const holding = Arr.filter(sources, ({ body }) => holdsForTiming(body));

    expect(Arr.length(holding)).toBeGreaterThan(0);
    const offenders = Arr.filterMap(holding, ({ path, body }) =>
      windowConversion.test(body) ? Result.failVoid : Result.succeed(path),
    );
    expect(offenders).toEqual([]);

    const handBuilt = Arr.filterMap(sources, ({ path, body }) =>
      path !== timingSeam && handBuiltWindow(body)
        ? Result.succeed(path)
        : Result.failVoid,
    );
    expect(handBuilt).toEqual([]);
  });
});

const shield = /<PresenceShield\b/;

const sharedShield = /<MenuSurface\b/;

const constantShield = /<PresenceShield\b[^>]*present=\{(?:true|false)\}/;

describe("the leaving shell", () => {
  it("covers the content it keeps mounted for its exit", () => {
    const mounted = Arr.filter(
      sources,
      ({ body }) =>
        (Str.includes("useSurfacePresence(")(body) ||
          Str.includes("presenceMotion(")(body)) &&
        !neverLeaves.test(body),
    );

    expect(Arr.length(mounted)).toBeGreaterThanOrEqual(10);
    const offenders = Arr.filterMap(mounted, ({ path, body }) =>
      shield.test(body) || sharedShield.test(body)
        ? Result.failVoid
        : Result.succeed(path),
    );
    expect(offenders).toEqual([]);
  });

  it("is derived from the state that owns it, never a constant", () => {
    const offenders = Arr.filterMap(sources, ({ path, body }) =>
      constantShield.test(body) ? Result.succeed(path) : Result.failVoid,
    );
    expect(offenders).toEqual([]);
  });
});

const apiDoc = readEntry("../../docs/component-api.md");

const readmeDoc = readEntry("README.md");

const bodyOf = (doc: Scan): string =>
  Option.getOrElse(
    Option.map(Arr.head(doc.sources), (source) => source.body),
    () => "",
  );

const apiBody = bodyOf(apiDoc);
const readmeBody = bodyOf(readmeDoc);

const sectionOf = (
  markdown: string,
  heading: string,
): ReadonlyArray<string> => {
  const lines = Str.split("\n")(markdown);
  return Option.match(
    Arr.findFirstIndex(lines, (line) => line === `## ${heading}`),
    {
      onNone: () => [],
      onSome: (index) =>
        Arr.takeWhile(
          Arr.drop(lines, index + 1),
          (line) => !Str.startsWith("## ")(line),
        ),
    },
  );
};

const apiLines = Str.split("\n")(apiBody);
const motionTable: ReadonlyArray<string> = Arr.takeWhile(
  Arr.dropWhile(
    Arr.drop(
      apiLines,
      Option.getOrElse(
        Option.map(
          Arr.findFirstIndex(apiLines, (line) =>
            Str.includes("**Per surface:**")(line),
          ),
          (index) => index + 1,
        ),
        () => Arr.length(apiLines),
      ),
    ),
    (line) => !Str.startsWith("|")(line),
  ),
  (line) => Str.startsWith("|")(line),
);

const cellsOf = (line: string): ReadonlyArray<string> =>
  Arr.map(Arr.filter(Str.split("|")(line), Str.isNonEmpty), (cell) =>
    Str.trim(cell),
  );

const rowOf = (surface: string): ReadonlyArray<string> =>
  Option.getOrElse(
    Option.map(
      Arr.findFirst(motionTable, (line) => {
        const cells = cellsOf(line);
        return cells.length >= 3 && Option.contains(Arr.head(cells), surface);
      }),
      cellsOf,
    ),
    () => [],
  );

interface SurfaceMotion {
  readonly surface: string;
  readonly prints: ReadonlyArray<string>;
  readonly paints: ReadonlyArray<{
    readonly file: string;
    readonly marker: string;
  }>;
}

const surfaces: ReadonlyArray<SurfaceMotion> = [
  {
    surface: "Dialog, Command menu",
    prints: ["fade", "8px", "slow"],
    paints: [
      { file: "src/dialog.tsx", marker: 'fadeFrom("top", 8)' },
      { file: "src/dialog.tsx", marker: 'useSurfaceTiming("slow")' },
    ],
  },
  {
    surface: "Drawer",
    prints: ["fade", "own span", "slow"],
    paints: [
      { file: "src/drawer.tsx", marker: "fadeFromSide(side, travel)" },
      { file: "src/drawer.tsx", marker: 'useSurfaceTiming("slow")' },
    ],
  },
  {
    surface: "Popover, Dropdown menu, Context menu, submenu",
    prints: ["fade", "8px", "4px", "normal"],
    paints: [
      { file: "src/popover.tsx", marker: "fadeFromAnchor(placement.side, 8)" },
      {
        file: "src/dropdown-menu.tsx",
        marker: "fadeFromAnchor(placement.side, 4)",
      },
      { file: "src/context-menu.tsx", marker: 'fadeFromAnchor("bottom", 4)' },
      { file: "src/menu/sub.tsx", marker: 'fadeFromAnchor("right", 4)' },
    ],
  },
  {
    surface: "Navigation menu",
    prints: ["4px", "normal"],
    paints: [
      {
        file: "src/navigation-menu.tsx",
        marker: 'fadeFromAnchor("bottom", 4)',
      },
    ],
  },
  {
    surface: "Combobox popup",
    prints: ["4px", "normal"],
    paints: [{ file: "src/combobox.tsx", marker: "fadeFromAnchor(side, 4)" }],
  },
  {
    surface: "Mention suggestions",
    prints: ["4px", "normal", "kept for the exit"],
    paints: [
      { file: "src/mention-input.tsx", marker: 'fadeFromAnchor("bottom", 4)' },
      { file: "src/mention-input.tsx", marker: "presenceMotion(listFrames" },
    ],
  },
  {
    surface: "Preview card",
    prints: ["4px", "fast"],
    paints: [
      {
        file: "src/preview-card.tsx",
        marker: "fadeFromAnchor(placement.side, 4)",
      },
      { file: "src/preview-card.tsx", marker: 'useSurfaceTiming("fast")' },
    ],
  },
  {
    surface: "Toast",
    prints: [
      "16px",
      "slide",
      "240 ms",
      "180 ms",
      "260 ms",
      "unfold",
      "peeking card tops",
    ],
    paints: [
      { file: "src/toast/viewport.tsx", marker: "EDGE_TRAVEL = 16" },
      { file: "src/toast/viewport.tsx", marker: "motionTimingOf(240" },
      { file: "src/toast/viewport.tsx", marker: "motionTimingOf(180" },
      { file: "src/toast/viewport.tsx", marker: "motionTimingOf(260" },
      { file: "src/toast/stack.ts", marker: "STACK_PEEK = 12" },
    ],
  },
  {
    surface: "Accordion panel",
    prints: ["height", "normal"],
    paints: [
      { file: "src/auto-height.tsx", marker: 'level = "normal"' },
      { file: "src/accordion.tsx", marker: "<AutoHeight" },
    ],
  },
  {
    surface: "Tabs pill",
    prints: ["width", "normal", "standard"],
    paints: [{ file: "src/tabs.tsx", marker: 'useMoveTiming("normal")' }],
  },
  {
    surface: "Carousel indicator",
    prints: ["width", "fast", "standard"],
    paints: [{ file: "src/carousel.tsx", marker: 'useMoveTiming("fast")' }],
  },
  {
    surface: "Page transition",
    prints: ["16px", "normal"],
    paints: [
      { file: "src/page-transition.tsx", marker: "PAGE_TRAVEL" },
      { file: "src/page-transition/logic.ts", marker: "PAGE_TRAVEL = 16" },
    ],
  },
];

const rowText = (surface: string): string =>
  Str.toLowerCase(Arr.join(Arr.drop(rowOf(surface), 1), " "));

describe("the per-surface table", () => {
  it("prints the movement and level its painter writes", () => {
    expect(apiDoc.failures).toEqual([]);

    expect(Arr.length(motionTable)).toBeGreaterThan(8);
    const missingRows = Arr.filterMap(surfaces, (entry) =>
      Arr.length(rowOf(entry.surface)) > 0
        ? Result.failVoid
        : Result.succeed(entry.surface),
    );
    expect(missingRows).toEqual([]);

    const wrong = Arr.flatMap(surfaces, (entry) => {
      const text = rowText(entry.surface);
      const unprinted = Arr.filterMap(entry.prints, (claim) =>
        Str.includes(Str.toLowerCase(claim))(text)
          ? Result.failVoid
          : Result.succeed(`${entry.surface}: does not print "${claim}"`),
      );
      const unpainted = Arr.filterMap(entry.paints, (painter) => {
        const source = readEntry(painter.file);
        const body = Option.getOrElse(
          Option.map(Arr.head(source.sources), (read) => read.body),
          () => "",
        );
        return Str.includes(painter.marker)(body)
          ? Result.failVoid
          : Result.succeed(
              `${entry.surface}: ${painter.file} does not paint "${painter.marker}"`,
            );
      });
      return [...unprinted, ...unpainted];
    });
    expect(wrong).toEqual([]);
  });

  it("teaches the toast's own timing, not a shared level", () => {
    const text = rowText("Toast");
    expect(Str.includes("notice")(text)).toBe(false);
    expect(Str.includes("motiontimingof")(text)).toBe(true);
    expect(Str.includes("slide")(text)).toBe(true);
    expect(Str.includes("unfold")(text)).toBe(true);
    expect(Str.includes("peeking card tops")(text)).toBe(true);
  });
});

const motionDocs: ReadonlyArray<{
  readonly name: string;
  readonly body: string;
  readonly failures: ReadonlyArray<string>;
}> = [
  { name: "README.md", body: readmeBody, failures: readmeDoc.failures },
  {
    name: "docs/component-api.md",
    body: apiBody,
    failures: apiDoc.failures,
  },
];

const ownedSeam = ["owns the frames", "owns the mount window"] as const;

const seamRow = Str.toLowerCase(
  Option.getOrElse(
    Option.map(
      Arr.findFirst(
        Arr.filter(Str.split("\n")(apiBody), Str.startsWith("|")),
        (line) => Str.includes("internal/presence.tsx")(line),
      ),
      (line) => line,
    ),
    () => "",
  ),
);

describe("the ownership the motion pages teach", () => {
  it("places each half in the entry that publishes it", () => {
    const wrong = Arr.flatMap(motionDocs, (doc) => {
      const missing = Arr.filterMap(
        [
          "@gpuixui/motion/presence",
          "@gpuixui/motion/react/presence",
          "PresenceShield",
        ],
        (claim) =>
          Str.includes(claim)(doc.body)
            ? Result.failVoid
            : Result.succeed(`${doc.name}: does not name ${claim}`),
      );
      const retracted = Arr.filterMap(ownedSeam, (claim) =>
        Str.includes(claim)(doc.body)
          ? Result.succeed(`${doc.name}: still says "${claim}"`)
          : Result.failVoid,
      );
      return [...missing, ...retracted];
    });
    expect(wrong).toEqual([]);

    expect(seamRow).toContain("re-publication");
    expect(seamRow).toContain("presenceshield");
    expect(
      seamRow.includes("the frames") || seamRow.includes("mount window"),
    ).toBe(false);
  });

  it("leaves the per-surface numbers to the one table", () => {
    const section = sectionOf(readmeBody, "Motion");
    expect(motionDocs[0]?.failures).toEqual([]);

    expect(section.length).toBeGreaterThan(5);
    const text = Arr.join(section, "\n");
    expect(text).toContain("docs/component-api.md");
    expect(text.match(/\b\d+(?:\.\d+)?\s*(?:px|ms)\b/g) ?? []).toEqual([]);
  });
});
