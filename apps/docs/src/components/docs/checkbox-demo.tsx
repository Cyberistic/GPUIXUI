import { useState } from "react";
import {
  activates,
  channels,
  describeGroup,
  groupState,
  parentPaint,
  toggleAll,
  toggleChannel,
} from "./checkbox-preview";

/**
 * Browser previews for the Checkbox page.
 *
 * The library's box draws at an icon step inside a 24px press target, so the
 * preview takes both from the theme bridge (`--icon-size-*`, `--target-size`)
 * and the press target carries the role, the tab stop and the ring. The
 * keyboard edges are the component's — Enter on key down, Space on key up, no
 * repeat — and the group's arithmetic lives in `checkbox-preview.ts` so the
 * page's parent rules can be tested. The preview labels its own controls with
 * `aria-checked` because it is a browser; the native box has no such attribute
 * and announces `aria-valuetext`, which the page says.
 */

interface CheckTargetProps {
  readonly label: string;
  readonly checked: boolean;
  readonly indeterminate?: boolean;
  readonly size?: "sm" | "md" | "lg";
  readonly accent?: "primary" | "destructive";
  readonly invalid?: boolean;
  readonly disabled?: boolean;
  readonly managed?: boolean;
  readonly mark?: string;
  readonly onToggle?: () => void;
}

/**
 * One box in its press target.
 *
 * The drawing is a child that takes no pointer input, exactly as the shipped
 * box's mark does: a press anywhere in the 24px target activates once. Escape
 * and arrows do nothing, Tab is the only way out, and a managed or disabled box
 * is out of the tab order.
 */
const CheckTarget = ({
  label,
  checked,
  indeterminate = false,
  size = "md",
  accent = "primary",
  invalid = false,
  disabled = false,
  managed = false,
  mark,
  onToggle,
}: CheckTargetProps) => {
  const state = indeterminate
    ? "indeterminate"
    : checked
      ? "checked"
      : "unchecked";
  const inert = disabled || managed;
  const toggle = (): void => {
    if (!inert) onToggle?.();
  };

  return (
    <div
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      className="gx-check-target"
      data-accent={accent}
      data-disabled={disabled ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      data-managed={managed ? "" : undefined}
      data-size={size}
      data-state={state}
      onClick={toggle}
      onKeyDown={(event) => {
        // Space must not scroll while the box waits for the release.
        if (event.key === " ") event.preventDefault();
        if (activates(event.key, "down", event.repeat)) {
          event.preventDefault();
          toggle();
        }
      }}
      onKeyUp={(event) => {
        if (activates(event.key, "up", event.repeat)) {
          event.preventDefault();
          toggle();
        }
      }}
      role="checkbox"
      tabIndex={inert ? undefined : 0}
    >
      <span className="gx-check-box">
        {state === "unchecked" ? null : (
          <span aria-hidden="true" className="gx-check-mark">
            {mark ?? (state === "indeterminate" ? "–" : "✓")}
          </span>
        )}
      </span>
    </div>
  );
};

/** A notification-settings group with an indeterminate parent. */
const ChannelGroup = () => {
  const [chosen, setChosen] = useState<ReadonlyArray<string>>(["email"]);
  const state = groupState(chosen);
  const parent = parentPaint(state);
  const editable = channels.filter((channel) => channel.managed !== true);

  return (
    <div className="gx-check-card">
      <div className="gx-check-parent">
        <CheckTarget
          checked={parent.checked}
          indeterminate={parent.indeterminate}
          label="All channels"
          onToggle={() => setChosen((current) => toggleAll(current))}
        />
        <div className="gx-check-copy">
          <span className="gx-check-title">All channels</span>
          <span className="gx-check-hint">
            Applies to the {editable.length} channels you can change.
          </span>
        </div>
      </div>
      <div className="gx-check-list">
        {channels.map((channel) => (
          <div className="gx-check-row" key={channel.value}>
            <CheckTarget
              checked={chosen.includes(channel.value)}
              label={channel.label}
              managed={channel.managed}
              onToggle={() =>
                setChosen((current) => toggleChannel(current, channel.value))
              }
            />
            <div className="gx-check-copy">
              <span className="gx-check-title">{channel.label}</span>
              <span className="gx-check-hint">{channel.description}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="gx-check-readout" role="status">
        {describeGroup(state, chosen)}
      </p>
    </div>
  );
};

interface StateSpec {
  readonly id: string;
  readonly label: string;
  readonly size?: "sm" | "md" | "lg";
  readonly accent?: "primary" | "destructive";
  readonly invalid?: boolean;
  readonly disabled?: boolean;
  readonly indeterminate?: boolean;
  readonly mark?: string;
  readonly initial: boolean;
}

const sizes: ReadonlyArray<StateSpec> = [
  { id: "sm", label: "Small", size: "sm", initial: true },
  { id: "md", label: "Medium", size: "md", initial: true },
  { id: "lg", label: "Large", size: "lg", initial: true },
];

const accents: ReadonlyArray<StateSpec> = [
  { id: "primary", label: "Primary", accent: "primary", initial: true },
  {
    id: "destructive",
    label: "Destructive",
    accent: "destructive",
    initial: true,
  },
];

const states: ReadonlyArray<StateSpec> = [
  { id: "unchecked", label: "Unchecked", initial: false },
  { id: "checked", label: "Checked", initial: true },
  { id: "mixed", label: "Mixed", indeterminate: true, initial: false },
  { id: "invalid", label: "Invalid", invalid: true, initial: false },
  { id: "disabled", label: "Disabled", disabled: true, initial: true },
  {
    id: "custom",
    label: "Custom mark",
    mark: "★",
    initial: true,
  },
  {
    id: "managed",
    label: "Managed",
    initial: true,
  },
];

const StateRow = ({ spec }: { readonly spec: StateSpec }) => {
  const [checked, setChecked] = useState(spec.initial);
  return (
    <div className="gx-check-state">
      <CheckTarget
        accent={spec.accent}
        checked={checked}
        disabled={spec.disabled}
        indeterminate={spec.indeterminate}
        invalid={spec.invalid}
        label={spec.label}
        managed={spec.id === "managed" ? true : undefined}
        mark={spec.mark}
        onToggle={() => setChecked((current) => !current)}
        size={spec.size}
      />
      <span className="gx-check-hint">{spec.label}</span>
    </div>
  );
};

export const CheckboxWorkflow = () => (
  <div className="gx-demo gx-demo-column gx-check-scene">
    <p className="gx-demo-label">Notifications</p>
    <ChannelGroup />
  </div>
);

export const CheckboxStates = () => (
  <div className="gx-demo gx-demo-column gx-check-scene">
    <p className="gx-demo-label">Sizes</p>
    <div className="gx-check-states">
      {sizes.map((spec) => (
        <StateRow key={spec.id} spec={spec} />
      ))}
    </div>
    <p className="gx-demo-label">Accents</p>
    <div className="gx-check-states">
      {accents.map((spec) => (
        <StateRow key={spec.id} spec={spec} />
      ))}
    </div>
    <p className="gx-demo-label">States</p>
    <div className="gx-check-states">
      {states.map((spec) => (
        <StateRow key={spec.id} spec={spec} />
      ))}
    </div>
  </div>
);

const workflowSource = `import { Checkbox } from "@gpuixui/primitives";
import { useState } from "react";

const CHANNELS = ["email", "desktop", "mobile"] as const;

export const Notifications = () => {
  const [chosen, setChosen] = useState<ReadonlyArray<string>>(["email"]);
  const all = CHANNELS.every((channel) => chosen.includes(channel));
  const none = CHANNELS.every((channel) => !chosen.includes(channel));

  return (
    <>
      {/* Indeterminate is a paint state: pressing this parent reports true,
          so an indeterminate group selects everything rather than clearing. */}
      <Checkbox
        checked={all}
        indeterminate={!all && !none}
        label="All channels"
        onCheckedChange={(next) => setChosen(next ? [...CHANNELS] : [])}
      />
      {CHANNELS.map((channel) => (
        <Checkbox
          checked={chosen.includes(channel)}
          key={channel}
          label={channel}
          onCheckedChange={(next) =>
            setChosen((current) =>
              next
                ? [...current, channel]
                : current.filter((value) => value !== channel),
            )
          }
        />
      ))}
    </>
  );
};`;

const statesSource = `import { Checkbox, Icon, useTheme } from "@gpuixui/primitives";

const theme = useTheme();

<>
  <Checkbox checked label="Primary" />
  <Checkbox checked accent="destructive" label="Destructive" />
  <Checkbox indeterminate label="Mixed" />
  <Checkbox invalid label="Invalid" />
  <Checkbox disabled checked label="Disabled" />
  {/* A custom mark is the indicator's content; the pointer guard stays. */}
  <Checkbox checked label="Favourite">
    <Icon name="star-filled" size={theme.iconSize.sm} />
  </Checkbox>
</>;`;

export {
  statesSource as checkboxStatesSource,
  workflowSource as checkboxWorkflowSource,
};
