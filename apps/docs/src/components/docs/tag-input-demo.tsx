import {
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  canPublish,
  committed,
  describeBudget,
  describeGate,
  emptyKeywords,
  keywordRules,
  removeLabel,
  removed,
  typed,
  type Keywords,
  type KeywordRules,
} from "./tag-input-preview";

const RemoveGlyph = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height={14}
    viewBox="0 0 24 24"
    width={14}
  >
    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" />
  </svg>
);

interface PreviewGroupProps {
  readonly label: string;
  readonly state: Keywords;
  readonly rules: KeywordRules;
  readonly disabled?: boolean;

  readonly hint?: string;

  readonly caption?: string;
  readonly onChange?: (next: Keywords) => void;
}

const PreviewGroup = ({
  label,
  state,
  rules,
  disabled = false,
  hint,
  caption,
  onChange,
}: PreviewGroupProps) => {
  const input = useRef<HTMLInputElement>(null);

  const commit = (): void => {
    onChange?.(committed(state, rules, disabled));
    input.current?.focus();
  };

  return (
    <div className="gx-tag-fieldset">
      <div
        aria-label={label}
        className="gx-tag-group"
        data-disabled={disabled ? "" : undefined}
        role="group"
      >
        {state.tokens.map((token) => (
          <span className="gx-tag-chip" key={token}>
            <span className="gx-tag-chip-text">{token}</span>
            {disabled ? null : (
              <button
                aria-label={removeLabel(token)}
                className="gx-tag-chip-remove"
                onClick={() => onChange?.(removed(state, token))}
                type="button"
              >
                <RemoveGlyph />
              </button>
            )}
          </span>
        ))}
        <input
          aria-label="Add a keyword"
          className="gx-tag-field"
          onChange={(event) =>
            onChange?.(typed(state, event.target.value, rules, disabled))
          }
          onKeyDown={(event: ReactKeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
          }}
          placeholder={state.tokens.length === 0 ? "Add a keyword…" : "Add…"}
          readOnly={disabled}
          ref={input}
          tabIndex={disabled ? -1 : 0}
          value={state.draft}
        />
        {hint === undefined ? null : (
          <span className="gx-tag-hint">{hint}</span>
        )}
      </div>
      {caption === undefined ? null : (
        <p className="gx-tag-caption">{caption}</p>
      )}
    </div>
  );
};

const TagInputWorkflow = () => {
  const [keywords, setKeywords] = useState<Keywords>({
    tokens: ["react", "gpuix", "components", "design", "docs"],
    draft: "",
  });
  const [refused, setRefused] = useState(0);
  const [locked, setLocked] = useState(false);

  const update = (next: Keywords): void => {
    const added = next.tokens.length - keywords.tokens.length;

    if (added === 0 && keywords.draft.trim() !== "" && next.draft === "") {
      setRefused((count) => count + 1);
    }
    setKeywords(next);
  };

  return (
    <div className="gx-demo gx-tag">
      <div className="gx-tag-card">
        <div>
          <p className="gx-tag-title">Publish @acme/ui</p>
        </div>
        <PreviewGroup
          caption={`${describeBudget(keywords, keywordRules)} · refused=${refused}`}
          disabled={locked}
          hint={`${keywordRules.max} max`}
          label="Package keywords"
          onChange={update}
          rules={keywordRules}
          state={keywords}
        />
        <div className="gx-tag-actions">
          <button
            className="gx-btn gx-btn-primary"
            disabled={!canPublish(keywords) || locked}
            type="button"
          >
            Publish
          </button>
          <label className="gx-tag-lock">
            <input
              checked={locked}
              onChange={(event) => setLocked(event.target.checked)}
              type="checkbox"
            />
            Read-only
          </label>
        </div>
        <p className="gx-tag-gate">{describeGate(keywords)}</p>
      </div>
    </div>
  );
};

const TagInputStates = () => {
  const [rest, setRest] = useState<Keywords>(emptyKeywords);
  const [full, setFull] = useState<Keywords>({
    tokens: ["react", "gpuix", "components", "tokens", "motion"],
    draft: "",
  });
  const [repeated, setRepeated] = useState<Keywords>({
    tokens: ["react", "react", "design"],
    draft: "",
  });
  const [locked, setLocked] = useState<Keywords>({
    tokens: ["design", "docs"],
    draft: "",
  });
  const [refused, setRefused] = useState(0);

  const updateFull = (next: Keywords): void => {
    if (
      next.tokens.length === full.tokens.length &&
      full.draft.trim() !== "" &&
      next.draft === ""
    ) {
      setRefused((count) => count + 1);
    }
    setFull(next);
  };

  const duplicates: KeywordRules = { max: 5, allowDuplicates: true };

  return (
    <div className="gx-demo gx-tag gx-tag-states">
      <div className="gx-tag-state">
        <span className="gx-tag-state-label">Rest</span>
        <PreviewGroup
          label="Empty keyword list"
          onChange={setRest}
          rules={keywordRules}
          state={rest}
        />
      </div>
      <div className="gx-tag-state">
        <span className="gx-tag-state-label">At the limit</span>
        <PreviewGroup
          label="Full keyword list"
          onChange={updateFull}
          rules={keywordRules}
          state={full}
        />
        <p className="gx-tag-note" role="status">
          {describeBudget(full, keywordRules)} · refused={refused}
        </p>
      </div>
      <div className="gx-tag-state">
        <span className="gx-tag-state-label">Duplicates allowed</span>
        <PreviewGroup
          label="Keywords allowing repeats"
          onChange={setRepeated}
          rules={duplicates}
          state={repeated}
        />
      </div>
      <div className="gx-tag-state">
        <span className="gx-tag-state-label">Disabled rendered</span>
        <PreviewGroup
          disabled
          label="Read-only keywords"
          onChange={setLocked}
          rules={keywordRules}
          state={locked}
        />
      </div>
    </div>
  );
};

const workflowSource = `import {
  TagInput,
  TagInputChip,
  TagInputField,
} from "@gpuixui/components/tag-input";
import { Button, Text } from "@gpuixui/primitives";
import { useState } from "react";

export const PublishForm = () => {
  const [keywords, setKeywords] = useState(["react", "gpuix"]);

  // The gate reads the tokens: the field keeps its draft privately, so a
  // half-typed keyword is not something a caller can see.
  const ready = keywords.length > 0;

  return (
    <>
      <TagInput
        label="Package keywords"
        max={5}
        value={keywords}
        onValueChange={setKeywords}
      >
        {keywords.map((keyword) => (
          <TagInputChip key={keyword} value={keyword} />
        ))}
        <TagInputField
          aria-label="Add a keyword"
          placeholder="Add a keyword…"
        />
      </TagInput>
      <Text role="caption">
        {keywords.length} of 5 keywords
      </Text>
      <Button disabled={!ready}>Publish</Button>
    </>
  );
};`;

const statesSource = `import { TagInput, TagInputChip, TagInputField } from "@gpuixui/components/tag-input";

const FIVE = ["react", "gpuix", "components", "tokens", "motion"];

/** The chips and the field; the caller renders the chips from its own list. */
const Keywords = ({ tokens }: { tokens: ReadonlyArray<string> }) => (
  <>
    {tokens.map((token) => (
      <TagInputChip key={token} value={token} />
    ))}
    <TagInputField aria-label="Add a keyword" placeholder="Add a keyword…" />
  </>
);

<>
  {/* Rest: the field paints its own hint. */}
  <TagInput label="Empty" value={[]} onValueChange={() => {}}>
    <Keywords tokens={[]} />
  </TagInput>

  {/* At the limit: a sixth token is refused, and the draft still clears. */}
  <TagInput label="Full" max={5} value={FIVE} onValueChange={() => {}}>
    <Keywords tokens={FIVE} />
  </TagInput>

  {/* allowDuplicates keeps a repeat as its own token. */}
  <TagInput
    label="Repeats"
    allowDuplicates
    value={["react", "react"]}
    onValueChange={() => {}}
  >
    <Keywords tokens={["react", "react"]} />
  </TagInput>

  {/* Disabled: read-only, half opacity, and no removal control. */}
  <TagInput label="Archived" disabled value={["design"]} onValueChange={() => {}}>
    <Keywords tokens={["design"]} />
  </TagInput>
</>;`;

export {
  TagInputStates,
  TagInputWorkflow,
  statesSource as tagInputStatesSource,
  workflowSource as tagInputWorkflowSource,
};
