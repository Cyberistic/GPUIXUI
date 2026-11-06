export interface ListRow {
  readonly value: string;
  readonly title: string;
  readonly disabled?: boolean;
}

export const LIST_ROWS: ReadonlyArray<ListRow> = [
  { value: "ada", title: "Ada Lovelace" },
  { value: "grace", title: "Grace Hopper" },
  { value: "alan", title: "Alan Turing", disabled: true },
  { value: "linus", title: "Linus Torvalds" },
  { value: "margaret", title: "Margaret Hamilton" },
];

export const TYPEAHEAD_LETTER = "g";
