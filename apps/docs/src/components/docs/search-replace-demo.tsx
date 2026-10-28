import { findRanges, replaceAll } from "@gpuixui/editor/search/logic";
import { useState, type KeyboardEvent } from "react";

/**
 * Browser preview for the Search and replace page.
 *
 * The scan and the replace-all are the package's own `search/logic`, so the
 * `n / m` readout is the number of replacements a replace-all would make and
 * the two toggles narrow it exactly as the component's do (case-sensitive by
 * default, whole-word off, and a case-insensitive scan runs the escaped literal
 * rather than a lowered copy of the text). The bar owns no document: every
 * replacement arrives through the text below, which is the caller's.
 */

export const FIND_SAMPLE = `The build preview is ready.
Open the preview before the release.
A preview is never the authority.`;

export const FIND_QUERY = "preview";
export const FIND_REPLACEMENT = "illustration";

interface Options {
  readonly caseSensitive: boolean;
  readonly wholeWord: boolean;
}

/** Swap one match, from the range the scan returned. */
export const replaceRange = (
  value: string,
  start: number,
  end: number,
  replacement: string,
): string => value.slice(0, start) + replacement + value.slice(end);

const Toggle = ({
  active,
  children,
  disabled,
  label,
  onPress,
}: {
  readonly active: boolean;
  readonly children: string;
  readonly disabled: boolean;
  readonly label: string;
  readonly onPress: () => void;
}) => (
  <button
    aria-label={label}
    aria-pressed={active}
    className="gx-btn gx-btn-outline gx-btn-sm gx-find-toggle"
    disabled={disabled}
    onClick={onPress}
    type="button"
  >
    {children}
  </button>
);

export const SearchReplaceDemo = () => {
  const [value, setValue] = useState(FIND_SAMPLE);
  const [query, setQuery] = useState(FIND_QUERY);
  const [replacement, setReplacement] = useState(FIND_REPLACEMENT);
  const [options, setOptions] = useState<Options>({
    caseSensitive: true,
    wholeWord: false,
  });
  const [active, setActive] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const [status, setStatus] = useState("");

  const matches = findRanges(value, query, options);
  const current =
    matches.length === 0 ? 0 : Math.min(active, matches.length - 1);
  const count =
    matches.length === 0 ? "0 / 0" : `${current + 1} / ${matches.length}`;

  const step = (delta: number): void => {
    if (matches.length === 0) return;
    setActive((value) => (value + delta + matches.length) % matches.length);
  };

  const replace = (): void => {
    const range = matches[current];
    if (range === undefined) {
      setStatus("No match to replace");
      return;
    }
    setValue((document) =>
      replaceRange(document, range.start, range.end, replacement),
    );
    setStatus(`Replaced 1 of ${matches.length}`);
  };

  const all = (): void => {
    if (matches.length === 0) {
      setStatus("No match to replace");
      return;
    }
    setValue((document) => replaceAll(document, query, replacement, options));
    setStatus(`Replaced ${matches.length}`);
  };

  const key = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== "F3" || disabled) return;
    event.preventDefault();
    step(event.shiftKey ? -1 : 1);
  };

  return (
    <div className="gx-find">
      <div className="gx-find-bar" onKeyDown={key}>
        <input
          aria-label="Find"
          className="gx-find-input"
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find"
          value={query}
        />
        <span className="gx-find-count" role="status">
          {count}
        </span>
        <Toggle
          active={options.caseSensitive}
          disabled={disabled}
          label="Match case"
          onPress={() =>
            setOptions((held) => ({
              ...held,
              caseSensitive: !held.caseSensitive,
            }))
          }
        >
          Aa
        </Toggle>
        <Toggle
          active={options.wholeWord}
          disabled={disabled}
          label="Match whole word"
          onPress={() =>
            setOptions((held) => ({
              ...held,
              wholeWord: !held.wholeWord,
            }))
          }
        >
          W
        </Toggle>
        <button
          aria-label="Previous match"
          className="gx-btn gx-btn-secondary gx-btn-sm"
          disabled={disabled}
          onClick={() => step(-1)}
          type="button"
        >
          ↑
        </button>
        <button
          aria-label="Next match"
          className="gx-btn gx-btn-secondary gx-btn-sm"
          disabled={disabled}
          onClick={() => step(1)}
          type="button"
        >
          ↓
        </button>
        <input
          aria-label="Replace with"
          className="gx-find-input"
          disabled={disabled}
          onChange={(event) => setReplacement(event.target.value)}
          placeholder="Replace with"
          value={replacement}
        />
        <button
          className="gx-btn gx-btn-secondary gx-btn-sm"
          disabled={disabled}
          onClick={replace}
          type="button"
        >
          Replace
        </button>
        <button
          className="gx-btn gx-btn-primary gx-btn-sm"
          disabled={disabled}
          onClick={all}
          type="button"
        >
          Replace all
        </button>
      </div>
      <textarea
        aria-label="Document"
        className="gx-find-doc"
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        spellCheck={false}
        value={value}
      />
      <div className="gx-find-foot">
        <span className="gx-find-status" role="status">
          {status === "" ? "Literal scan — no regex mode" : status}
        </span>
        <button
          aria-pressed={disabled}
          className="gx-btn gx-btn-outline gx-btn-sm"
          onClick={() => {
            setDisabled((held) => !held);
            setStatus("");
          }}
          type="button"
        >
          {disabled ? "Enable" : "Disable"}
        </button>
      </div>
    </div>
  );
};

export const searchReplaceDemoSource = `import { SearchReplace } from "@gpuixui/editor";

<SearchReplace value={value} onValueChange={setValue} />;`;
