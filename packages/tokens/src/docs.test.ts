/**
 * Guards the catalogue against drift. `docs/tokens.md` is the page a consumer
 * reads and states that a token absent from it is not public, so the package is
 * the source and the page must keep up: an export with no line in the catalogue,
 * or a colour role with no table row, is a reader who cannot find the value
 * their theme already carries.
 *
 * `node:fs` is deliberate, as in `exports.test.ts`: this is a check over the
 * repository's own Markdown, and the package keeps zero runtime dependencies by
 * design.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Tokens from "./index.js";

const catalogue = readFileSync(
  new URL("../../../docs/tokens.md", import.meta.url),
  "utf8",
);

const roleRow = (role: string): string => `| \`${role}\` |`;

/** The runtime exports of the package, excluding nothing: every one is public. */
const exportedValues = Object.keys(Tokens);

describe("token catalogue", () => {
  it("documents every public export", () => {
    const missing = exportedValues.filter((name) => !catalogue.includes(name));

    expect(missing).toEqual([]);
  });

  it("gives every colour role a row in both colour tables", () => {
    // The default and high-contrast tables list the same roles; a role present
    // in only one of them is a reader comparing modes with a missing line.
    const missing = Tokens.colorRoles.filter(
      (role) => catalogue.split(roleRow(role)).length - 1 < 2,
    );

    expect(missing).toEqual([]);
  });

  it("gives every type role a table row", () => {
    const roles = Object.keys(Tokens.typography).filter(
      (role) => role !== "sans" && role !== "mono",
    );
    const missing = roles.filter((role) => !catalogue.includes(roleRow(role)));

    expect(missing).toEqual([]);
  });

  it("counts the roles and the pairs it documents", () => {
    expect(catalogue).toContain(`There are ${Tokens.colorRoles.length} roles.`);
    expect(catalogue).toContain(
      `The ${Tokens.contrastPairs.length} pairs cover`,
    );
  });
});
