import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  capabilityGroups,
  playgroundSuites,
  type PlaygroundSuite,
} from "@/lib/playground-registry";
import { PlaygroundScenarios } from "./playground-scenarios";

/**
 * The probe catalogue on `/playground`.
 *
 * The page's whole value is that it lists what the native app actually runs, so
 * the render is held in both directions: every suite's count, host, source and
 * entries are printed, and a suite the parser could not fully read says so
 * instead of looking complete.
 */

const markup = (suites?: ReadonlyArray<PlaygroundSuite>): string =>
  renderToStaticMarkup(
    suites === undefined ? (
      <PlaygroundScenarios />
    ) : (
      <PlaygroundScenarios suites={suites} />
    ),
  );

const suite = (
  overrides: Partial<PlaygroundSuite> & Pick<PlaygroundSuite, "name">,
): PlaygroundSuite => ({
  source: "apps/playground/src/scenarios/registry.ts",
  host: "real window",
  probes: [],
  problems: [],
  ...overrides,
});

describe("the playground catalogue", () => {
  it("prints every suite with its count, host, source and entries", () => {
    const page = markup();

    expect(
      playgroundSuites.flatMap((entry) => {
        const groupCount = capabilityGroups(entry.probes).length;
        const missing = [
          [`suite ${entry.name}`, entry.name],
          [`host for ${entry.name}`, entry.host],
          [`source for ${entry.name}`, entry.source],
          [
            `count for ${entry.name}`,
            `${entry.probes.length} probes · ${groupCount} capabilities`,
          ],
        ].filter(([, text]) => !page.includes(text ?? ""));
        return missing.map(([label]) => label);
      }),
    ).toEqual([]);

    // Entries, not just headings: the ids and their measured sentences.
    const live = playgroundSuites.find((entry) => entry.name === "Live probes");
    expect(live?.probes.length ?? 0).toBeGreaterThanOrEqual(100);
    expect(page).toContain("dialog-lifecycle");
    expect(page).toContain("field-ink");
    expect(page).toContain(
      live?.probes[0]?.title ?? "a title that is not here",
    );
  });

  it("groups entries by capability and opens a short suite", () => {
    const page = markup([
      suite({
        name: "Fixture",
        probes: [
          { id: "first", title: "The first probe", capability: "virtual-list" },
          { id: "second", title: "The second probe", capability: "focus" },
        ],
      }),
    ]);

    expect(page).toContain("Virtual list");
    expect(page).toContain("Focus");
    expect(page.match(/<details/g)).toHaveLength(2);
    // Two groups is short enough to open: a reader is not left with a closed
    // list on a page whose point is the list.
    expect(page.match(/open=""/g)).toHaveLength(2);
  });

  it("reports an entry it could not read instead of looking complete", () => {
    const page = markup([
      suite({
        name: "Fixture",
        probes: [{ id: "read", title: "Read", capability: "focus" }],
        problems: ["`broken` is declared but not read as id/title/capability"],
      }),
    ]);

    expect(page).toContain('role="alert"');
    expect(page).toContain("could not read 1 entry");
    expect(page).toContain("`broken` is declared but not read");
  });
});
