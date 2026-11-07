/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { SearchReplace } from "../src/search/search-replace.js";

const text = "The quick brown fox jumps over the lazy dog.";

export const SearchReplaceExample = () => {
  const [value, setValue] = useState(text);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SearchReplace value={value} onValueChange={setValue} />
      <input testId="search-replace-example-mirror" value={value} readOnly />
    </div>
  );
};
