import {
  isDistinctiveName,
  type GeneratedSearchEntry,
} from "./generated-search";
import {
  eventAbsences,
  eventHandlers,
  eventPayloadFieldNames,
  eventPayloadGroups,
  eventModifiers,
  windowEventHandlers,
} from "./events";

/**
 * The Events page renders its tables from `events.ts`, so the page index cannot
 * see the 25 payload fields or the 23 handlers (plan 635). The simple index also
 * tokenises `eventType`, `clickCount` and `onWindowKeyDown` as single words, so
 * distinctive names are promoted, the rule plan 587 set for host props.
 *
 * Only distinctive names are promoted. Plain words (`value`, `paths`,
 * `modifiers`, `button`, `key`, `x`, `y`, `precise`) stay prose so the pages
 * that own them keep them, and no `on*` host prop is promoted: Component API's
 * `## Shared host props` owns the prop rows, and this page explains the object
 * those props receive.
 */
export const eventsSearchEntry: GeneratedSearchEntry = {
  names: [
    ...eventPayloadFieldNames,
    ...eventModifiers.map((row) => row.name),
    "EventPayload",
    "EventModifiers",
    "windowKeyDown",
    "windowKeyUp",
    "selectionChange",
  ].filter(isDistinctiveName),
  index: {
    title: "Events",
    description:
      "The event payload every handler receives — pointer, keyboard, scroll, file-drop and element-defined fields, modifiers, window-level keys, and what is not in the object.",
    content: [
      ...eventHandlers.map(
        (row) =>
          `${row.name}: ${row.eventType}, on ${row.firesOn}. Carries ${row.carries}. ${row.summary}`,
      ),
      ...eventPayloadGroups.flatMap((group) =>
        group.rows.map((row) => `${row.name} (${row.type}): ${row.summary}`),
      ),
      ...eventModifiers.map((row) => `${row.name}: ${row.summary}`),
      ...windowEventHandlers.map((row) => `${row.name}: ${row.summary}`),
      ...eventAbsences.map(
        (absence) => `${absence.subject}: ${absence.statement}`,
      ),
    ].join("\n"),
    url: "/docs/events",
    breadcrumbs: ["Events"],
    keywords: [
      "event payload",
      "event object",
      "event handler",
      "modifiers",
      "click count",
      "double click",
      "file drop",
      "scroll delta",
      "window key",
      "EventPayload",
    ].join(" "),
  },
};
