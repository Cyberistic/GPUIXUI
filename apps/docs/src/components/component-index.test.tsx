import { renderToStaticMarkup } from "react-dom/server";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { components, groups } from "@/component-meta/registry";
import { ComponentIndex } from "./component-index";

/**
 * Guards the generated component index (plan 411 §1): every record must appear
 * once, with its status **and** its GPUix support, grouped under its tier. The
 * failures it catches are an index that drops the support column (a reader can
 * no longer tell `unverified` from `yes`) and a group whose heading vanished.
 */
const html = renderToStaticMarkup(<ComponentIndex />);

describe("component index", () => {
  it("renders one card per registry record", () => {
    const cards = html.match(/data-status=/g) ?? [];
    expect(cards).toHaveLength(components.length);
    Arr.forEach(components, (component) => {
      expect(html).toContain(component.title);
    });
  });

  it("shows GPUix support for every record, not just the status", () => {
    const supports = html.match(/data-gpuix=/g) ?? [];
    expect(supports).toHaveLength(components.length);
    Arr.forEach(components, (component) => {
      expect(html).toContain(`data-gpuix="${component.gpuix}"`);
    });
  });

  it("heads every group with its tier", () => {
    Arr.forEach(groups, (group) => {
      expect(html).toContain(`Tier ${group.tier}`);
    });
  });
});
