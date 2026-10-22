/**
 * SearchReplace: a find-and-replace bar over a controlled text.
 *
 * The matching is {@link findRanges} — a literal, non-overlapping scan — and the
 * replacement is {@link replaceAll}, so the match count and a replace-all agree
 * on what "one match" is. The bar owns only the *bar*: the document text is the
 * caller's `value`, edited through `onValueChange`, so the editor (or any other
 * surface) stays the single owner of the text.
 *
 * F3 moves to the next match and Shift+F3 to the previous; next/previous and
 * replace act on the active match. Without a caret or scroll-offset API the bar
 * cannot move the editor's selection to the active match — it reports the match
 * (`n / m`) and leaves the jump to a surface that can.
 */

import type { KeyEvent } from "@gpuix/react";
import { Button, Input } from "@gpuixui/primitives";
import { cn } from "@gpuixui/tw";
import { useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import { useState } from "react";
import { findRanges, replaceAll } from "./logic.js";
import { recipeStyle } from "../internal/recipe.js";

/** The bar's resting surface. */
const SEARCH_ROOT = "flex flex-row items-center gap-2 flex-wrap";

/** {@link SearchReplace} props. */
export interface SearchReplaceProps {
  /** The controlled document text. */
  readonly value: string;
  /** Reports every edit: a single replace and a replace-all. */
  readonly onValueChange: (value: string) => void;
  /** The find field's placeholder. Default `"Find"`. */
  readonly placeholder?: string;
  /** The replacement field's placeholder. Default `"Replace with"`. */
  readonly replacePlaceholder?: string;
  /** The find field's accessible name. Default `"Find"`. */
  readonly findLabel?: string;
  /** The replacement field's accessible name. Default `"Replace with"`. */
  readonly replaceFieldLabel?: string;
  /** The replace action's name. Default `"Replace"`. */
  readonly replaceLabel?: string;
  /** The replace-all action's name. Default `"Replace all"`. */
  readonly replaceAllLabel?: string;
  /** The next-match action's name. Default `"Next match"`. */
  readonly nextLabel?: string;
  /** The previous-match action's name. Default `"Previous match"`. */
  readonly previousLabel?: string;
  readonly disabled?: boolean;
  /** A Tailwind class string for the bar, joined after the recipe so it wins. */
  readonly className?: string;
  readonly testId?: string;
}

/**
 * A find field, a match count, next/previous, and replace / replace-all.
 *
 * The find and replacement fields are the bar's own draft state; the document
 * text is the caller's. The match count reads the current `value` and `query`,
 * so it is always in step with what a replace would do.
 */
export const SearchReplace = ({
  value,
  onValueChange,
  placeholder = "Find",
  replacePlaceholder = "Replace with",
  findLabel = "Find",
  replaceFieldLabel = "Replace with",
  replaceLabel = "Replace",
  replaceAllLabel = "Replace all",
  nextLabel = "Next match",
  previousLabel = "Previous match",
  disabled = false,
  className,
  testId = "search-replace",
}: SearchReplaceProps) => {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const ranges = findRanges(value, query);
  const count = ranges.length;
  const active = count === 0 ? 0 : Math.min(activeIndex, count - 1);

  const go = (step: 1 | -1): void => {
    if (count === 0) return;
    setActiveIndex((active + step + count) % count);
  };

  const replaceOne = (): void => {
    if (count === 0) return;
    const range = Arr.getUnsafe(ranges, active);
    onValueChange(
      value.slice(0, range.start) + replacement + value.slice(range.end),
    );
  };

  const replaceEvery = (): void => {
    if (count === 0) return;
    onValueChange(replaceAll(value, query, replacement));
  };

  const onKeyDown = (event: KeyEvent): void => {
    if (event.key === "f3") {
      event.preventDefault();
      go(event.modifiers?.shift === true ? -1 : 1);
    }
  };

  return (
    <div testId={testId} style={recipeStyle(cn(SEARCH_ROOT, className), theme)}>
      <Input
        value={query}
        onValueChange={setQuery}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        label={findLabel}
        disabled={disabled}
        style={{ flexGrow: 1 }}
      />
      <text role="presentation" testId={`${testId}-count`}>
        {count === 0 ? "No matches" : `${active + 1} / ${count}`}
      </text>
      <Button
        variant="outline"
        size="sm"
        label={previousLabel}
        disabled={disabled || count === 0}
        onActivate={() => go(-1)}
      >
        ↑
      </Button>
      <Button
        variant="outline"
        size="sm"
        label={nextLabel}
        disabled={disabled || count === 0}
        onActivate={() => go(1)}
      >
        ↓
      </Button>
      <Input
        value={replacement}
        onValueChange={setReplacement}
        placeholder={replacePlaceholder}
        label={replaceFieldLabel}
        disabled={disabled}
        style={{ flexGrow: 1 }}
      />
      <Button
        variant="secondary"
        size="sm"
        label={replaceLabel}
        disabled={disabled || count === 0}
        onActivate={replaceOne}
      >
        {replaceLabel}
      </Button>
      <Button
        variant="outline"
        size="sm"
        label={replaceAllLabel}
        disabled={disabled || count === 0}
        onActivate={replaceEvery}
      >
        {replaceAllLabel}
      </Button>
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` by the owning workstream. */
export const searchReplaceMeta = {
  name: "Search and replace",
  tier: 4,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the matcher is a literal, case-sensitive scan — no regex, no whole-word, no case toggle",
    "the active match cannot move the editor's caret or scroll to it: the runtime reports no caret or scroll offset",
    "the bar owns the find/replace fields, not the document text; the caller applies every replacement",
  ],
  docs: "docs/search-replace.mdx",
  example: "examples/search-replace.example.tsx",
  testFile: "src/search/logic.test.ts",
} as const;
