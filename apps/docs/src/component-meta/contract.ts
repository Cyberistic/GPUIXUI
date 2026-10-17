import type { ComponentMetaInput } from "./schema";

/**
 * The compound/workspace contract (plan 427). A record's `pattern` decides
 * which extra sections its page owes, and a compound record owes the source of
 * every part — not just its entry file. Kept as pure functions so each rule has
 * a fixture test that can fail today, before the first data-grid or docking
 * record exists.
 */

const BASE_SECTIONS = [
  "Usage",
  "Variants",
  "Sizes",
  "States",
  "Composition",
  "API reference",
  "Keyboard and focus",
  "Theming",
  "Accessibility and limitations",
  "Dependencies",
  "Source",
  "Related",
] as const;

const insertAfter = (
  sections: readonly string[],
  anchor: string,
  section: string,
): readonly string[] => {
  const index = sections.indexOf(anchor);
  return index === -1
    ? [...sections, section]
    : [...sections.slice(0, index + 1), section, ...sections.slice(index + 1)];
};

/** The sections a page must carry, in documented order, for its pattern. */
export const sectionsFor = (
  pattern: ComponentMetaInput["pattern"],
): readonly string[] => {
  if (pattern === "static") return [...BASE_SECTIONS];

  const roleSections = insertAfter(
    BASE_SECTIONS,
    "Composition",
    "State and ownership",
  );
  if (pattern === "stateful") return roleSections;

  return insertAfter(
    insertAfter(roleSections, "Usage", "Anatomy"),
    "State and ownership",
    "Persistence",
  );
};

/** The sections a page is missing, in contract order. */
export const missingSections = (
  pattern: ComponentMetaInput["pattern"],
  headings: readonly string[],
): readonly string[] =>
  sectionsFor(pattern).filter((section) => !headings.includes(section));

/**
 * The compound parts whose source the page does not include. `absolute` maps a
 * repo-relative path to the build-time include target the page test collected.
 */
export const missingPartSources = (
  record: Pick<ComponentMetaInput, "parts">,
  included: readonly string[],
  absolute: (sourcePath: string) => string,
): readonly string[] =>
  record.parts.flatMap((part) =>
    included.includes(absolute(part.sourcePath))
      ? []
      : [`${part.name} (${part.sourcePath}) is not included`],
  );

/**
 * Record-level rules that hold before a page is written. `isExported` is the
 * caller's index of real package exports, so this stays pure and testable.
 */
export const registryViolations = (
  records: readonly ComponentMetaInput[],
  isExported: (packageName: string, name: string) => boolean,
): readonly string[] =>
  records.flatMap((record) => [
    ...(record.pattern === "workspace" && record.playgroundScreen === null
      ? [`${record.slug}: a workspace pattern requires a playgroundScreen`]
      : []),
    ...record.parts.flatMap((part) =>
      isExported(record.packageName, part.name)
        ? []
        : [
            `${record.slug}: ${part.name} is not exported by ${record.packageName}`,
          ],
    ),
  ]);
