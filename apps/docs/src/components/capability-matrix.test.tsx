import { renderToStaticMarkup } from "react-dom/server";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import { describe, expect, it } from "vitest";
import { capabilities } from "@/lib/capabilities";
import { CapabilityMatrix } from "./capability-matrix";

/**
 * Guards the capability matrix (plan 448). The failure it catches is a table
 * that renders fewer rows than the module declares, drops a scenario the page
 * promises, or prints the raw verdict enum where the reader needs a word. The
 * source contract lives in `capabilities.test.ts`; this file checks the markup.
 */
const html = renderToStaticMarkup(<CapabilityMatrix />);

const attributeValues = (name: string): ReadonlyArray<string> =>
  [...html.matchAll(new RegExp(`${name}="([^"]*)"`, "g"))].map(
    (match) => match[1] ?? "",
  );

describe("capability matrix", () => {
  it("renders one row per capability", () => {
    expect(Arr.sort(attributeValues("data-capability"), Order.String)).toEqual(
      Arr.sort(
        capabilities.map((entry) => entry.capability),
        Order.String,
      ),
    );
  });

  it("renders every scenario the matrix names", () => {
    const rendered = new Set(attributeValues("data-scenario"));
    const missing = capabilities.flatMap((entry) =>
      entry.scenarios
        .filter((scenario) => !rendered.has(scenario))
        .map((scenario) => `${entry.capability}: ${scenario}`),
    );
    expect(missing).toEqual([]);
  });

  it("prints a verdict word instead of the raw enum", () => {
    expect(html).not.toMatch(/>(verified|partial|unsupported)</);
  });

  it("renders only the requested subset", () => {
    const subset = renderToStaticMarkup(
      <CapabilityMatrix only={["panel", "workspace"]} />,
    );
    expect(
      [...subset.matchAll(/data-capability="([^"]*)"/g)].map(
        (match) => match[1],
      ),
    ).toEqual(["panel", "workspace"]);
  });

  it("says so when the subset is empty", () => {
    const empty = renderToStaticMarkup(<CapabilityMatrix only={[]} />);
    expect(empty).toContain("data-empty");
    expect(empty).not.toContain("data-capability");
  });
});
