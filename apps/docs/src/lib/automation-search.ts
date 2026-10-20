import {
  isDistinctiveName,
  type GeneratedSearchEntry,
} from "./generated-search";
import {
  appMethods,
  appSideFunctions,
  automationAbsences,
  automationEntryGroups,
  clockMethods,
  locatorMethods,
  mouseMethods,
  protocolErrorCodes,
  protocolMethods,
  treeNodeFields,
} from "./automation";

/**
 * The Automation page renders its rows React, so the page index sees prose but
 * not the API names, and the simple index tokenises `getByTestId` and
 * `connectStdio` as single words (the reason plans 587 and 633 added generated
 * documents).
 *
 * Only a distinctive name is promoted — the rule plan 504 set. `click`,
 * `count`, `screenshot` and `launch` are indexed but never promoted, so the
 * component page or section that owns each plain word keeps it; `getByTestId`,
 * `connectStdio`, `captureFrames` and `SseBackend` are names no other page uses.
 */
const promoted = [
  ...appSideFunctions.map((row) => row.name),
  ...automationEntryGroups.flatMap((group) =>
    group.rows.map((row) => row.name),
  ),
  ...locatorMethods.map((row) => row.name),
  ...appMethods.map((row) => row.name),
  ...mouseMethods.map((row) => row.name),
  ...clockMethods.map((row) => row.name),
  ...protocolMethods.map((row) => row.name),
  ...protocolErrorCodes.map((row) => row.name),
  ...treeNodeFields.map((row) => row.name),
].filter(
  (name) =>
    isDistinctiveName(name) &&
    // Names another page already documents: `testId` is the shared host prop
    // (plan 587), the selection methods are Selection and find's (plan 627),
    // and the painted-text reads are Testing's (plan 628).
    ![
      "testId",
      "getSelectedText",
      "clearSelection",
      "getPaintedText",
      "getAllText",
    ].includes(name),
);

export const automationSearchEntry: GeneratedSearchEntry = {
  names: [...new Set(promoted)],
  index: {
    title: "Automation",
    description:
      "Drive a running GPUix app from a test: enableAutomation over stdio, launch and Locator selectors, mouse and clock control, screenshots and the wire protocol.",
    content: [
      ...appSideFunctions.map((row) => `${row.name}: ${row.summary}`),
      ...automationEntryGroups.flatMap((group) =>
        group.rows.map((row) => `${row.name}: ${row.summary}`),
      ),
      ...locatorMethods.map((row) => `${row.name}: ${row.summary}`),
      ...appMethods.map((row) => `${row.name}: ${row.summary}`),
      ...mouseMethods.map((row) => `${row.name}: ${row.summary}`),
      ...clockMethods.map((row) => `${row.name}: ${row.summary}`),
      ...protocolMethods.map((row) => `${row.name}: ${row.summary}`),
      ...protocolErrorCodes.map((row) => `${row.name}: ${row.summary}`),
      ...treeNodeFields.map((row) => `${row.name}: ${row.summary}`),
      ...automationAbsences.map(
        (absence) => `${absence.subject}: ${absence.statement}`,
      ),
    ].join("\n"),
    url: "/docs/automation",
    breadcrumbs: ["Automation"],
    keywords: [
      ...locatorMethods.map((row) => row.name),
      ...protocolMethods.map((row) => row.name),
      ...protocolErrorCodes.map((row) => row.name),
      "enableAutomation",
      "installBrowserAutomation",
      "connectStdio",
      "captureFrames",
      "automation tree",
    ].join(" "),
  },
};
