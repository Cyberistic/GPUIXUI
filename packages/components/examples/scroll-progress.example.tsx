/**
 * ScrollProgress example: a bounded settings list with a reading line.
 *
 * The list is taller than the box on purpose: the line starts empty, fills as
 * the reader moves, and reaches the end exactly when the last row does. The
 * second reader puts the line on the top edge, which is where a page-level
 * reading usually sits.
 */

import { ScrollProgress } from "../src/scroll-progress.js";
import { useTheme } from "../src/internal/theme.js";

const settings = [
  "Launch at login",
  "Check for updates",
  "Send diagnostics",
  "Share usage statistics",
  "Keep a local history",
  "Hide the dock icon",
  "Follow the system theme",
  "Reduce transparency",
  "Show scrollbars",
  "Confirm destructive actions",
  "Autosave drafts",
  "Restore the last workspace",
];

const rows = (prefix: string) =>
  settings.map((setting, index) => (
    <div
      key={setting}
      testId={`${prefix}-row-${index}`}
      style={{ height: 28, paddingLeft: 8 }}
    >
      <text>{setting}</text>
    </div>
  ));

/** A bottom reading line and a top one over the same list. */
export const ScrollProgressExample = () => {
  const theme = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "row", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <text>Settings</text>
        <ScrollProgress
          testId="example-progress"
          label="Settings read"
          style={{ height: 180, width: 280 }}
        >
          {rows("bottom")}
        </ScrollProgress>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <text>Top edge</text>
        <ScrollProgress
          testId="example-progress-top"
          label="Settings read, top line"
          side="top"
          color={theme.colors.primary}
          style={{ height: 180, width: 280 }}
        >
          {rows("top")}
        </ScrollProgress>
      </div>
    </div>
  );
};
