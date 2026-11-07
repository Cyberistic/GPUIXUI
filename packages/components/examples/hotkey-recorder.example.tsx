/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { HotkeyRecorder } from "../src/hotkey-recorder.js";

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
