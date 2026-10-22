/**
 * Guards the probe registry against the README.
 *
 * A live probe is only evidence if its measurement is written down: the README
 * is what the docs site and a release report cite, so a probe added without a
 * section — or a section left behind after a probe is dropped — is a native
 * claim nobody can read. The heading pins the runtime version it was measured
 * on, because "a probe exists" and "this probe passed on 0.11.0" are different
 * claims and a version bump has to re-measure rather than inherit.
 *
 * `node:fs` is deliberate, as in `packages/tokens/src/docs.test.ts`: this is a
 * check over the repository's own Markdown, not a runtime path.
 */

import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

/** The probe ids the README measures, in the order its sections appear. */
const documented = readme
  .split("\n")
  .filter((line) => line.startsWith("### `"))
  .flatMap((line) => {
    const match = /^### `([^`]+)` — measured on 0\.11\.0 here$/.exec(line);
    return match === null ? [] : [match[1]];
  });

/**
 * The critical-interaction rows: the interaction's name and every probe id its
 * cells name, in the table's own order.
 */
const interactionRows = (): ReadonlyArray<{
  readonly interaction: string;
  readonly probes: ReadonlyArray<string>;
}> => {
  const start = readme.indexOf("### The critical interactions");
  const after = start === -1 ? "" : readme.slice(start);
  const rows = Arr.takeWhile(
    Arr.dropWhile(after.split("\n"), (line) => !line.startsWith("|")),
    (line) => line.startsWith("|"),
  );
  return Arr.getSomes(Arr.map(rows, parseInteractionRow));
};

/** One table line as a row, or `None` for the header and the separator. */
const parseInteractionRow = (
  line: string,
): Option.Option<{
  readonly interaction: string;
  readonly probes: ReadonlyArray<string>;
}> => {
  const cells = line.split("|");
  const interaction = cells[1]?.trim() ?? "";
  if (
    interaction === "" ||
    interaction === "Critical interaction" ||
    interaction.startsWith("---")
  ) {
    return Option.none();
  }
  const probes = Arr.filter(
    Arr.map(
      [...(cells[2] ?? "").matchAll(/`([^`]+)`/g)],
      (match) => match[1] ?? "",
    ),
    (id) => id.length > 0,
  );
  return Option.some({ interaction, probes });
};

describe("live probe documentation", () => {
  it("documents every registered probe under the version it was measured on", () => {
    expect(documented).toEqual(liveRegistry.map((probe) => probe.id));
  });

  it("measures every critical interaction the mission names, with registered probes", () => {
    // The mission's representative list is what "tested in the real runtime"
    // means; a row that loses its probes, or an id a rename retired, would leave
    // the claim unreadable rather than red.
    const rows = interactionRows();
    expect(rows.map((row) => row.interaction)).toEqual([
      "dialog open/close/confirm",
      "menu selection/dismissal",
      "input update/validation",
      "tabs and panel switching",
      "theme switching",
      "table sort/selection",
      "panel resizing",
      "workspace restore",
    ]);
    const registered = new Set<string>(
      Arr.map(liveRegistry, (probe) => probe.id),
    );
    // Both directions: a row may not lose its probes, and no row may name an
    // id the registry no longer declares.
    expect(Arr.filter(rows, (row) => row.probes.length === 0)).toEqual([]);
    expect(
      Arr.filter(
        Arr.flatMap(rows, (row) =>
          Arr.map(row.probes, (id) => ({ interaction: row.interaction, id })),
        ),
        (entry) => !registered.has(entry.id),
      ),
    ).toEqual([]);
  });

  it("prints the probes it ran and the ones a partial pass left red", () => {
    // The intro said "thirty-seven" while 39 probes were registered: a count a
    // reader uses to tell a partial pass from a complete one, written by hand.
    // The suite line is the other half: a full pass prints the registry's size
    // twice, and a partial one names exactly the probes that did not pass, so a
    // red probe cannot be left out of the sentence that reports it. The third
    // part is the probes registered *after* that pass and measured alone: they
    // are neither green in that run nor reds, so the sentence must name them or
    // a probe can be added without any measurement being reported at all.
    const intro = /the\s+(\d+) probes a real window can prove/.exec(readme);
    expect(intro?.[1]).toBe(`${liveRegistry.length}`);

    const start = readme.indexOf("The last full pass was");
    const bullet =
      start === -1 ? "" : readme.slice(start, readme.indexOf("\n\n", start));
    const suite = /\*\*(\d+)\/(\d+)\*\*/.exec(bullet);
    const passed = Number(suite?.[1] ?? Number.NaN);
    const total = Number(suite?.[2] ?? Number.NaN);

    // The bullet is wrapped prose, so a marker can be split across a line: the
    // clauses are read from one line of text, not from the file's wrapping.
    const text = bullet.replace(/\s+/g, " ");

    /** The backticked ids a clause names, up to the parenthesis after it. */
    const idsIn = (marker: string): ReadonlyArray<string> => {
      const at = text.indexOf(marker);
      if (at === -1) return [];
      const from = at + marker.length;
      const to = text.indexOf("(", from);
      const clause = text.slice(from, to === -1 ? text.length : to);
      return Arr.filter(
        Arr.map([...clause.matchAll(/`([^`]+)`/g)], (match) => match[1] ?? ""),
        (id) => id.length > 0,
      );
    };
    const reds = idsIn("the reds were:");
    const alone = idsIn("Measured alone since then:");

    // The pass accounts for the probes it covered, and the registry is the pass
    // plus the probes named as measured alone afterwards.
    expect(passed + reds.length).toBe(total);
    expect(total + alone.length).toBe(liveRegistry.length);

    const registered = new Set<string>(
      Arr.map(liveRegistry, (probe) => probe.id),
    );
    expect(
      Arr.filter(Arr.appendAll(reds, alone), (id) => !registered.has(id)),
    ).toEqual([]);
    expect(Arr.filter(reds, (id) => Arr.contains(alone, id))).toEqual([]);
  });
});
