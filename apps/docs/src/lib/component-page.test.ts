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

const dir = new URL("../../content/docs/components/", import.meta.url);
const repo = new URL("../../../../", import.meta.url);

const docsOnly = new Set(["reorderable-tabs.mdx"]);

const pages = readdirSync(dir).filter(
  (name) =>
    name.endsWith(".mdx") && name !== "index.mdx" && !docsOnly.has(name),
);

const source = (name: string): string =>
  readFileSync(new URL(name, dir), "utf8");

const title = (body: string): string =>
  (/^title:\s*(.+)$/m.exec(body)?.[1] ?? "").trim().replace(/^["']|["']$/g, "");

const sections = (body: string): readonly string[] =>
  [...body.matchAll(/^## (.+)$/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1].trim()],
  );

const required = ["Installation", "Usage", "API reference"] as const;

const policy = readFileSync(new URL("docs/preview-strategy.md", repo), "utf8");

const typesByPackage = new Map(
  packages.map((pkg) => [pkg, declaredTypes(pkg)] as const),
);

const packageOf = (body: string): Package | undefined => {
  const named = /<Install packageName="@gpuixui\/([a-z-]+)"/.exec(body)?.[1];
  return packages.find((pkg) => pkg === named);
};

const typesFor = (name: string): TypeIndex => {
  const pkg = packageOf(source(name));
  return (
    (pkg === undefined ? undefined : typesByPackage.get(pkg)) ?? declaredTypes()
  );
};

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

const documentedPackages = [
  new URL("packages/primitives/src/", repo),
  new URL("packages/components/src/", repo),
  new URL("packages/data/src/", repo),
];

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

    { part: null, types: ["TooltipProviderProps"] },
  ],
};

const declarationForms = [
  /^\s*readonly "?([A-Za-z_][A-Za-z0-9_-]*)"?\??:/gm,
  /^  "?([A-Za-z_][A-Za-z0-9_-]*)"?\??:/gm,
  /^export (?:interface|type|const|function|class) ([A-Za-z_][A-Za-z0-9_]*)/gm,
];

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

interface ApiTable {
  readonly part: string | null;
  readonly propColumn: number;
  readonly names: ReadonlyArray<string>;
}

const cells = (line: string): ReadonlyArray<string> =>
  line
    .replace(/^\|/, "")
    .split("|")
    .map((cell) => cell.trim());

const isPropName = (value: string): boolean => /^[A-Za-z_][\w-]*$/.test(value);

const quoted = (cell: string): ReadonlyArray<string> =>
  [...cell.matchAll(/`([^`]+)`/g)].flatMap((match) =>
    isPropName(match[1] ?? "") ? [match[1] ?? ""] : [],
  );

const named = (cell: string): ReadonlyArray<string> => {
  const inline = [
    ...cell.matchAll(/(?:^|[\s,;])([A-Za-z_][\w-]*)\??:/g),
  ].flatMap((match) => match[1] ?? []);
  return [...new Set([...quoted(cell), ...inline])];
};

const apiTables = (body: string): ReadonlyArray<ApiTable> => {
  const start = body.indexOf("## API reference");
  if (start === -1) return [];
  const rest = body.slice(start);
  const end = rest.indexOf("\n## ", 1);
  const section = end === -1 ? rest : rest.slice(0, end);

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

const apiNames = (body: string): ReadonlyArray<string> => [
  ...new Set(apiTables(body).flatMap((table) => table.names)),
];

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

        const previous = positions[index - 1];
        return previous !== undefined && position < previous
          ? [`${name}: ## ${section} is out of order`]
          : [];
      });
    });

    expect(missing).toEqual([]);
  });

  it("requires every permanent section its policy declares, in its order", () => {
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
    const declared = propDeclarations();
    const unresolved = pages.flatMap((name) =>
      apiNames(source(name))
        .filter((prop) => !declared.has(prop))
        .map((prop) => `${name}: ${prop}`),
    );

    expect(declared.size).toBeGreaterThanOrEqual(400);
    expect(unresolved).toEqual([]);
  });

  it("documents the payload every onActivate hands over", () => {
    const rows = pages.flatMap((name) =>
      source(name)
        .split("\n")
        .filter((line) => /^\|\s*`onActivate`\s*\|/.test(line))
        .map((line) => `${name}: ${line}`),
    );

    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows.filter((row) => row.includes("() => void"))).toEqual([]);
  });

  it("maps every API table to the props type it documents", () => {
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
  it("lists every curated page in the generated grid", () => {
    const listed = new Set(componentPages.map((entry) => entry.title));

    expect(
      pages
        .map((name) => title(source(name)))
        .filter((pageTitle) => !listed.has(pageTitle)),
    ).toEqual([]);
  });
});
