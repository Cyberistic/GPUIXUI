import headlessSource from "../../../playground/src/scenarios/registry.ts?raw";
import liveSource from "../../../playground/src/live/registry.ts?raw";
import terminalSource from "../../../playground/src/terminal/run.ts?raw";

/**
 * The companion playground's catalogue, read from its own registries.
 *
 * The site cannot render the native library, so `/playground` is the page
 * that sends a reader to the app that can — and a hand-written list of probes
 * drifts the moment one is added. The three registries are the single source of
 * truth the runners' `--list` prints, so the page reads them at build time
 * instead of restating them.
 *
 * The registries are parsed as source rather than imported: the headless one
 * pulls in `effect`, and the terminal one a pty runner, neither of which the
 * docs app should depend on to print a table. The parse is narrow on purpose —
 * `id`, `title` and `capability` in that order, the shape all three files use —
 * and reports a problem instead of dropping an entry, so a reformat that breaks
 * it fails a guard rather than shrinking the page silently.
 */

/** One probe a playground suite declares. */
export interface PlaygroundProbe {
  readonly id: string;
  readonly title: string;
  readonly capability: string;
}

/** Which host a suite runs against; the two are not interchangeable. */
export type PlaygroundHost = "offscreen renderer" | "real window" | "pty";

/** One suite: its registry, the host it needs, and what it declares. */
export interface PlaygroundSuite {
  /** What the page calls the suite. */
  readonly name: string;
  /** The registry's file, repo-relative, so a reader can find an entry. */
  readonly source: string;
  readonly host: PlaygroundHost;
  readonly probes: ReadonlyArray<PlaygroundProbe>;
  /** Entries the parse could not read; `playground-page.test.ts` requires none. */
  readonly problems: ReadonlyArray<string>;
}

/** `id`, `title` and `capability` in the order every registry writes them. */
const entry =
  /id:\s*"([^"]+)",\s*title:\s*"((?:[^"\\]|\\.)*)",\s*capability:\s*"([^"]+)"/g;

/** A registry entry's id, on its own line or after an opening brace. */
const declared = /(?:^|\n)\s*(?:\{\s*)?id:\s*"([^"]+)",/g;

/** A title is a TypeScript double-quoted string; undo the two escapes it may use. */
const unescape = (text: string): string => text.replace(/\\(["\\])/g, "$1");

/** Read one registry's entries, and name every entry the shape did not match. */
export const readProbes = (
  source: string,
): {
  readonly probes: ReadonlyArray<PlaygroundProbe>;
  readonly problems: ReadonlyArray<string>;
} => {
  const ids = [...source.matchAll(declared)].map((match) => match[1] ?? "");
  const probes = [...source.matchAll(entry)].map((match) => ({
    id: match[1] ?? "",
    title: unescape(match[2] ?? ""),
    capability: match[3] ?? "",
  }));
  const seen = new Set(probes.map((probe) => probe.id));

  const problems = [
    ...ids
      .filter((id) => !seen.has(id))
      .map((id) => `\`${id}\` is declared but not read as id/title/capability`),
    ...[...seen]
      .filter((id) => ids.filter((declaredId) => declaredId === id).length > 1)
      .map((id) => `\`${id}\` is declared more than once`),
    ...probes
      .filter((probe) => probe.title.trim() === "" || probe.capability === "")
      .map((probe) => `\`${probe.id}\` has no title or capability`),
  ];

  return { probes, problems };
};

/** A suite on the page, built from its registry. */
const suite = (
  name: string,
  source: string,
  host: PlaygroundHost,
  raw: string,
): PlaygroundSuite => ({ name, source, host, ...readProbes(raw) });

/** The three suites the playground runs, in the order its README introduces them. */
export const playgroundSuites: ReadonlyArray<PlaygroundSuite> = [
  suite(
    "Headless scenarios",
    "apps/playground/src/scenarios/registry.ts",
    "offscreen renderer",
    headlessSource,
  ),
  suite(
    "Live probes",
    "apps/playground/src/live/registry.ts",
    "real window",
    liveSource,
  ),
  suite(
    "Terminal probes",
    "apps/playground/src/terminal/run.ts",
    "pty",
    terminalSource,
  ),
];

/** One capability's probes, in the order the registry first names it. */
export interface CapabilityGroup {
  readonly capability: string;
  readonly label: string;
  readonly probes: ReadonlyArray<PlaygroundProbe>;
}

/** `virtual-list` reads as `Virtual list`; the registry uses kebab-case keys. */
export const capabilityLabel = (capability: string): string =>
  capability
    .split("-")
    .map((part, index) =>
      index === 0 ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part,
    )
    .join(" ");

/** A suite's probes grouped by capability, in first-appearance order. */
export const capabilityGroups = (
  probes: ReadonlyArray<PlaygroundProbe>,
): ReadonlyArray<CapabilityGroup> => {
  const order = probes.reduce<ReadonlyArray<string>>(
    (names, probe) =>
      names.includes(probe.capability) ? names : [...names, probe.capability],
    [],
  );

  return order.map((capability) => ({
    capability,
    label: capabilityLabel(capability),
    probes: probes.filter((probe) => probe.capability === capability),
  }));
};

/** The capabilities one suite covers, for a count that cannot drift. */
export const capabilitiesOf = (
  probes: ReadonlyArray<PlaygroundProbe>,
): number => capabilityGroups(probes).length;
