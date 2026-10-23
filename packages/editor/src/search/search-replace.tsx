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
 * replace act on the active match. A **disabled** bar is inert on that route
 * too: a read-only host still receives keys, so F3 must not step the match.
 * Without a caret or scroll-offset API the bar cannot move the editor's
 * selection to the active match — it reports the match (`n / m`) and leaves the
 * jump to a surface that can.
 */

import type { KeyEvent } from "@gpuix/react";
import { accessibleName, Button, Input, Toggle } from "@gpuixui/primitives";
import { cn } from "@gpuixui/tw";
import { useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import { useState } from "react";
import { findRanges, replaceAll } from "./logic.js";
import { recipeStyle } from "../internal/recipe.js";

/** The bar's resting surface. */
const SEARCH_ROOT = "flex flex-row items-center gap-2 flex-wrap";

/** The names a blank prop falls back to — the documented defaults. */
const FIND_NAME = "Find";
const REPLACE_FIELD_NAME = "Replace with";
const REPLACE_NAME = "Replace";
const REPLACE_ALL_NAME = "Replace all";
const NEXT_NAME = "Next match";
const PREVIOUS_NAME = "Previous match";

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
  /** The find field's accessible name. Default `"Find"`; a blank name reads as the default. */
  readonly findLabel?: string;
  /** The replacement field's accessible name. Default `"Replace with"`; a blank name reads as the default. */
  readonly replaceFieldLabel?: string;
  /** The replace action's name. Default `"Replace"`; a blank name reads as the default. */
  readonly replaceLabel?: string;
  /** The replace-all action's name. Default `"Replace all"`; a blank name reads as the default. */
  readonly replaceAllLabel?: string;
  /** The next-match action's name. Default `"Next match"`; a blank name reads as the default. */
  readonly nextLabel?: string;
  /** The previous-match action's name. Default `"Previous match"`; a blank name reads as the default. */
  readonly previousLabel?: string;
  /** Refuse every route, key included: a read-only host still receives keys. */
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
  // A name is copy from an i18n table or a saved record as often as a literal,
  // and a destructuring default covers only `undefined`: a blank one published
  // an unnamed field or an action named by its arrow glyph.
  const findName = accessibleName(findLabel) ?? FIND_NAME;
  const replaceFieldName =
    accessibleName(replaceFieldLabel) ?? REPLACE_FIELD_NAME;
  const replaceName = accessibleName(replaceLabel) ?? REPLACE_NAME;
  const replaceAllName = accessibleName(replaceAllLabel) ?? REPLACE_ALL_NAME;
  const nextName = accessibleName(nextLabel) ?? NEXT_NAME;
  const previousName = accessibleName(previousLabel) ?? PREVIOUS_NAME;
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [matchCase, setMatchCase] = useState(true);
  const [wholeWord, setWholeWord] = useState(false);

  const options = { caseSensitive: matchCase, wholeWord };
  const ranges = findRanges(value, query, options);
  const count = ranges.length;
  const active = count === 0 ? 0 : Math.min(activeIndex, count - 1);

  const go = (step: 1 | -1): void => {
    if (disabled || count === 0) return;
    setActiveIndex((active + step + count) % count);
  };

  const replaceOne = (): void => {
    if (disabled || count === 0) return;
    const range = Arr.getUnsafe(ranges, active);
    onValueChange(
      value.slice(0, range.start) + replacement + value.slice(range.end),
    );
  };

  const replaceEvery = (): void => {
    if (disabled || count === 0) return;
    onValueChange(replaceAll(value, query, replacement, options));
  };

  const onKeyDown = (event: KeyEvent): void => {
    // A read-only host still receives keys, so a disabled bar must refuse this
    // route itself rather than trusting the field's `disabled` prop.
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
        onValueChange={setQuery}
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
        onPressedChange={setMatchCase}
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
        onPressedChange={setWholeWord}
        label="Match whole word"
        disabled={disabled}
        testId={`${testId}-word`}
      >
        W
      </Toggle>
      <text role="presentation" testId={`${testId}-count`}>
        {count === 0 ? "No matches" : `${active + 1} / ${count}`}
      </text>
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

/** Inventory record, mirrored into `COMPONENTS.md` by the owning workstream. */
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
