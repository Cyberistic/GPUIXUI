import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import { describe, expect, it } from "vitest";
import * as primitiveExports from "./index.js";
import { inventory, type PrimitiveMeta } from "./inventory.js";

const packageRoot = new URL("../", import.meta.url);
const repoRoot = new URL("../../../", import.meta.url);

const fileExists = (relative: string): boolean =>
  existsSync(fileURLToPath(new URL(relative, packageRoot)));

interface Row {
  readonly name: string;
  readonly status: string;
  readonly support: string;
  readonly notes: string;
}

const tier1Rows = (): ReadonlyArray<Row> => {
  const markdown = readFileSync(
    fileURLToPath(new URL(".agents/slop/COMPONENTS.md", repoRoot)),
    "utf8",
  );
  const start = markdown.indexOf("## Tier 1");
  const end = markdown.indexOf("## Tier 2");
  if (start < 0 || end < 0 || end <= start) return [];

  return Arr.flatMap(markdown.slice(start, end).split("\n"), (line) => {
    if (!line.startsWith("|")) return [];
    const cells = Arr.map(line.split("|").slice(1, -1), (cell) => cell.trim());
    if (cells.length < 3) return [];
    const name = cells[0] ?? "";
    if (name === "Component" || name.startsWith("---") || name === "")
      return [];
    return [
      {
        name,
        status: cells[1] ?? "",
        support: cells[2] ?? "",
        notes: cells[3] ?? "",
      },
    ];
  });
};

const duplicates = (values: ReadonlyArray<string>): ReadonlyArray<string> =>
  Arr.filter(values, (value, index) => values.indexOf(value) !== index);

const rowFor = (meta: PrimitiveMeta): Option.Option<Row> =>
  Arr.findFirst(tier1Rows(), (row) => row.name === meta.name);

const ANNOUNCED_STATES: ReadonlyArray<{
  readonly name: string;
  readonly source: string;
}> = [
  { name: "Selects", source: "src/components/Select.tsx" },
  { name: "Slider", source: "src/components/Slider.tsx" },
  { name: "Range slider", source: "src/components/Slider.tsx" },
  { name: "Meter", source: "src/components/Meter.tsx" },
  { name: "Radio groups", source: "src/components/RadioGroup.tsx" },
  { name: "Switches", source: "src/components/Switch.tsx" },
  { name: "Toggle", source: "src/components/Toggle.tsx" },
];

const claimProblems = (name: string, text: string): ReadonlyArray<string> => [
  ...(text.includes("aria-valuetext")
    ? []
    : [`${name}: does not name aria-valuetext as the announced channel`]),
  ...(text.includes("not announced")
    ? [`${name}: says the state is not announced`]
    : []),
  ...(text.includes("pair it with a visible label")
    ? [`${name}: names a visible Label as the control's name`]
    : []),
];

const deniedParts = (text: string): ReadonlyArray<string> =>
  Arr.filter(
    Arr.map(
      [...text.matchAll(/\bno (?:compound |built-in )?([A-Z][A-Za-z0-9]+)\b/g)],
      (match) => match[1] ?? "",
    ),
    (name) => name.length > 0,
  );

const sourceOf = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, packageRoot)), "utf8");

const EXAMPLE_COMPONENTS: Readonly<Record<string, ReadonlyArray<string>>> = {
  "Text / typography": ["Text"],
  Icons: ["Icon"],
  Separators: ["Separator"],
  Spacers: ["Spacer"],
  "Stack / layout primitives": ["Stack"],
  Grid: ["Grid"],
  "Boxes / containers": ["Box"],
  "Scrollable containers": ["ScrollArea"],
  Buttons: ["Button"],
  "Icon buttons": ["IconButton"],
  "Button groups": ["ButtonGroup"],
  Labels: ["Label"],
  "Text inputs": ["Input"],
  "Text areas": ["TextArea"],
  Checkboxes: ["Checkbox"],
  "Checkbox group": ["CheckboxGroup"],
  "Radio groups": ["RadioGroup"],
  Selects: ["Select"],
  Switches: ["Switch"],
  Progress: ["Progress"],
  Tooltips: ["Tooltip"],
  Skeletons: ["Skeleton"],
  "Loading indicators": ["Spinner"],
  Slider: ["Slider"],
  "Range slider": ["RangeSlider"],
  Meter: ["Meter"],
  "Number Field": ["NumberField"],
  "OTP Field": ["OTPField"],
  Toggle: ["Toggle"],
  "Toggle group": ["ToggleGroup"],
  Rating: ["Rating"],
};

const renders = (source: string, component: string): boolean =>
  new RegExp(`<\\s*${component}(?=[\\s/>])`).test(source);

const announceProblems = ({
  name,
  source,
}: {
  readonly name: string;
  readonly source: string;
}): ReadonlyArray<string> =>
  Option.match(
    Arr.findFirst(inventory, (meta) => meta.name === name),
    {
      onNone: () => [`${name}: no record`],
      onSome: (meta) => [
        ...(sourceOf(source).includes("aria-valuetext={")
          ? []
          : [`${name}: ${source} declares no aria-valuetext`]),
        ...claimProblems(name, meta.limitations.join(" ")),
        ...Option.match(rowFor(meta), {
          onNone: () => [`${name}: no .agents/slop/COMPONENTS.md row`],
          onSome: (row) => claimProblems(name, row.notes),
        }),
      ],
    },
  );

const tooltipProblems = (): ReadonlyArray<string> =>
  Option.match(
    Arr.findFirst(inventory, (meta) => meta.name === "Tooltips"),
    {
      onNone: () => ["Tooltips: no record"],
      onSome: (meta) => [
        ...Arr.filter(meta.limitations, (line) =>
          line.includes("does not open"),
        ).map(
          (line) =>
            `Tooltips: the record still teaches the retracted "${line}"`,
        ),
        ...(Arr.some(meta.limitations, (line) =>
          line.includes("hover is the only open path"),
        )
          ? []
          : ["Tooltips: the record does not state the window's measured gap"]),
        ...Option.match(rowFor(meta), {
          onNone: () => ["Tooltips: no .agents/slop/COMPONENTS.md row"],
          onSome: (row) => [
            ...(row.notes.includes("tooltip-lifecycle")
              ? []
              : ["Tooltips: the row cites no measured probe"]),
            ...(row.notes.includes("`Tab` traversal opens it too")
              ? ["Tooltips: the row still promises the retracted open path"]
              : []),
            ...(row.notes.includes("stays closed")
              ? []
              : ["Tooltips: the row does not record the window's closed tip"]),
          ],
        }),
      ],
    },
  );

const otpAlphabetProblems = (): ReadonlyArray<string> =>
  Option.match(
    Arr.findFirst(inventory, (meta) => meta.name === "OTP Field"),
    {
      onNone: () => ["OTP Field: no record"],
      onSome: (meta) => [
        ...(sourceOf("src/core/otp.ts").includes("A-Za-z")
          ? []
          : ["OTP Field: src/core/otp.ts no longer keeps letters"]),
        ...Option.match(rowFor(meta), {
          onNone: () => ["OTP Field: no .agents/slop/COMPONENTS.md row"],
          onSome: (row) => [
            ...(row.notes.includes("digit-only")
              ? [
                  "OTP Field: the row says digit-only, and the core keeps letters",
                ]
              : []),
            ...(row.notes.includes("letters and digits")
              ? []
              : [
                  "OTP Field: the row does not name the alphabet the field keeps",
                ]),
          ],
        }),
      ],
    },
  );

const switchPendingProblems = (): ReadonlyArray<string> =>
  Option.match(
    Arr.findFirst(inventory, (meta) => meta.name === "Switches"),
    {
      onNone: () => ["Switches: no record"],
      onSome: (switches) => [
        ...(sourceOf("src/components/Switch.tsx").includes("readonly loading")
          ? ["Switches: the source declares a loading prop the documents deny"]
          : []),
        ...(Arr.some(switches.limitations, (line) =>
          line.includes("No pending state"),
        )
          ? []
          : ["Switches: the record does not state the missing pending state"]),
        ...Option.match(rowFor(switches), {
          onNone: () => ["Switches: no .agents/slop/COMPONENTS.md row"],
          onSome: (row) => [
            ...(row.notes.includes("busy toggle")
              ? ["Switches: the row promises the Toggle's busy state"]
              : []),
            ...(/no pending state/i.test(row.notes) &&
            row.notes.includes("in flight")
              ? []
              : [
                  "Switches: the row does not name disabling it while a request is in flight",
                ]),
          ],
        }),
        ...(sourceOf("src/components/Toggle.tsx").includes("readonly loading")
          ? []
          : ["Toggle: the source no longer declares its busy state"]),
        ...Option.match(
          Arr.findFirst(inventory, (meta) => meta.name === "Toggle"),
          {
            onNone: () => ["Toggle: no record"],
            onSome: (toggle) =>
              Option.match(rowFor(toggle), {
                onNone: () => ["Toggle: no .agents/slop/COMPONENTS.md row"],
                onSome: (row) =>
                  row.notes.includes("busy toggle")
                    ? []
                    : ["Toggle: the row lost its busy state"],
              }),
          },
        ),
      ],
    },
  );

describe("Tier 1 inventory", () => {
  it("names files that exist", () => {
    const problems = Arr.flatMap(inventory, (meta) =>
      Arr.filter(
        [...meta.source, meta.docs, meta.example, ...meta.tests],
        (path) => !fileExists(path),
      ).map((path) => `${meta.name}: missing ${path}`),
    );

    expect(problems).toEqual([]);
  });

  it("points every row at an example that renders it", () => {
    const problems = [
      ...Arr.filter(
        Arr.map(inventory, (meta) => meta.name),
        (name) => EXAMPLE_COMPONENTS[name] === undefined,
      ).map((name) => `${name}: no example contract`),
      ...Arr.filter(
        R.keys(EXAMPLE_COMPONENTS),
        (name) => !Arr.some(inventory, (meta) => meta.name === name),
      ).map((name) => `${name}: example contract with no record`),
      ...Arr.flatMap(inventory, (meta) =>
        Arr.flatMap(EXAMPLE_COMPONENTS[meta.name] ?? [], (component) =>
          renders(sourceOf(meta.example), component)
            ? []
            : [`${meta.name}: ${meta.example} renders no <${component}>`],
        ),
      ),
    ];

    expect(problems).toEqual([]);
  });

  it("has at least one test for every row marked done", () => {
    const problems = Arr.filter(
      Arr.filter(inventory, (meta) => meta.status === "done"),
      (meta) => meta.tests.length === 0,
    ).map((meta) => `${meta.name}: done without a test`);

    expect(problems).toEqual([]);
  });

  it("names the channel a state control announces on", () => {
    const problems = Arr.flatMap(ANNOUNCED_STATES, announceProblems);

    expect(problems).toEqual([]);
  });

  it("does not narrow the alphabet the OTP core keeps", () => {
    expect(otpAlphabetProblems()).toEqual([]);
  });

  it("keeps the switch's pending state honest", () => {
    expect(switchPendingProblems()).toEqual([]);
  });

  it("records the tooltip's measured keyboard path", () => {
    expect(tooltipProblems()).toEqual([]);
  });

  it("records the headless action the runtime publishes, and the decline", () => {
    const notes = Option.getOrElse(
      Option.map(
        Arr.findFirst(tier1Rows(), (candidate) => candidate.name === "Buttons"),
        (row) => row.notes,
      ),
      () => "",
    );
    expect(notes).not.toContain("publishes no `Button`");
    expect(notes).toContain("@gpuix/react/button");
    expect(notes).toContain("evaluated and declined");

    const readme = sourceOf("README.md");
    expect(readme).toContain("./button");
    expect(readme).toContain("published (headless)");
    expect(readme).toContain("declined");
    expect(sourceOf("src/components/Button.tsx")).not.toContain(
      "publishes no `Button`",
    );
  });

  it("agrees with its .agents/slop/COMPONENTS.md row", () => {
    const problems = Arr.flatMap(inventory, (meta) =>
      Option.match(rowFor(meta), {
        onNone: () => [`${meta.name}: no .agents/slop/COMPONENTS.md row`],
        onSome: (row) => [
          ...(row.status === meta.status
            ? []
            : [
                `${meta.name}: row says ${row.status}, record says ${meta.status}`,
              ]),
          ...(row.support === meta.gpuixSupport
            ? []
            : [
                `${meta.name}: row says support ${row.support}, record says ${meta.gpuixSupport}`,
              ]),
        ],
      }),
    );

    expect(problems).toEqual([]);
  });

  it("has a record for every Tier 1 row that is no longer todo", () => {
    const problems = Arr.filter(
      Arr.filter(tier1Rows(), (row) => row.status !== "todo"),
      (row) => !Arr.some(inventory, (meta) => meta.name === row.name),
    ).map((row) => `${row.name}: row is ${row.status} with no record`);

    expect(problems).toEqual([]);
  });

  it("covers every Tier 1 row exactly once", () => {
    const rows = Arr.map(tier1Rows(), (row) => row.name);

    expect(duplicates(rows)).toEqual([]);
    expect(Arr.length(inventory)).toBe(Arr.length(rows));
    expect(
      Arr.filter(inventory, (meta) => !Option.isSome(rowFor(meta))).map(
        (meta) => `${meta.name}: record with no row`,
      ),
    ).toEqual([]);
  });

  it("has no duplicate names or docs pages", () => {
    expect([
      ...duplicates(Arr.map(inventory, (meta) => meta.name)),
      ...duplicates(Arr.map(inventory, (meta) => meta.docs)),
    ]).toEqual([]);
  });

  it("records limitations as an explicit array", () => {
    expect(
      Arr.filter(inventory, (meta) => !Array.isArray(meta.limitations)).map(
        (meta) => `${meta.name}: limitations is not an array`,
      ),
    ).toEqual([]);
  });

  it("does not deny a part the package exports", () => {
    const exported = HashSet.fromIterable(R.keys(primitiveExports));
    const problems = Arr.flatMap(inventory, (meta) =>
      Arr.map(
        Arr.filter(deniedParts(Arr.join(meta.limitations, " ")), (name) =>
          HashSet.has(exported, name),
        ),
        (name) =>
          `${meta.name}: says there is no ${name}, and the package exports it`,
      ),
    );

    expect(problems).toEqual([]);
  });
});
