import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  missingReleaseArtifacts,
  parseLicense,
  releaseArtifacts,
} from "./licenses";
import { sidebarPages } from "./sidebar-pages.test-util";

/**
 * The licence inventory.
 *
 * `LICENSES/<reference>.md` is a release requirement, so the site reads it
 * rather than restating it — and a record the parser cannot read would vanish
 * from `/docs/license` with no other symptom, which is the one outcome a
 * licence page may not have. A record therefore has to name where it came from,
 * its licence, what we take and what we leave out; each is checked here.
 */

const dir = new URL("../../../../LICENSES/", import.meta.url);

const recordFiles = readdirSync(dir).filter(
  (name) => name.endsWith(".md") && name !== "README.md",
);

const read = (name: string): string => readFileSync(new URL(name, dir), "utf8");

/** A record with every required part, for the tests that remove one. */
const record = `# \`example\` — design reference

- Repository: <https://example.com/example>
- Licence: MIT — \`Copyright (c) 2026 Example\`

## What we use

The API shape.

## What we do not use

No source is copied.
`;

describe("the licence records", () => {
  it("every file in LICENSES/ parses, so none is dropped from the page", () => {
    const unreadable = recordFiles.filter(
      (name) => parseLicense(name, read(name)) === undefined,
    );

    expect(unreadable).toEqual([]);
    expect(recordFiles.length).toBeGreaterThanOrEqual(3);
  });

  it("reads the reference, its licence and both provenance sections", () => {
    const parsed = parseLicense("example.md", record);

    expect(parsed?.title).toBe("example — design reference");
    expect(parsed?.source).toBe("https://example.com/example");
    expect(parsed?.licence).toBe("MIT — Copyright (c) 2026 Example");
    expect(parsed?.uses).toBe("The API shape.");
    expect(parsed?.exclusions).toBe("No source is copied.");
  });

  it.each([
    ["a licence line", /^- Licence: .*$/m],
    ["what we take", /^## What we use/m],
    ["what we do not take", /^## What we do not use/m],
  ])("refuses a record without %s", (_part, marker) => {
    expect(parseLicense("example.md", record.replace(marker, ""))).toBe(
      undefined,
    );
  });

  it("accepts the verb a record uses for what it leaves out", () => {
    // The Lucide record says "What we do not copy" — the section the shape
    // requires, worded for an icon set. A parser that only knew "use" dropped
    // the whole record from `/docs/license` with no other symptom, which is the
    // one outcome a licence page may not have.
    const parsed = parseLicense(
      "lucide.md",
      record.replace("What we do not use", "What we do not copy"),
    );

    expect(parsed?.exclusions).toBe("No source is copied.");
  });

  it("reads a record that folds its exclusions into the uses section", () => {
    // The record may state the second half as a labelled list under "What we
    // use" — the shape a geometry reference reads naturally in. Dropping the
    // section must not drop the record.
    const folded = record
      .replace("## What we do not use\n\nNo source is copied.", "")
      .replace(
        "The API shape.",
        "The API shape.\n\nWe do **not** copy:\n\n- any source, class or token.",
      );
    const parsed = parseLicense("folded.md", folded);

    expect(parsed?.uses).toBe("The API shape.");
    expect(parsed?.exclusions).toBe("- any source, class or token.");
  });

  it("names the release artefacts the directory still lacks", () => {
    expect(missingReleaseArtifacts(["inventory.md"])).toEqual([
      "provenance.md",
    ]);
    expect(missingReleaseArtifacts(releaseArtifacts)).toEqual([]);
  });
});

describe("the license page", () => {
  const page = readFileSync(
    new URL("../../content/docs/license.mdx", import.meta.url),
    "utf8",
  );

  it("renders the records instead of restating them", () => {
    expect(page).toContain("<LicenseInventory />");
    expect(page).toContain("LICENSES/");
  });

  it("sends a reader to the notice the release carries, not to a path it lacks", () => {
    // The page said a redistributed notice lives in `LICENSES/NOTICE`, which
    // does not exist: the notice ships beside the port that owes it
    // (`packages/motion/NOTICE`, the location `LICENSES/README.md` names), so a
    // reader following the page found nothing and the footer reported a notice
    // missing from a release that carries one.
    expect(page).not.toContain("LICENSES/NOTICE");
    expect(page).toContain("packages/motion/NOTICE");
    expect(
      readFileSync(
        new URL("../../../../packages/motion/NOTICE", import.meta.url),
        "utf8",
      ),
    ).toContain("The NOTICE this package must redistribute");
    expect(releaseArtifacts).not.toContain("NOTICE");
  });

  it("sits in the sidebar after Contributing", () => {
    const pages = sidebarPages(new URL("../../", import.meta.url));

    expect(pages).toContain("license");
    expect(pages.indexOf("license")).toBeGreaterThan(
      pages.indexOf("contributing"),
    );
  });
});
