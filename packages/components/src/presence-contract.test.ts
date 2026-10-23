/**
 * The pointer contract every animated floating surface keeps.
 *
 * The bug this guards: `ContextMenuContent` composed the presence seam but never
 * painted the leaving state on its surface, and its `anchored` host kept
 * `occlude`, so for the 200 ms a dismissed menu stayed painted it still took the
 * pointer — a press inside that box went to the ghost (or was swallowed by the
 * occlusion) instead of the control underneath, and the press the dismissal was
 * for needed a second click. `presence.test.tsx` measures the behaviour; this
 * suite holds the shape that makes it possible.
 *
 * A surface hosted by `<FloatingLayer>` or `<anchored>` sits over whatever it
 * opened from, so it must paint `pointerEvents` from its presence while it
 * leaves. An `anchored` host must make `occlude` conditional for the same
 * reason: the occlusion is a native mouse block that no style value can undo.
 *
 * **Every surface the seam keeps mounted owes that guard, not only the floating
 * ones.** The rule was a literal copied into each overlay, and `Reveal` and
 * `AutoHeight` — which stay mounted for their exit like a surface — never
 * copied it, so a press meant for what a collapsing section uncovered ran a
 * control inside the fading box instead. It lives once, as `presenceStyle` in
 * the seam, and this suite fails a surface that composes the seam without it
 * and any source that writes the literal again.
 *
 * **The scan reads each entry in the same pass that lists it**, and skips one a
 * concurrent writer removed. Five sessions write this tree, so a listing can
 * name a file that is gone by the time it is opened: reproduced 2026-10-22 with
 * the same list-then-open walk over a directory another process was writing,
 * which threw `ENOENT: no such file or directory, open '…/tmp-6.tsx'` **106
 * times in one five-second run**. That is the class this suite once failed with
 * (a single occurrence in a full-package run, stack through the walk). Every
 * other failure — a permission error, a missing directory — still fails the
 * suite rather than shrinking the scan, and a source floor keeps a scan that
 * read nothing from passing the contract vacuously.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);

/** One source file and the text read from it in the same pass. */
interface Source {
  readonly path: string;
  readonly body: string;
}

/** What a scan read, and what it could not read for a reason worth failing. */
interface Scan {
  readonly sources: ReadonlyArray<Source>;
  readonly failures: ReadonlyArray<string>;
}

const empty: Scan = { sources: [], failures: [] };

/** True for an entry another session removed between the listing and the read. */
const vanished = (error: unknown): boolean =>
  P.isObject(error) && "code" in error && error.code === "ENOENT";

/** Merge two scans, keeping their order. */
const merge = (left: Scan, right: Scan): Scan => ({
  sources: [...left.sources, ...right.sources],
  failures: [...left.failures, ...right.failures],
});

/** A failed read, unless it is the vanished-entry case the scan tolerates. */
const failure = (path: string, error: unknown): Scan =>
  vanished(error)
    ? empty
    : { sources: [], failures: [`${path}: ${String(error)}`] };

/** Read one listed entry. */
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

/** Every readable source file under `relative`, recursively, minus suites. */
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

const { sources, failures } = scan("src/");

/** A floating host plus the presence seam: a surface that can cover a control. */
const floating = Arr.filter(sources, ({ body }) => {
  return (
    Str.includes("useSurfacePresence(")(body) &&
    (Str.includes("<FloatingLayer")(body) || Str.includes("<anchored")(body))
  );
});

/** The guard a leaving surface paints: no presses while its exit runs. */
const guard = /presenceStyle\(/;
const occludeGuard = /occlude=\{(?:presence\.)?present\}/;

/**
 * A surface whose presence is a constant: it mounts once and never leaves, so
 * it has no exit for a press to land in.
 */
const neverLeaves = /useSurfacePresence\(\s*true\b/;

/** The literal the guard replaced, before it had a home in the seam. */
const inlineGuard =
  /pointerEvents:\s*(?:presence\.)?present\s*\?\s*"auto"\s*:\s*"none"/;

/** The opening tag of a host, so an attribute is read where it is written. */
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
    // The read that used to throw is the one path a concurrent writer can
    // empty: a file listed a moment ago and gone at open time.
    expect(readEntry("src/__vanished_between_listing_and_read__.tsx")).toEqual(
      empty,
    );
    expect(readEntry("src/alert.tsx").sources).toHaveLength(1);

    expect(failures).toEqual([]);
    // A scan that read nothing cannot satisfy the contract below by accident.
    expect(sources.length).toBeGreaterThan(100);
  });

  it("covers every floating surface, so the rule cannot pass on an empty tree", () => {
    // A floor rather than the exact count: a new surface joins the rule.
    expect(Arr.length(floating)).toBeGreaterThanOrEqual(6);
  });

  it("a floating surface takes no press while it leaves", () => {
    const offenders = Arr.filterMap(floating, ({ path, body }) =>
      guard.test(body) ? Result.failVoid : Result.succeed(path),
    );
    expect(offenders).toEqual([]);
  });

  it("every surface that stays painted for an exit takes no press", () => {
    // The bug this guards: the rule lived as a literal in eight floating
    // surfaces, and the two that stayed mounted without copying it — `Reveal`
    // and `AutoHeight` — ran a press on content the reader could no longer see.
    // The seam owns the rule now; this case reads every surface it keeps.
    const mounted = Arr.filter(
      sources,
      ({ body }) =>
        (Str.includes("useSurfacePresence(")(body) ||
          Str.includes("presenceMotion(")(body)) &&
        !neverLeaves.test(body),
    );
    // A floor rather than the exact count: a new surface joins the rule.
    expect(Arr.length(mounted)).toBeGreaterThanOrEqual(10);
    const offenders = Arr.filterMap(mounted, ({ path, body }) =>
      guard.test(body) ? Result.failVoid : Result.succeed(path),
    );
    expect(offenders).toEqual([]);
  });

  it("keeps the guard in one home", () => {
    // Eight copies and two omissions were one rule; a ninth copy is how the
    // next omission happens.
    const copies = Arr.filterMap(sources, ({ path, body }) =>
      inlineGuard.test(body) ? Result.succeed(path) : Result.failVoid,
    );
    expect(copies).toEqual(["src/internal/presence.tsx"]);
  });

  it("a pointer-placed host drops its occlusion with its presence", () => {
    // A deferred host is placed at a point after measurement, and its box is the
    // surface: the occlusion is a native mouse block its child's `pointerEvents`
    // cannot undo (measured on the context menu: with only the style guard the
    // press case failed `expected +0 to be 1`). The modal veil is deliberately
    // exempt — its `<anchored>` is a zero-size anchor at the window origin and
    // its backdrop child owns the box, which `presence.test.tsx` measures a press
    // through while the modal leaves.
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

/** A stagger spread onto a house timing, which re-implements the reduced rule. */
const inlineDelay = /\.\.\.timing(?:\.\w+)?\s*,\s*delay\s*:/;

/** The arrivals that queue behind a stagger, and the seam that builds it. */
const staggered = [
  "src/reveal.tsx",
  "src/avatar-group.tsx",
  "src/splitting-text.tsx",
] as const;
const timingSeam = "src/internal/presence.tsx";
const retiredDelayCopies = ["groupEntering", "unitTransition"] as const;

describe("the house timing", () => {
  it("gains a delay in one place, so the reduced rule has one home", () => {
    // The bug this guards: `Reveal` spread `delayMs` onto the reduced timing
    // itself, and the runtime waits a delay out *before* an instant assignment —
    // so a reduced reveal sat at its first frame for the whole stagger. Its two
    // siblings had each written the correct rule in their own logic module.
    const offenders = Arr.filterMap(sources, ({ path, body }) =>
      inlineDelay.test(body) ? Result.succeed(path) : Result.failVoid,
    );
    expect(offenders).toEqual([timingSeam]);
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

  it("still drops the delay under a reduced timing, so the rule cannot pass by deletion", () => {
    const seam = Option.getOrElse(
      Option.map(
        Arr.findFirst(sources, (source) => source.path === timingSeam),
        (source) => source.body,
      ),
      () => {
        throw new Error(`timing contract: ${timingSeam} was not read`);
      },
    );
    expect(Str.includes("export const delayedTiming")(seam)).toBe(true);
    expect(Str.includes("timing.duration === 0")(seam)).toBe(true);
    expect(Str.includes("delay: delayMs / 1000")(seam)).toBe(true);
  });
});

/** A source that reads a surface timing's own duration. */
const readsTimingDuration = (body: string): boolean =>
  Str.includes("timing.enter.duration")(body) ||
  Str.includes("timing.exit.duration")(body);

/** The seam's one conversion from a timing's seconds to a hold window. */
const windowConversion = /(?:transitionWindowMs|exitWindowMs)\(/;

/** A source that keeps a box painted for a timing, through the seam or by hand. */
const holdsForTiming = (body: string): boolean =>
  Str.includes("setTimeout")(body) &&
  (windowConversion.test(body) || readsTimingDuration(body));

/**
 * A source that computes its own millisecond window out of a raw duration.
 *
 * `readsTimingDuration` alone only proves a source *uses* the seam somewhere;
 * a file that keeps one window through the helper and divides the second by
 * hand still holds a box for a span the seam does not own. This is the shape a
 * reintroduced copy has.
 */
const handBuiltWindow = (body: string): boolean =>
  Str.includes("setTimeout")(body) &&
  Str.includes(".duration")(body) &&
  (Str.includes("Math.round(")(body) || Str.includes("* 1000")(body));

describe("the hold window", () => {
  it("is the seam's conversion, so a delayed run keeps its box", () => {
    // The bug this guards: `PageTransition` divided its own window out of the
    // timing (`Math.round((timing.exit.duration ?? 0) * 1000)`), a second copy
    // of the rule `transitionWindowMs` exists to own. The runtime waits a
    // delayed run's first frame for `delay`, so a hand-built window counted only
    // the duration and unmounted a view before its journey began — and a delay
    // change did not re-run the timer at all. The seam's conversion is one home
    // for the duration *and* the wait, and a hold window counts whether it
    // reaches the rule through the helper or still reads the raw duration — the
    // second is exactly what this case has to see in order to fail it.
    // `gradient-text` and `splitting-text` read the duration only to report the
    // reduced preference, so they are not hold windows.
    const holding = Arr.filter(sources, ({ body }) => holdsForTiming(body));
    // A scan that reads no hold window cannot pass vacuously.
    expect(Arr.length(holding)).toBeGreaterThan(0);
    const offenders = Arr.filterMap(holding, ({ path, body }) =>
      windowConversion.test(body) ? Result.failVoid : Result.succeed(path),
    );
    expect(offenders).toEqual([]);
    // The seam is the one home for the conversion; a source that divides a
    // window out of a duration beside a seamed one holds a span it does not own.
    const handBuilt = Arr.filterMap(sources, ({ path, body }) =>
      path !== timingSeam && handBuiltWindow(body)
        ? Result.succeed(path)
        : Result.failVoid,
    );
    expect(handBuilt).toEqual([]);
  });
});

/** The layer a surface paints over the content it keeps for its exit. */
const shield = /<PresenceShield\b/;

/** The shared menu box, which paints the shield for both menu roots. */
const sharedShield = /<MenuSurface\b/;

/** A shield handed a constant, which covers a surface that is not leaving. */
const constantShield = /<PresenceShield\b[^>]*present=\{(?:true|false)\}/;

describe("the leaving shell", () => {
  it("covers the content it keeps mounted for its exit", () => {
    // The bug this guards: the seam removes a surface's **own** hitbox and
    // nothing it holds (`pointerEvents` does not inherit), so a card or panel
    // that stays painted for its exit must cover its content. The rule was one
    // omission away from the surface it was written for: a dismissed notice kept
    // its action painted with nothing over it, so the ghost's `Undo` answered a
    // press. Every surface the seam keeps paints the shield itself; the two menu
    // roots get it from the shared `MenuSurface` they render.
    const mounted = Arr.filter(
      sources,
      ({ body }) =>
        (Str.includes("useSurfacePresence(")(body) ||
          Str.includes("presenceMotion(")(body)) &&
        !neverLeaves.test(body),
    );
    // A floor rather than the exact count: a new surface joins the rule.
    expect(Arr.length(mounted)).toBeGreaterThanOrEqual(10);
    const offenders = Arr.filterMap(mounted, ({ path, body }) =>
      shield.test(body) || sharedShield.test(body)
        ? Result.failVoid
        : Result.succeed(path),
    );
    expect(offenders).toEqual([]);
  });

  it("is derived from the state that owns it, never a constant", () => {
    // A shield painted while the surface is open covers the controls the reader
    // is using, which is the opposite failure to a missing one.
    const offenders = Arr.filterMap(sources, ({ path, body }) =>
      constantShield.test(body) ? Result.succeed(path) : Result.failVoid,
    );
    expect(offenders).toEqual([]);
  });
});

/** The claim the shield replaced on the reveal's own page. */
const retractedPressClaim = "still takes a press";

describe("the reveal's page", () => {
  it("does not teach a collapsing body answering a press", () => {
    // The bug this guards: `docs/auto-height.mdx` listed "a filled control
    // inside a collapsing body still takes a press" as a limitation after the
    // seam's shield had been measured taking that press, so the one page a
    // consumer reads taught the opposite of the behaviour.
    const page = readEntry("docs/auto-height.mdx");
    expect(page.failures).toEqual([]);
    const body = Option.getOrElse(
      Option.map(Arr.head(page.sources), (source) => source.body),
      () => "",
    );
    expect(Str.includes(retractedPressClaim)(body)).toBe(false);
    // The rule is stated where the reader meets the component, rather than left
    // to the seam's source.
    expect(Str.includes("PresenceShield")(body)).toBe(true);
    expect(Str.includes("takes no presses")(body)).toBe(true);
  });
});

/** The per-surface motion table `docs/component-api.md` §11 publishes. */
const apiDoc = readEntry("../../docs/component-api.md");

/** The whole document, or `""` when it could not be read. */
const apiBody = Option.getOrElse(
  Option.map(Arr.head(apiDoc.sources), (source) => source.body),
  () => "",
);

/**
 * The table under §11's `**Per surface:**` marker.
 *
 * The document carries other tables (the component inventory among them, with a
 * `Drawer` row of its own), so the rows are read from the marked section alone —
 * a scan of every `|` line matched the inventory's `Drawer` first and read a
 * component row as a motion claim.
 */
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

/** The cells of one table line, trimmed. */
const cellsOf = (line: string): ReadonlyArray<string> =>
  Arr.map(Arr.filter(Str.split("|")(line), Str.isNonEmpty), (cell) =>
    Str.trim(cell),
  );

/** The row whose first cell names `surface`, as all of its cells. */
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

/**
 * One surface the table names: what it must print and the source that paints it.
 *
 * The bug this guards: the table taught the toast as "fade + 16px from the right
 * edge" on the `notice` level after the card was rewritten to rise 16px on its
 * own 220 ms entry and slide 16px right on a 180 ms exit, and nothing read the
 * table against the painters — so the one document a consumer learns the
 * movement from described a surface the library no longer shipped. Each entry
 * below is a claim the table makes, held to the literal its painter writes.
 */
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
    prints: ["fade", "12px", "slow"],
    paints: [
      { file: "src/drawer.tsx", marker: "fadeFromSide(side, 12)" },
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
    prints: ["4px", "normal"],
    paints: [
      { file: "src/mention-input.tsx", marker: 'fadeFromAnchor("bottom", 4)' },
    ],
  },
  {
    surface: "Preview card",
    prints: ["4px", "fast"],
    paints: [
      { file: "src/preview-card.tsx", marker: "fadeFromAnchor(side, 4)" },
      { file: "src/preview-card.tsx", marker: 'useSurfaceTiming("fast")' },
    ],
  },
  {
    surface: "Toast",
    prints: ["16px", "rise", "slide", "220 ms", "180 ms"],
    paints: [
      { file: "src/toast/viewport.tsx", marker: "top: 16" },
      { file: "src/toast/viewport.tsx", marker: "left: 16" },
      { file: "src/toast/viewport.tsx", marker: "motionTimingOf(220" },
      { file: "src/toast/viewport.tsx", marker: "motionTimingOf(180" },
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
    prints: ["width", "normal"],
    paints: [{ file: "src/tabs.tsx", marker: 'useSurfaceTiming("normal")' }],
  },
  {
    surface: "Carousel indicator",
    prints: ["width", "fast"],
    paints: [{ file: "src/carousel.tsx", marker: 'useSurfaceTiming("fast")' }],
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

/** The cells of a row as one lowercase sentence, for a printed claim. */
const rowText = (surface: string): string =>
  Str.toLowerCase(Arr.join(Arr.drop(rowOf(surface), 1), " "));

describe("the per-surface table", () => {
  it("prints the movement and level its painter writes", () => {
    expect(apiDoc.failures).toEqual([]);
    // A parse that read no table cannot satisfy the claims below.
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

  it("teaches the toast's own timing, not the level it left behind", () => {
    // The retracted reading: the card used to come in from the right edge on the
    // shared `notice` level. A row that names either again sends a consumer to a
    // motion the library does not paint.
    const text = rowText("Toast");
    expect(Str.includes("from the right edge")(text)).toBe(false);
    expect(Str.includes("notice")(text)).toBe(false);
    expect(Str.includes("motiontimingof")(text)).toBe(true);
    // Both halves are stated: the rise it arrives on and the slide it leaves on.
    expect(Str.includes("rise")(text)).toBe(true);
    expect(Str.includes("slide")(text)).toBe(true);
  });
});
