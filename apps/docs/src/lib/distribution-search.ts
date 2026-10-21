import type { GeneratedSearchEntry } from "./generated-search";
import {
  distributionAbsences,
  distributionProvenance,
  packagerConfigRows,
  packagerFormats,
  packagingSteps,
} from "./distribution";

/**
 * The shipping page's search document (plan 638). Its tables are rendered React
 * from `distribution.ts`, so the Fumadocs page index cannot see the format
 * names, the configuration fields or the absence subjects: measured 2026-10-21,
 * `cargo-packager` and `packager.json` returned nothing while `packaging`
 * reached the Values API and `packager` an Updates paragraph.
 *
 * Only distinctive spellings are promoted. `NSIS`, `WiX` and `AppImage` are
 * indexed as text and stay on Auto-update, whose aliases own those names (plan
 * 633); `icon` stays with the icon component, and `release` with Installation's
 * release words (plan 620).
 */
export const distributionSearchEntry: GeneratedSearchEntry = {
  names: [
    "cargo-packager",
    "packager.json",
    "binariesDir",
    "productName",
    "CARGO_PACKAGER_SIGN_PRIVATE_KEY",
    "CARGO_PACKAGER_SIGN_PRIVATE_KEY_PASSWORD",
  ],
  index: {
    title: "Shipping a desktop app",
    description:
      "How a GPUix app becomes an installable one: a single-file build, the cargo-packager wrapper, packager.json, the .icns icon, the signing key and .sig assets, the GitHub Releases feed, and what this repository has never done.",
    content: [
      "A GPUix app is a React tree, the @gpuix/native Node-API addon and the JavaScript runtime that loads it. The addon's three published targets and the unpublished Intel macOS build are Installation's native-binding table.",
      ...packagingSteps.map(
        (step) =>
          `${step.title}: ${step.command}. ${step.detail}`,
      ),
      ...packagerFormats.map(
        (row) =>
          `${row.os} ${row.format}: ${row.output}. An update installs ${row.updateAsset}.`,
      ),
      ...packagerConfigRows.map(
        (row) => `packager.json ${row.name}: ${row.value}`,
      ),
      "The icon is an .icns built from a 1024 PNG with sips and iconutil; cargo-packager rejects a 1024 PNG with No matching IconType.",
      "Signing is update-payload signing, not OS code signing or notarisation. The macOS update asset is My App.app.tar.gz, not the .app and not the .dmg.",
      "GitHub Releases is the feed: create the release, upload the bundle and its .sig, and keep the repository public.",
      ...distributionAbsences.map(
        (absence) => `${absence.subject}: ${absence.statement}`,
      ),
      `${distributionProvenance.recipe} ${distributionProvenance.note}`,
    ].join("\n"),
    url: "/docs/distribution",
    breadcrumbs: ["Shipping a desktop app"],
    keywords:
      "shipping packaging packager bundle identifier app bundle installer executable dmg notarize cargo packager sign release assets",
  },
};
