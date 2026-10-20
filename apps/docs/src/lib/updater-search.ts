import {
  isDistinctiveName,
  type GeneratedSearchEntry,
} from "./generated-search";
import { updateFormats, updaterAbsences, updaterGroups } from "./updater";

/**
 * The Auto-update page renders its rows from `updater.ts`, and the generated
 * type-table rule drops nothing here because the rows are React text, not a
 * type table — but the simple index still tokenises `installerArgs` and
 * `downloadAndInstall` as single words, so `updater` and `checkUpdate` need
 * promoted names (plan 633, the rule plan 587 set for host props).
 *
 * Only distinctive names are promoted. Plain words (`pubkey`, `format`,
 * `headers`, `date`, `notes`) stay prose so the pages that own them keep them.
 */
export const updaterSearchEntry: GeneratedSearchEntry = {
  names: [
    ...updaterGroups.flatMap((group) => group.rows.map((row) => row.name)),
    "checkUpdate",
    "AvailableUpdate",
    "CheckUpdateOptions",
    "UpdaterHeader",
  ].filter(isDistinctiveName),
  index: {
    title: "Auto-update",
    description:
      "The runtime's signed update client: checkUpdate and the feed, AvailableUpdate, downloadAndInstall, and what is not verified.",
    content: [
      ...updaterGroups.flatMap((group) =>
        group.rows.map((row) => `${row.name}: ${row.summary}`),
      ),
      `formats: ${updateFormats.join(", ")}`,
      ...updaterAbsences.map(
        (absence) => `${absence.subject}: ${absence.statement}`,
      ),
    ].join("\n"),
    url: "/docs/updates",
    breadcrumbs: ["Auto-update"],
    keywords: ["checkUpdate", "downloadAndInstall", "update feed"]
      .concat(updateFormats)
      .join(" "),
  },
};
