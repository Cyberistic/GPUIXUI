import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getMDXComponents } from "@/components/mdx";
import { PartStates } from "./part-states-table";
import { stateTypes } from "@/lib/part-states.generated";

/**
 * The table renders the generated rows and nothing else (plan 623). The guard
 * catches a renderer that drops a row, retypes a field, or ships a page tag that
 * `getMDXComponents()` does not register.
 */

const markup = renderToStaticMarkup(<PartStates />);

describe("PartStates", () => {
  it("renders one row per generated state type", () => {
    const rendered = [...markup.matchAll(/data-state-type="([^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(rendered).toEqual(stateTypes.map((state) => state.name));
  });

  it("paints every field and the derived summary", () => {
    const fields = new Set(stateTypes.flatMap((state) => state.fields));

    expect(
      [...fields].filter((field) => !markup.includes(`>${field}</code>`)),
    ).toEqual([]);
    expect(markup).toContain(
      `${stateTypes.length} exported state types across ${
        new Set(stateTypes.map((state) => state.file)).size
      } files.`,
    );
  });

  it("is a registered MDX component", () => {
    expect(getMDXComponents().PartStates).toBe(PartStates);
  });
});
