/**
 * Tag input example: a tag editor with a cap.
 *
 * The caller owns the tokens; the chips are rendered from that list, so the
 * component holds no value the caller cannot see.
 */

import { useState } from "react";
import { TagInput, TagInputChip, TagInputField } from "../src/tag-input.js";

/** A five-tag editor. */
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
