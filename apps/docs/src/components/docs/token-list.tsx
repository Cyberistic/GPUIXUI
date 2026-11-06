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
