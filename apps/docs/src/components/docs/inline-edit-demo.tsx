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

export const InlineEditWorkflow = () => {
  const [rename, setRename] = useState<Rename>(() => renameOf("Docs site"));
  const [saved, setSaved] = useState("Docs site");

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
      <div className="gx-inline-slot">{current}</div>
      <span className="gx-inline-readout" role="status">
        {`reported commits ${rename.commits} · discards ${rename.discards} · focus ${rename.focus}`}
      </span>
      {}
      <span className="gx-inline-refusal">{refused}</span>
      <span className="gx-inline-hint">{`Committed: "${saved}"`}</span>
    </div>
  );
};

export const InlineEditStates = () => {
  const [controlled, setControlled] = useState(false);

  return (
    <div className="gx-inline-grid">
      <div className="gx-inline-tile">
        <span className="gx-demo-label">At rest</span>
        <div className="gx-inline-slot">
          <Display empty={false} onStart={() => {}} value="Design system" />
        </div>
      </div>
      <div className="gx-inline-tile">
        <span className="gx-demo-label">Empty value</span>
        <div className="gx-inline-slot">
          <Display empty onStart={() => {}} value="" />
        </div>
      </div>
      <div className="gx-inline-tile">
        <span className="gx-demo-label">Editing</span>
        <div className="gx-inline-slot">
          <Editor
            draft="Design system"
            label="Editing value"
            onBlur={() => {}}
            onChange={() => {}}
            onKeyDown={() => {}}
          />
        </div>
      </div>
      <div className="gx-inline-tile">
        <span className="gx-demo-label">Disabled</span>
        <div className="gx-inline-slot">
          <Display
            disabled
            empty={false}
            onStart={() => {}}
            value="Design system"
          />
        </div>
      </div>
      <div className="gx-inline-tile">
        <span className="gx-demo-label">Controlled edit state</span>
        <div className="gx-inline-slot">
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
        </div>
        <button
          className="gx-btn gx-btn-outline gx-btn-sm"
          onClick={() => setControlled(true)}
          type="button"
        >
          Edit from the app
        </button>
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
