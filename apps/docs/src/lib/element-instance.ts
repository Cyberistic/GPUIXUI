/**
 * The `ref` contract and the element instance it receives (plan 624).
 *
 * Every host part's props type extends the runtime's `Props`, so the generated
 * props table repeats a `ref?` row on every component page and no page explained
 * it. The rows below are the one authored copy — the *meaning* of each instance
 * member — and `instanceViolations` compares them with the installed
 * `@gpuix/react` declarations in both directions, so a dependency upgrade that
 * adds, renames or retypes a member fails the docs suite by name instead of
 * leaving the page quietly wrong.
 */

/** One member of the `Instance` interface the runtime hands to a ref. */
export interface InstanceMember {
  readonly name: string;
  readonly type: string;
  readonly optional: boolean;
  /** What the member is for. Authored; every other field is guarded. */
  readonly summary: string;
}

/** The body of the first `export interface <name> {` in the text. */
const interfaceBody = (declarations: string, name: string): string => {
  const start = declarations.indexOf(`export interface ${name} `);
  if (start === -1) return "";
  const open = declarations.indexOf("{", start);
  const close = declarations.indexOf("}", open);
  if (open === -1 || close === -1) return "";
  return declarations.slice(open + 1, close);
};

/** One declaration line's name, type and optionality, or `undefined`. */
const parseMember = (
  line: string,
): Omit<InstanceMember, "summary"> | undefined => {
  const method = /^\s*([A-Za-z][A-Za-z0-9]*)(\?)?\(\)\s*:\s*([^;]+);?\s*$/.exec(
    line,
  );
  if (method !== null) {
    const [, name, optional, returns] = method;
    return name === undefined || returns === undefined
      ? undefined
      : { name, type: `() => ${returns.trim()}`, optional: optional === "?" };
  }
  const field = /^\s*([A-Za-z][A-Za-z0-9]*)(\?)?\s*:\s*([^;]+);?\s*$/.exec(
    line,
  );
  if (field === null) return undefined;
  const [, name, optional, type] = field;
  return name === undefined || type === undefined
    ? undefined
    : { name, type: type.trim(), optional: optional === "?" };
};

/** The members `export interface Instance` declares, in source order. */
export const declaredInstanceMembers = (
  declarations: string,
): ReadonlyArray<Omit<InstanceMember, "summary">> =>
  interfaceBody(declarations, "Instance")
    .split("\n")
    .flatMap((line) => {
      const member = parseMember(line);
      return member === undefined ? [] : [member];
    });

/** The `ref` declaration inside an interface, e.g. `Ref<PublicInstance>`. */
export const refPropType = (
  declarations: string,
  name = "Props",
): string | undefined =>
  /^\s*ref\?:\s*([^;]+);?\s*$/m
    .exec(interfaceBody(declarations, name))?.[1]
    ?.trim();

/** `true` when `PublicInstance` is still the exported alias of `Instance`. */
export const publicInstanceIsInstance = (declarations: string): boolean =>
  /^\s*export type PublicInstance = Instance;\s*$/m.test(declarations);

/** The rows the page renders, in the runtime's declaration order. */
export const instanceRows: ReadonlyArray<InstanceMember> = [
  {
    name: "id",
    type: "number",
    optional: false,
    summary:
      "The runtime's element id. `focusElement`, the automation locators and the scroll APIs take it.",
  },
  {
    name: "type",
    type: "ElementType",
    optional: false,
    summary:
      "The host element type — `div`, `text`, `input`, and so on. The width of the runtime's element union.",
  },
  {
    name: "props",
    type: "Props",
    optional: false,
    summary: "The props the host element was created with.",
  },
  {
    name: "scrollIntoView",
    type: "() => void",
    optional: true,
    summary:
      "Asks the renderer to scroll the element into view. The reconciler attaches it; the renderer method is optional, so treat the call as best effort.",
  },
];

/**
 * Names the ways the page can go stale: a member the runtime added, removed or
 * retyped without the table following, an authored row the runtime no longer
 * declares, and a lost `PublicInstance` alias. An empty array is the only
 * honest state.
 */
export const instanceViolations = (input: {
  readonly declarations: string;
  readonly rows: ReadonlyArray<InstanceMember>;
}): ReadonlyArray<string> => {
  const declared = declaredInstanceMembers(input.declarations);
  const missing = declared
    .filter((member) => !input.rows.some((row) => row.name === member.name))
    .map((member) => `Instance.${member.name} is declared but not documented`);
  const orphaned = input.rows
    .filter((row) => !declared.some((member) => member.name === row.name))
    .map((row) => `Instance.${row.name} is documented but not declared`);
  const changed = input.rows.flatMap((row) => {
    const member = declared.find((candidate) => candidate.name === row.name);
    if (member === undefined) return [];
    return member.type === row.type && member.optional === row.optional
      ? []
      : [
          `Instance.${row.name} is ${member.type}${member.optional ? "?" : ""}, documented as ${row.type}${row.optional ? "?" : ""}`,
        ];
  });
  const alias = publicInstanceIsInstance(input.declarations)
    ? []
    : ["PublicInstance is not the alias of Instance any more"];
  return [...missing, ...orphaned, ...changed, ...alias];
};
