import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  createQuery,
  createRowFor,
  firstEnabled,
  isCreateRow,
  nextHighlight,
  offersCreate,
  toggleSelection,
  triggerLabel,
  visibleOptions,
  type PreviewComboboxOption,
} from "./combobox-preview";

/**
 * Browser previews for the Combobox page.
 *
 * The shipped component wraps GPUix's headless combobox: the runtime owns focus,
 * the highlighted row and the Enter/arrow/Escape handling while this package
 * owns the ranking, the option shape and the selection payload. The previews
 * below mirror the parts a reader can check by pressing — the ranked list, the
 * disabled row that is skipped, the create row that only appears when nothing
 * matches, and the trigger's value-vs-label split — and they say they are
 * browser renderings, like every other preview on the site.
 */

interface PreviewComboboxProps {
  readonly id: string;
  readonly options: ReadonlyArray<PreviewComboboxOption>;
  readonly label: string;
  readonly placeholder: string;
  readonly selected: ReadonlyArray<string>;
  readonly onSelect: (values: ReadonlyArray<string>) => void;
  /** Absent when the preview does not offer a create row. */
  readonly onCreate?: (option: PreviewComboboxOption) => void;
  readonly multiple?: boolean;
  readonly disabled?: boolean;
}

/**
 * One preview control: the field-shaped trigger and the anchored popup.
 *
 * The popup is a sibling of the trigger inside a positioned root, because the
 * preview is not portalled — the shipped popup is an anchored layer too. Escape
 * returns the focus to the trigger; an outside press does not, because the
 * press already took the focus with it.
 */
const PreviewCombobox = ({
  id,
  options,
  label,
  placeholder,
  selected,
  onSelect,
  onCreate,
  multiple = false,
  disabled = false,
}: PreviewComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const listId = `${id}-list`;

  const visible = visibleOptions(options, query);
  const create = offersCreate(visible, query, onCreate !== undefined);
  const rows: ReadonlyArray<PreviewComboboxOption> = create
    ? [...visible, createRowFor(query)]
    : visible;

  const text = triggerLabel(options, selected, placeholder);

  const close = (returnFocus: boolean) => {
    setOpen(false);
    setQuery("");
    setHighlight(null);
    if (returnFocus) trigger.current?.focus();
  };

  const choose = (value: string) => {
    if (isCreateRow(value)) {
      const created = { value: createQuery(value), label: createQuery(value) };
      onCreate?.(created);
      onSelect([created.value]);
      close(true);
      return;
    }

    if (multiple) {
      onSelect(toggleSelection(selected, value));
      return;
    }

    onSelect([value]);
    close(true);
  };

  const openOn = (target: string | null) => {
    setQuery("");
    setHighlight(target);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPress = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (root.current?.contains(target) === true) return;
      close(false);
    };
    window.addEventListener("mousedown", onPress);
    return () => window.removeEventListener("mousedown", onPress);
  }, [open]);

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const { key } = event;
    if (disabled) return;

    if (key === "Enter" || key === " " || key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        // The component starts on the chosen row when there is one.
        const chosen = options.find(
          (option) => option.value === selected[0] && option.disabled !== true,
        );
        openOn(chosen?.value ?? firstEnabled(rows));
      }
      return;
    }

    if (key === "ArrowUp") {
      event.preventDefault();
      if (!open) openOn(nextHighlight(rows, null, -1));
      return;
    }

    if (key === "Escape" && open) {
      event.preventDefault();
      close(true);
    }
  };

  const onSearchChange = (next: string) => {
    setQuery(next);
    // `autoHighlight="always"`: the first row that can be chosen is active.
    setHighlight(firstEnabled(visibleOptions(options, next)));
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const { key } = event;

    if (key === "ArrowDown" || key === "ArrowUp") {
      event.preventDefault();
      setHighlight(
        nextHighlight(rows, highlight, key === "ArrowDown" ? 1 : -1),
      );
      return;
    }

    if (key === "Enter") {
      event.preventDefault();
      if (highlight !== null) choose(highlight);
      return;
    }

    if (key === "Escape") {
      event.preventDefault();
      close(true);
    }
  };

  return (
    <div className="gx-combobox" ref={root}>
      <button
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
        className="gx-combobox-trigger"
        data-placeholder={selected.length === 0}
        disabled={disabled}
        id={id}
        onClick={() => (open ? close(true) : openOn(firstEnabled(rows)))}
        onKeyDown={onTriggerKeyDown}
        ref={trigger}
        type="button"
      >
        <span className="gx-combobox-trigger-text">{text}</span>
        <span aria-hidden="true" className="gx-combobox-caret">
          ⌄
        </span>
      </button>

      {open ? (
        <div className="gx-combobox-popup">
          <input
            aria-label={label === "" ? "Search" : `Search ${label}`}
            className="gx-combobox-search"
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search…"
            ref={search}
            value={query}
          />
          <div
            aria-label={label}
            className="gx-combobox-list"
            id={listId}
            role="listbox"
          >
            {rows.length === 0 ? (
              <p className="gx-combobox-empty">No matches</p>
            ) : (
              rows.map((option) => {
                const chosen =
                  !isCreateRow(option.value) && selected.includes(option.value);
                const creating = isCreateRow(option.value);

                return (
                  <button
                    aria-selected={chosen}
                    className={
                      creating
                        ? "gx-combobox-row gx-combobox-create"
                        : "gx-combobox-row"
                    }
                    data-disabled={option.disabled === true}
                    data-highlighted={highlight === option.value}
                    disabled={option.disabled}
                    key={option.value}
                    onClick={() => choose(option.value)}
                    onMouseEnter={() => setHighlight(option.value)}
                    role="option"
                    tabIndex={-1}
                    type="button"
                  >
                    <span className="gx-combobox-row-text">
                      <span className="gx-combobox-row-label">
                        {option.label}
                      </span>
                      {option.description === undefined ? null : (
                        <span className="gx-combobox-row-description">
                          {option.description}
                        </span>
                      )}
                    </span>
                    {chosen ? (
                      <span aria-hidden="true" className="gx-combobox-check">
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const people: ReadonlyArray<PreviewComboboxOption> = [
  {
    value: "ada",
    label: "Ada Lovelace",
    description: "Engineering · compilers",
  },
  {
    value: "grace",
    label: "Grace Hopper",
    description: "Platform · releases",
  },
  {
    value: "alan",
    label: "Alan Turing",
    description: "Research · theory",
  },
  {
    value: "katherine",
    label: "Katherine Johnson",
    description: "Data · trajectories",
  },
  {
    value: "contractor",
    label: "External reviewers",
    description: "Invite-only · no access to private repos",
    disabled: true,
  },
];

/** A realistic composition: assign a reviewer by searching the whole team. */
export const ComboboxDemo = () => {
  const [reviewer, setReviewer] = useState<ReadonlyArray<string>>(["ada"]);
  const [created, setCreated] = useState<ReadonlyArray<PreviewComboboxOption>>(
    [],
  );
  const options = [...people, ...created];
  const chosen = options.find((option) => option.value === reviewer[0]);

  return (
    <div className="gx-demo-combobox">
      <div className="gx-combobox-card">
        <div>
          <p className="gx-combobox-title">Assign reviewer</p>
          <p className="gx-combobox-meta">
            Search by name, team or focus. The reported value is the option's
            value, never its label.
          </p>
        </div>
        <div className="gx-combobox-field">
          <label className="gx-combobox-label" htmlFor="preview-reviewer">
            Reviewer
          </label>
          <PreviewCombobox
            id="preview-reviewer"
            label="Reviewer"
            onCreate={(option) => setCreated((current) => [...current, option])}
            onSelect={setReviewer}
            options={options}
            placeholder="Choose a reviewer…"
            selected={reviewer}
          />
        </div>
        <p className="gx-combobox-readout">
          Assigned: <b>{reviewer[0] ?? "none"}</b> · Shown as:{" "}
          <b>{chosen?.label ?? "nothing"}</b>
        </p>
      </div>
    </div>
  );
};

const labels: ReadonlyArray<PreviewComboboxOption> = [
  { value: "bug", label: "Bug", description: "Something is broken" },
  { value: "docs", label: "Documentation", description: "Prose or an example" },
  { value: "perf", label: "Performance", description: "A measured slowdown" },
  { value: "design", label: "Design", description: "A visual or API decision" },
  {
    value: "archived",
    label: "Archived labels",
    description: "Kept read-only for old issues",
    disabled: true,
  },
];

/** Multiple mode: the popup stays open, the chosen order is the picked order. */
export const ComboboxMultiple = () => {
  const [chosen, setChosen] = useState<ReadonlyArray<string>>(["perf", "docs"]);

  return (
    <div className="gx-demo-combobox gx-combobox-states">
      <div className="gx-combobox-card">
        <div>
          <p className="gx-combobox-title">Triage labels</p>
          <p className="gx-combobox-meta">
            A pick appends, a second pick removes, and the order is the order
            the reader chose.
          </p>
        </div>
        <div className="gx-combobox-field">
          <span className="gx-combobox-label">Labels</span>
          <PreviewCombobox
            id="preview-labels"
            label="Labels"
            multiple
            onSelect={setChosen}
            options={labels}
            placeholder="Add labels…"
            selected={chosen}
          />
        </div>
        <div className="gx-combobox-field">
          <span className="gx-combobox-label">Disabled</span>
          <PreviewCombobox
            disabled
            id="preview-labels-disabled"
            label="Labels, disabled"
            onSelect={() => undefined}
            options={labels}
            placeholder="Add labels…"
            selected={["bug"]}
          />
        </div>
        <p className="gx-combobox-readout">
          Values: <b>{chosen.length === 0 ? "[]" : chosen.join(", ")}</b>
        </p>
      </div>
    </div>
  );
};

export const comboboxDemoSource = `import { useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxList,
  ComboboxTrigger,
} from "@gpuixui/components/combobox";

const people = [
  { value: "ada", label: "Ada Lovelace", description: "Engineering · compilers" },
  { value: "grace", label: "Grace Hopper", description: "Platform · releases" },
  {
    value: "contractor",
    label: "External reviewers",
    description: "Invite-only · no access to private repos",
    disabled: true,
  },
];

export const ReviewerField = () => {
  const [reviewer, setReviewer] = useState<string | null>("ada");

  return (
    <Combobox
      onValueChange={(value) =>
        setReviewer(typeof value === "string" ? value : null)
      }
      options={people}
      value={reviewer ?? undefined}
    >
      <ComboboxTrigger label="Reviewer" placeholder="Choose a reviewer…" />
      <ComboboxContent>
        <ComboboxInput label="Search reviewers" />
        <ComboboxList label="Reviewers" />
        <ComboboxEmpty />
      </ComboboxContent>
    </Combobox>
  );
};`;

export const comboboxMultipleSource = `import { useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxList,
  ComboboxTrigger,
} from "@gpuixui/components/combobox";

const labels = [
  { value: "bug", label: "Bug", description: "Something is broken" },
  { value: "docs", label: "Documentation", description: "Prose or an example" },
  { value: "perf", label: "Performance", description: "A measured slowdown" },
];

export const LabelField = () => {
  const [labels, setLabels] = useState<ReadonlyArray<string>>(["perf"]);

  return (
    <Combobox
      multiple
      onValueChange={(value) =>
        setLabels(typeof value === "string" ? [value] : value)
      }
      options={labels}
      value={labels}
    >
      {/* Several labels are shown joined by a comma. */}
      <ComboboxTrigger label="Labels" placeholder="Add labels…" />
      <ComboboxContent>
        <ComboboxInput label="Search labels" />
        <ComboboxList label="Labels" />
      </ComboboxContent>
    </Combobox>
  );
};`;
