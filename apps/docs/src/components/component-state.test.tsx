import { renderToStaticMarkup } from "react-dom/server";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import { describe, expect, it } from "vitest";
import { bySlug } from "@/component-meta/registry";
import {
  supportLegend,
  supportMeaning,
  supportOrder,
} from "@/component-meta/support";
import { ComponentState } from "./component-state";

/**
 * Guards the page status block's GPUix-support line (plan 443). The defect it
 * was written for: the Buttons page printed `GPUix support: yes` while the same
 * page said the runtime has no button element, because the registry flattened
 * the inventory's `ours` to `yes`. The word must match the inventory and must
 * be translated for the reader.
 */
const render = (slug: string): string =>
  renderToStaticMarkup(<ComponentState slug={slug} />);

const record = (slug: string) => {
  const found = bySlug.get(slug);
  if (found === undefined) throw new Error(`registry is missing ${slug}`);
  return found;
};

describe("component state", () => {
  it("prints a word GPUix does not provide with its meaning, not a bare yes", () => {
    const button = record("button");
    expect(button.gpuix).toBe("ours");
    const html = render("button");
    expect(html).toContain('data-gpuix="ours"');
    expect(html).toContain(supportMeaning.ours);
    expect(html).not.toContain('data-gpuix="yes"');
  });

  it("translates a reused GPUix primitive as a wrapper", () => {
    expect(render("select")).toContain(supportMeaning.reuse);
  });

  it("has one meaning per support word and documents every one", () => {
    expect(Arr.sort([...supportOrder], Order.String)).toEqual(
      Arr.sort(Object.keys(supportMeaning), Order.String),
    );
    expect(supportLegend.map((entry) => entry.value)).toEqual([
      ...supportOrder,
    ]);
    expect(supportLegend.every((entry) => entry.meaning.length > 0)).toBe(true);
  });

  it("reports an unknown slug instead of inventing a record", () => {
    expect(render("not-a-component")).toContain("Unknown component");
  });
});
