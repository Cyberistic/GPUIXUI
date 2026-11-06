/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { DropZone } from "../src/drop-zone.js";

export const DropZoneExample = () => {
  const [names, setNames] = useState<ReadonlyArray<string>>([]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        maxWidth: 420,
      }}
    >
      <DropZone
        label="Drop files here"
        description="or pick them from the platform"
        onDrop={({ files }) => setNames(files.map((file) => file.name))}
        onPick={() => undefined}
      />
      {names.length === 0 ? null : (
        <text testId="drop-names">{names.join(", ")}</text>
      )}
    </div>
  );
};
