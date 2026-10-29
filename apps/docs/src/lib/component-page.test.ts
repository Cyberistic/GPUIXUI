import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { componentPages } from "./component-index-data";
import {
  declaredTypes,
  packages,
  propsOf,
  type Package,
  type TypeIndex,
} from "./component-props";

/**
 * The component page contract.
 *
 * `docs/preview-strategy.md` fixes the sections a curated component page must
 * carry: the example, the API table and the limits. The policy's template table
 * is parsed, so the two cannot disagree on a section's name or order.
 */

const dir = new URL("../../content/docs/components/", import.meta.url);
const repo = new URL("../../../../", import.meta.url);

/** Curated pages, i.e. everything in the folder but the section index. */
const pages = readdirSync(dir).filter(
  (name) => name.endsWith(".mdx") && name !== "index.mdx",
);

const source = (name: string): string =>
  readFileSync(new URL(name, dir), "utf8");

/** A page's frontmatter title, as the index's data reads it. */
const title = (body: string): string =>
  (/^title:\s*(.+)$/m.exec(body)?.[1] ?? "").trim().replace(/^["']|["']$/g, "");

/** Every `##` heading on a page, in order. */
const sections = (body: string): readonly string[] =>
  [...body.matchAll(/^## (.+)$/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1].trim()],
  );

const required = [
  "Installation",
  "Usage",
  "API reference",
  "Limitations",
] as const;

/** The template's cap on a page's limits: "at most three one-line runtime facts". */
const MAX_LIMITATIONS = 3;

const policy = readFileSync(new URL("docs/preview-strategy.md", repo), "utf8");

/**
 * The declarations each package's pages resolve against, read once.
 *
 * The page's own package wins a shared name (`FieldProps` is two different
 * components), so the maps are keyed by the package the page installs from.
 */
const typesByPackage = new Map(
  packages.map((pkg) => [pkg, declaredTypes(pkg)] as const),
);

/** The package a page installs from; the page contract requires one. */
const packageOf = (body: string): Package | undefined => {
  const named = /<Install packageName="@gpuixui\/([a-z-]+)"/.exec(body)?.[1];
  return packages.find((pkg) => pkg === named);
};

/** The declarations a page's API table resolves its type names against. */
const typesFor = (name: string): TypeIndex => {
  const pkg = packageOf(source(name));
  return (
    (pkg === undefined ? undefined : typesByPackage.get(pkg)) ?? declaredTypes()
  );
};

/** The `Section` column of the policy's component-page template table. */
const policySections = (): ReadonlyArray<string> => {
  const start = policy.indexOf("## The component page template");
  const end = policy.indexOf("\n## ", start + 1);
  return policy
    .slice(start, end === -1 ? undefined : end)
    .split("\n")
    .filter((line) => line.startsWith("|") && !/^\|[\s:|-]+\|$/.test(line))
    .map((line) => line.replace(/^\|/, "").split("|")[0]?.trim() ?? "")
    .filter((label) => label !== "" && label !== "Section");
};

/** The source trees a curated page's API table can resolve a name against. */
const documentedPackages = [
  new URL("packages/primitives/src/", repo),
  new URL("packages/components/src/", repo),
  new URL("packages/data/src/", repo),
];

/**
 * The props type each API table documents.
 *
 * The resolution case above holds the direction a page is easy to get wrong one
 * row at a time — a name it prints must exist. This is the other direction:
 * every prop a component **declares** has a row, which needs to know which type
 * a table speaks for. The name is not derivable from a part's name
 * (`ContextMenuItem` is `MenuItemProps`, `DialogTrigger` is `ButtonProps`), a
 * part may borrow another page's surface (`NavigationMenuLink` takes every
 * `Button` prop), and one table may speak for several parts (a `Part | Prop`
 * table), so the contract is written down here. A page absent from this table
 * fails the suite: adding a curated page means naming the type its API
 * documents.
 */
const PAGE_PARTS: Readonly<
  Record<
    string,
    ReadonlyArray<{
      readonly part: string | null;
      readonly types: ReadonlyArray<string>;
    }>
  >
> = {
  "accordion.mdx": [
    {
      part: null,
      types: [
        "AccordionProps",
        "AccordionItemProps",
        "AccordionTriggerProps",
        "AccordionContentProps",
      ],
    },
  ],
  "alert.mdx": [
    {
      part: null,
      types: [
        "AlertProps",
        "AlertIconProps",
        "AlertContentProps",
        "AlertTitleProps",
        "AlertDescriptionProps",
        "AlertDismissProps",
        "AlertLinkProps",
      ],
    },
  ],
  "auth.mdx": [],
  "avatar.mdx": [{ part: null, types: ["AvatarProps"] }],
  "badge.mdx": [{ part: null, types: ["BadgeProps"] }],
  "breadcrumb.mdx": [
    {
      part: null,
      types: [
        "BreadcrumbProps",
        "BreadcrumbListProps",
        "BreadcrumbItemProps",
        "BreadcrumbLinkProps",
        "BreadcrumbPageProps",
        "BreadcrumbSeparatorProps",
      ],
    },
  ],
  "button.mdx": [{ part: null, types: ["ButtonProps"] }],
  "card.mdx": [
    {
      part: null,
      types: [
        "CardProps",
        "CardHeaderProps",
        "CardTitleProps",
        "CardDescriptionProps",
        "CardContentProps",
        "CardFooterProps",
      ],
    },
  ],
  "carousel.mdx": [
    { part: "Carousel", types: ["CarouselProps"] },
    { part: "CarouselTrack", types: ["CarouselTrackProps"] },
    { part: "CarouselSlide", types: ["CarouselSlideProps"] },
    { part: "CarouselControl", types: ["CarouselControlProps"] },
    { part: "CarouselIndicators", types: ["CarouselIndicatorsProps"] },
  ],
  "checkbox.mdx": [
    { part: null, types: ["CheckboxProps"] },
    { part: "CheckboxIndicator", types: ["CheckboxIndicatorProps"] },
  ],
  "collapsible.mdx": [
    {
      part: null,
      types: [
        "CollapsibleProps",
        "CollapsibleTriggerProps",
        "CollapsibleContentProps",
      ],
    },
  ],
  "color-picker.mdx": [{ part: "ColorPicker", types: ["ColorPickerProps"] }],
  "combobox.mdx": [
    { part: "Combobox", types: ["ComboboxProps"] },
    { part: "ComboboxTrigger", types: ["ComboboxTriggerProps"] },
    { part: "ComboboxContent", types: ["ComboboxContentProps"] },
    { part: "ComboboxInput", types: ["ComboboxInputProps"] },
    { part: "ComboboxList", types: ["ComboboxListProps"] },
    { part: "ComboboxItem", types: ["ComboboxItemProps"] },
    { part: "ComboboxEmpty", types: ["ComboboxEmptyProps"] },
  ],
  "command-menu.mdx": [
    {
      part: null,
      types: [
        "CommandMenuProps",
        "CommandMenuInputProps",
        "CommandMenuListProps",
        "CommandMenuItemProps",
        "CommandMenuEmptyProps",
      ],
    },
  ],
  "confirm-dialog.mdx": [{ part: null, types: ["ConfirmDialogProps"] }],
  "context-menu.mdx": [
    { part: "ContextMenu", types: ["ContextMenuProps"] },
    { part: "ContextMenuTrigger", types: ["ContextMenuTriggerProps"] },
    { part: "ContextMenuContent", types: ["ContextMenuContentProps"] },
    {
      part: "ContextMenuItem and ContextMenuCheckboxItem",
      types: ["MenuItemProps", "MenuCheckboxItemProps"],
    },
    {
      part: "ContextMenuRadioGroup and ContextMenuRadioItem",
      types: ["MenuRadioGroupProps", "MenuRadioItemProps"],
    },
    {
      part: "ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent",
      types: ["MenuSubProps", "MenuSubTriggerProps", "MenuSubContentProps"],
    },
  ],
  "calendar.mdx": [{ part: "Calendar", types: ["CalendarProps"] }],
  "date-picker.mdx": [
    { part: "DatePicker", types: ["DatePickerProps"] },
    { part: "DatePickerTrigger", types: ["DatePickerTriggerProps"] },
    { part: "DatePickerContent", types: ["DatePickerContentProps"] },
    { part: "DatePickerCalendar", types: ["DatePickerCalendarProps"] },
  ],
  "dialog.mdx": [
    { part: "Dialog", types: ["DialogProps"] },
    { part: "DialogContent", types: ["DialogContentProps"] },
    // A trigger and a close are the components package's action.
    { part: "DialogTrigger and DialogClose", types: ["ButtonProps"] },
  ],
  "drawer.mdx": [
    { part: "Drawer", types: ["DrawerProps"] },
    { part: "DrawerContent", types: ["DrawerContentProps"] },
  ],
  "dropdown-menu.mdx": [
    { part: "DropdownMenu", types: ["DropdownMenuProps"] },
    { part: "DropdownMenuContent", types: ["DropdownMenuContentProps"] },
    { part: "DropdownMenuItem", types: ["MenuItemProps"] },
    { part: "DropdownMenuCheckboxItem", types: ["MenuCheckboxItemProps"] },
    {
      part: "DropdownMenuRadioGroup / DropdownMenuRadioItem",
      types: ["MenuRadioGroupProps", "MenuRadioItemProps"],
    },
  ],
  "empty-state.mdx": [{ part: null, types: ["EmptyStateProps"] }],
  "field.mdx": [
    {
      part: null,
      types: [
        "FieldProps",
        "FieldLabelProps",
        "FieldDescriptionProps",
        "FieldErrorProps",
        "FieldInputProps",
        "FieldsetProps",
        "FieldsetLegendProps",
      ],
    },
  ],
  "form.mdx": [{ part: null, types: ["FormProps"] }],
  "inline-edit.mdx": [{ part: "InlineEdit", types: ["InlineEditProps"] }],
  "list.mdx": [
    { part: "List", types: ["ListProps"] },
    { part: "ListItem", types: ["ListItemProps"] },
  ],
  "navigation-menu.mdx": [
    {
      part: null,
      types: [
        "NavigationMenuProps",
        "NavigationMenuListProps",
        "NavigationMenuItemProps",
        "NavigationMenuContentProps",
        "NavigationMenuLinkProps",
      ],
    },
  ],
  "pagination.mdx": [
    {
      part: null,
      types: [
        "PaginationProps",
        "PaginationItemProps",
        "PaginationListProps",
        "PaginationEllipsisProps",
      ],
    },
  ],
  "popover.mdx": [
    { part: "Popover", types: ["PopoverProps"] },
    { part: "PopoverContent", types: ["PopoverContentProps"] },
    { part: "PopoverTrigger", types: ["PopoverTriggerProps"] },
  ],
  "search-input.mdx": [{ part: null, types: ["SearchInputProps"] }],
  "select.mdx": [{ part: null, types: ["SelectProps"] }],
  "stepper.mdx": [
    { part: "Stepper", types: ["StepperProps"] },
    { part: "StepperStep", types: ["StepperStepProps"] },
  ],
  "switch.mdx": [
    { part: "Switch", types: ["SwitchProps"] },
    { part: "SwitchThumb", types: ["SwitchThumbProps"] },
  ],
  "table.mdx": [
    { part: "Table", types: ["TableProps"] },
    {
      part: "TableViewport, TableHeader, TableBody",
      types: ["TableViewportProps", "TableHeaderProps", "TableBodyProps"],
    },
    { part: "TableRow", types: ["TableRowProps"] },
    {
      part: "TableHeaderCell, TableCell",
      types: ["TableHeaderCellProps", "TableCellProps"],
    },
    { part: "TableSkeleton", types: ["TableSkeletonProps"] },
    { part: "TableSortHeader", types: ["TableSortHeaderProps"] },
    // A member list: the fields `useTable` exposes, not a props type.
    { part: "The sort surface useTable exposes", types: [] },
  ],
  "tabs.mdx": [
    { part: "Tabs", types: ["TabsProps"] },
    { part: "TabsList", types: ["TabsListProps"] },
    { part: "TabsTrigger", types: ["TabsTriggerProps"] },
  ],
  "tag-input.mdx": [
    { part: "TagInput", types: ["TagInputProps"] },
    { part: "TagInputField", types: ["TagInputFieldProps"] },
    { part: "TagInputChip", types: ["TagInputChipProps"] },
  ],
  "time-picker.mdx": [
    { part: "TimePicker", types: ["TimePickerProps"] },
    { part: "TimePickerSegment", types: ["TimePickerSegmentProps"] },
    { part: "TimePickerSeparator", types: ["TimePickerSeparatorProps"] },
    { part: "TimePickerClear", types: ["TimePickerClearProps"] },
  ],
  "timeline.mdx": [
    { part: "Timeline", types: ["TimelineProps"] },
    { part: "TimelineItem", types: ["TimelineItemProps"] },
  ],
  "toast.mdx": [
    {
      part: null,
      types: ["ToastProviderProps", "ToastViewportProps", "ToastInput"],
    },
  ],
  "tooltip.mdx": [
    { part: null, types: ["TooltipProps"] },
    // The second table is the provider's one timing for every tip.
    { part: null, types: ["TooltipProviderProps"] },
  ],
};

/**
 * The three forms a documented name can take in the packages' source.
 *
 * `readonly` is the prop convention, the two-space form covers the shared
 * `Props` object types, and an exported declaration is what a part row
 * (`CommandMenuInput`) names. A name the platform spells with a hyphen is
 * quoted at its declaration (`"aria-id"`), so the prop forms read the quotes.
 */
const declarationForms = [
  /^\s*readonly "?([A-Za-z_][A-Za-z0-9_-]*)"?\??:/gm,
  /^  "?([A-Za-z_][A-Za-z0-9_-]*)"?\??:/gm,
  /^export (?:interface|type|const|function|class) ([A-Za-z_][A-Za-z0-9_]*)/gm,
];

/** Every name a prop interface or an exported part declares. */
const propDeclarations = (): ReadonlySet<string> =>
  new Set(
    documentedPackages.flatMap((dir) =>
      readdirSync(dir, { recursive: true, encoding: "utf8" })
        .filter((name) => /\.tsx?$/.test(name))
        .flatMap((name) => {
          const text = readFileSync(new URL(name, dir), "utf8");
          return declarationForms.flatMap((form) =>
            [...text.matchAll(form)].flatMap((match) => match[1] ?? []),
          );
        }),
    ),
  );

/**
 * One table under a page's `## API reference`.
 *
 * A page may carry several: a compound component documents each part under its
 * own `###` heading, and the table before the first heading speaks for the
 * root. `propColumn` is the column the names live in — `Prop` on most pages,
 * the second column of a `Part | Prop | …` table, the third of a
 * `Part | Renders | Props` map — and `-1` for a member list (`useTable`), whose
 * rows name a surface's fields in prose rather than a props type's.
 */
interface ApiTable {
  readonly part: string | null;
  readonly propColumn: number;
  readonly names: ReadonlyArray<string>;
}

/** The cells of one Markdown table row. */
const cells = (line: string): ReadonlyArray<string> =>
  line
    .replace(/^\|/, "")
    .split("|")
    .map((cell) => cell.trim());

/** A name a prop can carry: an identifier, hyphenated for the runtime's props. */
const isPropName = (value: string): boolean => /^[A-Za-z_][\w-]*$/.test(value);

/** The backticked names one cell prints. */
const quoted = (cell: string): ReadonlyArray<string> =>
  [...cell.matchAll(/`([^`]+)`/g)].flatMap((match) =>
    isPropName(match[1] ?? "") ? [match[1] ?? ""] : [],
  );

/**
 * The prop names a cell prints, backticked or not.
 *
 * A `Part | Renders | Props` map writes a prop as `name: type`; the name is
 * what a reader copies, so the reader here takes it either way.
 */
const named = (cell: string): ReadonlyArray<string> => {
  const inline = [
    ...cell.matchAll(/(?:^|[\s,;])([A-Za-z_][\w-]*)\??:/g),
  ].flatMap((match) => match[1] ?? []);
  return [...new Set([...quoted(cell), ...inline])];
};

/** Every API table on a page, with the part its heading names. */
const apiTables = (body: string): ReadonlyArray<ApiTable> => {
  const start = body.indexOf("## API reference");
  if (start === -1) return [];
  const rest = body.slice(start);
  const end = rest.indexOf("\n## ", 1);
  const section = end === -1 ? rest : rest.slice(0, end);

  /**
   * The table being read and the tables already closed.
   *
   * A header row opens a table, so a member list (`useTable`'s fields) is a
   * table too — its `propColumn` is `-1` and it names no props type.
   */
  return section.split("\n").reduce<{
    readonly tables: ReadonlyArray<ApiTable>;
    readonly part: string | null;
    readonly column: number;
  }>(
    (state, line) => {
      if (line.startsWith("### "))
        return {
          ...state,
          part: line.slice(4).replaceAll("`", "").trim(),
          column: -1,
        };
      if (!line.startsWith("|")) return { ...state, column: -1 };
      const row = cells(line);
      const header =
        row[0] === "Prop"
          ? 0
          : row[0] === "Part" || row[0] === "Member"
            ? row.findIndex((cell) => cell === "Prop" || cell === "Props")
            : undefined;
      if (header !== undefined)
        return {
          ...state,
          column: header,
          tables: [
            ...state.tables,
            { part: state.part, propColumn: header, names: [] },
          ],
        };
      if (state.column === -1 || /^[:\s-]+$/.test(row[state.column] ?? ""))
        return state;
      const last = state.tables.at(-1);
      if (last === undefined) return state;
      return {
        ...state,
        tables: [
          ...state.tables.slice(0, -1),
          {
            ...last,
            names: [...last.names, ...named(row[state.column] ?? "")],
          },
        ],
      };
    },
    { tables: [], part: null, column: -1 },
  ).tables;
};

/** Every name every table on a page prints. */
const apiNames = (body: string): ReadonlyArray<string> => [
  ...new Set(apiTables(body).flatMap((table) => table.names)),
];

/**
 * The tables on a page, paired with the props types `PAGE_PARTS` maps them to.
 *
 * A page may carry two tables under one heading (Tooltip documents the tip and
 * its provider), so entries are consumed in order, one per table with the same
 * heading. A table with no entry left, or an entry with no table, is reported:
 * a page that grows a table without saying what it documents fails, and so does
 * a map that describes a table the page dropped.
 */
const pairTables = (
  name: string,
): {
  readonly pairs: ReadonlyArray<{
    readonly table: ApiTable;
    readonly types: ReadonlyArray<string>;
  }>;
  readonly problems: ReadonlyArray<string>;
} => {
  const entries = PAGE_PARTS[name];
  const scanned = apiTables(source(name)).reduce<{
    readonly pairs: ReadonlyArray<{
      readonly table: ApiTable;
      readonly types: ReadonlyArray<string>;
    }>;
    readonly remaining: ReadonlyArray<{
      readonly part: string | null;
      readonly types: ReadonlyArray<string>;
    }>;
    readonly problems: ReadonlyArray<string>;
  }>(
    (state, table) => {
      const index = state.remaining.findIndex(
        (entry) => entry.part === table.part,
      );
      const entry = state.remaining[index];
      if (entry === undefined)
        return {
          ...state,
          problems: [
            ...state.problems,
            `${name}: the ${table.part ?? "page"} table is unmapped`,
          ],
        };
      return {
        pairs: [...state.pairs, { table, types: entry.types }],
        remaining: state.remaining.filter((_, position) => position !== index),
        problems: state.problems,
      };
    },
    { pairs: [], remaining: entries ?? [], problems: [] },
  );

  return {
    pairs: scanned.pairs,
    problems: [
      ...(entries === undefined ? [`${name}: no props type is mapped`] : []),
      ...scanned.problems,
      ...scanned.remaining.map(
        (entry) => `${name}: no table is headed ${entry.part ?? "the page"}`,
      ),
    ],
  };
};

describe("the curated component pages", () => {
  it("exist, so the folder cannot empty out unnoticed", () => {
    expect(pages.length).toBeGreaterThanOrEqual(4);
  });

  it("carry the sections the template requires, in the template's order", () => {
    const missing = pages.flatMap((name) => {
      const found = sections(source(name));
      const positions = required.map((section) => found.indexOf(section));
      return positions.flatMap((position, index) => {
        const section = required[index] ?? "";
        if (position === -1) return [`${name}: no ## ${section}`];
        // Order matters: the API precedes the limits.
        const previous = positions[index - 1];
        return previous !== undefined && position < previous
          ? [`${name}: ## ${section} is out of order`]
          : [];
      });
    });

    expect(missing).toEqual([]);
  });

  it("keep the limits to the three facts the template allows", () => {
    // Bug guarded: the policy says a page's Limitations are "at most three
    // one-line runtime facts", and nothing counted them — `avatar.mdx` grew a
    // fourth bullet that restated two API rows the page already documents, so
    // the section drifted from "the limits" into a second list of behaviour.
    const limits = pages.flatMap((name) => {
      const body = source(name);
      const start = body.indexOf("## Limitations");
      if (start === -1) return [];
      const rest = body.slice(start + "## Limitations".length);
      const end = rest.indexOf("\n## ");
      const section = end === -1 ? rest : rest.slice(0, end);
      const facts = section
        .split("\n")
        .filter((line) => line.startsWith("- ") && line.trim() !== "-");

      if (facts.length === 0) return [`${name}: no limitation is stated`];
      return facts.length > MAX_LIMITATIONS
        ? [`${name}: ${facts.length} limitations`]
        : [];
    });

    expect(pages).toContain("avatar.mdx");
    expect(policy).toContain("at most three one-line runtime facts");
    expect(limits).toEqual([]);
  });

  it("requires every permanent section its policy declares, in its order", () => {
    // `frontmatter` and `preview` are not `##` headings, `Composition` is
    // declared for compound components only, and `keyboard` is the block the
    // frame generates after the prose rather than a heading a page writes, so
    // the other rows are the ones every page carries. The table is parsed
    // rather than trusted: a row added to the policy fails here until
    // `required` gains it, and a required section the policy withdraws fails
    // the same way.
    const conditional = new Set([
      "frontmatter",
      "preview",
      "Composition",
      "keyboard",
    ]);

    expect(
      policySections().filter((section) => !conditional.has(section)),
    ).toEqual([...required]);
  });

  it("open with a preview and a sentence saying what the component is not", () => {
    const withoutPreview = pages.filter(
      (name) => !source(name).includes("<ComponentPreview"),
    );

    expect(withoutPreview).toEqual([]);
  });

  it("name the package they install from", () => {
    const withoutInstall = pages.filter(
      (name) => !/<Install packageName="@gpuixui\/[a-z-]+"/.test(source(name)),
    );

    expect(withoutInstall).toEqual([]);
  });

  it("name only props and parts the packages declare", () => {
    // The API table is the page's most copyable claim, and nothing resolved it:
    // `page-snippets.test.ts` checks the imports in a fence, not the prop names
    // in a row, so renaming `onActivate` in the component left the page teaching
    // a prop that no longer exists — the same "copyable code must resolve" rule
    // the snippet walk exists for. This reads the packages a curated page can
    // document (primitives, the components built on them, and the data surfaces)
    // and holds every backticked name in the table's first column to a
    // declaration there.
    //
    // It is a resolution check, not a completeness one: a prop a page omits is
    // a documentation gap, not a wrong name, and inherited `Omit`/`Props` types
    // make "every prop" a compiler question rather than a regex one.
    const declared = propDeclarations();
    const unresolved = pages.flatMap((name) =>
      apiNames(source(name))
        .filter((prop) => !declared.has(prop))
        .map((prop) => `${name}: ${prop}`),
    );

    // Floors, so a scan that stopped matching cannot pass.
    expect(declared.size).toBeGreaterThanOrEqual(400);
    expect(unresolved).toEqual([]);
  });

  it("documents the payload every onActivate hands over", () => {
    // Bug guarded: `ButtonProps.onActivate` was widened to carry the event that
    // caused the press — the runtime's click point, or the key that activated —
    // and `/components/button` still typed it `() => void`, so a consumer
    // reading the table could not know a payload existed before binding a
    // handler that needed it. Every shipped `onActivate` takes one argument (the
    // event on an action, the row's value on a list), so a nullary cell is a
    // contract read backwards.
    const rows = pages.flatMap((name) =>
      source(name)
        .split("\n")
        .filter((line) => /^\|\s*`onActivate`\s*\|/.test(line))
        .map((line) => `${name}: ${line}`),
    );

    // Floors, so a scan that stopped matching cannot pass on no rows.
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows.filter((row) => row.includes("() => void"))).toEqual([]);
  });

  it("maps every API table to the props type it documents", () => {
    // The map is the completeness contract's premise, so it is held both ways:
    // a page the table forgets, a table the map invents, and a type name that
    // resolves to nothing all fail here rather than passing a check that
    // walked an empty set.
    const problems = pages.flatMap((name) => {
      const { problems: pairing } = pairTables(name);
      const types = typesFor(name);
      return [
        ...pairing,
        ...(PAGE_PARTS[name] ?? []).flatMap((entry) =>
          entry.types
            .filter((type) => !types.byName.has(type))
            .map((type) => `${name}: ${type} is not declared`),
        ),
      ];
    });

    expect(problems).toEqual([]);
  });

  it("documents every prop the component each table speaks for declares", () => {
    // Bug guarded: the case above resolves the names a table prints, so a
    // renamed prop fails — but a prop the table omits is silent, and
    // `/components/button` listed `onClick` and `style` while `ButtonProps`
    // also carried `className`, the five interaction handlers and the tooltip
    // trigger's `onMouseEnter`/`onMouseLeave`. The package pages are held to
    // this rule by `packages/primitives/src/docs.test.ts` §The primitives API
    // tables; the curated pages are held here, per table, through the same
    // resolution rules — an interface's own fields and its parents, an alias's
    // intersection, `Omit` subtracting, and the runtime's own `Props` surface
    // left opaque because its properties are not this repository's to
    // document. A row may name several props (`leading` / `trailing`), which is
    // how the shared host surface stays readable.
    const problems = pages.flatMap((name) => {
      const types = typesFor(name);
      return pairTables(name).pairs.flatMap(({ table, types: names }) => {
        if (names.length === 0)
          return table.propColumn === -1
            ? []
            : [`${name}: a props table maps no type`];
        return names.flatMap((type) => {
          const props = [...new Set(propsOf(type, types))];
          if (props.length === 0)
            return [`${name}: ${type} declares no prop this suite can read`];
          return props
            .filter((prop) => !table.names.includes(prop))
            .map(
              (prop) =>
                `${name}: ${table.part ?? "the page"}: ${type}.${prop} has no API row`,
            );
        });
      });
    });

    expect(problems).toEqual([]);
  });

  it("reads a composed props type through extends, an alias and Omit", () => {
    // The reader itself, measured against the packages' real declarations so a
    // reader that quietly resolves nothing cannot pass by reading no types:
    // `ButtonProps` declares its own fields, inherits the interaction and
    // tooltip-trigger surfaces through `extends`, and leaves the runtime's
    // `Props` opaque; `TextAreaProps` is an alias that omits `onSubmit`.
    const types = declaredTypes("primitives");
    const button = propsOf("ButtonProps", types);
    const textarea = propsOf("TextAreaProps", types);

    expect({
      own: button.includes("loadingLabel"),
      parent: button.includes("onFocus"),
      tooltip: button.includes("onMouseEnter"),
      alias: textarea.includes("minRows"),
      omitted: textarea.includes("onSubmit"),
      runtime: button.includes("aria-expanded"),
    }).toEqual({
      own: true,
      parent: true,
      tooltip: true,
      alias: true,
      omitted: false,
      runtime: false,
    });
  });
});

describe("the component section index", () => {
  it("mounts the generated index rather than a hand-kept list", () => {
    // The index reads the same frontmatter the pages render, so a page added
    // to any collection appears without a docs edit.
    const index = source("index.mdx");

    expect(index).toContain("<ComponentIndex />");
    expect(index).toContain("?q=partial");
  });

  it("lists every curated page in the generated grid", () => {
    // The index listed Button, Dialog, Popover and Tabs while the Dropdown
    // menu page shipped beside them, so a reader looking for a menu preview was
    // told the curated set did not include one. The grid is the list now, so
    // the guard reads the rows the site generates rather than prose that can
    // drift: a page the index's data drops is a card no reader can reach.
    const listed = new Set(componentPages.map((entry) => entry.title));

    expect(
      pages
        .map((name) => title(source(name)))
        .filter((pageTitle) => !listed.has(pageTitle)),
    ).toEqual([]);
  });

  it("renders each page's demo in its grid tile", () => {
    // The index offers `preview` as a query and says a page that mounts a
    // preview renders it; a tile that dropped the demo would leave the claim
    // false and the grid a wall of names.
    const index = source("index.mdx");
    const grid = readFileSync(
      new URL("../components/docs/component-index.tsx", import.meta.url),
      "utf8",
    );

    expect(grid).toContain("<Scene />");
    expect(grid).toContain("data-preview");
    expect(index).toContain("renders it in its grid tile");
    expect(index).toContain("`preview` finds");
  });

  it("teaches the verdict mark a row wears, and where it comes from", () => {
    // The index marks the rows the inventory does not call whole; an
    // unexplained `partial` beside a component's name reads as a docs bug, and
    // a hand-written verdict would drift from the row the page prints.
    const index = source("index.mdx");
    const component = readFileSync(
      new URL("../components/docs/component-index.tsx", import.meta.url),
      "utf8",
    );

    expect(component).toContain("verdictMark");
    expect(index).toContain("**partial**");
    expect(index).toContain(
      "finds every component the runtime supports only in part",
    );
    expect(index).toContain("`COMPONENTS.md` row");
  });

  it("says how to run the native component, from one command", () => {
    // The command is a constant the page prints as an expression, so the
    // prose and the command cannot drift.
    const index = source("index.mdx");

    expect(index).toContain(
      'export const playgroundCommand = "nub run dev:playground";',
    );
    expect(index).toContain("<code>{playgroundCommand}</code>");
  });

  it("teaches only the sections a page can actually have", () => {
    // The index described a page from memory — Variants / Sizes / States,
    // Keyboard, Theming, "Accessibility and limitations" — while the template
    // the pages follow has none of those headings. `Keyboard` returned as the
    // strip the frame generates, not as an authored heading: the rows are the
    // policy's own section names plus the four generated blocks, held to the
    // template table rather than to this comment.
    const generated = [
      "Status",
      "Dependencies",
      "Keyboard",
      "Related",
    ] as const;
    const allowed = [
      ...policySections().filter((section) => section !== "frontmatter"),
      ...generated,
    ];
    const index = source("index.mdx");
    const start = index.indexOf("## How to read a page");
    const end = index.indexOf("\n## ", start + 1);
    const taught = index
      .slice(start, end === -1 ? undefined : end)
      .split("\n")
      .filter((line) => line.startsWith("|") && !/^\|[\s:|-]+\|$/.test(line))
      .slice(1)
      .map((line) => line.replace(/^\|/, "").split("|")[0]?.trim() ?? "")
      .filter((label) => label !== "");

    expect(taught.length).toBeGreaterThanOrEqual(6);
    expect(taught.filter((label) => !allowed.includes(label))).toEqual([]);
    // The template's own name, not the old invented one.
    expect(taught).toContain("Limitations");
    expect(taught).not.toContain("Accessibility and limitations");
  });

  it("names the limits section the template declares, not the one it replaced", () => {
    // The policy described a page's shared limits as the **Accessibility and
    // limitations** row, a heading no template row declares and no page
    // writes — the same invented name the index taught until it was held to
    // `policySections()`. A contributor following the policy looked for a
    // section the page does not have.
    const declared = policySections();

    expect(declared).toContain("Limitations");
    expect(declared).not.toContain("Accessibility and limitations");
    expect(policy).not.toContain("Accessibility and limitations");
    expect(policy).toContain("The **Limitations** section");
  });
});
