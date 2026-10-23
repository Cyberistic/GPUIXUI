/**
 * Browser preview for the Keyboard shortcuts page.
 *
 * The shipped sheet is display-only: a `role="list"` of groups, each a
 * `role="group"` named by its heading, of label-and-chord rows rendered as
 * platform keycaps. It registers no handler. The preview draws two groups with
 * the macOS glyphs the host resolves, and a separator drawn as a 1px element —
 * the runtime has one border colour per element, not a per-side border.
 */

const Keycap = ({ children }: { readonly children: string }) => (
  <kbd className="gx-keycap">{children}</kbd>
);

function Row({
  label,
  keys,
}: {
  readonly label: string;
  readonly keys: ReadonlyArray<string>;
}) {
  return (
    <div className="gx-shortcuts-row">
      <span className="gx-shortcuts-label">{label}</span>
      <span className="gx-shortcuts-keys">
        {keys.map((key) => (
          <Keycap key={key}>{key}</Keycap>
        ))}
      </span>
    </div>
  );
}

const file: ReadonlyArray<{
  readonly label: string;
  readonly keys: ReadonlyArray<string>;
}> = [
  { label: "New file", keys: ["⌘", "N"] },
  { label: "Open file", keys: ["⌘", "O"] },
  { label: "Save", keys: ["⌘", "S"] },
];

const view: ReadonlyArray<{
  readonly label: string;
  readonly keys: ReadonlyArray<string>;
}> = [
  { label: "Toggle sidebar", keys: ["⌘", "B"] },
  { label: "Command palette", keys: ["⌘", "K"] },
];

function Group({
  heading,
  rows,
}: {
  readonly heading: string;
  readonly rows: ReadonlyArray<{
    readonly label: string;
    readonly keys: ReadonlyArray<string>;
  }>;
}) {
  return (
    <div className="gx-shortcuts-group" role="group" aria-label={heading}>
      <p className="gx-shortcuts-heading" role="heading" aria-level={3}>
        {heading}
      </p>
      {rows.map((row, index) => (
        <div className="gx-shortcuts-row-wrap" key={row.label}>
          <Row {...row} />
          {index === rows.length - 1 ? null : (
            <span className="gx-shortcuts-separator" role="separator" />
          )}
        </div>
      ))}
    </div>
  );
}

export function KeyboardShortcutsDemo() {
  return (
    <div className="gx-shortcuts">
      <div
        className="gx-shortcuts-card"
        role="list"
        aria-label="Editor shortcuts"
      >
        <Group heading="File" rows={file} />
        <Group heading="View" rows={view} />
      </div>
      <p className="gx-shortcuts-note">
        Display-only: a row documents a chord, it does not register a handler.
        Rows are separated by 1px elements rather than borders.
      </p>
    </div>
  );
}

export const keyboardShortcutsDemoSource = `import {
  KeyboardShortcut,
  KeyboardShortcuts,
  KeyboardShortcutsGroup,
} from "@gpuixui/components";

<KeyboardShortcuts label="Editor shortcuts">
  <KeyboardShortcutsGroup label="File">
    <KeyboardShortcut label="New file" accelerator="mod+n" />
    <KeyboardShortcut label="Open file" accelerator="mod+o" />
    <KeyboardShortcut label="Save" accelerator="mod+s" />
  </KeyboardShortcutsGroup>
  <KeyboardShortcutsGroup label="View">
    <KeyboardShortcut label="Toggle sidebar" accelerator="mod+b" />
    <KeyboardShortcut label="Command palette" accelerator="mod+k" />
  </KeyboardShortcutsGroup>
</KeyboardShortcuts>;`;
