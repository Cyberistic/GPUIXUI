/**
 * The licence records.
 *
 * `LICENSES/<reference>.md` is one row of the release inventory: where a
 * reference came from, its licence, and what we take from it. `/docs/license`
 * renders these files rather than restating them, so a record added beside the
 * code appears on the site with no docs change, and a reference whose terms
 * were never verified cannot hide behind a summary.
 *
 * The shape is enforced: a record without a repository, a licence line, and a
 * statement of what it takes and what it leaves out is not renderable, and
 * `licenses.test.ts` fails on one instead of dropping it. A record may carry
 * that second statement as its own section or as a "We do not copy:" list
 * inside the uses section, because it is worded for the reference — an icon
 * set's geometry is copied, a design system's API is not.
 */

/** One `LICENSES/*.md` record. Display-ready: the Markdown is folded here. */
export interface LicenseRecord {
  /** The file name in `LICENSES/`, e.g. `open-gpui.md`. */
  readonly file: string;
  /** The reference's own name, from the record's heading. */
  readonly title: string;
  /** Where it was read from. */
  readonly source: string;
  /** The licence, with the copyright line it was read from. */
  readonly licence: string;
  /** What we take from it. */
  readonly uses: string;
  /** What we deliberately do not take. */
  readonly exclusions: string;
}

/** The artefacts `LICENSES/README.md` requires before a release. */
export const releaseArtifacts = [
  "inventory.md",
  "provenance.md",
  "NOTICE",
] as const;

/** The required artefacts the directory does not have yet. */
export const missingReleaseArtifacts = (
  present: ReadonlyArray<string>,
): ReadonlyArray<string> =>
  releaseArtifacts.filter((artifact) => !present.includes(artifact));

/** `## ` sections of a record, keyed by heading. */
const sections = (body: string): ReadonlyMap<string, string> =>
  new Map(
    body
      .split(/^## /m)
      .slice(1)
      .flatMap((part) => {
        const end = part.indexOf("\n");
        return end === -1
          ? []
          : [[part.slice(0, end).trim(), part.slice(end + 1).trim()] as const];
      }),
  );

/** The lead-in a record may use for what it leaves out instead of a section. */
const exclusionsLeadIn = /^We do (?:\*\*)?not(?:\*\*)?[^\n]*:\s*$/m;

/** Split a uses section that carries the exclusions as a lead-in list. */
const splitExclusions = (
  uses: string,
): readonly [uses: string, exclusions: string] => {
  const match = exclusionsLeadIn.exec(uses);
  return match === null
    ? [uses, ""]
    : [
        uses.slice(0, match.index).trim(),
        uses.slice(match.index + match[0].length).trim(),
      ];
};

/**
 * The section naming what a record leaves out. The heading is worded for the
 * reference: a design system is not used, an icon set is not copied, a font is
 * not shipped. The shape requires the statement, not one verb or one layout.
 */
const exclusionsSection = (
  found: ReadonlyMap<string, string>,
): string | undefined =>
  [...found].find(([heading]) => heading.startsWith("What we do not"))?.[1];

/**
 * The folded `- Key: value` bullets of a record's header. A wrapped bullet is
 * one value: indented lines continue it.
 */
const bullets = (header: string): ReadonlyMap<string, string> => {
  const folded = new Map<string, string>();
  let key: string | undefined;
  for (const line of header.split("\n").slice(1)) {
    if (line.startsWith("- ")) {
      const colon = line.indexOf(":");
      key = colon === -1 ? undefined : line.slice(2, colon).trim();
      if (key !== undefined) {
        folded.set(key, line.slice(colon + 1).trim());
      }
    } else if (line.startsWith("  ") && key !== undefined) {
      folded.set(key, `${folded.get(key) ?? ""} ${line.trim()}`);
    }
  }
  return folded;
};

/** A record's plain text: backticks mark inline code, not punctuation. */
const plain = (text: string): string => text.replaceAll("`", "");

/** Parse one `LICENSES/*.md` record, or `undefined` when it is not one. */
export const parseLicense = (
  file: string,
  body: string,
): LicenseRecord | undefined => {
  const [header = ""] = body.split(/^## /m);
  const heading = header.split("\n")[0] ?? "";
  const fields = bullets(header);
  const found = sections(body);

  const title = plain(heading.replace(/^#\s*/, "").trim());
  const source = plain(fields.get("Repository") ?? "").replace(/[<>]/g, "");
  const licence = plain(fields.get("Licence") ?? "");
  const usesSection = found.get("What we use") ?? "";
  const excluded = exclusionsSection(found);
  const [uses, leadInExclusions] =
    excluded === undefined ? splitExclusions(usesSection) : [usesSection, ""];
  const exclusions = excluded ?? leadInExclusions;

  return title === "" ||
    source === "" ||
    licence === "" ||
    uses === "" ||
    exclusions === ""
    ? undefined
    : { file, title, source, licence, uses, exclusions };
};
