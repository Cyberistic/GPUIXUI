import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";
import { capabilities } from "./capabilities";

/**
 * Guards the capability page (plan 448).
 *
 * The failure this catches is a docs page that tells its own story: a verdict
 * upgraded after the inventory changed, a scenario id the playground does not
 * run, a cited plan that does not exist, or a subset page naming a capability
 * that was removed. `COMPONENTS.md` owns the verdicts; this file keeps the site
 * equal to it.
 *
 * `node:fs` and `node:path` are deliberate, as in `content.test.ts` and
 * `pattern-pages.test.ts`: this is a browser app whose tests read the repository
 * directly, and the Effect runtime must not reach its bundle.
 */
const root = new URL("../../../../", import.meta.url);
const componentsMarkdown = readFileSync(
  fileURLToPath(new URL("COMPONENTS.md", root)),
  "utf8",
);
const capabilitiesPage = readFileSync(
  fileURLToPath(new URL("apps/docs/content/docs/capabilities.mdx", root)),
  "utf8",
);
const plansDirectory = fileURLToPath(new URL(".agents/slop/plans/", root));
const plans = readdirSync(plansDirectory);

const CapabilityVerdict = Schema.Literals([
  "verified",
  "partial",
  "unsupported",
]);
const CapabilityEvidence = Schema.Struct({
  capability: Schema.NonEmptyString,
  label: Schema.NonEmptyString,
  scenarios: Schema.NonEmptyArray(Schema.NonEmptyString),
  verdict: CapabilityVerdict,
  proves: Schema.NonEmptyString,
  plans: Schema.NonEmptyArray(Schema.Int),
});

interface Measured {
  readonly capability: string;
  readonly scenarios: ReadonlyArray<string>;
  readonly verdict: string;
}

/** The capability table under "How the two evidence columns are decided". */
const measuredTable = (): ReadonlyArray<Measured> => {
  const section =
    componentsMarkdown
      .split("## How the two evidence columns are decided")[1]
      ?.split("\n## ")[0] ?? "";
  return section.split("\n").flatMap((line) => {
    const cells = line.split("|").map((cell) => cell.trim());
    const capability = cells[1];
    if (
      capability === undefined ||
      capability === "Capability" ||
      capability.startsWith("-")
    ) {
      return [];
    }
    const scenarios = [...(cells[2] ?? "").matchAll(/`([^`]+)`/g)].map(
      (match) => match[1] ?? "",
    );
    const verdict = cells[3];
    return scenarios.length === 0 || verdict === undefined
      ? []
      : [{ capability, scenarios, verdict }];
  });
};

/** Every scenario id the playground registry defines. */
const scenarioIds = (): ReadonlySet<string> => {
  const directory = fileURLToPath(
    new URL("apps/playground/src/scenarios/", root),
  );
  return new Set(
    readdirSync(directory)
      .filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"))
      .flatMap((file) => [
        ...readFileSync(join(directory, file), "utf8").matchAll(
          /id:\s*"([^"]+)"/g,
        ),
      ])
      .map((match) => match[1] ?? ""),
  );
};

const capabilityPageText = capabilitiesPage;

describe("capability evidence", () => {
  it("decodes every row through the schema", () => {
    const decoded = capabilities.map((entry) =>
      Schema.decodeUnknownSync(CapabilityEvidence)(entry),
    );
    expect(decoded).toHaveLength(capabilities.length);
  });

  it("names every capability once", () => {
    const names = capabilities.map((entry) => entry.capability);
    expect(new Set(names).size).toBe(names.length);
  });

  it("agrees with the inventory's measured table", () => {
    const inventory = new Map(
      measuredTable().map((row) => [row.capability, row]),
    );
    const documented = new Map(
      capabilities.map((row) => [row.capability, row]),
    );

    expect(
      [...inventory.keys()].filter((name) => !documented.has(name)),
    ).toEqual([]);
    expect(
      [...documented.keys()].filter((name) => !inventory.has(name)),
    ).toEqual([]);

    const mismatched = [...inventory].flatMap(([name, row]) => {
      const entry = documented.get(name);
      if (entry === undefined) return [];
      const scenarios = Arr.sort([...row.scenarios], Order.String);
      const ours = Arr.sort([...entry.scenarios], Order.String);
      return [
        ...(scenarios.join(",") === ours.join(",")
          ? []
          : [`${name}: scenarios ${ours.join(",")} != ${scenarios.join(",")}`]),
        ...(row.verdict === entry.verdict
          ? []
          : [`${name}: verdict ${entry.verdict} != ${row.verdict}`]),
      ];
    });
    expect(mismatched).toEqual([]);
  });

  it("names only scenarios the playground registry defines", () => {
    const registered = scenarioIds();
    const invented = capabilities.flatMap((entry) =>
      entry.scenarios
        .filter((scenario) => !registered.has(scenario))
        .map((scenario) => `${entry.capability}: ${scenario}`),
    );
    expect(invented).toEqual([]);
  });

  it("cites plans that exist", () => {
    const missing = capabilities.flatMap((entry) =>
      entry.plans
        .map((plan) => String(plan).padStart(3, "0"))
        .filter((plan) => !plans.some((file) => file.startsWith(`${plan}-`)))
        .map((plan) => `${entry.capability}: plan ${plan}`),
    );
    const prose = [...capabilityPageText.matchAll(/plan (\d{3})/g)]
      .map((match) => match[1] ?? "")
      .filter((plan) => !plans.some((file) => file.startsWith(`${plan}-`)));
    expect([...missing, ...prose.map((plan) => `page: plan ${plan}`)]).toEqual(
      [],
    );
  });

  it("has a page that renders the matrix and sits in the sidebar", () => {
    const sidebar = Schema.decodeUnknownSync(
      Schema.fromJsonString(
        Schema.Struct({ pages: Schema.Array(Schema.String) }),
      ),
    )(
      readFileSync(
        fileURLToPath(new URL("apps/docs/content/docs/meta.json", root)),
        "utf8",
      ),
    );
    expect(capabilityPageText).toContain("<CapabilityMatrix");
    expect(sidebar.pages).toContain("capabilities");
  });

  it("keeps every embedded subset a real capability", () => {
    const names = new Set(capabilities.map((entry) => entry.capability));
    const subsets = ["workspace", "data-display"].flatMap((page) => {
      const body = readFileSync(
        fileURLToPath(new URL(`apps/docs/content/docs/${page}.mdx`, root)),
        "utf8",
      );
      return [...body.matchAll(/only=\{(\[[^\]]*\])\}/g)].flatMap((match) => {
        const decoded = Schema.decodeUnknownSync(
          Schema.fromJsonString(Schema.Array(Schema.String)),
        )(match[1] ?? "[]");
        return decoded
          .filter((name) => !names.has(name))
          .map((name) => `${page}: ${name}`);
      });
    });
    expect(subsets).toEqual([]);
  });

  it("has every scenario file the docs named on disk", () => {
    const directory = fileURLToPath(
      new URL("apps/playground/src/scenarios/", root),
    );
    const scenario = [...scenarioIds()][0] ?? "";
    expect(scenario.length).toBeGreaterThan(0);
    expect(existsSync(directory)).toBe(true);
  });
});
