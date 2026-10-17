/**
 * SearchInput example: filter a file list as you type.
 *
 * The field owns the text and reports every keystroke; the list is derived from
 * that query. There is no debounce in the component — a real query would debounce
 * the consumer's effect, which this in-memory example does not need.
 */

import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import { SearchInput } from "../src/search-input.js";

const files: ReadonlyArray<string> = [
  "components/src/card.tsx",
  "components/src/list.tsx",
  "components/src/dialog.tsx",
  "components/src/combobox.tsx",
  "components/docs/card.mdx",
  "components/examples/list.example.tsx",
];

/** A filterable file list. */
export const SearchInputExample = () => {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("none");

  const needle = Str.toLowerCase(Str.trim(query));
  const matches = Arr.filter(files, (file) =>
    Str.includes(needle)(Str.toLowerCase(file)),
  );

  return (
    <Card style={{ maxWidth: 460 }}>
      <CardHeader>
        <CardTitle>Find a file</CardTitle>
        <CardDescription>
          {matches.length} of {files.length} · submitted: {submitted}
        </CardDescription>
      </CardHeader>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
          paddingTop: 0,
        }}
      >
        <SearchInput
          testId="file-filter"
          placeholder="Filter files…"
          onValueChange={setQuery}
          onSubmit={setSubmitted}
          onClear={() => setSubmitted("none")}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing["2xs"],
          }}
        >
          {Arr.map(matches, (file) => (
            <text
              key={file}
              style={{
                ...textStyle(theme, "caption"),
                color: theme.colors.mutedForeground,
              }}
            >
              {file}
            </text>
          ))}
          {matches.length === 0 ? (
            <text
              style={{
                ...textStyle(theme, "caption"),
                color: theme.colors.mutedForeground,
              }}
            >
              No file matches that search.
            </text>
          ) : null}
        </div>
      </div>
    </Card>
  );
};
