import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  flatten,
  nextEnabled,
  selectedLabel,
  type PreviewEntry,
  type PreviewOption,
} from "./select-preview";

/**
 * Browser previews for the Select page.
 *
 * The shipped component wraps GPUix's own select, so the open state,
 * positioning and dismissal below mirror measured runtime behaviour rather than
 * a lookalike: the trigger opens on Enter, Space or an arrow, the highlight
 * starts on the chosen row, a disabled row is skipped, the ends wrap, Enter
 * commits, and Escape or a press outside closes and returns the focus to the
 * trigger. `NULL` is browser focus state, not a missing selection.
 */

const regions: ReadonlyArray<PreviewEntry> = [
  {
    label: "Europe",
    options: [
      { value: "eu-west", label: "Europe — West (Ireland)" },
      { value: "eu-central", label: "Europe — Central (Frankfurt)" },
    ],
  },
  {
    label: "Americas",
    options: [
      { value: "us-east", label: "United States — East" },
      { value: "us-west", label: "United States — West" },
    ],
  },
  {
    label: "Closed to new workspaces",
    options: [{ value: "legacy", label: "Legacy region", disabled: true }],
  },
];

const machines: ReadonlyArray<PreviewEntry> = [
  { value: "standard", label: "Standard — 4 vCPU, 16 GB" },
  { value: "compute", label: "Compute — 16 vCPU, 32 GB" },
  { value: "memory", label: "Memory — 8 vCPU, 64 GB" },
  { value: "dedicated", label: "Dedicated host", disabled: true },
];

/** A selected set of options for the states preview. */
const plans: ReadonlyArray<PreviewEntry> = [
  { value: "team", label: "Team" },
  { value: "business", label: "Business" },
  { value: "enterprise", label: "Enterprise" },
];

interface PreviewSelectProps {
  readonly id: string;
  readonly entries: ReadonlyArray<PreviewEntry>;
  readonly value: string | null;
  /** Absent on a disabled preview, which never commits. */
  readonly onValueChange?: (value: string) => void;
  readonly label: string;
  readonly placeholder?: string;
  readonly size?: "sm" | "md" | "lg";
  readonly invalid?: boolean;
  readonly disabled?: boolean;
}

/**
 * One preview control: the field chrome, the popover list and the row states.
 *
 * Every select owns its open state, and each closes on a press outside its own
 * root — the same rule a popover has, so pressing a second trigger closes the
 * first without a shared coordinator.
 */
const PreviewSelect = ({
  id,
  entries,
  value,
  onValueChange,
  label,
  placeholder = "Choose…",
  size = "md",
  invalid = false,
  disabled = false,
}: PreviewSelectProps) => {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const rows = useRef(new Map<string, HTMLButtonElement>());
  /** The row to focus once the open render commits. */
  const initialFocus = useRef<string | null>(null);
  const listId = `${id}-list`;
  const chosen = selectedLabel(entries, value);

  const openOn = (target: string | null) => {
    setHighlight(target);
    initialFocus.current = target;
    setOpen(true);
  };

  const close = (returnFocus: boolean) => {
    setOpen(false);
    setHighlight(null);
    if (returnFocus) trigger.current?.focus();
  };

  const commit = (next: string | null) => {
    if (next === null) return;
    onValueChange?.(next);
    close(true);
  };

  const focusRow = (next: string | null) => {
    if (next === null) return;
    setHighlight(next);
    rows.current.get(next)?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const target = initialFocus.current;
    initialFocus.current = null;
    if (target !== null) rows.current.get(target)?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPress = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (root.current?.contains(target) === true) return;
      // A press elsewhere takes the focus with it, so the trigger does not.
      close(false);
    };
    window.addEventListener("mousedown", onPress);
    return () => window.removeEventListener("mousedown", onPress);
  }, [open]);

  const firstEnabled = (): string | null => {
    const [first] = flatten(entries).filter(
      (option) => option.disabled !== true,
    );
    return first === undefined ? null : first.value;
  };

  /** Where an opening key lands: the chosen row, or the nearest enabled edge. */
  const openTarget = (delta: 1 | -1): string | null => {
    const chosen = flatten(entries).find(
      (option) => option.value === value && option.disabled !== true,
    );
    return chosen === undefined
      ? nextEnabled(entries, null, delta)
      : chosen.value;
  };

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const { key } = event;
    if (key === "Enter" || key === " " || key === "ArrowDown") {
      event.preventDefault();
      if (!open) openOn(openTarget(1));
      return;
    }
    if (key === "ArrowUp") {
      event.preventDefault();
      if (!open) openOn(openTarget(-1));
      return;
    }
    if (key === "Escape" && open) {
      event.preventDefault();
      close(true);
    }
  };

  const onListKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const { key } = event;
    if (key === "ArrowDown" || key === "ArrowUp") {
      event.preventDefault();
      focusRow(nextEnabled(entries, highlight, key === "ArrowDown" ? 1 : -1));
      return;
    }
    if (key === "Home" || key === "End") {
      event.preventDefault();
      focusRow(nextEnabled(entries, null, key === "Home" ? 1 : -1));
      return;
    }
    if (key === "Enter" || key === " ") {
      event.preventDefault();
      commit(highlight);
      return;
    }
    if (key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    if (key === "Tab") {
      // A select is not modal: Tab closes the list and lets the focus move on.
      close(false);
    }
  };

  const row = (option: PreviewOption) => {
    const selected = option.value === value;
    return (
      <button
        aria-selected={selected}
        className="gx-select-row"
        data-highlighted={highlight === option.value}
        data-selected={selected}
        disabled={option.disabled}
        key={option.value}
        onClick={() => commit(option.value)}
        onFocus={() => setHighlight(option.value)}
        ref={(element) => {
          if (element === null) rows.current.delete(option.value);
          else rows.current.set(option.value, element);
        }}
        role="option"
        tabIndex={-1}
        type="button"
      >
        <span>{option.label}</span>
        {selected ? (
          <span aria-hidden="true" className="gx-select-check">
            ✓
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="gx-select" ref={root}>
      <button
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-invalid={invalid || undefined}
        className="gx-select-trigger"
        data-invalid={invalid}
        data-open={open}
        data-size={size}
        disabled={disabled}
        id={id}
        onClick={() => (open ? close(true) : openOn(value ?? firstEnabled()))}
        onKeyDown={onTriggerKeyDown}
        ref={trigger}
        type="button"
      >
        <span className={chosen === null ? "gx-select-placeholder" : undefined}>
          {chosen ?? placeholder}
        </span>
        <span aria-hidden="true" className="gx-select-chevron">
          ⌄
        </span>
      </button>
      {open ? (
        <div
          aria-label={label}
          className="gx-select-list"
          id={listId}
          onKeyDown={onListKeyDown}
          role="listbox"
          tabIndex={-1}
        >
          {entries.map((entry, index) =>
            "options" in entry ? (
              <div className="gx-select-group" key={`${entry.label}-${index}`}>
                {index === 0 ? null : (
                  <div className="gx-select-rule" role="separator" />
                )}
                <p aria-hidden="true" className="gx-select-caption">
                  {entry.label}
                </p>
                {entry.options.map(row)}
              </div>
            ) : (
              row(entry)
            ),
          )}
        </div>
      ) : null}
    </div>
  );
};

/** A realistic composition: the deploy target a workspace is created in. */
export const SelectDemo = () => {
  const [region, setRegion] = useState<string | null>("eu-west");
  const [machine, setMachine] = useState<string | null>(null);

  return (
    <div className="gx-demo-select">
      <div className="gx-select-card">
        <div>
          <p className="gx-select-title">New workspace</p>
          <p className="gx-select-meta">
            The region cannot be changed after the first deploy.
          </p>
        </div>
        <div className="gx-select-field">
          <label className="gx-select-label" htmlFor="preview-region">
            Region
          </label>
          <PreviewSelect
            entries={regions}
            id="preview-region"
            label="Region"
            onValueChange={setRegion}
            value={region}
          />
        </div>
        <div className="gx-select-field">
          <label className="gx-select-label" htmlFor="preview-machine">
            Machine type
          </label>
          <PreviewSelect
            entries={machines}
            id="preview-machine"
            label="Machine type"
            onValueChange={setMachine}
            placeholder="Choose a machine…"
            value={machine}
          />
        </div>
        <p className="gx-select-readout">
          Region: <b>{selectedLabel(regions, region) ?? "none"}</b> · Machine:{" "}
          <b>{selectedLabel(machines, machine) ?? "none"}</b>
        </p>
      </div>
    </div>
  );
};

/** The three sizes and the four trigger states the component paints. */
export const SelectStates = () => {
  const [plan, setPlan] = useState<string | null>("team");
  const [empty, setEmpty] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<string | null>(null);

  return (
    <div className="gx-demo-select gx-select-states">
      <div className="gx-select-row-of-fields">
        <div className="gx-select-field">
          <span className="gx-select-label">Small</span>
          <PreviewSelect
            entries={plans}
            id="preview-plan-sm"
            label="Plan, small"
            onValueChange={setPlan}
            size="sm"
            value={plan}
          />
        </div>
        <div className="gx-select-field">
          <span className="gx-select-label">Medium</span>
          <PreviewSelect
            entries={plans}
            id="preview-plan-md"
            label="Plan, medium"
            onValueChange={setPlan}
            size="md"
            value={plan}
          />
        </div>
        <div className="gx-select-field">
          <span className="gx-select-label">Large</span>
          <PreviewSelect
            entries={plans}
            id="preview-plan-lg"
            label="Plan, large"
            onValueChange={setPlan}
            size="lg"
            value={plan}
          />
        </div>
      </div>
      <div className="gx-select-row-of-fields">
        <div className="gx-select-field">
          <span className="gx-select-label">Nothing chosen</span>
          <PreviewSelect
            entries={plans}
            id="preview-plan-empty"
            label="Plan, empty"
            onValueChange={setEmpty}
            placeholder="Select a plan…"
            value={empty}
          />
        </div>
        <div className="gx-select-field">
          <span className="gx-select-label">Invalid</span>
          <PreviewSelect
            entries={plans}
            id="preview-plan-invalid"
            invalid
            label="Plan, invalid"
            onValueChange={setInvalid}
            placeholder="Required"
            value={invalid}
          />
        </div>
        <div className="gx-select-field">
          <span className="gx-select-label">Disabled</span>
          <PreviewSelect
            disabled
            entries={plans}
            id="preview-plan-disabled"
            label="Plan, disabled"
            value="team"
          />
        </div>
      </div>
      <p className="gx-select-readout">
        Every trigger opens; the invalid one keeps the destructive edge the
        caller asked for, because the component paints the state it is given
        rather than deciding when a form is wrong.
      </p>
    </div>
  );
};

export const selectDemoSource = `import { useState } from "react";
import { Label, Select } from "@gpuixui/primitives";

const regions = [
  {
    label: "Europe",
    options: [
      { value: "eu-west", label: "Europe — West (Ireland)" },
      { value: "eu-central", label: "Europe — Central (Frankfurt)" },
    ],
  },
  {
    label: "Americas",
    options: [
      { value: "us-east", label: "United States — East" },
      { value: "us-west", label: "United States — West" },
    ],
  },
];

export const DeployTarget = () => {
  const [region, setRegion] = useState("eu-west");
  const [machine, setMachine] = useState<string>();

  return (
    <form>
      <Label>Region</Label>
      <Select
        label="Region"
        onValueChange={setRegion}
        options={regions}
        value={region}
      />

      <Label>Machine type</Label>
      <Select
        label="Machine type"
        onValueChange={setMachine}
        options={[
          { value: "standard", label: "Standard — 4 vCPU, 16 GB" },
          { value: "compute", label: "Compute — 16 vCPU, 32 GB" },
          { value: "dedicated", label: "Dedicated host", disabled: true },
        ]}
        placeholder="Choose a machine…"
        value={machine}
      />
    </form>
  );
};`;

export const selectStatesSource = `import { Select } from "@gpuixui/primitives";

const plans = [
  { value: "team", label: "Team" },
  { value: "business", label: "Business" },
  { value: "enterprise", label: "Enterprise" },
];

export const PlanPicker = () => (
  <>
    {/* sm / md / lg read density.controlHeight */}
    <Select label="Plan" options={plans} size="sm" value="team" />
    <Select label="Plan" options={plans} size="md" value="team" />
    <Select label="Plan" options={plans} size="lg" value="team" />

    {/* Nothing chosen: the placeholder is the trigger's text */}
    <Select label="Plan" options={plans} placeholder="Select a plan…" />

    {/* Validation failed: the trigger's border takes the destructive role */}
    <Select
      invalid
      label="Plan"
      options={plans}
      placeholder="Required"
    />

    {/* Disabled: the trigger refuses to open */}
    <Select disabled label="Plan" options={plans} value="team" />
  </>
);`;
