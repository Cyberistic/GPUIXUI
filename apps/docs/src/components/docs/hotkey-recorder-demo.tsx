/**
 * Browser preview for the Hotkey recorder page.
 *
 * The shipped control captures the next chord the reader presses and shows it
 * as keycaps; clearing is a real control beside it, not Backspace (the test
 * renderer emits no key event for it). The preview records a real chord from
 * the browser's own keys through `chordOf` — the same `parseHotkey`,
 * `hasNonModifierKey` and `normalizeHotkey` the runtime path ends in — so ⌘⇧P
 * binds three keys instead of the letter the old drawing kept. Glyphs come from
 * `glyphsOf`, which is the component's own `formatSymbols`.
 */

import {
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import * as Option from "effect/Option";
import { chordOf, glyphsOf } from "./hotkey-chord";

const PLACEHOLDER = "Click to record";

const Keycap = ({ children }: { readonly children: string }) => (
  <kbd className="gx-keycap">{children}</kbd>
);

const Keys = ({ chord }: { readonly chord: string }) => (
  <span className="gx-hotkey-keys">
    {glyphsOf(chord).map((glyph, index) => (
      <Keycap key={index}>{glyph}</Keycap>
    ))}
  </span>
);

const BOUND = "mod+shift+p";

export function HotkeyRecorderDemo() {
  const [recording, setRecording] = useState(false);
  const [value, setValue] = useState<string | null>(BOUND);
  /** The modifiers being held, painted while the recorder waits for a key. */
  const [held, setHeld] = useState<string | null>(null);

  const stop = () => {
    setRecording(false);
    setHeld(null);
  };

  const capture = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!recording) return;
    event.preventDefault();
    if (event.key === "Escape") return stop();
    const chord = chordOf(event);
    if (Option.isSome(chord)) {
      setValue(chord.value);
      return stop();
    }
    // Only modifiers so far: show them and keep listening.
    setHeld(
      [
        event.metaKey ? "mod" : null,
        event.ctrlKey ? "ctrl" : null,
        event.altKey ? "alt" : null,
        event.shiftKey ? "shift" : null,
      ]
        .filter((part): part is string => part !== null)
        .join("+") || null,
    );
  };

  return (
    <div className="gx-hotkey-scene">
      <div className="gx-hotkey-card">
        <p className="gx-hotkey-title">Toggle command palette</p>
        <div
          aria-label="Toggle command palette"
          className="gx-hotkey"
          data-recording={recording ? "" : undefined}
          role="button"
          tabIndex={0}
          onClick={() => (recording ? stop() : setRecording(true))}
          onKeyDown={capture}
        >
          {recording ? (
            held === null ? (
              <span className="gx-hotkey-text">Press keys…</span>
            ) : (
              <Keys chord={held} />
            )
          ) : value === null ? (
            <span className="gx-hotkey-text">{PLACEHOLDER}</span>
          ) : (
            <Keys chord={value} />
          )}
          {value === null || recording ? null : (
            <button
              aria-label="Clear shortcut"
              className="gx-hotkey-clear"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setValue(null);
              }}
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
            aria-label="Empty recorder"
            className="gx-hotkey"
            role="button"
            tabIndex={0}
          >
            <span className="gx-hotkey-text">{PLACEHOLDER}</span>
          </div>
        </div>
        <div className="gx-hotkey-state">
          <p className="gx-hotkey-state-label">bound</p>
          <div
            aria-label="Bound recorder"
            className="gx-hotkey"
            role="button"
            tabIndex={0}
          >
            <Keys chord={BOUND} />
            <button aria-label="Clear shortcut" className="gx-hotkey-clear" type="button">
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
