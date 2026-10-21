import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { licenseRecords, missingArtifacts } from "../../lib/licenses-data";
import { LicenseInventory } from "./license-table";

/**
 * The licence table is the only place the page gets its rows. A record that
 * parses but does not reach the rendered table would be a licence the reader
 * cannot find, and the missing artefacts are the page's release status — so
 * both are asserted against what is on screen.
 */

const markup = renderToStaticMarkup(<LicenseInventory />);

/** The text a reader sees: React escapes quotes and angle brackets. */
const text = markup
  .replaceAll("&quot;", '"')
  .replaceAll("&#x27;", "'")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">")
  .replaceAll("&amp;", "&");

describe("the licence table", () => {
  it("renders every record with its licence and its source", () => {
    const dropped = licenseRecords.filter(
      (record) =>
        !text.includes(record.title) ||
        !text.includes(record.licence) ||
        !text.includes(record.source),
    );

    expect(licenseRecords.length).toBeGreaterThanOrEqual(3);
    expect(dropped.map((record) => record.file)).toEqual([]);
  });

  it("names the release artefacts that are still missing", () => {
    expect(
      missingArtifacts.filter((artifact) => !text.includes(artifact)),
    ).toEqual([]);
  });
});
