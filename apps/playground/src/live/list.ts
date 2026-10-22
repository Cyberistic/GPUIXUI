/**
 * The rows the `list-lifecycle` probe paints.
 *
 * Kept native-free so the premise is testable on a host with no binding: the
 * arrow path counts enabled rows, so the disabled row's position is what makes
 * "down from grace lands on linus" a measurement, and the type-ahead step needs
 * a letter that names exactly one row. `list.test.ts` guards both.
 */

/** One list row: its selection value, painted title and input state. */
export interface ListRow {
  readonly value: string;
  readonly title: string;
  readonly disabled?: boolean;
}

/** The rows, in keyboard order; `alan` is the disabled row. */
export const LIST_ROWS: ReadonlyArray<ListRow> = [
  { value: "ada", title: "Ada Lovelace" },
  { value: "grace", title: "Grace Hopper" },
  { value: "alan", title: "Alan Turing", disabled: true },
  { value: "linus", title: "Linus Torvalds" },
  { value: "margaret", title: "Margaret Hamilton" },
];

/** The letter the type-ahead step types; it must name only `grace`. */
export const TYPEAHEAD_LETTER = "g";
