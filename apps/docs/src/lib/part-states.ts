/**
 * Every exported `<Part>State` interface in the component package (plan 622).
 *
 * The Component API page explains state-aware styling, so its vocabulary has to
 * match the parts. The sentence it used to carry claimed a fixed ten-field
 * vocabulary, while the package declares 25 state types with 27 distinct
 * fields, some part-specific and one imported from the headless runtime. This
 * parser is the evidence: it is pure so the page test can feed the real
 * sources, and the fixture test can prove the narrow contract it relies on.
 */

/** One exported `<Part>State` interface and the fields it declares. */
export interface PartState {
  readonly name: string;
  readonly file: string;
  readonly fields: ReadonlyArray<string>;
}

/** One source file offered to the parser. */
export interface StateSource {
  readonly path: string;
  readonly text: string;
}

const INTERFACE = /export interface (\w+State)\s*\{([^}]*)\}/g;
const FIELD = /readonly (\w+)\??:/g;

/** Top-level exported state interfaces, in source order. */
export const partStates = (
  sources: ReadonlyArray<StateSource>,
): ReadonlyArray<PartState> =>
  sources.flatMap((source) =>
    [...source.text.matchAll(INTERFACE)].flatMap((match) => {
      const name = match[1];
      const body = match[2];
      if (name === undefined || body === undefined) return [];
      return [
        {
          name,
          file: source.path,
          fields: [...body.matchAll(FIELD)].flatMap((field) =>
            field[1] === undefined ? [] : [field[1]],
          ),
        },
      ];
    }),
  );

/** The fields every named state type declares, flattened. */
export const allStateFields = (
  states: ReadonlyArray<PartState>,
): ReadonlySet<string> => new Set(states.flatMap((state) => state.fields));

/** The number of state types that declare a field. */
export const fieldFrequency = (
  states: ReadonlyArray<PartState>,
  field: string,
): number => states.filter((state) => state.fields.includes(field)).length;
