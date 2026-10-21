import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as Schema from "effect/Schema";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  installedNativeDeclarations,
  installedNativeRoot,
} from "./lib/native-declarations.testing";
import {
  eventAbsences,
  eventHandlerPairs,
  eventHandlers,
  eventModifiers,
  eventPayloadFieldNames,
  eventPayloadGroups,
  eventPropPairsIn,
  eventSurfaceViolations as violations,
} from "./lib/events";
import { eventsSearchEntry } from "./lib/events-search";
import {
  EventAbsences,
  EventHandlerTable,
  EventPayloadTables,
  WindowEventTable,
} from "./components/event-tables";
import { generatedSearchEntries, search } from "./lib/search";

/**
 * Guards the Events page (plan 635). The bug being prevented is the event
 * payload having no owner: measured 2026-10-21, `@gpuix/native@0.10.0`
 * declares a 25-field `EventPayload` and 23 host event handlers, while
 * `event payload` reached a Separator limitation, `click count` reached
 * Countdown, `deltaY` reached Auto-update, `key repeat` reached Keycap and
 * `onWindowKeyDown` and `stopPropagation` returned nothing at all.
 *
 * These cases fail when the runtime adds, renames or removes a payload field or
 * handler, when the page invents one, when a promised absence stops being
 * absent, when the dispatcher loses the window rewrite the page quotes, when a
 * section or table leaves the page, or when the page steals a query from
 * Component API, Context menu, Accessibility or Keycap. `node:fs` is a
 * test-only boundary import, as in `updater.test.ts`: the docs bundle must
 * never import the native runtime.
 */
const source = (path: string): string =>
  readFileSync(new URL(`../content/docs/${path}`, import.meta.url), "utf8");

const EVENTS_PAGE = source("events.mdx");
const META = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Struct({ pages: Schema.Array(Schema.String) })),
)(source("meta.json"));

const MDX_REGISTRY = readFileSync(
  new URL("./components/mdx.tsx", import.meta.url),
  "utf8",
);

const DECLARATIONS = installedNativeDeclarations().join("\n");
const NATIVE_ROOT = installedNativeRoot();
const HOST_DECLARATIONS = readFileSync(
  join(NATIVE_ROOT, "dist/host.d.ts"),
  "utf8",
);
const MUTATION_DECLARATIONS = readFileSync(
  join(NATIVE_ROOT, "dist/mutations.d.ts"),
  "utf8",
);
const DISPATCHER = readFileSync(
  join(NATIVE_ROOT, "dist/renderer-state.js"),
  "utf8",
);

const realInput = {
  declarations: DECLARATIONS,
  hostDeclarations: HOST_DECLARATIONS,
  mutationDeclarations: MUTATION_DECLARATIONS,
  dispatcher: DISPATCHER,
};

/** Insert a line after an interface's opening brace. */
const withMember = (
  declarations: string,
  interfaceName: string,
  line: string,
): string => {
  const start = declarations.indexOf(`export interface ${interfaceName} {`);
  if (start < 0) return declarations;
  const open = declarations.indexOf("{", start) + 1;
  return `${declarations.slice(0, open)}\n  ${line}${declarations.slice(open)}`;
};

const messages = (
  overrides: Partial<typeof realInput> = {},
): ReadonlyArray<string> => violations({ ...realInput, ...overrides });

describe("the event surface", () => {
  it("agrees with the installed declarations", () => {
    expect(messages()).toEqual([]);
  });

  it("documents every declared payload field exactly once", () => {
    expect(eventPayloadFieldNames.length).toBeGreaterThan(0);
    expect(new Set(eventPayloadFieldNames).size).toBe(
      eventPayloadFieldNames.length,
    );
    expect(eventPayloadGroups.every((group) => group.rows.length > 0)).toBe(
      true,
    );
  });

  it("names a declared event type for every handler row", () => {
    const declared = eventPropPairsIn(MUTATION_DECLARATIONS);
    expect(declared.length).toBe(eventHandlers.length);
    expect(
      eventHandlerPairs.filter(
        ([name, type]) =>
          !declared.some(([left, right]) => left === name && right === type),
      ),
    ).toEqual([]);
  });

  it("renders the four modifier booleans", () => {
    expect(eventModifiers.map((row) => row.name)).toEqual([
      "shift",
      "ctrl",
      "alt",
      "cmd",
    ]);
  });

  it("fails when the runtime adds a payload field", () => {
    const changed = messages({
      declarations: withMember(
        DECLARATIONS,
        "EventPayload",
        "wheelPhase?: string",
      ),
    });
    expect(changed.join("\n")).toContain(
      "EventPayload.wheelPhase is declared and not documented",
    );
  });

  it("fails when the page invents a payload field", () => {
    const changed = messages({
      declarations: DECLARATIONS.replace(/\n\s*paths\?: Array<string>/u, "\n"),
    });
    expect(changed.join("\n")).toContain(
      "paths is documented and not declared on EventPayload",
    );
  });

  it("fails when a promised absence appears in the payload", () => {
    const changed = messages({
      declarations: withMember(
        DECLARATIONS,
        "EventPayload",
        "preventDefault?: () => void",
      ),
    });
    expect(changed.join("\n")).toContain(
      "EventPayload declares the absent field preventDefault",
    );
  });

  it("fails when a promised-absent handler is declared", () => {
    const changed = messages({
      hostDeclarations: withMember(
        HOST_DECLARATIONS,
        "HostProps",
        "onPointerDown?: (event: EventPayload) => void;",
      ),
    });
    expect(changed.join("\n")).toContain(
      "HostProps declares the absent handler onPointerDown",
    );
  });

  it("fails when a handler row or event type drifts", () => {
    expect(
      messages({
        hostDeclarations: HOST_DECLARATIONS.replace(
          /\n\s*onFileDrop\?:[^\n]*/u,
          "",
        ),
      }).join("\n"),
    ).toContain(
      "onFileDrop is in the handler table and not declared on HostProps",
    );
    expect(
      messages({
        mutationDeclarations: MUTATION_DECLARATIONS.replace(
          'readonly ["onScroll", "scroll"]',
          'readonly ["onScroll", "wheel"]',
        ),
      }).join("\n"),
    ).toContain("EVENT_PROPS declares onScroll:wheel and the table does not");
  });

  it("fails when a fourth window handler appears", () => {
    const changed = messages({
      hostDeclarations: withMember(
        HOST_DECLARATIONS,
        "WindowKeyEventHandlers",
        "onWindowFocus?: WindowKeyEventHandler;",
      ),
    });
    expect(changed.join("\n")).toContain(
      "WindowKeyEventHandlers.onWindowFocus is documented as a window event",
    );
  });

  it("fails when the dispatcher loses the rewrite the page quotes", () => {
    const changed = messages({
      dispatcher: DISPATCHER.replace('eventType: "keyDown"', ""),
    });
    expect(changed.join("\n")).toContain(
      "the dispatcher no longer rewrites a window key down to keyDown",
    );
  });
});

describe("the Events page", () => {
  it("is ordered in the sidebar", () => {
    expect(META.pages).toContain("events");
  });

  it("registers every generated table", () => {
    const tags = [
      "EventHandlerTable",
      "EventPayloadTables",
      "WindowEventTable",
      "EventAbsences",
    ];
    expect(tags.filter((tag) => !MDX_REGISTRY.includes(tag))).toEqual([]);
    expect(tags.filter((tag) => !EVENTS_PAGE.includes(`<${tag} />`))).toEqual(
      [],
    );
  });

  it("keeps every section the page promises", () => {
    const headings = [
      "## Every handler gets the same payload",
      "## The payload",
      "## Modifiers",
      "## Mouse input",
      "## Keyboard input",
      "## Scroll input",
      "## Element-defined values",
      "## Window-level events",
      "## What is not in the payload",
      "## Evidence on this site",
      "## Related",
    ];
    expect(
      headings.filter((heading) => !EVENTS_PAGE.includes(heading)),
    ).toEqual([]);
  });

  it("renders every declared row, not an empty table", () => {
    const handlers = renderToStaticMarkup(createElement(EventHandlerTable));
    const payloads = renderToStaticMarkup(createElement(EventPayloadTables));
    const window = renderToStaticMarkup(createElement(WindowEventTable));
    const absences = renderToStaticMarkup(createElement(EventAbsences));

    expect(handlers.match(/data-event-handler=/gu)).toHaveLength(
      eventHandlers.length,
    );
    expect(payloads.match(/data-event-field=/gu)).toHaveLength(
      eventPayloadFieldNames.length,
    );
    expect(window.match(/data-window-event=/gu)).toHaveLength(4);
    expect(absences.match(/data-event-absence=/gu)).toHaveLength(
      eventAbsences.length,
    );
  });

  it("carries a compiled example and no placeholder", () => {
    expect(EVENTS_PAGE).toContain("```tsx");
    expect(EVENTS_PAGE).toContain("onFileDrop");
    expect(EVENTS_PAGE).not.toMatch(
      /\bTODO\b|\bplaceholder\b|\bcoming soon\b/iu,
    );
  });

  it("links the pages that own the neighbouring subjects", () => {
    const links = [
      "/docs/component-api#shared-host-props",
      "/docs/accessibility#pointer-and-touch-input",
      "/docs/native-elements",
      "/docs/selection",
      "/docs/automation",
      "/docs/window",
    ];
    expect(links.filter((link) => !EVENTS_PAGE.includes(link))).toEqual([]);
  });
});

describe("the Events search document", () => {
  it("is one of the generated documents", () => {
    expect(generatedSearchEntries).toContain(eventsSearchEntry);
  });

  it("promotes distinctive payload names, not plain words or prop names", () => {
    expect(eventsSearchEntry.names).toContain("elementId");
    expect(eventsSearchEntry.names).toContain("clickCount");
    expect(eventsSearchEntry.names).toContain("windowKeyDown");
    expect(eventsSearchEntry.names).not.toContain("onClick");
    expect(eventsSearchEntry.names).not.toContain("value");
    expect(eventsSearchEntry.names).not.toContain("paths");
  });

  it("indexes the absences, so the payload boundary is findable", () => {
    expect(
      eventAbsences.map((absence) => absence.subject).join("\n"),
    ).toContain("onWindowKeyDown");
    expect(eventsSearchEntry.index.content).toContain("stopPropagation");
  });
});

describe(
  "a reader's event query reaches the page",
  { timeout: 120_000 },
  () => {
    it.each([
      "event payload",
      "event object",
      "event target",
      "click count",
      "double click",
      "file drop",
      "scroll delta",
      "deltaY",
      "key repeat",
      "stopPropagation",
      "onWindowKeyDown",
      "window key events",
      "EventPayload",
      "clickCount",
    ])("%s → /docs/events", async (query) => {
      const [first] = await search(query);
      expect(first?.url).toBe("/docs/events");
    });

    it.each([
      ["onClick", "/docs/component-api#shared-host-props"],
      ["onKeyDown", "/docs/component-api#shared-host-props"],
      ["testId", "/docs/component-api#shared-host-props"],
      ["right click", "/docs/components/context-menu"],
      ["pointer event", "/docs/accessibility"],
      ["keycap", "/docs/components/keycap"],
      ["keyboard", "/docs/component-api"],
    ])("%s keeps %s", async (query, url) => {
      const [first] = await search(query);
      expect(first?.url).toBe(url);
    });
  },
);
