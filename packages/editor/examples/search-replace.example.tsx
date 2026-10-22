/**
 * SearchReplace example: a find-and-replace bar over a controlled text.
 *
 * The bar edits the text through `onValueChange`; the example holds the value
 * and mirrors it into a read-only field so the replaced text is visible beside
 * the bar.
 */

import { useState } from "react";
import { SearchReplace } from "../src/search/search-replace.js";

const text = "The quick brown fox jumps over the lazy dog.";

/** A find-and-replace bar over a sentence, with the result mirrored. */
export const SearchReplaceExample = () => {
  const [value, setValue] = useState(text);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SearchReplace value={value} onValueChange={setValue} />
      <input testId="search-replace-example-mirror" value={value} readOnly />
    </div>
  );
};
