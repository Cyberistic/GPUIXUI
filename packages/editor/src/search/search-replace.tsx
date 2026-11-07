/** @jsxImportSource @gpuix/react */
import type { KeyEvent } from "@gpuix/react";
import { Button, Input, Toggle } from "@gpuixui/primitives";
import { cn } from "@gpuixui/tw";
import { useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import { useState } from "react";
import { findRanges, matchReadout, replaceAll } from "./logic.js";
import { recipeStyle } from "../internal/recipe.js";
import { draftOf, labelOf } from "../internal/text.js";

const SEARCH_ROOT = "flex flex-row items-center gap-2 flex-wrap";

const FIND_NAME = "Find";
const REPLACE_FIELD_NAME = "Replace with";
const REPLACE_NAME = "Replace";
const REPLACE_ALL_NAME = "Replace all";
const NEXT_NAME = "Next match";
const PREVIOUS_NAME = "Previous match";

export interface SearchReplaceProps {
  readonly value: string;

  readonly onValueChange: (value: string) => void;

  readonly placeholder?: string;

  readonly replacePlaceholder?: string;

  readonly findLabel?: string;

  readonly replaceFieldLabel?: string;

  readonly replaceLabel?: string;

  readonly replaceAllLabel?: string;

  readonly nextLabel?: string;

  readonly previousLabel?: string;

  readonly disabled?: boolean;

  readonly className?: string;
  readonly testId?: string;
}

export const SearchReplace = ({
  value,
  onValueChange,
  placeholder = "Find",
  replacePlaceholder = "Replace with",
  findLabel,
  replaceFieldLabel,
  replaceLabel,
  replaceAllLabel,
  nextLabel,
  previousLabel,
  disabled = false,
  className,
  testId = "search-replace",
}: SearchReplaceProps) => {
  const theme = useTheme();

  const findName = labelOf(findLabel, FIND_NAME);
  const replaceFieldName = labelOf(replaceFieldLabel, REPLACE_FIELD_NAME);
  const replaceName = labelOf(replaceLabel, REPLACE_NAME);
  const replaceAllName = labelOf(replaceAllLabel, REPLACE_ALL_NAME);
  const nextName = labelOf(nextLabel, NEXT_NAME);
  const previousName = labelOf(previousLabel, PREVIOUS_NAME);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [matchCase, setMatchCase] = useState(true);
  const [wholeWord, setWholeWord] = useState(false);

  const document = draftOf(value);
  const options = { caseSensitive: matchCase, wholeWord };
  const ranges = findRanges(document, query, options);
  const count = ranges.length;
  const active = count === 0 ? 0 : Math.min(activeIndex, count - 1);

  const readout = matchReadout(query, active, count);

  const go = (step: 1 | -1): void => {
    if (disabled || count === 0) return;
    setActiveIndex((active + step + count) % count);
  };

  const changeQuery = (next: string): void => {
    setQuery(next);
    setActiveIndex(0);
  };

  const changeMatchCase = (next: boolean): void => {
    setMatchCase(next);
    setActiveIndex(0);
  };

  const changeWholeWord = (next: boolean): void => {
    setWholeWord(next);
    setActiveIndex(0);
  };

  const replaceOne = (): void => {
    if (disabled || count === 0) return;
    const range = Arr.getUnsafe(ranges, active);
    onValueChange(
      document.slice(0, range.start) + replacement + document.slice(range.end),
    );
  };

  const replaceEvery = (): void => {
    if (disabled || count === 0) return;
    onValueChange(replaceAll(document, query, replacement, options));
  };

  const onKeyDown = (event: KeyEvent): void => {
    if (disabled) return;
    if (event.key === "f3") {
      event.preventDefault();
      go(event.modifiers?.shift === true ? -1 : 1);
    }
  };

  return (
    <div testId={testId} style={recipeStyle(cn(SEARCH_ROOT, className), theme)}>
      <Input
        value={query}
        onValueChange={changeQuery}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        label={findName}
        disabled={disabled}
        testId={`${testId}-find`}
        style={{ flexGrow: 1 }}
      />
      <Toggle
        variant="outline"
        size="sm"
        square
        pressed={matchCase}
        onPressedChange={changeMatchCase}
        label="Match case"
        disabled={disabled}
        testId={`${testId}-case`}
      >
        Aa
      </Toggle>
      <Toggle
        variant="outline"
        size="sm"
        square
        pressed={wholeWord}
        onPressedChange={changeWholeWord}
        label="Match whole word"
        disabled={disabled}
        testId={`${testId}-word`}
      >
        W
      </Toggle>
      {readout.length === 0 ? null : (
        <text role="status" aria-label={readout} testId={`${testId}-count`}>
          {readout}
        </text>
      )}
      <Button
        variant="outline"
        size="sm"
        label={previousName}
        disabled={disabled || count === 0}
        onActivate={() => go(-1)}
      >
        ↑
      </Button>
      <Button
        variant="outline"
        size="sm"
        label={nextName}
        disabled={disabled || count === 0}
        onActivate={() => go(1)}
      >
        ↓
      </Button>
      <Input
        value={replacement}
        onValueChange={setReplacement}
        onKeyDown={onKeyDown}
        placeholder={replacePlaceholder}
        label={replaceFieldName}
        disabled={disabled}
        testId={`${testId}-replace`}
        style={{ flexGrow: 1 }}
      />
      <Button
        variant="secondary"
        size="sm"
        label={replaceName}
        disabled={disabled || count === 0}
        testId={`${testId}-replace-one`}
        onActivate={replaceOne}
      >
        {replaceName}
      </Button>
      <Button
        variant="outline"
        size="sm"
        label={replaceAllName}
        disabled={disabled || count === 0}
        testId={`${testId}-replace-all`}
        onActivate={replaceEvery}
      >
        {replaceAllName}
      </Button>
    </div>
  );
};

export const searchReplaceMeta = {
  name: "Search and replace",
  tier: 4,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the matcher is a literal scan — no regex mode; `Aa` (match case, on by default) and `W` (whole word, off) toggle the query",
    "the active match cannot move the editor's caret or scroll to it: the runtime reports no caret or scroll offset",
    "the bar owns the find/replace fields, not the document text; the caller applies every replacement",
  ],
  docs: "docs/search-replace.mdx",
  example: "examples/search-replace.example.tsx",
  testFile: "src/search/logic.test.ts",
} as const;
