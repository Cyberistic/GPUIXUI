import { readFileSync, readdirSync } from "node:fs";
import {
  contrastRatio,
  elevationShadow,
  highContrastLightColors,
  lightTheme,
} from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { pageUrl, propsOf } from "./component-index";
import { packageCollections } from "./collection-routes";
import { inventory } from "./inventory-data";

/**
 * The curated component pages make claims the code owns: which runtime version
 * a gap was measured on, how many native behaviour tests prove the component,
 * whether the inventory calls it shipped — and how the component paints.
 *
 * Each drifted. After the 0.11.0 bump the pages still measured their gaps on
 * 0.10.0 — and the Button page said the runtime had no `focusVisible`, which
 * 0.11.0 paints. The Tabs page claimed 14 native tests where the suite runs 19,
 * and it went on saying selection was "painted per trigger" with "no measured
 * overlay" after `tabs-indicator` shipped as one measured, sliding surface. The
 * Button page said `COMPONENTS.md` listed Tier 1 as `todo` long after the rows
 * were `done`. A page that undersells or overstates the code is the same defect
 * in both directions.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string, base: URL = root): string =>
  readFileSync(new URL(path, base), "utf8");

/** The runtime the workspace installs, from the package catalogue. */
const pinnedRuntime = (): string => {
  const manifest: unknown = JSON.parse(read("package.json"));
  const catalog =
    typeof manifest === "object" &&
    manifest !== null &&
    "workspaces" in manifest
      ? manifest.workspaces
      : undefined;
  const versions =
    typeof catalog === "object" && catalog !== null && "catalog" in catalog
      ? catalog.catalog
      : undefined;
  const version =
    typeof versions === "object" &&
    versions !== null &&
    "@gpuix/native" in versions
      ? versions["@gpuix/native"]
      : undefined;
  return typeof version === "string" ? version : "";
};

interface CuratedPage {
  readonly file: string;
  /** The row in `COMPONENTS.md` this component's status comes from. */
  readonly row: string;
  /** The native suite that proves it, when the page prints a test count. */
  readonly suite?: string;
  /** The source the page's Dependencies table describes. */
  readonly source: string;
  /**
   * The package page this curated page displaces.
   *
   * A docs page is served at one URL, so a curated page whose name matches a
   * package page wins it: the package page is unreachable. Anything only the
   * package page documented is then documented nowhere on the site — which is
   * how `DropdownMenuCheckboxItem`'s two required props went missing.
   */
  readonly shadowed?: string;
}

const pages: ReadonlyArray<CuratedPage> = [
  {
    file: "accordion.mdx",
    row: "Accordions",
    suite: "packages/components/src/behaviour/accordion.test.tsx",
    shadowed: "packages/components/docs/accordion.mdx",
    source: "packages/components/src/accordion.tsx",
  },
  {
    file: "alert.mdx",
    row: "Alerts",
    suite: "packages/components/src/behaviour/alert.test.tsx",
    shadowed: "packages/components/docs/alert.mdx",
    source: "packages/components/src/alert.tsx",
  },
  {
    file: "button.mdx",
    row: "Buttons",
    source: "packages/primitives/src/components/Button.tsx",
  },
  {
    file: "card.mdx",
    row: "Cards",
    suite: "packages/components/src/behaviour/card.test.tsx",
    shadowed: "packages/components/docs/card.mdx",
    source: "packages/components/src/card.tsx",
  },
  {
    file: "checkbox.mdx",
    row: "Checkboxes",
    source: "packages/primitives/src/components/Checkbox.tsx",
  },
  {
    file: "combobox.mdx",
    row: "Comboboxes",
    suite: "packages/components/src/behaviour/combobox.test.tsx",
    shadowed: "packages/components/docs/combobox.mdx",
    source: "packages/components/src/combobox.tsx",
  },
  {
    file: "command-menu.mdx",
    row: "Command menus",
    suite: "packages/components/src/behaviour/command-menu.test.tsx",
    shadowed: "packages/components/docs/command-menu.mdx",
    source: "packages/components/src/command-menu.tsx",
  },
  {
    file: "confirm-dialog.mdx",
    row: "Confirmation dialogs",
    suite: "packages/components/src/behaviour/confirm-dialog.test.tsx",
    shadowed: "packages/components/docs/confirm-dialog.mdx",
    source: "packages/components/src/confirm-dialog.tsx",
  },
  {
    file: "dialog.mdx",
    row: "Dialogs",
    suite: "packages/components/src/behaviour/dialog.test.tsx",
    shadowed: "packages/components/docs/dialog.mdx",
    source: "packages/components/src/dialog.tsx",
  },
  {
    file: "dropdown-menu.mdx",
    row: "Dropdown menus",
    suite: "packages/components/src/behaviour/dropdown-menu.test.tsx",
    shadowed: "packages/components/docs/dropdown-menu.mdx",
    source: "packages/components/src/dropdown-menu.tsx",
  },
  {
    file: "field.mdx",
    row: "Inline validation",
    suite: "packages/components/src/behaviour/field.test.tsx",
    shadowed: "packages/components/docs/field.mdx",
    source: "packages/components/src/field.tsx",
  },
  {
    file: "list.mdx",
    row: "Lists / list items",
    suite: "packages/components/src/behaviour/list.test.tsx",
    shadowed: "packages/components/docs/list.mdx",
    source: "packages/components/src/list.tsx",
  },
  {
    file: "popover.mdx",
    row: "Popovers",
    suite: "packages/components/src/behaviour/popover.test.tsx",
    shadowed: "packages/components/docs/popover.mdx",
    source: "packages/components/src/popover.tsx",
  },
  {
    file: "select.mdx",
    row: "Selects",
    source: "packages/primitives/src/components/Select.tsx",
  },
  {
    file: "tabs.mdx",
    row: "Tabs",
    suite: "packages/components/src/behaviour/tabs.test.tsx",
    shadowed: "packages/components/docs/tabs.mdx",
    source: "packages/components/src/tabs.tsx",
  },
  {
    file: "toast.mdx",
    row: "Toasts / notifications",
    suite: "packages/components/src/behaviour/toast.test.tsx",
    shadowed: "packages/components/docs/toast.mdx",
    source: "packages/components/src/toast.tsx",
  },
  {
    file: "tooltip.mdx",
    row: "Tooltips",
    source: "packages/primitives/src/components/Tooltip.tsx",
  },
];

const body = (page: CuratedPage): string =>
  read(`apps/docs/content/docs/components/${page.file}`);

/** The `## Status` section, which is where a page makes its claims. */
const status = (page: CuratedPage): string => {
  const text = body(page);
  const start = text.indexOf("## Status");
  return start === -1 ? "" : text.slice(start);
};

/**
 * The `<Button …>…</Button>` block that carries a `testId`.
 *
 * Read by position rather than with a regex: a pattern literal containing a
 * quote is still mis-scanned by `scripts/check-tests.ts`, which then reports
 * every later test in the file as assertionless (`TODO.md` → Harness).
 */
const elementBlock = (source: string, testId: string): string => {
  const marker = `testId="${testId}"`;
  const at = source.indexOf(marker);
  const from = at === -1 ? -1 : source.lastIndexOf("<Button", at);
  const end = at === -1 ? -1 : source.indexOf("</Button>", at);
  return from === -1 || end === -1 ? "" : source.slice(from, end);
};

/** Every `it(` in a suite file: the native cases the page counts. */
const nativeCases = (suite: string): number =>
  (read(suite).match(/\bit\(/g) ?? []).length;

/** The `## Dependencies` table's package cells. */
const dependencies = (page: CuratedPage): ReadonlyArray<string> => {
  const text = body(page);
  const start = text.indexOf("## Dependencies");
  if (start === -1) return [];
  const end = text.indexOf("\n## ", start + 1);
  const section = text.slice(start, end === -1 ? undefined : end);

  return section
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .flatMap((line) => {
      const cell = line.replace(/^\|/, "").split("|")[0]?.trim();
      return cell === undefined || cell === "Package" || cell.startsWith("---")
        ? []
        : [cell.replace(/`/g, "")];
    });
};

/**
 * Every package a source imports. A relative import is this package's own code
 * (the table's `this package` row), `react` is a peer every component shares,
 * and an `effect` subpath is the `effect` package the table names.
 */
const importedPackages = (source: string): ReadonlyArray<string> =>
  [...source.matchAll(/(?:from\s+|import\s+)"([^"]+)"/g)]
    .flatMap((match) => (match[1] === undefined ? [] : [match[1]]))
    .filter(
      (specifier) =>
        !specifier.startsWith(".") &&
        !specifier.startsWith("node:") &&
        specifier !== "react" &&
        specifier !== "react-dom" &&
        specifier !== "react/jsx-runtime",
    )
    .map((specifier) =>
      specifier.startsWith("effect/") ? "effect" : specifier,
    )
    .filter((specifier, index, all) => all.indexOf(specifier) === index);

describe("the curated component pages", () => {
  it("name the runtime version their gaps were measured on", () => {
    const pinned = pinnedRuntime();

    expect(pinned).not.toBe("");
    expect(
      pages.filter((page) => !body(page).includes(`@gpuix/native@${pinned}`)),
    ).toEqual([]);
  });

  it("cite no version other than the pinned runtime", () => {
    const pinned = pinnedRuntime();
    const stale = pages.flatMap((page) =>
      [...body(page).matchAll(/\b(\d+\.\d+\.\d+)\b/g)]
        .flatMap((match) => (match[1] === undefined ? [] : [match[1]]))
        .filter((version) => version !== pinned)
        .map((version) => `${page.file}: ${version}`),
    );

    expect(stale).toEqual([]);
  });

  it("print the number of native cases their suite runs", () => {
    const wrong = pages.flatMap((page) => {
      if (page.suite === undefined) return [];
      const printed = /(\d+) native/.exec(status(page))?.[1];
      return printed === String(nativeCases(page.suite))
        ? []
        : [
            `${page.file}: says ${printed ?? "nothing"}, suite runs ${nativeCases(page.suite)}`,
          ];
    });

    expect(wrong).toEqual([]);
  });

  it("describe the modes, the indicator and the row the source paints", () => {
    // The accordion's two modes are separate state shapes, its indicator is a
    // chevron swap rather than a rotation (0.11.0 has no `transform`), and its
    // header row is the `lg` control height with the hover wash. The page prints
    // the mode table and the row's roles, so both are read from the source that
    // paints them instead of trusted.
    const accordion = pages.find((page) => page.file === "accordion.mdx");
    expect(
      accordion,
      "the accordion page is not in the curated set",
    ).toBeDefined();
    if (accordion === undefined) return;

    const source = read(accordion.source);
    expect(read("packages/components/src/accordion/logic.ts")).toContain(
      "AccordionState",
    );
    // The indicator swaps; a rotated chevron is not a shape the runtime has.
    expect(source).toContain('name={open ? "chevron-up" : "chevron-down"}');
    expect(source).toContain('label={open ? "Collapse" : "Expand"}');
    expect(source).not.toContain("rotate");
    // The row: the `lg` control height, the hover wash, and no tab stop while
    // the section is disabled.
    expect(source).toContain('height: controlHeight(theme, "lg")');
    expect(source).toContain("backgroundColor: theme.colors.hover");
    expect(source).toContain("tabIndex={disabled ? -1 : 0}");
    // The runtime publishes no `aria-controls`, so the page must not teach one.
    expect(source).not.toContain("aria-controls");

    const text = body(accordion).replace(/\s+/g, " ");
    expect(text).toContain("No `aria-controls`");
    expect(text).toContain("`density.controlHeight.lg`");
    expect(text).toContain("16 native behaviour tests");
    expect(text).toContain("unmounted");
    // The retracted shape: a rotation the indicator does not do.
    expect(text).not.toContain("rotates");
  });

  it("hold the confirmation's safety decisions to the source", () => {
    // A confirmation is safe because of two decisions in code, and neither is
    // visible in a screenshot: Cancel must own the initial focus, or Enter on
    // an untouched dialog destroys something; and confirm must report rather
    // than close, or a failed save vanishes with the surface. The page also
    // teaches the busy mark, which must stay the named `loader` icon — 0.11.0
    // has no transform, so a page that promised a spinner would sell a
    // behaviour the runtime cannot paint.
    const confirm = pages.find((page) => page.file === "confirm-dialog.mdx");
    expect(
      confirm,
      "the confirmation dialog page is not in the curated set",
    ).toBeDefined();
    if (confirm === undefined) return;

    const source = read(confirm.source);
    expect(source).toContain("initialFocus={() => cancel.current?.id ?? null}");
    expect(source).toContain("dismissible={!loading}");

    const cancel = elementBlock(source, "confirm-cancel");
    const accept = elementBlock(source, "confirm-accept");
    expect(cancel, "the cancel action no longer holds the ref").toContain(
      "ref={cancel}",
    );
    expect(cancel).toContain("onOpenChange(false)");
    // The whole point: the confirm path never closes. A handler that set the
    // open state here would hide the failure the caller has to render.
    expect(accept).toContain("onClick={onConfirm}");
    expect(accept).not.toContain("onOpenChange");

    expect(source).toContain('name="loader"');
    expect(source).toContain('label="In progress"');
    expect(source).toContain("actionOnColor(theme, variant)");
    // The mark takes the action's own label role; the page names the role and
    // the button source proves it, rather than the page printing a colour.
    expect(read("packages/components/src/internal/button.tsx")).toContain(
      'Match.when("secondary", () => theme.colors.secondaryForeground)',
    );

    // The surface is the dialog's own, at `sm`, with no close control: a page
    // that taught a third exit would contradict `showClose={false}`.
    expect(source).toContain('size="sm"');
    expect(source).toContain("showClose={false}");
    const dialog = read("packages/components/src/dialog.tsx").replace(
      /\s+/g,
      " ",
    );
    expect(dialog).toContain("sm: 360");
    const call = dialog.indexOf("overlaySurfaceStyle(DIALOG_CONTENT");
    expect(
      call === -1 ? "" : dialog.slice(call, dialog.indexOf(")", call) + 1),
      "the dialog surface no longer names the elevation level it paints",
    ).toContain('"lg"');

    const text = body(confirm).replace(/\s+/g, " ");
    expect(text).toContain("Cancel holds the initial focus");
    // The substance, not only the marker: the caller owns the close, which is
    // why a failed save can stay on screen.
    expect(text).toContain("The caller runs the work and closes the dialog");
    expect(text).toContain("so a failure can stay visible");
    expect(text).toContain("does **not** spin");
    expect(text).toContain("In progress");
    expect(text).toContain("360px");
    expect(text).toContain("`elevation.lg`");
    // The retracted shape: a confirm that closes itself, or a busy mark that
    // animates. Neither is a behaviour the component or the runtime has.
    expect(text).not.toContain("closes after confirming");
    expect(text).not.toContain("spins beside the label");
  });

  it("hold the field's one message slot and its state paint to the source", () => {
    // The field's two safety decisions are structural, not visual: one message
    // slot (an error must replace the description, never stack under it), and
    // the caller owning the moment validation runs (no keystroke path). The
    // paint is read from the component and the app's message walk from the
    // validation module, so a page teaching "describe the error" neither can
    // drift from the code that ships.
    const field = pages.find((page) => page.file === "field.mdx");
    expect(field, "the field page is not in the curated set").toBeDefined();
    if (field === undefined) return;

    const source = read(field.source);
    const logic = read("packages/components/src/validation/logic.ts");

    // One slot: the description's branch and the error's branch, in that order.
    const choice = source.indexOf("error === undefined ?");
    const description = source.indexOf("<FieldDescription>");
    const error = source.indexOf("<FieldError>");
    expect(choice).toBeGreaterThan(-1);
    expect(description).toBeGreaterThan(choice);
    expect(error).toBeGreaterThan(description);
    expect(source).toContain('role="alert"');

    // The required marker is a label, not part of the name.
    expect(source).toContain('aria-label="Required"');
    expect(source).toContain("${text}. Required");

    // The invalid edge and the message's measured role.
    expect(source).toContain("theme.colors.destructive");
    expect(source).toContain('statusTone(theme, "destructive").foreground');
    expect(source).toContain("keyboardRing(theme, isInvalid)");

    // Disabled: neutral roles and no tab stop, not a whole-control fade.
    expect(source).toContain("readOnly: true, tabIndex: -1");
    expect(source).toContain("theme.colors.disabled");
    expect(source).toContain("theme.colors.disabledForeground");
    expect(source).toContain('cursor: "not-allowed"');
    expect(source).not.toContain("opacity");

    // The runtime attributes the page says are absent really are.
    expect(source).not.toContain('"aria-describedby"');
    expect(source).not.toContain('"aria-invalid"');
    expect(source).not.toContain('"aria-required"');

    // The two message readers: the first message, and every distinct one. The
    // default read is `validate`'s; only `validateAll` asks for every error.
    expect(logic).toContain("SchemaIssue.makeFormatterDefault");
    expect(logic).toContain("Schema.decodeUnknownResult(schema)(value)");
    expect(logic).toContain(
      'Schema.decodeUnknownResult(schema, { errors: "all" })(value)',
    );
    expect(logic).toContain("Arr.dedupe");

    const text = body(field).replace(/\s+/g, " ");
    expect(text).toContain("one message slot");
    expect(text).toContain("replaces the description");
    expect(text).toContain("does not fade itself");
    expect(text).toContain(
      "No `aria-describedby`, `aria-invalid` or `aria-required`",
    );
    expect(text).toContain("7 native behaviour tests");
    expect(text).toContain("There is no auto-validate on every keystroke");
    // The retracted shapes: a field that validates itself, or a faded control.
    expect(text).not.toContain("validates on every keystroke and");
    expect(text).not.toContain("fades the whole control");
  });

  it("hold the select's list cap and its reveal to the source", () => {
    // A Select looks like a field and a list, so the two decisions a reader
    // cannot see are what the page has to get right: the 320px cap is the
    // component's own (the runtime's content sets no maximum height and its
    // scroll parts are empty in 0.11.0), and a row that the arrows reach below
    // the fold moves the list itself — GPUix never scrolls its own highlight
    // into view. A page that taught either the other way would describe a
    // component nobody shipped.
    const select = pages.find((page) => page.file === "select.mdx");
    expect(select, "the select page is not in the curated set").toBeDefined();
    if (select === undefined) return;

    const source = read(select.source);
    const scroll = read("packages/primitives/src/core/scroll.ts");

    // The bound, and the scroller that makes it reachable.
    expect(source).toContain("maxHeight: 320");
    expect(source).toContain('overflowY: "scroll"');

    // The reveal is the wrapper's arithmetic over painted boxes, not the
    // runtime's `scrollIntoView` (which only reaches a direct child).
    expect(source).toContain("revealScroll");
    expect(source).toContain("renderer.getElementBounds");
    expect(source).toContain("renderer.scrollTo");
    expect(scroll).toContain("revealScroll");

    // The mark comes from the row's reported state, in the popover's own text
    // role, so an uncontrolled select keeps no mirror of its value.
    expect(source).toContain('name="check"');
    expect(source).toContain("theme.colors.popoverForeground");
    expect(source).toContain("state.selected");

    // The trigger shows the chosen value, so it opts out of the keyboard dim;
    // its ring is the shared resting one.
    expect(source).toContain("keepContent");
    expect(source).toContain("controlRing");
    expect(read("packages/primitives/src/core/focus.ts")).toContain(
      "keyboardFocusDim: false",
    );

    // The options are data: the runtime receives one flat list.
    expect(source).toContain("isSelectGroup");
    expect(source).toContain("Arr.flatMap");

    const text = body(select).replace(/\s+/g, " ");
    expect(text).toContain("320px");
    expect(text).toContain("reveals itself");
    expect(text).toContain("check mark");
    expect(text).toContain("keyboardFocusDim: false");
    expect(text).toContain("No type-ahead");
    expect(text).toContain("one flat list");
    // The retracted shape: the keyboard gap the reveal closed.
    expect(text).not.toContain("cannot reach the tail");
    expect(text).not.toContain("does not scroll the highlight");
  });

  it("hold the combobox's ranking and its create row to the source", () => {
    // A combobox looks like a select with a search field, so the rules that
    // matter are the ones the drawing cannot show: the ranking is ours (GPUix's
    // filter only removes rows), the cap is the component's (the runtime sets no
    // maximum height), a disabled row is painted a role rather than faded, and
    // the create row is offered only when nothing matches. Each is read from the
    // file that ships it, so the page cannot teach a list the component does not
    // build.
    const combobox = pages.find((page) => page.file === "combobox.mdx");
    expect(
      combobox,
      "the combobox page is not in the curated set",
    ).toBeDefined();
    if (combobox === undefined) return;

    const logic = read("packages/components/src/combobox/logic.ts");
    const source = read(combobox.source);
    const recipes = read("packages/tw/src/recipes.ts");

    // The ranking's four rules, in the order the page prints them.
    const rank = logic.slice(logic.indexOf("const rank ="));
    const order = [
      "Str.startsWith(query)(label)",
      "wordStarts(label, query)",
      "Str.includes(query)(label)",
      'normalise(option.description ?? "")',
    ].map((rule) => rank.indexOf(rule));
    expect(order.every((at) => at > -1)).toBe(true);
    // Ascending: prefix, then word prefix, then substring, then description.
    expect(order[0]).toBeLessThan(order[1] ?? -1);
    expect(order[1]).toBeLessThan(order[2] ?? -1);
    expect(order[2]).toBeLessThan(order[3] ?? -1);
    // Ties keep declaration order rather than the runtime's own order.
    expect(logic).toContain("byRankThenDeclaration");
    expect(logic).toContain("Order.mapInput(Order.Number");

    // The runtime receives the ranked list, and the adapter owns the query.
    expect(source).toContain("filter={null}");
    expect(source).toContain("inputValue={query}");
    expect(source).toContain('autoHighlight="always"');

    // The create row: text, no match, single mode. The caller adds the option.
    expect(logic).toContain("Arr.isReadonlyArrayEmpty(visible)");
    expect(source).toContain("onCreate !== undefined && !multiple");

    // The cap is the component's, and the list scrolls.
    expect(source).toContain("maxHeight: 280");
    expect(source).toContain('overflowY: "scroll"');

    // A selected row reports its own state; a disabled row names its roles.
    expect(source).toContain("aria-selected={selected}");
    expect(source).toContain("theme.colors.disabledForeground");
    expect(source).toContain("isCreateRow(value)");

    // The trigger is a field on the page's own fill, not a field's `input` fill.
    // The recipe is sliced by position: a pattern literal holding a quote is
    // still mis-scanned by `scripts/check-tests.ts` (TODO.md → Harness).
    const declaration = (name: string): string => {
      const at = recipes.indexOf(`export const ${name} =`);
      if (at === -1) return "";
      const end = recipes.indexOf("\n\n", at);
      return recipes.slice(at, end === -1 ? undefined : end);
    };
    const trigger = declaration("COMBOBOX_TRIGGER");
    expect(trigger).toContain("bg-background");
    expect(trigger).toContain("border-strong");
    const content = declaration("COMBOBOX_CONTENT");
    expect(content).toContain("bg-popover");
    expect(content).toContain("shadow-md");

    const text = body(combobox).replace(/\s+/g, " ");
    expect(text).toContain("starts with the query");
    expect(text).toContain("a word inside the label starts with the query");
    expect(text).toContain("the description contains the query");
    expect(text).toContain("280px");
    expect(text).toContain("No `aria-activedescendant`");
    expect(text).toContain("offered only when nothing matches");
    expect(text).toContain("22 native behaviour tests");
    expect(text).toContain("`partial`");
    // The retracted shapes: a runtime ranking, or a faded disabled row.
    expect(text).not.toContain("the runtime ranks");
    expect(text).not.toContain("faded disabled");
    expect(text).not.toContain("loads options asynchronously");
  });

  it("hold the list's roving stop, its range and its disabled paint to the source", () => {
    // A list looks like rows, so the page has to get right what a screenshot
    // cannot show: one tab stop rather than one per row, arrows that skip a
    // disabled row and act on the row that sent the key, a range that never
    // includes a disabled row, a typed prefix that searches *after* the current
    // row, and a disabled row that keeps its fills and names its text roles
    // instead of fading. Each is read from the module that ships it.
    const list = pages.find((page) => page.file === "list.mdx");
    expect(list, "the list page is not in the curated set").toBeDefined();
    if (list === undefined) return;

    const source = read(list.source);
    const collection = read("packages/components/src/internal/collection.ts");
    const typeahead = read("packages/components/src/internal/typeahead.ts");
    const selection = read("packages/components/src/list/selection.ts");
    const recipes = read("packages/tw/src/recipes.ts");

    // One stop, on the active row; the role follows the mode.
    expect(source).toContain('role={selectable ? "option" : "listitem"}');
    expect(source).toContain(
      "tabIndex={selectable ? (isTabbable ? 0 : -1) : undefined}",
    );
    expect(source).toContain('"aria-selected": isSelected');
    // The row's height is the density plus one spacing step.
    expect(source).toContain("theme.density.rowHeight + theme.spacing.md");
    expect(source).toContain("theme.density.rowHeight");

    // Arrows skip a disabled row and wrap; type-ahead searches after the row.
    expect(collection).toContain("nextEnabled");
    expect(collection).toContain("enabledIndexes");
    expect(typeahead).toContain("matchPrefix");
    const window = /Duration\.millis\((\d+)\)/.exec(typeahead)?.[1];
    expect(window, "typeahead no longer declares its window").toBeDefined();

    // A range never takes a disabled row, and select-all is the enabled set.
    expect(selection).toContain("Arr.filter((row) => !row.disabled)");
    expect(selection).toContain("export const range");

    // The paint: a selected row's title takes the row's on-colour, and a
    // disabled row names its roles rather than fading.
    expect(source).toContain("theme.colors.selectedForeground");
    expect(source).toContain("theme.colors.disabledForeground");
    expect(source).toContain('cursor: disabled ? "not-allowed" : "pointer"');
    const rowPaint = source.slice(
      source.indexOf("...(isSelected"),
      source.indexOf("...(isSelected") + 200,
    );
    expect(rowPaint).toContain("theme.colors.selected");
    expect(source).not.toContain("opacity: disabled");
    const at = recipes.indexOf("export const LIST_ITEM =");
    const item =
      at === -1 ? "" : recipes.slice(at, recipes.indexOf("\n\n", at));
    expect(item).toContain("flex-row");
    expect(recipes).toContain("export const LIST_ITEM_TITLE");

    const text = body(list).replace(/\s+/g, " ");
    expect(text).toContain("one tab stop");
    expect(text).toContain(`${window}ms`);
    expect(text).toContain("**after** the current one");
    expect(text).toContain("No `aria-multiselectable`");
    expect(text).toContain("without running its `onFocus`");
    expect(text).toContain("never fades by opacity");
    // Derived, so a case added to the suite fails the generic count check above
    // rather than leaving this line asserting a stale number.
    expect(list.suite, "the list page names no behaviour suite").toBeDefined();
    expect(text).toContain(
      `${nativeCases(list.suite ?? "")} native behaviour tests`,
    );
    // The retracted shapes: a stop per row, or a faded disabled row.
    expect(text).not.toContain("one tab stop per row");
    expect(text).not.toContain("disabled rows are dimmed");
  });

  it("hold the toast queue's bounds and its card paint to the source", () => {
    // The three rules a toast must not lose are arithmetic, not styling: a
    // fourth push drops the oldest, ids are a monotonic counter (a reused id
    // would let a stale timer dismiss the next toast), and a card can be held
    // by the pointer or focus but resumes with the time left. The page prints
    // them beside the browser rendering, so both are read from the store and
    // the viewport that ship.
    const toast = pages.find((page) => page.file === "toast.mdx");
    expect(toast, "the toast page is not in the curated set").toBeDefined();
    if (toast === undefined) return;

    const store = read("packages/components/src/toast/store.ts");
    const model = read("packages/components/src/toast/model.ts");
    const viewport = read("packages/components/src/toast/viewport.tsx");
    const recipes = read("packages/tw/src/recipes.ts");

    expect(store).toContain("const DEFAULT_MAX = 3;");
    expect(store).toContain("const DEFAULT_DURATION = Duration.seconds(5);");
    expect(store).toContain("String(current.seq + 1)");
    expect(store).toContain("Arr.drop(appended, overflow)");

    expect(model).toContain('"info"');
    expect(model).toContain('"success"');
    expect(model).toContain('"warning"');
    expect(model).toContain('"danger"');
    expect(model).toContain("title: Schema.NonEmptyString");

    expect(viewport).toContain('role="status"');
    expect(viewport).toContain('aria-label="Notifications"');
    expect(viewport).toContain('pointerEvents: present ? "auto" : "none"');
    expect(viewport).toContain("held.current.focus > 0");
    expect(viewport).toContain(
      "Math.max(0, held.current.focus + (value ? 1 : -1))",
    );
    expect(viewport).toContain("width: 3");
    expect(viewport).toContain("actionFor(toast.id)");
    expect(viewport).toContain("onSelect();");
    expect(viewport).not.toContain("aria-live");

    expect(recipes).toContain("w-[380px]");
    expect(recipes).toContain("bg-popover");
    expect(recipes).toContain("shadow-md");

    const text = body(toast).replace(/\s+/g, " ");
    expect(text).toContain("pushing a fourth drops the oldest");
    expect(text).toContain("never reused");
    expect(text).toContain("at most one action");
    expect(text).toContain("draws nothing");
    expect(text).toContain("remaining");
    expect(text).toContain("No `aria-live` and no `aria-atomic`");
    expect(text).toContain("No progress indicator");
    expect(text).toContain("380px");
    expect(text).toContain("16 native behaviour tests");
    expect(text).toContain("Render the viewport **last**");
    // The retracted shapes: an escape path and an announcement the runtime
    // cannot make.
    expect(text).not.toContain("Escape dismisses the toast");
    expect(text).not.toContain("announced by aria-live");
  });

  it("describe the alert's tone paint and the announcement it does not claim", () => {
    // The package page the curated page displaces said the root is "a live
    // region, announced when it appears". The runtime's aria set has no live
    // region, and no probe measured an announcement, so the site must not sell
    // one: the role is a marker. The tone paint is read from the recipe too, so
    // a palette move cannot leave the table teaching old roles.
    const alert = pages.find((page) => page.file === "alert.mdx");
    expect(alert, "the alert page is not in the curated set").toBeDefined();
    if (alert === undefined) return;

    const recipes = read("packages/tw/src/recipes.ts");
    const base =
      /export const ALERT_BASE =\s*"([^"]*)"/.exec(recipes)?.[1] ?? "";
    const tones =
      /export const ALERT_TONES = \{([\s\S]*?)\} as const;/.exec(
        recipes,
      )?.[1] ?? "";

    expect(base).toContain("p-3");
    expect(base).toContain("rounded-md");
    expect(tones).toContain("bg-infoSoft");
    expect(tones).toContain("bg-destructiveSoft");
    expect(tones).toContain("border-destructive/30");

    // The page's tone table is read against the recipe, cell by cell: a role
    // renamed in `ALERT_TONES` cannot leave the table teaching the old paint.
    const text = body(alert).replace(/\s+/g, " ");
    const declared = new Map(
      [
        ...tones.matchAll(/(\w+):\s*"bg-(\w+) text-(\w+) border-(\w+)\/30"/g),
      ].map(
        (match) =>
          [
            match[1] ?? "",
            {
              surface: match[2] ?? "",
              title: match[3] ?? "",
              edge: match[4] ?? "",
            },
          ] as const,
      ),
    );
    const printed = new Map(
      [
        ...body(alert).matchAll(
          /^\| `(\w+)`(?: \(default\))? \| `(\w+)` \| `(\w+)` \| `(\w+)` at 30% \|$/gm,
        ),
      ].map(
        (match) =>
          [
            match[1] ?? "",
            {
              surface: match[2] ?? "",
              title: match[3] ?? "",
              edge: match[4] ?? "",
            },
          ] as const,
      ),
    );

    expect(declared.size).toBe(4);
    expect(printed.size).toBe(declared.size);
    expect(
      [...printed].filter(
        ([tone, cells]) =>
          cells.surface !== declared.get(tone)?.surface ||
          cells.title !== declared.get(tone)?.title ||
          cells.edge !== declared.get(tone)?.edge,
      ),
    ).toEqual([]);

    const source = read(alert.source);
    expect(source).toContain('role="alert"');
    expect(source).toContain('testId="alert-dismiss"');

    const live =
      read("docs/gpuix-capabilities.md")
        .split("\n")
        .find((line) => line.startsWith("| Live regions")) ?? "";
    expect(live).toContain("not supported");

    expect(text).toContain('role="alert"');
    expect(text).toContain("no live-region attribute");
    expect(text).toContain("does not claim one");
    expect(text).not.toContain("announced when it appears");
    expect(text).toContain("`foreground`");
  });

  it("describe the selected surface the source paints", () => {
    // The Tabs page said selection was "painted per trigger", that the native
    // side had "no measured overlay", and that the surface "jumps between
    // triggers" — all three after `tabs-indicator` shipped as one measured,
    // sliding surface. The test count and the status cannot see a claim like
    // that, so the description is derived from the source and from the motion
    // package instead of trusted.
    const tabs = pages.find((page) => page.file === "tabs.mdx");
    expect(tabs, "the tabs page is not in the curated set").toBeDefined();
    if (tabs === undefined) return;

    const source = read(tabs.source);
    expect(source).toContain('testId="tabs-indicator"');
    expect(source).toContain("motion={{");
    expect(source).toContain("backgroundColor: theme.colors.selected");

    const level = /useSurfaceTiming\("([a-z]+)"\)/.exec(source)?.[1];
    expect(
      level,
      "tabs.tsx no longer names its surface timing level",
    ).toBeDefined();
    const duration = new RegExp(`\\b${level}\\b:\\s*(\\d+)`).exec(
      read("packages/motion/src/timing.ts"),
    )?.[1];
    expect(duration, `motionLevels has no ${level}`).toBeDefined();

    const text = body(tabs).replace(/\s+/g, " ");
    expect(text).not.toContain("painted per trigger");
    expect(text).not.toContain("no measured overlay");
    expect(text).not.toContain("jumps between");
    expect(text).toContain("`tabs-indicator`");
    expect(text).toContain("slides");
    expect(text).toContain(`\`${level}\`, ${duration} ms`);
  });

  it("hold the pill's colour role to the palette that forced it", () => {
    // The page says the pill paints `selected` rather than `card` because
    // `card` equals the rail's `background` in the high-contrast light theme.
    // If that palette moves, every other check stays green while the page
    // teaches a decision whose cause is gone.
    const ratio = contrastRatio(
      highContrastLightColors.card,
      highContrastLightColors.background,
    );
    expect(ratio, "the high-contrast light cards do not paint").toBeDefined();

    const tabs = pages.find((page) => page.file === "tabs.mdx");
    expect(tabs, "the tabs page is not in the curated set").toBeDefined();
    if (tabs === undefined) return;

    const text = body(tabs).replace(/\s+/g, " ");
    expect(text).toContain(
      "`card` equals the rail's `background` in the high-contrast light theme",
    );
    expect(text).toContain(`(${ratio?.toFixed(2)}:1)`);
  });

  it("derive a link's paint from the brand-text the registry registers", () => {
    // The page taught that `link` paints "the primary role". It does not: a
    // `primary` is a fill chosen to carry `primaryForeground`, and as text it is
    // under the 4.5:1 floor on most styles (4.30:1 on the base light theme's
    // pressed wash, 3.10:1 in macOS dark), so the primitives register
    // `text-brand` and the link paints `brandText(theme)`. A reader who tuned
    // `primary` for links would not get the colour the page promised.
    const button = pages.find((page) => page.file === "button.mdx");
    expect(button, "the button page is not in the curated set").toBeDefined();
    if (button === undefined) return;

    expect(read("packages/primitives/src/recipe/registry.ts")).toContain(
      '"text-brand": (theme) => ({ color: brandText(theme) })',
    );

    const text = body(button).replace(/\s+/g, " ");
    expect(text).toContain("`brandText(theme)`");
    expect(text).not.toContain("text in the primary role");
    expect(text).not.toContain("| `link` | `primary` |");
  });

  it("describe the card's edge, lift and fixed metrics", () => {
    // The package page the curated page replaces said the outline edge was the
    // `border` role, the elevated card painted `elevation.md`, and colour,
    // spacing, radius and type all came from the theme. The recipe says
    // otherwise: the outline edge is `border-input`, elevated is `shadow-sm`
    // (which the registry maps to `elevation.sm`), and `components` compiles
    // against the default registry's fixed metrics (ADR 0006) — so a platform
    // switch repaints a card and does not reshape it. Reading the recipe here
    // means the page and the compiled surface cannot disagree.
    const card = pages.find((page) => page.file === "card.mdx");
    expect(card, "the card page is not in the curated set").toBeDefined();
    if (card === undefined) return;

    const recipes = read("packages/tw/src/recipes.ts");
    const block =
      /export const CARD_VARIANTS = \{([\s\S]*?)\} as const;/.exec(
        recipes,
      )?.[1] ?? "";
    const variants = new Map(
      [...block.matchAll(/^\s*(\w+):\s*"([^"]*)",?$/gm)].map((match) => [
        match[1] ?? "",
        match[2] ?? "",
      ]),
    );

    expect(variants.get("outline")).toBe("border border-input");
    expect(variants.get("plain")).toBe("");

    const utility = /shadow-([a-z]+)/.exec(variants.get("elevated") ?? "")?.[1];
    expect(utility, "the elevated card paints no shadow").toBeDefined();

    const utilities = read("packages/tw/src/utilities.ts");
    const mapped = new RegExp(`\\b${utility ?? ""}:\\s*"([a-z]+)"`).exec(
      utilities,
    )?.[1];
    const level = (["sm", "md", "lg"] as const).find(
      (candidate) => candidate === mapped,
    );
    expect(
      level,
      `the registry maps shadow-${utility ?? ""} to ${mapped ?? "nothing"}`,
    ).toBeDefined();
    if (level === undefined) return;

    const shadow = elevationShadow(lightTheme, level);
    expect(shadow, `elevation.${level} paints no shadow`).toBeDefined();
    if (shadow === undefined) return;

    const radiusBlock =
      /const RADIUS: Readonly<Record<string, number>> = \{([\s\S]*?)\};/.exec(
        utilities,
      )?.[1] ?? "";
    const radius = /^\s*lg: (\d+),$/m.exec(radiusBlock)?.[1];
    expect(radius, "the fixed registry has no lg radius").toBeDefined();

    // The seam the card compiles through: fixed metrics, not theme density.
    const seam = read("packages/components/src/internal/recipe.ts");
    expect(seam).toContain("shadcn's fixed metrics");
    expect(seam).toMatch(/\*\*default\*\* registry/);

    const text = body(card).replace(/\s+/g, " ");
    expect(text).toContain("`border`");
    expect(text).toContain(`\`elevation.${level}\``);
    expect(text).toContain(`${shadow.offsetY}px offset`);
    expect(text).toContain(`${shadow.blurRadius}px blur`);
    expect(text).toContain(`${radius ?? ""}px`);
    expect(text).toContain("default registry");

    // The edge's role is the compiler's, not the class name's: the recipe says
    // `border-input` (shadcn's name for its border) and `@gpuixui/tw` resolves
    // that to this library's `border` role, because `input` here is the field
    // fill. A page that read the class literally taught a role the renderer
    // never paints — `input` is the card's own white in the base light theme.
    expect(utilities).toContain(
      'if (name === "border-input") return { borderColor: theme.colors.border };',
    );
    expect(lightTheme.colors.input).not.toBe(lightTheme.colors.border);

    // The Variants and Theming cells are read directly, not through the page's
    // prose: bold markers would hide a retracted "**`input`** role" from a
    // `not.toContain("in the `input` role")` check.
    const outlineRow =
      /\| `outline` \(default\) \| `border border-input` \| ([^|\n]+) \|/.exec(
        body(card),
      )?.[1] ?? "";
    const themingRow =
      /\| outline and footer edge \| ([^|\n]+) \|/.exec(body(card))?.[1] ?? "";
    expect(outlineRow).toContain("`border`");
    expect(outlineRow).not.toContain("`input`");
    expect(themingRow).toContain("`border`");
    expect(themingRow).not.toContain("`input`");
    expect(text).toContain("`border-input`");
    expect(text).toContain("`border` role");

    // The retracted claims: the package page taught a role and a lift the
    // recipe does not paint.
    expect(text).not.toContain("in the `input` role");
    expect(text).not.toContain("elevation.md");
    expect(text).not.toContain("radius.lg");
  });

  it("describe the two shadows the overlay surfaces paint", () => {
    // `@gpuixui/tw` writes `shadow-*` and `ring-*` through the one `boxShadow`
    // slot and applies the ring after the utilities, so a compiled overlay
    // recipe is a 1px `foreground` ring at 5% and **no lift**. The runtime
    // paints a shadow list, and `overlaySurfaceStyle` restores the theme's level
    // beside that edge — so the four curated overlay pages state two shadows,
    // and they taught "no lift" after the seam landed. The level is read from
    // the component that names it, so a page cannot describe a different one.
    const recipes = read("packages/tw/src/recipes.ts");
    const recipe = (name: string): string =>
      new RegExp(`export const ${name} =\\s*\\n?\\s*"([^"]+)"`).exec(
        recipes,
      )?.[1] ?? "";

    const premises = ["DIALOG_CONTENT", "POPOVER_CONTENT", "MENU_CONTENT"].map(
      (name) => {
        const value = recipe(name);
        return {
          name,
          named: value !== "",
          ringWins: value.lastIndexOf("ring-1") > value.indexOf("shadow-"),
        };
      },
    );
    expect(
      premises
        .filter((premise) => !premise.named)
        .map((premise) => premise.name),
      "the recipe table lost an overlay surface",
    ).toEqual([]);
    expect(
      premises.filter((premise) => !premise.ringWins).map((p) => p.name),
      "the recipe paints its elevation because the ring no longer comes last",
    ).toEqual([]);

    // The seam that puts the level back, and the components that name one.
    const seam = read("packages/components/src/internal/overlay.ts");
    expect(seam, "the overlay seam lost its elevation argument").toContain(
      "elevation?: ElevationLevel",
    );
    expect(
      seam,
      "the seam stopped restoring the level beside the edge",
    ).toContain("boxShadow: [shadow, ...painted]");

    const passedLevel = (source: string, surface: string): string => {
      const flat = source.replace(/\s+/g, " ");
      return (
        new RegExp(`overlaySurfaceStyle\\(${surface},[^()]*?"(sm|md|lg)"`).exec(
          flat,
        )?.[1] ?? ""
      );
    };

    const surfaces = [
      {
        file: "dialog.mdx",
        source: "packages/components/src/dialog.tsx",
        surface: "DIALOG_CONTENT",
      },
      {
        file: "popover.mdx",
        source: "packages/components/src/popover.tsx",
        surface: "POPOVER_CONTENT",
      },
      {
        file: "dropdown-menu.mdx",
        source: "packages/components/src/menu/surface.tsx",
        surface: "MENU_CONTENT",
      },
      {
        // The palette is the dialog's surface, so the level is the dialog's too.
        file: "command-menu.mdx",
        source: "packages/components/src/dialog.tsx",
        surface: "DIALOG_CONTENT",
      },
    ];

    const overlay = (file: string): string =>
      read(`apps/docs/content/docs/components/${file}`).replace(/\s+/g, " ");

    const unnamed = surfaces
      .filter(
        ({ source, surface }) => passedLevel(read(source), surface) === "",
      )
      .map(({ source, surface }) => `${source} names no level for ${surface}`);
    expect(unnamed, "an overlay surface paints no elevation level").toEqual([]);

    const stale = surfaces
      .filter(({ file, source, surface }) => {
        const level = passedLevel(read(source), surface);
        const page = overlay(file);
        return (
          page.includes(`elevation.${level}`) === false ||
          page.includes("has no lift") ||
          page.includes("elevation step")
        );
      })
      .map(({ file, source, surface }) => {
        const level = passedLevel(read(source), surface);
        return `${file}: does not state the theme's elevation.${level} that ${surface} paints`;
      });
    expect(stale).toEqual([]);

    expect(overlay("popover.mdx")).not.toContain("10% in the dark theme");
    expect(overlay("popover.mdx")).toContain("keyboardRing(theme)");
  });

  it("agree with the inventory row for the component", () => {
    const disagreeing = pages.flatMap((page) => {
      const row = inventory.rows.find(
        (candidate) => candidate.name === page.row,
      );
      return row !== undefined && status(page).includes(row.status)
        ? []
        : [
            `${page.file}: says ${status(page).slice(0, 60)}…, inventory says ${row?.status ?? "no row"}`,
          ];
    });

    expect(disagreeing).toEqual([]);
  });

  it("state the runtime support verdict the inventory records", () => {
    // The status word was held to the inventory; the support verdict beside it
    // was not, so a page could drop `partial` and read as a component the
    // runtime covers whole — the one claim the strip exists to prevent. The
    // verdict is the first word of the cell (`partial`, `yes`, `?`); the rest
    // of the cell is the note the page's prose expands.
    const verdict = (support: string): string =>
      support.trim().split(/\s+/)[0] ?? "";

    const missing = pages.flatMap((page) => {
      const row = inventory.rows.find(
        (candidate) => candidate.name === page.row,
      );
      if (row === undefined) return [`${page.file}: no inventory row`];
      const word = verdict(row.support);
      return status(page).includes(`\`${word}\``)
        ? []
        : [
            `${page.file}: does not name the ${word} runtime verdict its inventory row records`,
          ];
    });

    // Floors: every curated page is read, and each verdict is a real word.
    expect(pages.length).toBeGreaterThanOrEqual(4);
    expect(missing).toEqual([]);
  });

  it("holds the checkbox's three states and its target to the source", () => {
    // A checkbox page can drift in three silent ways: it can promise an
    // `aria-checked` the runtime does not have, hide the 24px target that makes
    // the small drawing pressable, or teach the wrong activation edge (Space on
    // key down double-toggles). Each is read from the painter and the shared
    // decisions rather than trusted.
    const page = pages.find((candidate) => candidate.file === "checkbox.mdx");
    expect(page, "the checkbox page is not in the curated set").toBeDefined();
    if (page === undefined) return;

    const source = read(page.source);
    const selection = read("packages/primitives/src/core/selection.ts");
    const keyboard = read("packages/primitives/src/core/keyboard.ts");
    const recipe = read("packages/primitives/src/recipe/index.ts");

    expect(source).toContain('role="checkbox"');
    expect(source).toContain("aria-valuetext={selectionValueText(current)}");
    // No `aria-checked` attribute (the module's comment names the absence).
    expect(source).not.toContain("aria-checked=");
    expect(source).toContain("aria-description=");
    expect(source).toContain("selectionTargetStyle(spec, theme)");
    expect(source).toContain("controlRing(theme,");
    expect(source).toContain('pointerEvents: "none"');
    expect(source).toContain(
      "tabIndex={props.disabled === true ? undefined : 0}",
    );
    expect(source).toContain("composePress(props.disabled === true");

    // The target is the token helper's arithmetic, not a hardcoded 24px.
    expect(selection).toContain("targetInset(side)");
    expect(keyboard).toContain(
      'if (key === ENTER_KEY) return phase === "down"',
    );
    expect(keyboard).toContain('if (key === SPACE_KEY) return phase === "up"');
    expect(keyboard).toContain("if (held) return false");

    // The empty edge, its state wash and the filled box's derived fills.
    expect(recipe).toContain(
      'invalid === true ? "border-destructive" : "border-strong"',
    );
    expect(recipe).toContain("hover:bg-hover active:bg-active");
    expect(recipe).toContain("hover:fill-");
    expect(recipe).toContain("active:fill-");

    const text = body(page).replace(/\s+/g, " ");
    expect(text).toContain("@gpuix/native@0.11.0");
    expect(text).toContain("`aria-valuetext`");
    expect(text).toContain("no `aria-checked`");
    expect(text).toContain("24px");
    expect(text).toContain("key **up**");
    expect(text).toContain("key **down**");
    expect(text).toContain("held key");
    expect(text).toContain("paint override");
    expect(text).toContain("`borderStrong`");
    expect(text).toContain("`filledHover`");
    expect(text).toContain("`filledPressed`");
    expect(text).toContain("`iconSize`");
  });

  it("hold the tip's clock and its trigger rule to the runtime", () => {
    // The tip's timing is not in this wrapper: `@gpuix/react/tooltip` owns the
    // delay, the grace a leaving pointer gets and the reopen window, and a page
    // that printed the wrong number would teach a clock the component does not
    // run. Two claims are the wrapper's own: the surface must be the theme's
    // popover (the runtime mounts its own `#1A1A1A` behind a caller that sets
    // no fill) and the trigger's `aria-description` is the assistive path,
    // because a `Tab` traversal never runs the handler that opens the tip.
    const tooltip = pages.find((page) => page.file === "tooltip.mdx");
    expect(tooltip, "the tooltip page is not in the curated set").toBeDefined();
    if (tooltip === undefined) return;

    const runtime = read(
      "packages/primitives/node_modules/@gpuix/react/dist/components/tooltip.js",
    );
    const floating = read(
      "packages/primitives/node_modules/@gpuix/react/dist/components/floating.js",
    );
    expect(runtime).toContain("delayDuration = 0");
    expect(runtime).toContain("skipDelayDuration = 300");
    expect(runtime).toContain("setTimeout(close, 80)");
    expect(runtime).toContain("defaultTabIndex: 0");
    expect(runtime).toContain("onFocus: (event) => {");
    expect(runtime).toContain("openImmediately()");
    // The runtime's built-in surface, which the recipe's fill has to beat.
    expect(floating).toContain('backgroundColor: "#1A1A1A"');

    const source = read(tooltip.source);
    expect(source).toContain("TooltipTrigger asChild");
    expect(source).toContain('"aria-description": name');
    expect(source).toContain("delayDuration={delay}");
    expect(source).toContain("disableHoverableContent");

    const recipe = read("packages/primitives/src/recipe/index.ts");
    expect(recipe).toContain("bg-popover text-popover-foreground rounded-sm");
    expect(recipe).toContain("pl-sm pr-sm pt-xs pb-xs");
    expect(recipe).toContain("type-size-caption whitespace-nowrap");

    const text = body(tooltip).replace(/\s+/g, " ");
    // Every number the clock section prints is one of the runtime's three, so a
    // stale figure cannot hide behind another mention of the same word.
    const clockAt = body(tooltip).indexOf("## The clock");
    const clock = body(tooltip).slice(clockAt);
    const printed = new Set(
      [...clock.slice(0, clock.indexOf("\n## ", 1)).matchAll(/(\d+) ms/g)].map(
        (match) => match[1] ?? "",
      ),
    );
    expect(printed).toEqual(new Set(["0", "80", "300"]));
    expect(text).toContain("`defaultTabIndex: 0`");
    expect(text).toContain("`aria-description`");
    expect(text).toContain("no live region");
    expect(text).toContain("`radius.sm`");
    expect(text).toContain("`#1A1A1A`");
    expect(text).toContain("`bg-popover`");
    expect(text).toContain("hover is the one open path");
    // The retracted claim: a traversal does not open the tip, so a page
    // promising a keyboard-opened tip would teach a path the window lacks.
    expect(text).not.toContain("opens on focus");
  });

  it("list every package the component imports", () => {
    const missing = pages.flatMap((page) => {
      const listed = dependencies(page);
      return importedPackages(read(page.source))
        .filter((specifier) => !listed.includes(specifier))
        .map(
          (specifier) =>
            `${page.file}: imports ${specifier}, which its Dependencies table does not list`,
        );
    });

    expect(missing).toEqual([]);
  });
});

/** Every `packages/<pkg>/docs/*.mdx` page the site mounts, as a repo path. */
const packagePageFiles = (): ReadonlyArray<string> =>
  packageCollections.flatMap((collection) =>
    readdirSync(new URL(`${collection.dir}/`, root))
      .filter((name) => name.endsWith(".mdx"))
      .map((name) => `${collection.dir}/${name}`),
  );

/** The `## API…` section of a page, as text: tables and the prose beside them. */
const apiSection = (text: string): string => {
  const start = text.search(/^## (API|Props)\b/m);
  if (start === -1) return "";
  const rest = text.slice(start);
  const end = rest.indexOf("\n## ", 1);
  return end === -1 ? rest : rest.slice(0, end);
};

describe("the page a curated page displaces", () => {
  it("names exactly the package pages whose URL the curated folder takes", () => {
    // The site serves one page per URL, so a curated page whose name matches a
    // package page displaces it: the package page is not mounted anywhere. A
    // curated page that forgot it (or a package page that landed on one) hides
    // a whole page rather than a paragraph, so the set is derived from the
    // files rather than kept in the fixture.
    const curated = pages.map((page) => ({
      file: page.file,
      url: pageUrl(`content/docs/components/${page.file}`),
    }));
    const displaced = packagePageFiles().filter((file) => {
      const url = pageUrl(file);
      return curated.some((page) => page.url !== undefined && page.url === url);
    });
    const named = pages.flatMap((page) =>
      page.shadowed === undefined ? [] : [page.shadowed],
    );

    expect(curated.filter((page) => page.url === undefined)).toEqual([]);
    expect(named.toSorted()).toEqual(displaced.toSorted());
  });

  it("documents every prop the displaced page documents", () => {
    // `DropdownMenuCheckboxItem` is a required `checked` and `onCheckedChange`
    // row with two defaults of its own, and the curated page documented neither
    // — nor `leading`/`trailing`/`closeOnSelect`, nor the alignment offset. The
    // package page that says so is the one the curated page displaces, so the
    // props were documented nowhere a reader of this site can reach. A prop
    // counts as documented when the page's API section names it as a word: a
    // backticked name, a `name?:` inside a declaration the page prints, and a
    // plain `Props` cell are all the API. This is a presence check, not a
    // signature one — the row's type and default are the page's to state.
    const gaps = pages.flatMap((page) => {
      if (page.shadowed === undefined) return [];
      const documented = apiSection(body(page)).replaceAll("`", "");
      const named = (prop: string): boolean =>
        new RegExp(`(^|[^A-Za-z0-9_$])${prop}([^A-Za-z0-9_$]|$)`).test(
          documented,
        );
      return propsOf(read(page.shadowed))
        .props.filter((prop) => !named(prop))
        .map(
          (prop) =>
            `${page.file}: the displaced ${page.shadowed} documents \`${prop}\`, this page does not`,
        );
    });

    // Floors: the displacement is read, and the props are read from both sides.
    expect(
      pages.filter((page) => page.shadowed !== undefined).length,
    ).toBeGreaterThanOrEqual(5);
    expect(
      pages.reduce(
        (count, page) =>
          page.shadowed === undefined
            ? count
            : count + propsOf(read(page.shadowed)).props.length,
        0,
      ),
    ).toBeGreaterThan(30);
    expect(gaps).toEqual([]);
  });
});
