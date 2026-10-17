/**
 * Keyboard shortcuts example: the same editor chords with macOS and Windows
 * glyphs, which is what the docs platform toggle does. `mod` is the
 * platform-adaptive token; `ctrl` names the Control key everywhere.
 */

import {
  KeyboardShortcut,
  KeyboardShortcuts,
  KeyboardShortcutsGroup,
} from "../src/keyboard-shortcuts.js";

/** A cheat sheet rendered with one platform's keycaps. */
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

/** An editor cheat sheet, shown on both platforms. */
export const KeyboardShortcutsExample = () => (
  <div style={{ display: "flex", flexDirection: "row", gap: 48 }}>
    <Sheet platform="darwin" label="Editor shortcuts, macOS" />
    <Sheet platform="win32" label="Editor shortcuts, Windows" />
  </div>
);
