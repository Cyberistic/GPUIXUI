/**
 * Hotkey recorder example: bind the command-palette chord.
 *
 * The bound value is an accelerator string, the same grammar the shortcut
 * display reads, so the two views are always consistent.
 */

import { useState } from "react";
import { HotkeyRecorder } from "../src/hotkey-recorder.js";

/** One binding, shown as the accelerator string the app would store. */
export const HotkeyRecorderExample = () => {
  const [hotkey, setHotkey] = useState<string | null>("mod+k");

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 12, width: 320 }}
    >
      <HotkeyRecorder
        label="Toggle command palette"
        value={hotkey}
        onChange={setHotkey}
      />
      <text>{hotkey === null ? "Unbound" : `Stored as ${hotkey}`}</text>
    </div>
  );
};
