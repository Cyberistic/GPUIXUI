/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { InlineEdit } from "../src/inline-edit.js";

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
