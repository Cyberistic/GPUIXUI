import { readFileSync } from "node:fs";
import {
  contrastRatio,
  disabledOpacity,
  elevationShadow,
  highContrastLightColors,
  lightTheme,
} from "@gpuixui/tokens";
import { switchThumbStyle, switchTrackStyle } from "@gpuixui/primitives/core";
import { describe, expect, it } from "vitest";
import { classesToStyle } from "../../../../packages/tw/src/index";
import { pageUrl, propsOf } from "./component-index";
import { collectionPages } from "./collection-pages";
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
    file: "breadcrumb.mdx",
    row: "Breadcrumbs",
    suite: "packages/components/src/behaviour/breadcrumb.test.tsx",
    shadowed: "packages/components/docs/breadcrumb.mdx",
    source: "packages/components/src/breadcrumb.tsx",
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
    file: "carousel.mdx",
    row: "Carousel",
    suite: "packages/components/src/behaviour/carousel.test.tsx",
    shadowed: "packages/components/docs/carousel.mdx",
    source: "packages/components/src/carousel.tsx",
  },
  {
    file: "collapsible.mdx",
    row: "Collapsible sections",
    suite: "packages/components/src/behaviour/collapsible.test.tsx",
    shadowed: "packages/components/docs/collapsible.mdx",
    source: "packages/components/src/collapsible.tsx",
  },
  {
    file: "color-picker.mdx",
    row: "Color picker",
    suite: "packages/components/src/behaviour/color-picker.test.tsx",
    shadowed: "packages/components/docs/color-picker.mdx",
    source: "packages/components/src/color-picker.tsx",
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
    file: "context-menu.mdx",
    row: "Context menus",
    suite: "packages/components/src/behaviour/context-menu.test.tsx",
    shadowed: "packages/components/docs/context-menu.mdx",
    source: "packages/components/src/context-menu.tsx",
  },
  {
    file: "date-picker.mdx",
    row: "Date pickers",
    suite: "packages/components/src/behaviour/date-picker.test.tsx",
    shadowed: "packages/components/docs/date-picker.mdx",
    source: "packages/components/src/date-picker.tsx",
  },
  {
    file: "dialog.mdx",
    row: "Dialogs",
    suite: "packages/components/src/behaviour/dialog.test.tsx",
    shadowed: "packages/components/docs/dialog.mdx",
    source: "packages/components/src/dialog.tsx",
  },
  {
    file: "drawer.mdx",
    row: "Drawer",
    suite: "packages/components/src/behaviour/drawer.test.tsx",
    shadowed: "packages/components/docs/drawer.mdx",
    source: "packages/components/src/drawer.tsx",
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
    file: "inline-edit.mdx",
    row: "Inline edit",
    suite: "packages/components/src/behaviour/inline-edit.test.tsx",
    shadowed: "packages/components/docs/inline-edit.mdx",
    source: "packages/components/src/inline-edit.tsx",
  },
  {
    file: "list.mdx",
    row: "Lists / list items",
    suite: "packages/components/src/behaviour/list.test.tsx",
    shadowed: "packages/components/docs/list.mdx",
    source: "packages/components/src/list.tsx",
  },
  {
    file: "pagination.mdx",
    row: "Pagination",
    suite: "packages/components/src/behaviour/pagination.test.tsx",
    shadowed: "packages/components/docs/pagination.mdx",
    source: "packages/components/src/pagination.tsx",
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
    file: "stepper.mdx",
    row: "Stepper",
    suite: "packages/components/src/behaviour/stepper.test.tsx",
    shadowed: "packages/components/docs/stepper.mdx",
    source: "packages/components/src/stepper.tsx",
  },
  {
    file: "switch.mdx",
    row: "Switches",
    suite: "packages/primitives/runtime/switch.runtime.test.tsx",
    source: "packages/primitives/src/components/Switch.tsx",
  },
  {
    file: "table.mdx",
    row: "Tables",
    suite: "packages/data/src/behaviour/table.test.tsx",
    source: "packages/data/src/table/table.tsx",
  },
  {
    file: "tag-input.mdx",
    row: "Tag / token input",
    suite: "packages/components/src/behaviour/tag-input.test.tsx",
    shadowed: "packages/components/docs/tag-input.mdx",
    source: "packages/components/src/tag-input.tsx",
  },
  {
    file: "search-input.mdx",
    row: "Search inputs",
    suite: "packages/components/src/behaviour/search-input.test.tsx",
    shadowed: "packages/components/docs/search-input.mdx",
    source: "packages/components/src/search-input.tsx",
  },
  {
    file: "form.mdx",
    row: "Form",
    suite: "packages/components/src/behaviour/form.test.tsx",
    shadowed: "packages/components/docs/form.mdx",
    source: "packages/components/src/form.tsx",
  },
  {
    file: "tabs.mdx",
    row: "Tabs",
    suite: "packages/components/src/behaviour/tabs.test.tsx",
    shadowed: "packages/components/docs/tabs.mdx",
    source: "packages/components/src/tabs.tsx",
  },
  {
    file: "timeline.mdx",
    row: "Timeline",
    suite: "packages/components/src/behaviour/timeline.test.tsx",
    shadowed: "packages/components/docs/timeline.mdx",
    source: "packages/components/src/timeline.tsx",
  },
  {
    file: "time-picker.mdx",
    row: "Time pickers",
    suite: "packages/components/src/behaviour/time-picker.test.tsx",
    shadowed: "packages/components/docs/time-picker.mdx",
    source: "packages/components/src/time-picker.tsx",
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

/**
 * One row of a page's `## Theming` table, by its first cell.
 *
 * Returns the whole row so a case can hold both the role a page prints and the
 * role the component paints; `undefined` when the table or the row is gone.
 */
const themingRow = (page: CuratedPage, element: string): string | undefined => {
  const text = body(page);
  const start = text.indexOf("## Theming");
  if (start === -1) return undefined;
  const end = text.indexOf("\n## ", start + 1);
  const section = text.slice(start, end === -1 ? undefined : end);

  return section
    .split("\n")
    .find((line) => line.replace(/^\|/, "").trimStart().startsWith(element));
};

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

    // The required marker is a label, not part of the name, and it is **text**:
    // it paints the tone's readable role, never the solid fill. The row and the
    // painter are read together, so a page cannot teach the fill the component
    // stopped using (and a painter that moved back to the fill fails beside it).
    expect(source).toContain('aria-label="Required"');
    expect(source).toContain("${text}. Required");

    const marker = source.slice(
      source.indexOf('aria-label="Required"'),
      source.indexOf("</text>", source.indexOf('aria-label="Required"')),
    );
    expect(
      marker,
      "the required marker no longer paints the tone's readable role",
    ).toContain('statusTone(theme, "destructive").foreground');
    expect(marker).not.toContain("theme.colors.destructive");

    const markerRow = themingRow(field, "required marker");
    expect(
      markerRow,
      "the field page's Theming table has no required-marker row",
    ).toBeDefined();
    expect(markerRow).toContain('statusTone(theme, "destructive").foreground');
    expect(markerRow).not.toContain("`colors.destructive`");

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
    expect(text).toContain("8 native behaviour tests");
    expect(text).toContain("There is no auto-validate on every keystroke");
    // The retracted shapes: a field that validates itself, or a faded control.
    expect(text).not.toContain("validates on every keystroke and");
    expect(text).not.toContain("fades the whole control");
  });

  it("hold the drawer's edges, its exit frame and its dismiss stack to the source", () => {
    // A drawer is the modal whose position is the whole component, and three of
    // its decisions are invisible in a screenshot: the requested size is
    // clamped by the window, a non-dismissible surface consumes the gesture
    // instead of passing it to the dialog beneath, and the surface stays
    // mounted for an exit tween while taking no presses. Each is read from the
    // painter or the rule that owns it, so the page cannot teach a surface the
    // component does not paint.
    const drawer = pages.find((page) => page.file === "drawer.mdx");
    expect(drawer, "the drawer page is not in the curated set").toBeDefined();
    if (drawer === undefined) return;

    const source = read(drawer.source);
    const flatSource = source.replace(/\s+/g, " ");
    const modal = read("packages/components/src/internal/modal.ts").replace(
      /\s+/g,
      " ",
    );
    const dismiss = read(
      "packages/components/src/internal/dismiss-layer.ts",
    ).replace(/\s+/g, " ");
    const presenceSeam = read(
      "packages/components/src/internal/presence.tsx",
    ).replace(/\s+/g, " ");

    // The box: the component's two size tables, and the window clamp on each.
    expect(source).toContain(
      "const WIDTH: Readonly<Record<DrawerSize, number>>",
    );
    expect(source).toContain(
      "const HEIGHT: Readonly<Record<DrawerSize, number>>",
    );
    expect(flatSource).toContain("sm: 320, md: 400, lg: 560");
    expect(flatSource).toContain("sm: 240, md: 320, lg: 420");
    expect(flatSource).toContain("width: Math.min(WIDTH[size], window.width)");
    expect(flatSource).toContain(
      "height: Math.min(HEIGHT[size], window.height)",
    );

    // The dismiss rule: the topmost layer consumes the gesture, and a
    // non-dismissible one closes nothing; focus leaves on `open`, not when the
    // exit tween ends.
    expect(modal).toContain("if (dismissible) setOpen(false);");
    expect(modal).toContain("if (contentId === undefined || !open) return;");
    expect(dismiss).toContain(
      "onSome: (onDismiss) => { onDismiss(event); return true; },",
    );

    // The exit frame: the surface stays mounted, refuses presses, and travels
    // 12px on an inset at the `slow` level. The refusal is the shared seam's —
    // `presenceStyle` paints `auto` while present and `none` once it starts
    // leaving — so the surface composes it rather than restating the pair.
    expect(source).toContain("fadeFromSide(side, 12)");
    expect(source).toContain('useSurfaceTiming("slow")');
    expect(flatSource).toContain("...presenceStyle(presence.present)");
    expect(presenceSeam).toContain('{ pointerEvents: "auto" }');
    expect(presenceSeam).toContain('{ pointerEvents: "none" }');
    expect(source).toContain("if (!presence.mounted) return null;");
    expect(source).toContain('label="Close drawer"');

    // The surface is square: the recipe names no radius utility, which is the
    // difference the page draws beside Dialog.
    const recipes = read("packages/tw/src/recipes.ts");
    const at = recipes.indexOf("export const DRAWER_CONTENT =");
    const recipe =
      at === -1 ? "" : recipes.slice(at).split("\n").slice(0, 2).join(" ");
    expect(recipe).toContain("bg-popover");
    expect(recipe).toContain("shadow-lg");
    expect(recipe).not.toContain("rounded");

    const text = body(drawer).replace(/\s+/g, " ");
    // The measured boxes, read off the 1280 × 800 window the suite uses.
    expect(text).toContain("400 × 800");
    expect(text).toContain("320 × 800");
    expect(text).toContain("1280 × 420");
    // The three decisions a drawing cannot show.
    expect(text).toContain("is **clamped by the window**");
    expect(text).toContain("still **consumes** the gesture and closes nothing");
    expect(text).toContain("survives");
    expect(text).toContain("12px");
    expect(text).toContain("320 ms");
    expect(text).toContain("The surface is **square**");
    // The runtime budget the page must not overstate.
    expect(text).toContain("no `aria-modal`");
    expect(text).toContain("no `aria-labelledby`");
    expect(text).toContain("Not portalled");
    expect(text).toContain("No swipe-to-dismiss");
    // The retracted shapes: a rounded native surface and a surface that leaves
    // before its tween, neither of which the code paints.
    expect(text).not.toContain("rounded-4xl");
    expect(text).not.toContain("unmounts immediately");
  });

  it("hold the context menu's point, its restore gate and its type-ahead to the source", () => {
    // A context menu is a position and a focus destination, and a screenshot
    // shows neither: the pointer point is the aux click's, `Shift+F10` opens at
    // the trigger's bottom-left, only a keyboard-opened menu returns focus, and
    // a typed prefix searches *after* the current row with a 500 ms window.
    // Each is read from the handler, the key module and the type-ahead module
    // that ship them.
    const menu = pages.find((page) => page.file === "context-menu.mdx");
    expect(
      menu,
      "the context menu page is not in the curated set",
    ).toBeDefined();
    if (menu === undefined) return;

    const source = read(menu.source);
    const flatSource = source.replace(/\s+/g, " ");
    const keys = read("packages/components/src/internal/key.ts").replace(
      /\s+/g,
      " ",
    );
    const typeahead = read("packages/components/src/typeahead.ts").replace(
      /\s+/g,
      " ",
    );
    const surface = read("packages/components/src/menu/surface.tsx").replace(
      /\s+/g,
      " ",
    );
    const presenceSeam = read(
      "packages/components/src/internal/presence.tsx",
    ).replace(/\s+/g, " ");

    // Both opening routes, each with the point it records.
    expect(flatSource).toContain("event.isRightClick !== true");
    expect(flatSource).toContain(
      "openAt({ x: event.x ?? 0, y: event.y ?? 0 })",
    );
    expect(flatSource).toContain(
      "openFromKeyboard({ x: bounds.x, y: bounds.y + bounds.height })",
    );
    expect(keys).toContain(
      '(event.key === "f10" && event.modifiers?.shift === true)',
    );
    expect(keys).toContain('event.key === "contextmenu"');

    // The surface is placed at the point, not anchored to a trigger.
    expect(flatSource).toContain("position={point}");
    expect(flatSource).toContain("deferred");

    // The restore gate: a keyboard open records a target, and only the two
    // reasons that keep the reader's place use it.
    expect(flatSource).toContain("restoreFocus.current = true;");
    expect(flatSource).toContain(
      '(reason === "activate" || reason === "dismiss")',
    );
    expect(flatSource).toContain("restoreFocus.current = false;");

    // The entrance and the exit frame: 4px from the point at the normal level,
    // mounted without taking a press once it starts leaving. The press refusal
    // is the shared seam's, so the surface composes `presenceStyle`.
    expect(flatSource).toContain('fadeFromAnchor("bottom", 4)');
    expect(flatSource).toContain('useSurfaceTiming("normal")');
    expect(flatSource).toContain("if (!presence.mounted) return null;");
    expect(flatSource).toContain("occlude={presence.present}");
    expect(flatSource).toContain("...presenceStyle(presence.present)");
    expect(presenceSeam).toContain('{ pointerEvents: "auto" }');
    expect(presenceSeam).toContain('{ pointerEvents: "none" }');

    // The surface itself takes focus on every open: `autoFocus` is on the
    // menu box, so the first arrow reaches the first row rather than the probe
    // finding a row already focused.
    expect(surface).toContain("autoFocus");
    expect(surface).toContain('role="menu"');

    // The typed prefix: the shipped window and the "after the current row"
    // rule, which is what makes a repeated letter advance.
    expect(typeahead).toContain("Duration.millis(500)");
    expect(typeahead).toContain("candidate.index > fromIndex");

    // The surface's fixed corner, so the page can say the platform switch
    // repaints the palette and not the 24px radius.
    const recipes = read("packages/tw/src/recipes.ts");
    const at = recipes.indexOf("export const MENU_CONTENT =");
    const recipe =
      at === -1 ? "" : recipes.slice(at).split("\n").slice(0, 2).join(" ");
    expect(recipe).toContain("rounded-3xl");
    expect(recipe).toContain("bg-popover");

    const text = body(menu).replace(/\s+/g, " ");
    expect(text).toContain("bottom-left");
    expect(text).toContain("500 ms");
    expect(text).toContain("not portalled");
    expect(text).toContain("no `onContextMenu`");
    expect(text).toContain("focus `none`");
    expect(text).toContain("4px");
    expect(text).toContain("200 ms");
    expect(text).toContain("rounded-3xl");
    expect(text).toContain("`partial`");
    expect(text).toContain("24 checks");
    expect(text).toContain("focuses the surface");
    // The retracted shape: a keyboard open does not pre-highlight a row in the
    // shipped component, so a page saying it does would teach focus it lacks.
    expect(text).not.toContain("focuses the first enabled row");
    // The retracted shape: a keyboard route that opens at the pointer would
    // teach a point the keyboard never has.
    expect(text).not.toContain("Shift+F10` opens at the pointer");
  });

  it("holds the pagination window, its square pages and its gap rule to the source", () => {
    // A pagination control is arithmetic a drawing cannot show: a crop that
    // grows at the edges still looks like one, and an ellipsis over a single
    // hidden page only reads wrong once the reader counts. The page prints the
    // crops, the gap-of-one rule and the two knobs, so both the window function
    // and the painter that realises it are read here rather than trusted.
    const pagination = pages.find((page) => page.file === "pagination.mdx");
    expect(
      pagination,
      "the pagination page is not in the curated set",
    ).toBeDefined();
    if (pagination === undefined) return;

    const source = read(pagination.source);
    const logic = read("packages/components/src/pagination/logic.ts");
    const button = read("packages/components/src/internal/button.tsx");
    const primitiveButton = read(
      "packages/primitives/src/components/Button.tsx",
    );
    // A page button is the primitives' action, so its corner is the class that
    // recipe names — compiled, not remembered. The components package cannot
    // import an unexported recipe constant, and this page must print the pixel
    // the painter draws rather than a theme role no painter reads.
    const actionRecipe = read("packages/primitives/src/recipe/index.ts");
    const radiusClass =
      /\brounded-[\w-]+/.exec(
        /const BUTTON_BASE =\s*"([^"]*)"/.exec(actionRecipe)?.[1] ?? "",
      )?.[0] ?? "";
    expect(
      radiusClass,
      "the primitives' action recipe names no radius",
    ).not.toBe("");
    const corner = classesToStyle(radiusClass, lightTheme).style.borderRadius;
    expect(corner, `${radiusClass} compiles no corner`).toBe(6);
    // A disabled page button is the primitive's fade, and the share the page
    // prints is the one the recipe compiles — the same share the disabled
    // contract measures with `disabledOpacity`. A ghost action paints no fill,
    // so it takes `UNFILLED_DISABLED` rather than the neutral pair.
    const fadeClass =
      /UNFILLED_DISABLED = "(disabled:opacity-\S+)"/.exec(actionRecipe)?.[1] ??
      "";
    const fade = classesToStyle(fadeClass, lightTheme).disabled.opacity;
    expect(fade, `${fadeClass} compiles no fade`).toBe(disabledOpacity);

    // One window function with both knobs, and the branch that keeps a
    // single hidden page as the page itself.
    // One call, carrying the clamped page, the count and both knobs; read from
    // the argument object so a reformat is not a behaviour change.
    const call = /pageWindow\(\{([^}]*)\}\)/.exec(source)?.[1] ?? "";
    expect(call).toContain("page: current");
    expect(call).toContain("pageCount");
    expect(call).toContain("siblingCount");
    expect(call).toContain("showEdges");
    expect(logic).toContain(
      "if (siblings + 5 >= pageCount) return pages(1, pageCount);",
    );
    expect(logic).toContain("if (hidden === 1) return [page(low + 1)];");
    expect(logic).toContain("const showStart = left > 2;");

    // The page button is the `sm` control height square; the current page is the
    // primary fill with `aria-selected`, because 0.11.0 has no `aria-current`;
    // a disabled control leaves the tab order rather than only dimming.
    expect(source).toContain('const height = controlHeight(theme, "sm");');
    expect(source).toContain("minWidth: height");
    expect(source).toContain("aria-selected={isCurrent}");
    expect(source).toContain('variant={isCurrent ? "primary" : "ghost"}');
    expect(source).toContain('label="More pages"');
    expect(source).toContain('role="navigation"');
    expect(source).toContain('aria-label="Pagination"');
    expect(button).toContain("disabled={disabled}");
    expect(primitiveButton).toContain("disabled === true ? -1 : 0");

    const text = body(pagination).replace(/\s+/g, " ");
    // The crops the page prints, and the rule that explains them.
    expect(text).toContain("1 2 3 4 5 … 10");
    expect(text).toContain("1 … 4 5 6 … 10");
    expect(text).toContain("1 … 6 7 8 9 10");
    expect(text).toContain("two or more");
    expect(text).toContain("never draws `1 … 2 3 4 5 6 7 8`");
    // The absent attribute and the substitution, plus the retracted claim the
    // displaced page still makes: a ghost label is `foreground`, not the muted
    // role the ellipsis paints.
    expect(text).toContain('No `aria-current="page"`');
    expect(text).toContain("aria-selected");
    expect(text).not.toContain("ghost buttons with `colors.mutedForeground`");
    // The corner the painter draws, read from the compiled utility: the page
    // button is the primitives' action, whose `rounded-md` is the registry's
    // fixed 6px, so a platform switch repaints it and does not reshape it. The
    // retracted claim named the theme's `radius.md`, which no painter reads.
    expect(text).toContain(`${corner}px corner`);
    expect(text).toContain(radiusClass);
    expect(text).not.toContain("`radius.md`");
    expect(text).not.toContain("reshapes the page buttons");
    // The disabled share the page prints is the recipe's compiled one.
    expect(text).toContain(`\`disabledOpacity\`, \`${fade}\``);
    expect(button).toContain(
      'Match.when("ghost", () => theme.colors.foreground)',
    );

    // A count or a bound the control cannot read is the case a page built from
    // `Math.ceil(total / pageSize)` reaches: the reducer answers no count for a
    // `NaN`, page 1 for an unreadable page and the default sibling for an
    // unreadable one, so the page teaches that rather than only `<= 0`.
    expect(logic).toContain(
      "Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : fallback",
    );
    expect(logic).toContain("Number.isFinite(page) ? Math.trunc(page) : 1");
    expect(logic).toContain("countable(rawSiblingCount, 1)");
    expect(text).toContain("a `pageCount` it cannot read");
    expect(text).toContain("a `page` or `siblingCount` it cannot read");
    expect(text).toContain("no unreadable number is painted");
  });

  it("holds the breadcrumb's budget, its separator pairing and its current crumb to the source", () => {
    // A collapsed trail looks the same whether the rule kept the current page or
    // dropped it, and a separator that outlives its hidden item still reads as a
    // path. The page prints the budget table, the pairing and the substitution,
    // so the pure rule and the painter are read here rather than trusted.
    const breadcrumb = pages.find((page) => page.file === "breadcrumb.mdx");
    expect(
      breadcrumb,
      "the breadcrumb page is not in the curated set",
    ).toBeDefined();
    if (breadcrumb === undefined) return;

    const source = read(breadcrumb.source);
    const logic = read("packages/components/src/breadcrumb/logic.ts");
    const recipes = read("packages/tw/src/recipes.ts");

    // The budget is clamped at three and the tail is `budget - 2`, which is what
    // keeps the current page on screen at every budget.
    expect(logic).toContain("const minimum = 3;");
    expect(logic).toContain(
      "const budget = Math.max(minimum, Math.trunc(maxItems));",
    );
    expect(logic).toContain("Arr.takeRight(items, budget - 2)");
    // A separator is paired with the item that follows it, so hiding one hides
    // the other.
    expect(source).toContain("const parsed = entries(children, fallback);");
    expect(source).toContain("pending = child;");
    // The roles, the absent `aria-current` and its substitution, and the named
    // non-focusable marks.
    expect(source).toContain('role="navigation"');
    expect(source).toContain('aria-label="Breadcrumb"');
    expect(source).toContain("aria-selected");
    expect(source).toContain('label="More"');
    expect(source).toContain('role="presentation"');
    expect(source).toContain(
      "activationHandlers(() => onSelect?.(), { onKeyDown, onKeyUp })",
    );
    // The list wraps rather than clipping; collapse is a budget, not overflow.
    expect(recipes).toContain(
      'export const BREADCRUMB_LIST = "flex flex-row items-center flex-wrap gap-1";',
    );

    const text = body(breadcrumb).replace(/\s+/g, " ");
    // The crops the page prints, and the clamp below three.
    expect(text).toContain("Projects / … / breadcrumb.tsx");
    expect(text).toContain("Projects / … / src / breadcrumb.tsx");
    expect(text).toContain("Projects / … / components / src / breadcrumb.tsx");
    expect(text).toContain("clamped");
    expect(text).toContain("direct** children");
    expect(text).toContain("No `aria-current`");
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

    // A group is announced: 0.11.0's `SelectGroup` carries no role, so the
    // wrapper supplies `group` and the caption as its accessible name, and the
    // accessibility tree reports that node beside the list's `option` rows. The
    // page taught the opposite after the shim landed, which told a reader the
    // announcement the component ships does not exist.
    expect(source).toContain('role="group"');
    expect(source).toContain("aria-label={accessibleName(entry.label)}");
    expect(source).toContain('role="option"');
    const a11y = read("packages/primitives/runtime/fields.runtime.test.tsx");
    expect(a11y).toContain(
      "announces a Select's options, their selection and their group",
    );
    expect(a11y).toContain('role: "Group"');

    const text = body(select).replace(/\s+/g, " ");
    expect(text).toContain("320px");
    expect(text).toContain("reveals itself");
    expect(text).toContain("check mark");
    expect(text).toContain("keyboardFocusDim: false");
    expect(text).toContain("No type-ahead");
    expect(text).toContain("one flat list");
    expect(text).toContain("names the run it heads");
    expect(text).toContain('role="group"');
    expect(text).toContain("announces a Select's options");
    // The retracted shape: the shim's announcement called impossible.
    expect(text).not.toContain("presentational");
    expect(text).not.toContain("painted, not announced");
    expect(text).not.toContain("hierarchy is visual only");
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
    // The count is the suite's, not a transcription: the behaviour suite grew
    // the popup's entrance cases while the page still printed 22, and only the
    // generic case above noticed. Derived, the page cannot lag a new case.
    expect(text).toContain(
      `${nativeCases("packages/components/src/behaviour/combobox.test.tsx")} native behaviour tests`,
    );
    expect(text).toContain("`partial`");

    // The entrance is the component's, not the page's memory: the source asks
    // for the 4px travel from the side it opened at at the `normal` level, and
    // there is no exit because the headless content renders nothing while closed.
    expect(source).toContain("fadeFromAnchor(side, 4)");
    expect(source).toContain('useSurfaceTiming("normal")');
    expect(text).toContain("4px of travel");
    expect(text).toContain("no exit tween");
    expect(text).toContain('preference="reduced"');

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
    const typeahead = read("packages/components/src/typeahead.ts");
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
    // The prefix searches the rows after the current one, then wraps.
    expect(typeahead).toContain("export const typeaheadMatchIndex");
    expect(typeahead).toContain("candidate.index > fromIndex");
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
    const presenceSeam = read(
      "packages/components/src/internal/presence.tsx",
    ).replace(/\s+/g, " ");

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
    // The page stays usable because the viewport itself takes no press and each
    // card turns it back on — the pair the two recipes compile — while a card
    // that is leaving refuses the press through the shared presence seam.
    const viewportRecipe = recipes.slice(
      recipes.indexOf("export const TOAST_VIEWPORT ="),
      recipes.indexOf("export const TOAST_CARD ="),
    );
    const cardRecipe = recipes.slice(
      recipes.indexOf("export const TOAST_CARD ="),
      recipes.indexOf("export const TOAST_TITLE ="),
    );
    expect(viewportRecipe).toContain("pointer-events-none");
    expect(cardRecipe).toContain("pointer-events-auto");
    expect(viewport).toContain("presenceStyle(present)");
    expect(presenceSeam).toContain('{ pointerEvents: "auto" }');
    expect(presenceSeam).toContain('{ pointerEvents: "none" }');
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
    // The clock a traversal cannot hold: a window focuses the card's control
    // without running its `onFocus` (`focuses=0`), so keyboard arrival does not
    // pause it and a reader who must reach the card needs `duration: 0` — the
    // same rule the package page prints.
    expect(text).toContain("A traversal does not hold the clock");
    expect(text).toContain("focuses=0");
    expect(text).toContain("duration: 0");
    expect(text).not.toContain("focuses=1");
    // The retracted shapes: an escape path and an announcement the runtime
    // cannot make.
    expect(text).not.toContain("Escape dismisses the toast");
    expect(text).not.toContain("announced by aria-live");
  });

  it("hold the alert's text action to the tint it derives against", () => {
    // A link inside a message sits on the tone's own soft fill, where the shared
    // page brand is measured under the text floor in 29 of the 64 tint
    // placements; the part derives against that tint instead, keeps the 24px
    // target and publishes `role="link"`. The page and the painter are read
    // together, so neither can describe the other's colour.
    const alert = pages.find((page) => page.file === "alert.mdx");
    expect(alert, "the alert page is not in the curated set").toBeDefined();
    if (alert === undefined) return;

    const source = read(alert.source);
    expect(source).toContain('role="link"');
    expect(source).toContain("height: targetSize.minimum");
    expect(source).toContain("messageLink(theme, value)");
    expect(source).toContain("activationHandlers(");
    expect(read("packages/components/src/internal/theme.ts")).toContain(
      "brandTextOn(theme, softRoles[value])",
    );

    const text = body(alert).replace(/\s+/g, " ");
    expect(text).toContain("`AlertLink`");
    expect(text).toContain("message's own tint");
    expect(text).toContain("29 of the 64");
    expect(text).toContain('`role="link"`');
    expect(text).toContain("13 native behaviour tests");
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

  it("place the pill from the origin the rail last reported", () => {
    // The rail's `tabs-origin` probe was a 1×1 swatch in the rail's corner, and
    // the page taught that as the mechanism. A 1×1 box never changes size, and
    // the runtime reports only a layout it can see change — so a rail the window
    // moved never reported its origin again, and a trigger that re-measured was
    // subtracted from the place the rail used to start (measured: the pill
    // 120px off its tab). The probe fills the padding box and re-reports it on
    // every change now, and both boxes have to come from one paint; the page is
    // held to the probe that exists rather than the swatch it described.
    const tabs = pages.find((page) => page.file === "tabs.mdx");
    expect(tabs, "the tabs page is not in the curated set").toBeDefined();
    if (tabs === undefined) return;

    const source = read(tabs.source);
    expect(source, "tabs.tsx still draws a 1×1 origin probe").not.toContain(
      "width: 1,",
    );
    expect(source).toContain("right: 0,");
    expect(source).toContain("bottom: 0,");
    expect(source).toContain("sameBox(previous, box)");

    expect(read("packages/components/src/tabs/indicator.ts")).toContain(
      "must come from the same paint",
    );

    expect(tabs.suite, "the tabs page prints no native suite").toBeDefined();
    if (tabs.suite === undefined) return;
    expect(read(tabs.suite)).toContain(
      "follows the rail when the window moves it, not the origin it first reported",
    );

    const text = body(tabs).replace(/\s+/g, " ");
    expect(text, "the tabs page still teaches the 1×1 swatch").not.toContain(
      "1×1",
    );
    expect(text).toContain("padding box");
    expect(text).toContain("same paint");
    expect(text).toContain(
      "follows the rail when the window moves it, not the origin it first reported",
    );
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

  it("holds the disabled control's pointer focus to the source", () => {
    // A window focuses the element a pointer pressed even when it is disabled
    // and out of the tab order, so a press on the month nav parked the keyboard
    // there and every later arrow moved nothing. The fix is that both
    // containers answer the movement keys — a page that teaches only the grid's
    // key table would not explain why the nav row carries them.
    const page = pages.find(
      (candidate) => candidate.file === "date-picker.mdx",
    );
    expect(
      page,
      "the date-picker page is not in the curated set",
    ).toBeDefined();
    if (page === undefined) return;

    const source = read(page.source);
    expect(source).toContain("onKeyDown={moveByKey}");
    expect(source).toContain("onKeyDown={handleKeyDown}");
    expect(source).toContain(
      "const handleKeyDown = (event: KeyEvent): void => {\n    moveByKey(event);",
    );
    expect(source).toContain(
      "disabled={!canBrowseMonth(viewMonth, 1, bounds)}",
    );

    const text = body(page).replace(/\s+/g, " ");
    expect(text).toContain(
      "A **disabled** month control still takes the pointer's focus",
    );
    expect(text).toContain(
      "`date-picker-lifecycle` measured the disabled next-month control",
    );
    expect(text).toContain(
      "Both the grid and the nav row answer the movement keys",
    );
    expect(text).toContain("`Enter` and `Space` stay the grid's");
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
    // The state travels as `aria-valuetext`, derived from the shared helper —
    // not a literal pair, because the words became a provider value.
    expect(source).toContain("aria-valuetext={selectionValueText(");
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

  it("holds the timeline's passed status and the rail's end to the source", () => {
    // Three silent drifts: a page that taught the stepper's derived status, a
    // rail whose connector runs past the last event, or an upcoming dot painted
    // in the `muted` surface fill that measured 1.06:1 on the page. Each is
    // read from the painter, and the stepper's own source is read beside it so
    // the contrast the page teaches is the code's.
    const page = pages.find((candidate) => candidate.file === "timeline.mdx");
    expect(page, "the timeline page is not in the curated set").toBeDefined();
    if (page === undefined) return;

    const source = read(page.source);
    expect(source).toContain("readonly status?: TimelineStatus");
    expect(source).toContain('status = "complete"');
    expect(source).toContain('aria-selected={status === "current"}');
    // The rail ends at the last direct child.
    expect(source).toContain(
      "{last ? null : <div style={recipeStyle(TIMELINE_CONNECTOR",
    );
    expect(source).toContain("value={{ last: index === lastItem }}");
    // The dot is a mark, so its upcoming fill is the text role.
    const dot = source.slice(
      source.indexOf("const dotFill"),
      source.indexOf("/** {@link Timeline} props. */"),
    );
    expect(dot).toContain("theme.colors.mutedForeground");
    expect(/theme\.colors\.muted(?![A-Za-z])/.test(dot)).toBe(false);

    // The contrast: a stepper derives its statuses from one value.
    const stepper = read("packages/components/src/stepper.tsx");
    expect(stepper).toContain("readonly value: number");
    expect(stepper).toContain(
      'step < current ? "complete" : step === current ? "current" : "upcoming"',
    );

    const text = body(page).replace(/\s+/g, " ");
    expect(text).toContain("passed, not derived");
    expect(text).toContain("measured 1.06:1 on the page");
    expect(text).toContain("paints **no connector**");
    expect(text).toContain("installs no key handler and no tab stop");
    expect(text).toContain("7 native behaviour tests");
    // The retracted shape: a component that counts from a value of its own.
    expect(text).not.toContain("derives each event's status from a value");
  });

  it("holds the stepper's derived status and its raw value to the source", () => {
    // A stepper page can drift in three silent ways: it can teach a `status`
    // prop the component does not take, hide the 24px marker that scales with
    // the platform's density, or claim the value is clamped when the component
    // compares the raw number. Each is read from the painter rather than
    // trusted, and the page's "no key handler" sentence is the one a reader
    // needs before putting Next on the stepper.
    const page = pages.find((candidate) => candidate.file === "stepper.mdx");
    expect(page, "the stepper page is not in the curated set").toBeDefined();
    if (page === undefined) return;

    const source = read(page.source);
    // One rule, one place: the raw comparison, with no clamp and no callback.
    expect(source).toContain(
      'step < current ? "complete" : step === current ? "current" : "upcoming"',
    );
    expect(source).not.toContain("Math.min");
    expect(source).not.toContain("Math.max");
    expect(source).toContain('role="list"');
    expect(source).toContain('role="listitem"');
    expect(source).toContain('aria-selected={status === "current"}');
    // The marker is a density step, not a constant.
    expect(source).toContain('controlHeight(theme, "md")');

    // The props are the contract: no callback to move the value, and no status
    // a caller could pass beside it.
    const props = source.slice(
      source.indexOf("export interface StepperProps"),
      source.indexOf("export interface StepperStepProps"),
    );
    expect(props).not.toContain("onValueChange");
    expect(props).not.toContain("readonly status");

    const text = body(page).replace(/\s+/g, " ");
    expect(text).toContain("The comparison is made against the **raw number**");
    expect(text).toContain("no `aria-orientation`");
    expect(text).toContain("`aria-selected`");
    expect(text).toContain("installs no key handler and no tab stop");
    expect(text).toContain('controlHeight(theme, "md")');
    expect(text).toContain("8 native behaviour tests");
    // The retracted shape: a status prop a caller could contradict.
    expect(text).not.toContain("`status` prop to set");
  });

  it("holds the switch's slide, its band and its knob guard to the source", () => {
    // A switch page can drift in four silent ways: it can promise an
    // `aria-checked` the runtime does not have, call the slide a transform the
    // runtime cannot paint, hide the 24px band that makes the one-icon-tall
    // pill pressable, or print geometry from memory. The first three are read
    // from the painter; the size table is compared with the style helpers the
    // component itself calls.
    const page = pages.find((candidate) => candidate.file === "switch.mdx");
    expect(page, "the switch page is not in the curated set").toBeDefined();
    if (page === undefined) return;

    const source = read(page.source);
    const selection = read("packages/primitives/src/core/selection.ts");
    const internal = read("packages/primitives/src/components/internal.ts");
    const recipe = read("packages/primitives/src/recipe/index.ts");

    expect(source).toContain('role="switch"');
    // The two states travel as `aria-valuetext`, derived from the shared
    // helper rather than a literal pair.
    expect(source).toContain("aria-valuetext={selectionValueText(");
    // No `aria-checked` attribute (the module's comment names the absence).
    expect(source).not.toContain("aria-checked=");
    expect(source).toContain("aria-description=");
    expect(source).toContain("switchTargetStyle(spec)");
    expect(source).toContain("controlRing(theme,");
    expect(source).toContain(
      "tabIndex={props.disabled === true ? undefined : 0}",
    );
    expect(source).toContain("composePress(props.disabled === true");

    // The band is the token floor, and the pill and knob are decorative: the
    // shared helper is what strips their mouse-blocking hitbox.
    expect(selection).toContain("minHeight: targetSize.minimum");
    expect(internal).toContain('{ pointerEvents: "none" }');
    expect(selection).toContain('pointerEvents: "none"');

    // The slide: a `left` inset the runtime interpolates, a rest-first paint
    // and a zero-duration landing under the caller's preference.
    expect(source).toContain(
      'const THUMB_SLIDE: MotionTransition = { duration: 0.15, ease: "easeOut" };',
    );
    expect(source).toContain("stillTransition(THUMB_SLIDE, reducedMotion)");
    expect(source).toContain("initial={false}");
    expect(source).toContain("animate={{ left }}");
    expect(selection).toContain("left: switchThumbOffset(spec, theme)");

    // The off pill's fill and edge, and a checked pill's derived opaque fills.
    expect(selection).toContain("theme.colors.muted");
    expect(selection).toContain("theme.colors.borderStrong");
    expect(selection).toContain("feedbackFill(spec, theme,");
    expect(recipe).toContain("hover:bg-hover active:bg-active");
    expect(recipe).toContain("switch-thumb-on-${size}");
    expect(recipe).toContain("pointer-events-none");
    expect(source).toContain(
      'throw new Error("SwitchThumb must be used inside Switch")',
    );

    // The size table is the component's arithmetic, not a memory: every pill,
    // knob and travel cell is computed from the theme through the same helper
    // the component calls.
    const text = body(page).replace(/\s+/g, " ");
    const inset = lightTheme.spacing["2xs"];
    const rows = (["sm", "md", "lg"] as const).map((size) => {
      const spec = {
        state: "checked" as const,
        size,
        accent: "primary" as const,
      };
      const track = switchTrackStyle(spec, lightTheme);
      const thumb = switchThumbStyle(spec, lightTheme);
      const left = typeof thumb.left === "number" ? thumb.left : Number.NaN;
      const label = size === "md" ? "`md` (default)" : `\`${size}\``;
      return `| ${label} | ${track.width} × ${track.height}px | ${thumb.width}px | ${left - inset}px | 24px high |`;
    });
    expect(rows.filter((row) => !text.includes(row))).toEqual([]);

    // The preview paints that geometry from the theme's steps, not literals.
    const css = read("apps/docs/src/styles/demos.css");
    const switchCss = css.slice(
      css.indexOf("/* ---- switch:"),
      css.indexOf("/* ---- tooltip:"),
    );
    expect(switchCss).toContain("min-height: var(--target-size)");
    expect(switchCss).toContain("width: calc(var(--icon-size-md) * 1.75)");
    expect(switchCss).toContain("width: calc(var(--icon-size-md) - 4px)");
    expect(switchCss).toContain("transition: left 150ms ease-out");
    expect(switchCss).not.toContain("width: 28px");

    expect(text).toContain("@gpuix/native@0.11.0");
    expect(text).toContain("`aria-valuetext`");
    expect(text).toContain("no `aria-checked`");
    expect(text).toContain("24px");
    expect(text).toContain("key **up**");
    expect(text).toContain("key **down**");
    expect(text).toContain("held key");
    expect(text).toContain("`left` inset");
    expect(text).toContain("`reducedMotion`");
    expect(text).toContain("`borderStrong`");
    expect(text).toContain("`filledHover`");
    expect(text).toContain("`filledPressed`");
    expect(text).toContain("`iconSize`");
    expect(text).toContain('`pointerEvents: "none"`');
  });

  it("holds the carousel's clamp, its dot pill and its control edge to the source", () => {
    // A carousel page can drift in four silent ways: it can promise a slide
    // animation the runtime cannot paint, describe a dot whose state is only a
    // hue, print a press target smaller than the floor, or read the recipe's
    // `border-input` class literally as the `input` role. The first three are
    // read from the painter; the edge is read through the compiler's remap.
    const page = pages.find((candidate) => candidate.file === "carousel.mdx");
    expect(page, "the carousel page is not in the curated set").toBeDefined();
    if (page === undefined) return;

    const source = read(page.source);
    const recipes = read("packages/tw/src/recipes.ts");
    const utilities = read("packages/tw/src/utilities.ts");

    // One clamp and one loop rule, shared by the controls, the keys and the dots.
    expect(source).toContain(
      "const active = count === 0 ? 0 : Math.min(Math.max(value, 0), count - 1);",
    );
    expect(source).toContain("(next + count) % count");
    expect(source).toContain('display: active ? "flex" : "none"');
    // The region, its keys and its one roving stop on the active dot.
    expect(source).toContain('role="group"');
    expect(source).toContain("aria-label={label}");
    expect(source).toContain("tabIndex={0}");
    expect(source).toContain("aria-selected={selected}");
    expect(source).toContain("tabIndex={selected ? 0 : -1}");
    expect(source).toContain("Go to slide ${index + 1}");
    // The drawing: a 24px target around a 6px dot that becomes a pill, in mark
    // roles, with the drawing taking no press.
    expect(source).toContain("width: targetSize.minimum");
    expect(source).toContain("height: targetSize.minimum");
    expect(source).toContain('pointerEvents: "none"');
    expect(source).toContain("const DOT_HEIGHT = 6;");
    expect(source).toContain("const DOT_ACTIVE_WIDTH = 18;");
    expect(source).toContain("theme.colors.primary");
    expect(source).toContain("theme.colors.mutedForeground");
    // The control is pinned to `secondary`, and its chevron is that fill's own
    // on-colour rather than a role chosen for another fill.
    expect(source).toContain('const CONTROL_VARIANT = "secondary" as const;');
    expect(source).toContain("actionOnColor(theme, CONTROL_VARIANT)");
    // The track's edge is the `border` role: `border-input` is shadcn's name
    // for a border, and the compiler resolves it to `border` because this
    // library's `input` is the field fill (the card's own white in the base
    // light theme, which would paint no edge). Its corner is the recipe's
    // fixed step, not the theme's radius.
    const track = recipes.slice(
      recipes.indexOf("export const CAROUSEL_TRACK ="),
    );
    expect(track.split("\n").slice(0, 2).join(" ")).toContain("border-input");
    expect(track.split("\n").slice(0, 2).join(" ")).toContain("rounded-lg");
    expect(utilities).toContain(
      'if (name === "border-input") return { borderColor: theme.colors.border };',
    );
    expect(lightTheme.colors.input).not.toBe(lightTheme.colors.border);

    const text = body(page).replace(/\s+/g, " ");
    expect(text).toContain("discrete, not sliding");
    expect(text).toContain("6 × 6px");
    expect(text).toContain("18 × 6px");
    expect(text).toContain("24 × 24px");
    expect(text).toContain("8px");
    expect(text).toContain("`aria-selected`");
    expect(text).toContain("no `aria-current`");
    expect(text).toContain("one roving tab stop");
    expect(text).toContain("stays mounted");
    expect(text).toContain("`secondaryForeground`");
    expect(text).toContain("`filledHover`");
    expect(text).toContain("`filledPressed`");
    expect(text).toContain("`border-input`");
    expect(text).toContain("the **`border`** role");
    // The Theming cell is read directly: a bold marker would hide a retracted
    // "`input` edge" from a prose-only check.
    const theming = body(page).slice(body(page).indexOf("## Theming"));
    const trackRow = /\| track \| ([^|\n]+) \|/.exec(theming)?.[1] ?? "";
    expect(trackRow).toContain("`border`");
    expect(trackRow).not.toContain("`input`");
    expect(text).not.toContain("the **`input`** role");
    // The retracted shapes: a sliding track and a state carried only by colour.
    expect(text).not.toContain("slides between");
    expect(text).not.toContain("translates");

    // The preview paints the same decisions from the theme's variables. The
    // section ends at the next sheet heading rather than at EOF, so a preview
    // appended below it is not read as part of the carousel.
    const css = read("apps/docs/src/styles/demos.css");
    const carouselStart = css.indexOf("/* ---- carousel:");
    const carouselEnd = css.indexOf("/* ----", carouselStart + 1);
    const carouselCss = css.slice(
      carouselStart,
      carouselEnd === -1 ? undefined : carouselEnd,
    );
    const cardRule =
      /\.gx-carousel-card \{([\s\S]*?)\n\}/.exec(carouselCss)?.[1] ?? "";
    expect(cardRule).toContain("border: 1px solid var(--border)");
    expect(cardRule).not.toContain("var(--input)");
    expect(carouselCss).toContain("background: var(--secondary)");
    expect(carouselCss).toContain("var(--secondary-hover)");
    expect(carouselCss).toContain("var(--secondary-pressed)");
    expect(carouselCss).toContain("width: var(--control-height-md)");
    expect(carouselCss).not.toContain("width: 6px");
    expect(carouselCss).not.toContain("width: 18px");
  });

  it("holds the collapsible's key edges and its unmount window to the source", () => {
    // A disclosure page can drift in three silent ways: it can promise a body
    // that stays mounted, an indicator the component ships, or a keyboard edge
    // the shared key module does not implement. The trigger's role and its
    // single state channel are read from the source, the reveal and its unmount
    // window from `AutoHeight`, and the preview's fixed metrics from the recipe
    // so a platform switch cannot be described as re-shaping the row.
    const page = pages.find(
      (candidate) => candidate.file === "collapsible.mdx",
    );
    expect(
      page,
      "the collapsible page is not in the curated set",
    ).toBeDefined();
    if (page === undefined) return;

    const source = read(page.source);
    const key = read("packages/components/src/internal/key.ts");
    const reveal = read("packages/components/src/auto-height.tsx");
    const recipes = read("packages/tw/src/recipes.ts");

    // The trigger: a role button, one state channel, and a gated press path.
    expect(source).toContain('role="button"');
    expect(source).toContain("aria-expanded={open}");
    expect(source).toContain("tabIndex={disabled ? -1 : 0}");
    expect(source).toContain("...disabledFade(disabled)");
    expect(source).toContain('cursor: disabled ? "not-allowed" : "pointer"');
    expect(source).toContain("hover: disabled ? undefined");
    expect(source).toContain("active: disabled");
    expect(source).toContain("controlRing(theme, { disabled })");
    expect(source).toContain("activationHandlers(toggle");
    // The runtime publishes no `aria-controls`, and the trigger ships no icon.
    expect(source).not.toContain("aria-controls");
    expect(source).not.toContain("chevron");

    // The two keyboard edges and the repeat guard are the shared key module's.
    expect(key).toContain(
      'if (event.key === "enter") return phase === "down";',
    );
    expect(key).toContain('return event.key === "space" && phase === "up";');
    expect(key).toContain("if (event.isHeld === true) return false;");

    // The body is the house reveal: mounted while open, unmounted after the
    // exit, with the measured frame painted at once under the reduced rule.
    expect(source).toContain("<AutoHeight");
    expect(source).toContain("open={open}");
    expect(source).toContain("contentClassName={cn(COLLAPSIBLE_CONTENT");
    expect(reveal).toContain("if (!presence.mounted) return null;");
    expect(reveal).toContain("initial: { height: 0, opacity: 0 }");
    expect(reveal).toContain('reducedMotion: preference === "reduced"');

    // The recipe fixes the metrics the page prints.
    const triggerRecipe = recipes.slice(
      recipes.indexOf("export const COLLAPSIBLE_TRIGGER"),
    );
    expect(triggerRecipe).toContain("px-2 py-1.5");
    expect(triggerRecipe).toContain("rounded-sm");
    expect(triggerRecipe).toContain("text-sm font-medium");
    expect(triggerRecipe).toContain("text-foreground");
    const contentRecipe = recipes.slice(
      recipes.indexOf("export const COLLAPSIBLE_CONTENT"),
    );
    expect(contentRecipe).toContain("gap-2 px-2 pt-1.5 pb-2");
    expect(contentRecipe).toContain("text-muted-foreground");

    const text = body(page).replace(/\s+/g, " ");
    expect(text).toContain("No `aria-controls`");
    expect(text).toContain("ships no indicator");
    expect(text).toContain(
      `${nativeCases(page.suite ?? "")} native behaviour tests`,
    );
    expect(text).toContain("unmounts");
    expect(text).toContain("8px inline");
    expect(text).toContain("first open paints the body at zero");
    // The retracted shapes: an indicator and a body that stays painted.
    expect(text).not.toContain("rotates");
    expect(text).not.toContain("stays mounted while closed");

    // The preview paints the recipe's fixed metrics and the platform's roles,
    // and it fades a body it actually removes.
    const css = read("apps/docs/src/styles/demos.css");
    const start = css.indexOf("/* ---- collapsible:");
    const end = css.indexOf("/* ----", start + 1);
    const collapseCss = css.slice(start, end === -1 ? undefined : end);
    const triggerRule =
      /\.gx-collapse-trigger \{([\s\S]*?)\n\}/.exec(collapseCss)?.[1] ?? "";
    expect(triggerRule).toContain("padding: 6px 8px");
    expect(triggerRule).toContain("border-radius: 4px");
    expect(triggerRule).toContain("font-size: 14px");
    expect(triggerRule).toContain("line-height: 20px");
    expect(triggerRule).not.toContain("var(--radius)");
    expect(collapseCss).toContain("background: var(--hover)");
    expect(collapseCss).toContain("background: var(--active)");
    expect(collapseCss).toContain("outline: 2px solid var(--ring)");
    expect(collapseCss).toContain("animation: gx-collapse-in 160ms ease-out");

    const demo = read("apps/docs/src/components/docs/collapsible-demo.tsx");
    expect(demo).toContain('const [note, setNote] = useState("");');
    expect(demo).toContain("{state.open ? (");
  });

  it("holds the form's submit lifecycle and its message block to the source", () => {
    // A form is the one component whose whole behaviour is a lifecycle, so the
    // page's most load-bearing claims are the four a screenshot cannot show: the
    // messages appear only after a failed submit, they are derived from the live
    // draft (an edit clears one), a pending form refuses a second submit, and
    // `onSubmit` receives the decoded value. The state moved to
    // `@tanstack/form-core`, so the page also owns the two consequences a reader
    // cannot see from the props: the core owns the submit attempts, and the
    // schema and handler are read once when the form mounts.
    const form = pages.find((candidate) => candidate.file === "form.mdx");
    expect(form, "the form page is not in the curated set").toBeDefined();
    if (form === undefined) return;

    const source = read(form.source);
    // The core owns values, meta and submit attempts; the schema is its
    // validator, not a boolean flag the page used to describe.
    expect(source).toContain("new FormApi({");
    expect(source).toContain(
      "validators: { onSubmit: schemaValidator(schema) }",
    );
    expect(source).toContain("Option.match(decode(schema)(rawValue)");
    expect(source).toContain("state.submissionAttempts > 0");
    expect(source).toContain("Effect.runSync(validateAll(schema)(value))");
    expect(source).toContain("if (pending) return;");
    expect(source).toContain("syncValues(form, value);");
    expect(source).toContain("void form.handleSubmit();");
    expect(source).toContain("children({ errors, pending, submit, form })");
    expect(source).toContain('role="alert"');
    expect(source).toContain('statusTone(theme, "destructive").foreground');
    expect(source).toContain('role: "form", "aria-label": label');
    // The validator is the half that maps a path to a field name, which is why
    // the page may promise per-field messages from the `FormApi` and still call
    // the painted summary flat.
    const validator = read("packages/components/src/form/validator.ts");
    expect(validator).toContain(
      'Schema.decodeUnknownEffect(schema, { errors: "all" })',
    );
    expect(validator).toContain("const fieldName =");
    expect(validator).toContain(
      "return { form: Option.getOrUndefined(grouped.form), fields: grouped.fields };",
    );
    // The walk is the other half of "every bad field": the default decoder
    // stops at the first failure, and `validateAll` asks for all of them.
    const logic = read("packages/components/src/validation/logic.ts");
    expect(logic).toContain('{ errors: "all" }');
    expect(logic).toContain("Arr.dedupe");

    const recipes = read("packages/tw/src/recipes.ts");
    expect(recipes).toContain(
      'export const FORM_ROOT = "flex flex-col gap-3";',
    );
    expect(recipes).toContain(
      'export const FORM_ERRORS = "flex flex-col gap-0.5";',
    );

    const text = body(form).replace(/\s+/g, " ");
    expect(text).toContain("`@tanstack/form-core` owns the state");
    expect(text).toContain("submissionAttempts");
    expect(text).toContain("nothing is validated and nothing is reported");
    expect(text).toContain("derived from the live draft");
    expect(text).toContain("**every** bad field");
    expect(text).toContain("ignores `submit`");
    expect(text).toContain("decoded");
    expect(text).toContain("reads them from the `FormApi`");
    expect(text).toContain("read when the form mounts");
    expect(text).toContain("9 native behaviour tests");
    expect(text).toContain("form-root");
    // The dependency a reader installs is the core, so the table lists it.
    expect(text).toContain("| `@tanstack/form-core` |");
    // The retracted claims: a form that reads the runtime's value, a message the
    // component wrote rather than the schema, a single boolean and a summary
    // that cannot name a field at all.
    expect(text).not.toContain("reads the runtime's value");
    expect(text).not.toContain("15 native behaviour tests");
    expect(text).not.toContain("The one piece of state is the flag");
    expect(text).not.toContain("No field-to-message mapping");
  });

  it("hold the search field's clear rule and its fixed metrics to the source", () => {
    // Three decisions a screenshot cannot show: Escape clears only a non-empty
    // field (an empty one must leave the key to an enclosing dialog), a clear
    // returns the focus to the input, and the clear control is a 24px target
    // around the 14px `sm` glyph while the field's radius and padding are the
    // recipe's fixed metrics rather than theme tokens. The last one is a
    // correction: the package page this page displaces called them `radius.md`
    // and `spacing.md`, so a platform switch was said to reshape a field that
    // only re-heights.
    const page = pages.find(
      (candidate) => candidate.file === "search-input.mdx",
    );
    expect(
      page,
      "the search-input page is not in the curated set",
    ).toBeDefined();
    if (page === undefined) return;

    const source = read(page.source);
    expect(source).toContain('if (value === "") return;');
    expect(source).toContain("if (isDismiss(event)) clear();");
    expect(source).toContain("onSubmit={() => onSubmit?.(value)}");
    expect(source).toContain("renderer?.focusElement?.(instance.id)");
    expect(source).toContain("readOnly={disabled}");
    expect(source).toContain("...disabledFade(disabled)");
    expect(source).toContain("fieldHint(");
    expect(source).toContain("renderFieldHint(");
    expect(source).toContain('nativeTextTheme(theme, "background")');
    expect(source).toContain('role="button"');
    expect(source).toContain('aria-label="Clear search"');
    expect(source).toContain("width: targetSize.minimum");
    expect(source).toContain("height: targetSize.minimum");
    expect(source).toContain("tabIndex={disabled ? -1 : 0}");
    // A disabled field refuses every edit path: the guard sits on the clear
    // itself (a `readOnly` host still receives keys), both tab stops leave the
    // order, and the target paints no hover wash. The page must teach the inert
    // rule, not the gap it used to record.
    expect(source).toContain("if (disabled) return;");
    expect(
      source.match(/tabIndex=\{disabled \? -1 : 0\}/g) ?? [],
      "both the field and the clear target must leave the tab order",
    ).toHaveLength(2);
    expect(source).toContain("hover: disabled");
    expect(source).toContain('cursor: disabled ? "not-allowed" : "pointer"');

    // No timer: the field reports every edit and the caller schedules.
    expect(source).not.toContain("setTimeout");
    expect(source).not.toContain("setInterval");

    // The recipe's fixed geometry, read from the suite that pins it.
    const recipeTest = read("packages/components/src/recipe/recipe.test.ts");
    const searchRecipe = recipeTest.slice(
      recipeTest.indexOf('describe("SearchInput recipe"'),
    );
    expect(searchRecipe).toContain("paddingLeft: 8");
    expect(searchRecipe).toContain("paddingRight: 8");
    expect(searchRecipe).toContain("borderRadius: 6");
    expect(searchRecipe).toContain(
      "backgroundColor: darkTheme.colors.background",
    );
    expect(searchRecipe).toContain("borderColor: darkTheme.colors.border");
    expect(searchRecipe).toContain("width: 18");
    const recipes = read("packages/tw/src/recipes.ts");
    expect(recipes).toContain(
      '"flex flex-row items-center gap-2 px-2 bg-background border border-input rounded-md"',
    );
    expect(recipes).toContain("size-[18px]");

    const text = body(page).replace(/\s+/g, " ");
    expect(text).toContain("does nothing on an empty or disabled field");
    expect(text).toContain("`submit` event");
    expect(text).toContain("returns the focus");
    expect(text).toContain("24px");
    expect(text).toContain("6px");
    expect(text).toContain("8px");
    expect(text).toContain("14/20");
    expect(text).toContain("fixed");
    expect(text).toContain("paints the hint itself");
    expect(text).toContain("refusing **every** edit path");
    expect(text).toContain("`not-allowed`");
    expect(text).toContain("refused `Escape`");
    expect(text).toContain("10 native behaviour tests");
    // The retracted shape: radius and padding as theme tokens.
    expect(text).not.toContain("`radius.md`");
    expect(text).not.toContain("`spacing.md`");
    // …and the retracted gap: a disabled field that a pointer could still clear.
    expect(text).not.toContain("press handler is still bound");
  });

  it("names the pinned column that ships beside the table", () => {
    // `FrozenTable` shipped from `@gpuixui/data` with its own page, and this page
    // is where a grid is designed: a reader planning a pinned column read a
    // Composition table that stopped at `VirtualTable` and a Related list with no
    // route to the component, so the pinned-column work looked unbuilt.
    const table = pages.find((page) => page.file === "table.mdx");
    expect(table, "the table page is not in the curated set").toBeDefined();
    if (table === undefined) return;

    expect(read("packages/data/src/index.ts")).toContain(
      'export { FrozenTable } from "./table/frozen.js";',
    );
    expect(
      read("packages/data/docs/frozen-columns.mdx"),
      "the frozen-columns package page is gone",
    ).toContain("title: Frozen columns");

    const text = body(table).replace(/\s+/g, " ");
    expect(text).toContain("`FrozenTable`");
    expect(text).toContain("](/docs/data-display/frozen-columns)");
    expect(text).toContain("mirrored in both directions");
  });

  it("refuse a disabled time field's edits, not only its tab stop", () => {
    // `disabled` made both segments readOnly, dropped the clear control and the
    // tab stops — and left the root's key handler and edit path live. A
    // read-only host still receives keys, so `ArrowUp` on a disabled field
    // stepped `09:30` to `10:30` and reported it to the caller (measured in the
    // test renderer on 2026-10-23). The guards in `edit` and `handleKeyDown`
    // are what let the page call the field inert, so the page is held to them.
    const page = pages.find(
      (candidate) => candidate.file === "time-picker.mdx",
    );
    expect(
      page,
      "the time-picker page is not in the curated set",
    ).toBeDefined();
    if (page === undefined) return;

    const source = read(page.source);
    const between = (start: string, end: string): string => {
      const from = source.indexOf(start);
      const to = source.indexOf(end, from + start.length);
      return from === -1 || to === -1 ? "" : source.slice(from, to);
    };
    expect(
      between("const edit =", "const handleKeyDown ="),
      "time-picker.tsx's edit path no longer refuses a disabled field",
    ).toContain("if (disabled) return;");
    expect(
      between("const handleKeyDown =", "const normalize ="),
      "time-picker.tsx's key handler no longer refuses a disabled field",
    ).toContain("if (disabled) return;");

    expect(
      page.suite,
      "the time-picker page prints no native suite",
    ).toBeDefined();
    if (page.suite === undefined) return;
    expect(read(page.suite)).toContain(
      "refuses every edit path on a disabled field",
    );

    const text = body(page).replace(/\s+/g, " ");
    expect(text).toContain("refuses every edit path");
    expect(text).toContain("read-only host still receives keys");
    expect(text).toContain("arrow step stops at the root's guard");
  });

  it("holds the time field's clock, its clamp and its hint seam to the source", () => {
    // A time field can drift in four silent ways: an arrow that carries at the
    // hour but not at midnight, a typed segment that clamps the value while its
    // text keeps the out-of-range digits, a fixed geometry the platform switch
    // cannot move, or a hint painted by the host instead of the published seam
    // (the host's placeholder is a fixed grey that ignores the theme). Each is
    // read from the module that decides it, not trusted to the page.
    const page = pages.find(
      (candidate) => candidate.file === "time-picker.mdx",
    );
    expect(
      page,
      "the time-picker page is not in the curated set",
    ).toBeDefined();
    if (page === undefined) return;

    const source = read(page.source);
    const clock = read("packages/components/src/time-picker/time.ts");
    // One clock: typing, arrows and midnight all go through `addMinutes`.
    expect(clock).toContain(
      "(((time.hours * 60 + time.minutes + amount) % 1440) + 1440) % 1440",
    );
    expect(source).toContain(
      'Match.when("up", () => shift(segment === "hours" ? 60 : step))',
    );
    expect(source).toContain(
      'Match.when("down", () => shift(segment === "hours" ? -60 : -step))',
    );
    // The text clamps in the same edit as the value, and erasing clears both.
    expect(source).toContain(
      "Number(digits) > max ? padSegment(clamped) : digits",
    );
    expect(source).toContain('if (digits === "") {');
    expect(source).toContain("composeIsoTime(nextHours, nextMinutes)");
    // A disabled field is read-only, dimmed and out of the tab order; there is
    // no `aria-disabled` in 0.11.0 for the page to promise.
    expect(source).toContain("readOnly: disabled");
    expect(source).toContain("tabIndex: disabled ? -1 : 0");
    expect(source).toContain("...disabledFade(disabled)");
    expect(source).not.toContain("aria-disabled=");
    // The field is the density's `md` box; the segment and the clear target are
    // the component's own fixed metrics.
    expect(source).toContain("const SEGMENT_WIDTH = 26;");
    expect(source).toContain('height: controlHeight(theme, "md")');
    expect(source).toContain("width: targetSize.minimum");
    expect(source).toContain("height: targetSize.minimum");
    expect(source).toContain("renderer?.focusElement?.(instance.id)");
    expect(source).toContain("resolveStyle(style, state)");
    expect(source).toContain("activationHandlers(clear)");
    // The hint is the published seam, over the field's own fill.
    expect(source).toContain("fieldHint(");
    expect(source).toContain("renderFieldHint(");
    expect(source).toContain('nativeTextTheme(theme, "input")');
    // No spinbutton: the two segments are real `<input>` hosts inside a group,
    // because the runtime has no `aria-valuenow` to announce.
    expect(source).toContain("const props: InputProps = {");
    expect(source).toContain('"aria-label": `${groupLabel} ${segment}`');
    expect(source).toContain('role="group"');

    const recipes = read("packages/tw/src/recipes.ts");
    expect(recipes).toContain(
      '"flex flex-row items-center gap-0.5 px-1.5 bg-input border border-border rounded-md"',
    );
    expect(recipes).toContain(
      '"text-sm font-sans text-input-foreground text-center h-full p-0"',
    );
    expect(recipes).toContain(
      '"text-sm font-sans text-muted-foreground select-none"',
    );
    expect(recipes).toContain("cursor-pointer");

    // The preview draws those metrics and takes the height from the theme.
    const css = read("apps/docs/src/styles/demos.css");
    const fieldStart = css.indexOf(".gx-time-field {");
    const field = css.slice(fieldStart, css.indexOf("}", fieldStart));
    expect(field).toContain("var(--control-height-md)");
    expect(field).toContain("background: var(--input)");
    const segmentStart = css.indexOf(".gx-time-segment {");
    const segment = css.slice(segmentStart, css.indexOf("}", segmentStart));
    expect(segment).toContain("width: 26px");
    const clearStart = css.indexOf(".gx-time-clear {");
    const clear = css.slice(clearStart, css.indexOf("}", clearStart));
    expect(clear).toContain("var(--target-size)");
    expect(clear).not.toContain("width: 18px");

    const text = body(page).replace(/\s+/g, " ");
    expect(text).toContain("24-hour");
    expect(text).toContain("one clock");
    expect(text).toContain("wrapping from `23:59` to `00:00`");
    expect(text).toContain("`density.controlHeight.md`");
    expect(text).toContain("26px");
    expect(text).toContain("6px");
    expect(text).toContain("24px");
    expect(text).toContain("`placeholder`");
    expect(text).toContain("No `aria-valuenow`");
    expect(text).toContain("No caret position");
    expect(text).toContain("declared at rest");
    expect(text).toContain(
      `${nativeCases(page.suite ?? "")} native behaviour tests`,
    );
    // The retracted claim: the traversal does run the segment's `onFocus` on
    // 0.11.0 (re-measured on `tooltip-lifecycle` and `tabs-lifecycle`), so a page
    // must not rest the ring on the event's absence.
    expect(text).not.toContain("focuses=0");
    expect(text).not.toContain("does not run its `onFocus`");
  });

  it("hold the tip's clock and its trigger rule to the runtime", () => {
    // The tip's timing is not in this wrapper: `@gpuix/react/tooltip` owns the
    // delay, the grace a leaving pointer gets and the reopen window, and a page
    // that printed the wrong number would teach a clock the component does not
    // run. Two claims are the wrapper's own: the surface must be the theme's
    // popover (the runtime mounts its own `#1A1A1A` behind a caller that sets
    // no fill) and the trigger's `aria-description` is the assistive path,
    // because a `Tab` traversal never runs the handler that opens the tip
    // (`apps/playground/src/live/focus-delivery.test.ts` holds that direction).
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

  it("holds the tag field's rules, its cap and its removal target to the source", () => {
    // A tag page can drift in four silent ways: it can promise Backspace
    // removal the runtime cannot observe, hide the 24px removal target behind a
    // smaller glyph, describe a draft the caller can read (it cannot), or order
    // the cap after the duplicate so a sixth repeated token is refused twice
    // for the wrong reason. Each is read from the painter and the rules.
    const page = pages.find((candidate) => candidate.file === "tag-input.mdx");
    expect(page, "the tag input page is not in the curated set").toBeDefined();
    if (page === undefined) return;

    const source = read(page.source);
    const rules = read("packages/components/src/tag-input/logic.ts");

    // The group: named, one recipe, the density height and the disabled fade.
    expect(source).toContain('role="group"');
    expect(source).toContain("aria-label={label}");
    expect(source).toContain('minHeight: controlHeight(theme, "md")');
    expect(source).toContain("...disabledFade(disabled)");
    // One fade for the group; a chip inside it must not composite a second.
    expect(source).not.toContain("opacity: disabled ? 0.6");
    expect(read("packages/tw/src/recipes.ts")).toContain(
      "px-1.5 py-0.5 bg-background rounded-md border border-input",
    );

    // Every edit path refuses while disabled, and the field leaves the tab order.
    expect(source.match(/if \(disabled\) return;/g)).toHaveLength(3);
    expect(source).toContain("readOnly={disabled}");
    expect(source).toContain("tabIndex={disabled ? -1 : 0}");
    expect(source).toContain("controlRing(theme, { disabled })");
    expect(source).toContain('nativeTextTheme(theme, "background")');
    expect(source).toContain("fieldHint(");

    // The chip's removal control: the 24px target, the named button, the glyph.
    expect(source).toContain('role="button"');
    expect(source).toContain("`Remove ${value}`");
    expect(source).toContain("width: targetSize.minimum");
    expect(source).toContain('name="x" size="sm"');
    expect(source).toContain("`${testId}-remove`");
    expect(source).toContain("hover: { backgroundColor: theme.colors.accent }");

    // The cap is checked before the duplicate, and a commit clears the draft.
    expect(rules.indexOf("rules.max !== undefined")).toBeLessThan(
      rules.indexOf("rules.allowDuplicates !== true"),
    );
    expect(source).toContain('setDraft("");');

    const text = body(page).replace(/\s+/g, " ");
    expect(text).toContain("Backspace");
    expect(text).toContain("No `aria-disabled`");
    expect(text).toContain("6px / 2px");
    expect(text).toContain("14/20");
    expect(text).toContain("24px");
    expect(text).toContain("draft is the component's");
    expect(text).toContain("The cap is checked **before** the duplicate");
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
    collectionPages(root, collection).map(
      (name) => `${collection.dir}/${name}`,
    ),
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
