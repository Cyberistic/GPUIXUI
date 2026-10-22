import { useId, useState, type ReactNode } from "react";
import {
  changedLabel,
  closeSection,
  describePolicy,
  editPolicy,
  initialDisclosure,
  nextOpen,
  openSection,
  setBudget,
  type Policy,
} from "./collapsible-preview";

/**
 * Browser previews for the Collapsible page.
 *
 * The shipped trigger is a `div role="button"`; the preview uses a real
 * `<button>`, because the browser gives it the same tab stop, `aria-expanded`
 * host and Enter/Space activation. The body is **not** rendered while closed,
 * exactly as the native body unmounts — that is why the note a reader types
 * inside it disappears on the next open — while the policy lives above the
 * disclosure and survives. The native body grows to its measured height; the
 * preview fades the mounted body in, and the page says which half is drawn.
 */

const Chevron = ({ open }: { readonly open: boolean }) => (
  <svg aria-hidden="true" className="gx-collapse-icon" viewBox="0 0 24 24">
    <path d={open ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} />
  </svg>
);

interface TriggerProps {
  readonly label: string;
  readonly hint?: string;
  readonly open: boolean;
  readonly disabled?: boolean;
  readonly onToggle: () => void;
}

/**
 * One disclosure trigger.
 *
 * `disabled` is a browser attribute here; the native trigger is a `div` that
 * leaves the tab order with `tabIndex={-1}`, takes no press handler and paints
 * at half opacity. The hint is caller content under the label, as the workflow's
 * Code tab shows — the component ships no indicator of its own.
 */
const Trigger = ({
  label,
  hint,
  open,
  disabled = false,
  onToggle,
}: TriggerProps) => (
  <button
    aria-expanded={open}
    className="gx-collapse-trigger"
    data-disabled={disabled ? "" : undefined}
    disabled={disabled}
    onClick={onToggle}
    type="button"
  >
    <span className="gx-collapse-trigger-copy">
      <span>{label}</span>
      {hint === undefined ? null : (
        <span className="gx-collapse-trigger-hint">{hint}</span>
      )}
    </span>
    <Chevron open={open} />
  </button>
);

interface PolicyBodyProps {
  readonly policy: Policy;
  readonly onBudget: (delta: number) => void;
  readonly onBackoff: (backoff: Policy["backoff"]) => void;
  readonly onJitter: () => void;
}

/**
 * The advanced body.
 *
 * The note is the body's own state, so it lives and dies with this component.
 * The policy is passed in: the parent owns it, which is why a collapse cannot
 * lose it.
 */
const PolicyBody = ({
  policy,
  onBudget,
  onBackoff,
  onJitter,
}: PolicyBodyProps) => {
  const [note, setNote] = useState("");
  const noteId = useId();

  return (
    <div className="gx-collapse-content">
      <div className="gx-collapse-row">
        <span className="gx-collapse-row-label">Retry budget</span>
        <span className="gx-collapse-stepper">
          <button
            aria-label="Fewer retries"
            className="gx-collapse-step"
            onClick={() => onBudget(-1)}
            type="button"
          >
            −
          </button>
          <span className="gx-collapse-value">{policy.budget}</span>
          <button
            aria-label="More retries"
            className="gx-collapse-step"
            onClick={() => onBudget(1)}
            type="button"
          >
            +
          </button>
        </span>
      </div>
      <div className="gx-collapse-row">
        <span className="gx-collapse-row-label">Backoff</span>
        <span className="gx-collapse-segment">
          {(["linear", "exponential"] as const).map((backoff) => (
            <button
              aria-pressed={policy.backoff === backoff}
              className="gx-collapse-segment-item"
              data-selected={policy.backoff === backoff ? "" : undefined}
              key={backoff}
              onClick={() => onBackoff(backoff)}
              type="button"
            >
              {backoff}
            </button>
          ))}
        </span>
      </div>
      <div className="gx-collapse-row">
        <span className="gx-collapse-row-label">Add jitter</span>
        <button
          aria-pressed={policy.jitter}
          className="gx-collapse-toggle"
          data-selected={policy.jitter ? "" : undefined}
          onClick={onJitter}
          type="button"
        >
          {policy.jitter ? "On" : "Off"}
        </button>
      </div>
      <label className="gx-collapse-field" htmlFor={noteId}>
        <span className="gx-collapse-row-label">Session note</span>
        <input
          className="gx-collapse-input"
          id={noteId}
          onChange={(event) => setNote(event.currentTarget.value)}
          placeholder="Lives inside the body"
          value={note}
        />
      </label>
      <p className="gx-collapse-hint">
        The note belongs to the body, so collapsing removes it. The retry policy
        above belongs to the page and survives.
      </p>
    </div>
  );
};

/** A retry policy in a card: one advanced section, one managed section. */
export const CollapsibleWorkflow = () => {
  const [state, setState] = useState(initialDisclosure);

  return (
    <div className="gx-demo gx-collapse-scene">
      <div className="gx-collapse-card">
        <div className="gx-collapse-head">
          <span className="gx-collapse-title">Retry policy</span>
          <span className="gx-collapse-chip">{changedLabel(state.policy)}</span>
        </div>
        <div className="gx-collapse-section">
          <Trigger
            hint="3 settings"
            label="Advanced options"
            onToggle={() =>
              setState((current) =>
                current.open ? closeSection(current) : openSection(current),
              )
            }
            open={state.open}
          />
          {state.open ? (
            <PolicyBody
              onBackoff={(backoff) =>
                setState((current) =>
                  editPolicy(current, { ...current.policy, backoff }),
                )
              }
              onBudget={(delta) =>
                setState((current) => setBudget(current, delta))
              }
              onJitter={() =>
                setState((current) =>
                  editPolicy(current, {
                    ...current.policy,
                    jitter: !current.policy.jitter,
                  }),
                )
              }
              policy={state.policy}
            />
          ) : null}
        </div>
        <div className="gx-collapse-section">
          <Trigger
            disabled
            hint="Set by your organisation"
            label="Managed options"
            onToggle={() => undefined}
            open={false}
          />
        </div>
      </div>
      <p className="gx-collapse-readout" role="status">
        {describePolicy(state.policy)} ·{" "}
        {state.open ? "advanced open" : "advanced closed"}
      </p>
    </div>
  );
};

const stateRows: ReadonlyArray<string> = [
  "Retry budget — 3 attempts",
  "Timeout — 120 s",
  "Working directory — packages/components",
];

const StateBody = () => (
  <div className="gx-collapse-content">
    {stateRows.map((row) => (
      <div className="gx-collapse-row" key={row}>
        <span className="gx-collapse-row-label">{row}</span>
      </div>
    ))}
  </div>
);

/** One independent disclosure: the open state belongs to this tile. */
const LocalSection = ({
  label,
  initial,
  disabled = false,
  hint,
}: {
  readonly label: string;
  readonly initial: boolean;
  readonly disabled?: boolean;
  readonly hint?: string;
}) => {
  const [open, setOpen] = useState(initial);

  return (
    <div className="gx-collapse-section">
      <Trigger
        disabled={disabled}
        hint={hint}
        label={label}
        onToggle={() => setOpen((current) => nextOpen(current, disabled))}
        open={open}
      />
      {open ? <StateBody /> : null}
    </div>
  );
};

const Tile = ({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) => (
  <div className="gx-collapse-state">
    <p className="gx-collapse-state-label">{label}</p>
    {children}
  </div>
);

/**
 * The controlled tile: the trigger only reports, and the consumer decides.
 *
 * Pressing the trigger increments the request count and moves nothing; the
 * consumer's own button is what opens and closes the section. That is the
 * controlled contract the component documents.
 */
const ControlledSection = () => {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState(0);

  return (
    <>
      <div className="gx-collapse-section">
        <Trigger
          hint={`${requests} request${requests === 1 ? "" : "s"}`}
          label="Controlled section"
          onToggle={() => setRequests((current) => current + 1)}
          open={open}
        />
        {open ? <StateBody /> : null}
      </div>
      <button
        className="gx-collapse-consumer"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        Consumer: {open ? "close" : "open"}
      </button>
    </>
  );
};

/** The four states a disclosure can be in. */
export const CollapsibleStates = () => (
  <div className="gx-demo gx-collapse-scene">
    <div className="gx-collapse-states">
      <Tile label="Closed (default)">
        <LocalSection initial={false} label="Advanced options" />
      </Tile>
      <Tile label="Open (defaultOpen)">
        <LocalSection initial hint="3 settings" label="Advanced options" />
      </Tile>
      <Tile label="Disabled">
        <LocalSection
          disabled
          hint="Set by your organisation"
          initial={false}
          label="Managed options"
        />
      </Tile>
      <Tile label="Controlled">
        <ControlledSection />
      </Tile>
    </div>
  </div>
);

const workflowSource = `import { Icon } from "@gpuixui/icons";
import {
  Button,
  Stack,
  Text,
  useTheme,
} from "@gpuixui/primitives";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@gpuixui/components/collapsible";

export const RetryPolicy = () => {
  const theme = useTheme();
  // The policy lives above the disclosure, so a collapse keeps it; the body is
  // unmounted, so anything it owns does not.
  const [budget, setBudget] = useState(3);
  const [open, setOpen] = useState(false);

  return (
    <Collapsible onOpenChange={setOpen} open={open}>
      <CollapsibleTrigger testId="advanced">
        <Stack align="center" direction="row" gap="sm">
          <Text>Advanced options</Text>
          <Icon
            color={theme.colors.mutedForeground}
            label={open ? "Collapse" : "Expand"}
            name={open ? "chevron-up" : "chevron-down"}
            size="sm"
          />
        </Stack>
      </CollapsibleTrigger>
      <CollapsibleContent testId="advanced-content">
        <Text tone="muted">Retry budget: {budget} of 5</Text>
        <Stack direction="row" gap="sm">
          <Button
            onActivate={() => setBudget((n) => Math.max(1, n - 1))}
            size="sm"
            variant="outline"
          >
            Fewer
          </Button>
          <Button
            onActivate={() => setBudget((n) => Math.min(5, n + 1))}
            size="sm"
            variant="outline"
          >
            More
          </Button>
        </Stack>
      </CollapsibleContent>
    </Collapsible>
  );
};`;

const statesSource = `import { Text } from "@gpuixui/primitives";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@gpuixui/components/collapsible";

// Closed: the body is not mounted at all.
<Collapsible>
  <CollapsibleTrigger>Closed</CollapsibleTrigger>
  <CollapsibleContent>Retry budget 3 attempts</CollapsibleContent>
</Collapsible>

// Uncontrolled, open on the first frame.
<Collapsible defaultOpen>
  <CollapsibleTrigger>Open</CollapsibleTrigger>
  <CollapsibleContent>Retry budget 3 attempts</CollapsibleContent>
</Collapsible>

// A disabled trigger leaves the tab order and refuses every route.
<Collapsible>
  <CollapsibleTrigger disabled>Managed by your organisation</CollapsibleTrigger>
  <CollapsibleContent>Only an administrator can open this.</CollapsibleContent>
</Collapsible>

// Controlled: the trigger reports; the consumer decides.
<Collapsible onOpenChange={setOpen} open={open}>
  <CollapsibleTrigger>Controlled</CollapsibleTrigger>
  <CollapsibleContent>
    <Text tone="muted">Opened by the consumer.</Text>
  </CollapsibleContent>
</Collapsible>;`;

export {
  statesSource as collapsibleStatesSource,
  workflowSource as collapsibleWorkflowSource,
};
