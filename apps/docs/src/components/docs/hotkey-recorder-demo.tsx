/**
 * Browser preview for the Hotkey recorder page.
 *
 * The shipped control captures the next chord the reader presses and shows it
 * as keycaps; clearing is a real control beside it, not Backspace (the test
 * renderer emits no key event for it). The preview draws the three states — an
 * empty recorder, a bound chord, and the "Press keys…" listening state — and
 * records a real chord from the browser's own keys.
 */

import { useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

const PLACEHOLDER = "Click to record";

const Keycap = ({ children }: { readonly children: string }) => (
  <kbd className="gx-keycap">{children}</kbd>
);

function CapturedChord() {
  return (
    <span className="gx-hotkey-keys">
      <Keycap>⌘</Keycap>
      <Keycap>⇧</Keycap>
      <Keycap>P</Keycap>
    </span>
  );
}

export function HotkeyRecorderDemo() {
  const [recording, setRecording] = useState(false);
  const [value, setValue] = useState<string | null>("mod+shift+p");

  const clear = () => setValue(null);

  const capture = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!recording) return;
    event.preventDefault();
    if (event.key === "Escape") {
      setRecording(false);
      return;
    }
    if (event.key.length !== 1) return;
    setValue(`${event.key.toLowerCase()}`);
    setRecording(false);
  };

  return (
    <div className="gx-hotkey-scene">
      <div className="gx-hotkey-card">
        <p className="gx-hotkey-title">Toggle command palette</p>
        <div
          aria-label="Toggle command palette"
          className="gx-hotkey"
          data-recording={recording ? "" : undefined}
          onKeyDown={capture}
          onClick={() => setRecording((current) => !current)}
          role="button"
          tabIndex={0}
        >
          {recording ? (
            <span className="gx-hotkey-text">Press keys…</span>
          ) : value === null ? (
            <span className="gx-hotkey-text">{PLACEHOLDER}</span>
          ) : (
            <CapturedChord />
          )}
          {value === null ? null : (
            <button
              aria-label="Clear shortcut"
              className="gx-hotkey-clear"
              onClick={(event) => {
                event.stopPropagation();
                clear();
              }}
              type="button"
            >
              ✕
            </button>
          )}
        </div>
        <p className="gx-hotkey-note">
          {recording
            ? "Press a chord; Escape cancels."
            : value === null
              ? "Click the recorder, then press a chord."
              : "Clear is a control, not Backspace."}
        </p>
      </div>

      <div className="gx-hotkey-states" aria-label="Recorder states">
        <div className="gx-hotkey-state">
          <p className="gx-hotkey-state-label">empty</p>
          <div
            className="gx-hotkey"
            role="button"
            aria-label="Empty recorder"
            tabIndex={0}
          >
            <span className="gx-hotkey-text">{PLACEHOLDER}</span>
          </div>
        </div>
        <div className="gx-hotkey-state">
          <p className="gx-hotkey-state-label">bound</p>
          <div
            className="gx-hotkey"
            role="button"
            aria-label="Bound recorder"
            tabIndex={0}
          >
            <CapturedChord />
            <button
              aria-label="Clear shortcut"
              className="gx-hotkey-clear"
              type="button"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const hotkeyRecorderDemoSource = `import { useState } from "react";
import { HotkeyRecorder } from "@gpuixui/components";

export const PaletteChord = () => {
  const [hotkey, setHotkey] = useState<string | null>(null);

  return (
    <HotkeyRecorder
      label="Toggle command palette"
      value={hotkey}
      onChange={setHotkey}
    />
  );
};`;
