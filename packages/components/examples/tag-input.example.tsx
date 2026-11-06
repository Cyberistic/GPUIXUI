/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { TagInput, TagInputChip, TagInputField } from "../src/tag-input.js";

export const TagInputExample = () => {
  const [tags, setTags] = useState<ReadonlyArray<string>>(["design", "docs"]);

  return (
    <div style={{ width: 360 }}>
      <TagInput label="Tags" value={tags} onValueChange={setTags} max={5}>
        {tags.map((tag) => (
          <TagInputChip key={tag} value={tag} />
        ))}
        <TagInputField placeholder="Add a tag…" />
      </TagInput>
    </div>
  );
};
