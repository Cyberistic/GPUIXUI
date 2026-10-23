import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

/**
 * Browser preview for the DropZone page.
 *
 * The native zone reports a drop through the runtime's `onFileDrop` and offers
 * the caller's pick; the preview accepts a browser drop and opens the browser's
 * own file picker. The highlight is the component's: the pointer wash, not a
 * drag-over state — 0.11.0 has no drag-enter event, and the preview does not
 * invent one.
 */

const namesOf = (files: FileList | null): ReadonlyArray<string> =>
  files === null ? [] : Array.from(files, (file) => file.name);

export const DropZoneDemo = () => {
  const [received, setReceived] = useState<ReadonlyArray<string>>([]);
  const [disabled, setDisabled] = useState(false);
  const picker = useRef<HTMLInputElement | null>(null);

  const accept = (names: ReadonlyArray<string>): void => {
    if (!disabled && names.length > 0) {
      setReceived((current) => [...current, ...names]);
    }
  };

  return (
    <div className="gx-demo-column gx-drop-demo">
      <div
        aria-label="Drop files here"
        className="gx-drop"
        data-disabled={disabled ? "" : undefined}
        onDragOver={(event: DragEvent<HTMLDivElement>) => {
          if (!disabled) event.preventDefault();
        }}
        onDrop={(event: DragEvent<HTMLDivElement>) => {
          if (disabled) return;
          event.preventDefault();
          accept(namesOf(event.dataTransfer.files));
        }}
        role="group"
      >
        <span aria-hidden="true" className="gx-drop-mark">
          ↑
        </span>
        <p className="gx-drop-label">Drop files here</p>
        <p className="gx-drop-description">or pick them from the platform</p>
        <button
          className="gx-btn gx-btn-secondary gx-btn-sm"
          disabled={disabled}
          onClick={() => picker.current?.click()}
          type="button"
        >
          Choose files
        </button>
      </div>
      <input
        hidden
        multiple
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          accept(namesOf(event.target.files));
          event.target.value = "";
        }}
        ref={picker}
        type="file"
      />
      <p className="gx-drop-readout" role="status">
        {received.length === 0
          ? "Nothing dropped yet"
          : `Received ${received.join(", ")}`}
      </p>
      <button
        aria-pressed={disabled}
        className="gx-btn gx-btn-outline gx-btn-sm"
        onClick={() => {
          setDisabled((current) => !current);
          setReceived([]);
        }}
        type="button"
      >
        {disabled ? "Enable the zone" : "Disable the zone"}
      </button>
    </div>
  );
};

export const dropZoneDemoSource = `import { DropZone } from "@gpuixui/media";

<DropZone
  label="Drop files here"
  description="or pick them from the platform"
  onDrop={({ files }) => addFiles(files.map((file) => file.path))}
  onPick={() => renderer.promptForPaths({ allowMultiple: true })}
/>;`;
