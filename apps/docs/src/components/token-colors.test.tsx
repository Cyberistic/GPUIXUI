import { colorRoles } from "@gpuixui/tokens";
import { renderToStaticMarkup } from "react-dom/server";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { themeColors } from "@/lib/docs-theme";
import { TokenColors } from "./token-colors";

/**
 * Guards the generated colour catalogue (plan 416): the table must render every
 * exported role, with both themes' real values. The failures it catches are a
 * dropped row (the page silently documents fewer roles than the package ships)
 * and a table that stops reading the package and renders stale or duplicated
 * literals.
 */
const html = renderToStaticMarkup(<TokenColors />);

const cells = (pattern: RegExp): ReadonlyArray<string> =>
  Arr.map(Arr.fromIterable(html.matchAll(pattern)), (match) => match[0]);

describe("token colour table", () => {
  it("renders one row per exported role", () => {
    expect(cells(/data-role="/g)).toHaveLength(colorRoles.length);
    Arr.forEach(colorRoles, (role) => {
      expect(html).toContain(`data-role="${role}"`);
    });
  });

  it("renders both themes' real values for every role", () => {
    Arr.forEach(colorRoles, (role) => {
      expect(html).toContain(themeColors.light[role]);
      expect(html).toContain(themeColors.dark[role]);
    });
  });
});
