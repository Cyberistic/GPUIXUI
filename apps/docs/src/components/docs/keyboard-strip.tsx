import {
  keyboardContractFor,
  type KeyboardNote,
} from "../../lib/keyboard-contracts";

/**
 * The keys a component handles, printed on its page.
 *
 * `MISSION.md` asks every component page for its keyboard notes; the pages are
 * Markdown the site mounts or MDX it writes, so the strip is the site's, read
 * from the model whose guard holds it to the component's own modules. It stays
 * silent on a page whose author wrote its own `## Keyboard` section and on a
 * page no contract names — never a guess in either case.
 */
export function KeyboardStrip({
  url,
  sections,
}: {
  readonly url: string;
  /** The page's table of contents, so a written section wins. */
  readonly sections: readonly string[];
}) {
  const contract = keyboardContractFor(url);
  if (contract === undefined || sections.includes("#keyboard")) return null;

  const modules = contract.sources.map((source) => source.split("/").at(-1));

  return (
    <div
      className="not-prose my-4 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground"
      data-keyboard-contract={contract.url}
    >
      <p className="gx-eyebrow m-0">Keyboard</p>
      <dl className="m-0 mt-1.5 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1">
        {contract.notes.map((note) => (
          <Note key={note.keys.join("+")} note={note} />
        ))}
      </dl>
      {contract.also === undefined ? null : (
        <p className="m-0 mt-1.5">{contract.also}</p>
      )}
      <p className="m-0 mt-1.5">
        read from{" "}
        {modules.map((module, index) => (
          <span key={module}>
            {index > 0 ? ", " : null}
            <code className="text-foreground">{module}</code>
          </span>
        ))}
      </p>
    </div>
  );
}

function Note({ note }: { readonly note: KeyboardNote }) {
  return (
    <>
      <dt className="m-0 flex flex-wrap gap-1">
        {note.keys.map((key) => (
          <kbd
            className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground"
            key={key}
          >
            {key}
          </kbd>
        ))}
      </dt>
      <dd className="m-0">{note.action}</dd>
    </>
  );
}
