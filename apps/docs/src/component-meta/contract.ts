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
 * Parts whose props type the package exports but the record does not list
 * (plan 479). A compound component's part is a component in its own right: if
 * `TabsListProps` exists, a reader must be able to find it. `hasType` is the
 * caller's real export index, so this stays pure and the fixture can fail.
 */
export const missingPartApi = (
  record: Pick<ComponentMetaInput, "slug" | "parts" | "api">,
  hasType: (name: string) => boolean,
): readonly string[] =>
  record.parts.flatMap((part) => {
    const props = `${part.name}Props`;
    return hasType(props) && !record.api.includes(props)
      ? [
          `${record.slug}: ${part.name} exports ${props} but the record does not document it`,
        ]
      : [];
  });

/**
 * Props types the page generates but the record does not declare, and the
 * reverse (plan 441). The registry is the index at `/docs/api-reference`; the
 * page owns the generated table. The two are a set: page order is not a
 * contract, but membership is.
 */
export const apiDrift = (
  record: Pick<ComponentMetaInput, "slug" | "api">,
  pageTypes: readonly string[],
): readonly string[] => {
  const declared = new Set(record.api);
  const generated = new Set(pageTypes);
  return [
    ...pageTypes
      .filter((name) => !declared.has(name))
      .map(
        (name) =>
          `${record.slug}: page generates ${name} but the registry does not declare it`,
      ),
    ...record.api
      .filter((name) => !generated.has(name))
      .map(
        (name) =>
          `${record.slug}: registry declares ${name} but the page does not generate it`,
      ),
  ];
};

/**
 * Status coherence for a record. The inventory (`COMPONENTS.md`) owns the
 * status itself; this checks that a `done` row is credible (a native suite, and
 * a documented limitation when support is only partial) and that the other
 * states carry the evidence they claim.
 *
 * `done` does not require GPUix to have written the primitive: a component the
 * library implements itself (`gpuix: "ours"`) is `done` once its suite drives it
 * in the real renderer (plans 432, 443).
 */
export const statusViolations = (
  records: readonly ComponentMetaInput[],
): readonly string[] =>
  records.flatMap((record) => [
    ...(record.status === "done" && record.runtime === null
      ? [`${record.slug}: done requires a native suite`]
      : []),
    ...(record.status === "done" &&
    record.gpuix === "partial" &&
    record.limitations.length === 0
      ? [`${record.slug}: done with partial support needs a limitation`]
      : []),
    ...(record.status === "unsupported" && record.gpuix !== "no"
      ? [`${record.slug}: unsupported requires gpuix "no"`]
      : []),
    ...(record.status === "unsupported" && record.limitations.length === 0
      ? [`${record.slug}: unsupported requires a limitation`]
      : []),
    ...((record.status === "wip" || record.status === "done") &&
    record.sourcePath === null
      ? [`${record.slug}: ${record.status} requires a sourcePath`]
      : []),
  ]);

/**
 * Record-level rules that hold before a page is written. `isExported` is the
 * caller's index of real package exports, so this stays pure and testable.
 */ export const registryViolations = (
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
