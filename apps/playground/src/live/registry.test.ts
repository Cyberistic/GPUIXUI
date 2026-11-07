import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const documented = readme
  .split("\n")
  .filter((line) => line.startsWith("### `"))
  .flatMap((line) => {
    const match = /^### `([^`]+)` — measured on 0\.11\.0 here$/.exec(line);
    return match === null ? [] : [match[1]];
  });

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
    const rows = interactionRows();
    expect(rows.map((row) => row.interaction)).toEqual([
      "button activation",
      "dialog open/close/confirm",
      "menu selection/dismissal",
      "input update/validation",
      "tabs and panel switching",
      "theme switching",
      "table sort/selection",
      "filtering/search",
      "empty and error states",
      "panel resizing",
      "workspace restore",
    ]);
    const registered = new Set<string>(
      Arr.map(liveRegistry, (probe) => probe.id),
    );

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
    const intro = /the\s+(\d+) probes a real window can prove/.exec(readme);
    expect(intro?.[1]).toBe(`${liveRegistry.length}`);

    const start = readme.indexOf("The last full pass was");
    const bullet =
      start === -1 ? "" : readme.slice(start, readme.indexOf("\n\n", start));
    const suite = /\*\*(\d+)\/(\d+)\*\*/.exec(bullet);
    const passed = Number(suite?.[1] ?? Number.NaN);
    const total = Number(suite?.[2] ?? Number.NaN);

    const text = bullet.replace(/\s+/g, " ");

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
