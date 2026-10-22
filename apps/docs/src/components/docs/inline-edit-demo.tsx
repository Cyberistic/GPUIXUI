import { useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  beginEdit,
  cancelEdit,
  commitEdit,
  editDraft,
  nameVerdict,
  renameOf,
  type FinishReason,
  type Rename,
} from "./inline-edit-preview";

/**
 * Browser previews for the Inline edit page.
 *
 * The shipped control swaps a `role="button"` display for a real `<input>`; the
 * library renders through GPUix, so the preview mirrors the contract with HTML
 * and says so. What a picture cannot show is the half this page is about: one
 * finish per edit (Enter can arrive twice), no commit for an unchanged draft,
 * Escape as the only discard, a blur commit that leaves the focus where the
 * reader put it, and an app that may refuse a value the component accepted.
 *
 * The rules live in `inline-edit-preview.ts` so a test can fail on them; this
 * file only renders them. The Code tab always shows the native usage.
 */

/** The display half: a `sm` row that washes `accent` under the pointer. */
const Display = ({
  disabled = false,
  empty,
  onStart,
  value,
}: {
  readonly disabled?: boolean;
  readonly empty: boolean;
  readonly onStart: () => void;
  readonly value: string;
}) => (
  <button
    className="gx-inline-display"
    data-disabled={disabled ? "" : undefined}
    disabled={disabled}
    onClick={onStart}
    type="button"
  >
    <span data-empty={empty ? "" : undefined}>{empty ? "—" : value}</span>
  </button>
);

/** The edit half: the input the display swaps to. */
const Editor = ({
  draft,
  label,
  onBlur,
  onChange,
  onKeyDown,
}: {
  readonly draft: string;
  readonly label: string;
  readonly onBlur: () => void;
  readonly onChange: (draft: string) => void;
  readonly onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
}) => (
  <input
    aria-label={label}
    autoFocus
    className="gx-inline-input"
    onBlur={onBlur}
    onChange={(event) => onChange(event.target.value)}
    onKeyDown={onKeyDown}
    value={draft}
  />
);

/** A project rename whose save the app gates on its own name rule. */
export const InlineEditWorkflow = () => {
  const [rename, setRename] = useState<Rename>(() => renameOf("Docs site"));
  const [saved, setSaved] = useState("Docs site");
  // The app's refusal message; empty means the last commit was accepted.
  const [refused, setRefused] = useState("");

  const finish = (reason: FinishReason): void => {
    const next = commitEdit(rename, reason);
    setRename(next);
    if (next.commits === rename.commits) return;
    const verdict = nameVerdict(next.value);
    if (verdict.ok) {
      setSaved(next.value);
      setRefused("");
      return;
    }
    // The component reported the commit; this app keeps the name it had, so the
    // display is re-seeded with the caller's value on the next render.
    setRename({ ...next, value: saved, draft: saved });
    setRefused(verdict.message ?? "");
  };

  const current = rename.editing ? (
    <Editor
      draft={rename.draft}
      label="Project name"
      onBlur={() => finish("blur")}
      onChange={(draft) => setRename((state) => editDraft(state, draft))}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          // Enter also fires `submit` in the native field; one finish per edit.
          event.preventDefault();
          finish("enter");
        } else if (event.key === "Escape") {
          event.preventDefault();
          setRename((state) => cancelEdit(state));
        }
      }}
    />
  ) : (
    <Display
      empty={saved === ""}
      onStart={() =>
        setRename((state) => beginEdit({ ...state, value: saved }))
      }
      value={saved}
    />
  );

  return (
    <div className="gx-demo-column gx-inline-scene">
      <span className="gx-demo-label">Project name</span>
      {current}
      <span className="gx-inline-readout" role="status">
        {`reported commits ${rename.commits} · discards ${rename.discards} · focus ${rename.focus}`}
      </span>
      {refused === "" ? null : (
        <span className="gx-inline-refusal">{refused}</span>
      )}
      <span className="gx-inline-hint">
        {`The component commits an empty name; this app refuses one. Committed: "${saved}".`}
      </span>
    </div>
  );
};

/** The states the control draws, side by side. */
export const InlineEditStates = () => {
  const [controlled, setControlled] = useState(false);

  return (
    <div className="gx-inline-grid">
      <div className="gx-inline-tile">
        <span className="gx-demo-label">At rest</span>
        <Display empty={false} onStart={() => {}} value="Design system" />
      </div>
      <div className="gx-inline-tile">
        <span className="gx-demo-label">Empty value</span>
        <Display empty onStart={() => {}} value="" />
        <span className="gx-inline-hint">The placeholder is muted text.</span>
      </div>
      <div className="gx-inline-tile">
        <span className="gx-demo-label">Editing</span>
        <Editor
          draft="Design system"
          label="Editing value"
          onBlur={() => {}}
          onChange={() => {}}
          onKeyDown={() => {}}
        />
      </div>
      <div className="gx-inline-tile">
        <span className="gx-demo-label">Disabled</span>
        <Display
          disabled
          empty={false}
          onStart={() => {}}
          value="Design system"
        />
        <span className="gx-inline-hint">
          Out of the tab order; the display ignores activation.
        </span>
      </div>
      <div className="gx-inline-tile">
        <span className="gx-demo-label">Controlled edit state</span>
        {controlled ? (
          <Editor
            draft="Design system"
            label="Controlled value"
            onBlur={() => setControlled(false)}
            onChange={() => {}}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setControlled(false);
              }
            }}
          />
        ) : (
          <Display empty={false} onStart={() => {}} value="Design system" />
        )}
        <button
          className="gx-btn gx-btn-outline gx-btn-sm"
          onClick={() => setControlled(true)}
          type="button"
        >
          Edit from the app
        </button>
        <span className="gx-inline-hint">
          {`The app owns `}
          <code>editing</code>
          {`; the control only reports `}
          <code>onEditingChange</code>.
        </span>
      </div>
    </div>
  );
};

export const inlineEditWorkflowSource = `import { InlineEdit } from "@gpuixui/components";
import { useState } from "react";

export const RenameProject = () => {
  const [name, setName] = useState("Docs site");

  return (
    <InlineEdit
      label="Project name"
      onCommit={(next) => {
        // The component reported a changed value; the app decides what to save.
        setName(next);
      }}
      value={name}
    />
  );
};`;

export const inlineEditStatesSource = `import { InlineEdit } from "@gpuixui/components";

<>
  <InlineEdit label="At rest" onCommit={() => {}} value="Design system" />
  {/* An empty string is a valid value; the placeholder is muted text. */}
  <InlineEdit label="Empty" onCommit={() => {}} value="" />
  {/* The caller can own the edit state instead of the control. */}
  <InlineEdit
    editing={editing}
    label="Controlled"
    onCommit={() => {}}
    onEditingChange={setEditing}
    value="Design system"
  />
  {/* Disabled: no tab stop, and the display refuses activation. */}
  <InlineEdit
    disabled
    label="Disabled"
    onCommit={() => {}}
    value="Design system"
  />
</>;`;
