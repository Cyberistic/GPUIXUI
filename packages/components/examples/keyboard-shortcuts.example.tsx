/** @jsxImportSource @gpuix/react */
import {
  KeyboardShortcut,
  KeyboardShortcuts,
  KeyboardShortcutsGroup,
} from "../src/keyboard-shortcuts.js";

const Sheet = ({
  platform,
  label,
}: {
  readonly platform: "darwin" | "win32";
  readonly label: string;
}) => (
  <KeyboardShortcuts label={label} style={{ width: 320 }}>
    <KeyboardShortcutsGroup label="File">
      <KeyboardShortcut
        label="New file"
        accelerator="mod+n"
        platform={platform}
      />
      <KeyboardShortcut label="Save" accelerator="mod+s" platform={platform} />
      <KeyboardShortcut
        label="Command palette"
        accelerator="mod+shift+p"
        platform={platform}
      />
    </KeyboardShortcutsGroup>
    <KeyboardShortcutsGroup label="Navigation">
      <KeyboardShortcut
        label="Go to line"
        accelerator="ctrl+g"
        platform={platform}
      />
    </KeyboardShortcutsGroup>
  </KeyboardShortcuts>
);

export const KeyboardShortcutsExample = () => (
  <div style={{ display: "flex", flexDirection: "row", gap: 48 }}>
    <Sheet platform="darwin" label="Editor shortcuts, macOS" />
    <Sheet platform="win32" label="Editor shortcuts, Windows" />
  </div>
);
