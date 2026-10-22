/**
 * StatusBar example: a branch/position group on the left, encoding and a
 * destructive error count on the right.
 */

import { StatusBar } from "../src/status-bar/status-bar.js";

/** The editor's bottom status bar. */
export const StatusBarExample = () => (
  <StatusBar
    label="Editor status"
    left={[
      { id: "branch", label: "main" },
      { id: "position", label: "Ln 12, Col 4" },
    ]}
    right={[
      { id: "encoding", label: "UTF-8" },
      { id: "errors", label: "3 errors", tone: "destructive" },
      { id: "lint", label: "Lint passed", tone: "success" },
    ]}
  />
);
