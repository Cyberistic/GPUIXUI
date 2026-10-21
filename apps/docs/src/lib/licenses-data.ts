import {
  missingReleaseArtifacts,
  parseLicense,
  type LicenseRecord,
} from "./licenses";

/**
 * `LICENSES/`, read at build time.
 *
 * The records are the release inventory, not a copy of it: a file added there
 * appears on `/docs/license` with no docs change. `licenses.test.ts` holds the
 * parse, so a file in an unreadable shape fails the suite instead of vanishing
 * from the page.
 */
const files = import.meta.glob("../../../../LICENSES/*", {
  eager: true,
  query: "?raw",
  import: "default",
});

const named = Object.entries(files).map(
  ([path, body]) => [path.slice(path.lastIndexOf("/") + 1), body] as const,
);

export const licenseRecords: ReadonlyArray<LicenseRecord> = named.flatMap(
  ([file, body]) => {
    const record = parseLicense(file, body);
    return record === undefined ? [] : [record];
  },
);

/** The artefacts `LICENSES/README.md` requires that the directory lacks. */
export const missingArtifacts: ReadonlyArray<string> = missingReleaseArtifacts(
  named.map(([file]) => file),
);
