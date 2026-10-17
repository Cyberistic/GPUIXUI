/**
 * The executable form of the props-type contract a component package must
 * satisfy (plan 411 §4, pinned by `type-table.test.ts`): the type is exported
 * from a real file, every public prop carries tsdoc text, an optional prop uses
 * `?`, and a prop that must not appear on the site carries `@internal`.
 *
 * No page renders this type. It exists so the contract fails a test instead of
 * a component page.
 */
export interface FixtureProps {
  /** The visible label. */
  readonly label: string;
  /** Optional; the table must mark it optional. */
  readonly tone?: "calm" | "loud";
  /** @internal */
  readonly internal: string;
}
