/**
 * Inline edit example: rename a workspace where its name is shown.
 *
 * The caller owns the committed value; the component only owns the draft.
 * Pressing the other field while one is open is a real outside press, and moving
 * native focus away commits the draft even when the host sends no blur event.
 */

import { useState } from "react";
import { InlineEdit } from "../src/inline-edit.js";

/** A rename field beside an empty one that shows the placeholder. */
export const InlineEditExample = () => {
  const [name, setName] = useState("Untitled workspace");

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 16, width: 320 }}
    >
      <InlineEdit label="Workspace name" value={name} onCommit={setName} />
      <InlineEdit
        label="Project name"
        value=""
        placeholder="Name this project"
        onCommit={() => undefined}
      />
    </div>
  );
};
