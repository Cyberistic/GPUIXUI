/**
 * A list of token names, rendered as code spans.
 *
 * A page that names the roles or surfaces a contract measures reads them from
 * the package rather than typing them: a literal list is one table edit away
 * from naming a set the library no longer runs, and a guard that catches it
 * only reports the drift after the fact. `TokenList` renders the array it is
 * given, so a table that grows reaches every page that mounts it.
 */
export function TokenList({
  names,
}: {
  readonly names: ReadonlyArray<string>;
}) {
  return (
    <>
      {names.map((name, index) => (
        <span key={name}>
          {index === 0 ? null : ", "}
          <code>{name}</code>
        </span>
      ))}
    </>
  );
}
