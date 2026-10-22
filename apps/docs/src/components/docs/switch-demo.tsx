import { useState } from "react";
import { activates } from "./selection-preview";
import {
  describeSync,
  initialSync,
  meteredAvailable,
  setEnabled,
  setMetered,
  setReducedMotion,
  slideMs,
  type SyncSettings,
} from "./switch-preview";

/**
 * Browser previews for the Switch page.
 *
 * The shipped switch draws a pill one icon-step tall inside a 24px press band,
 * so the preview takes both from the theme bridge (`--icon-size-*`,
 * `--target-size`). The band owns the role, the tab stop and the ring; the
 * pill and the knob take no pointer input, exactly as `decorative()` strips it
 * from the native track and thumb. The slide is the component's 150 ms
 * `easeOut` on the knob's `left` inset, and `reducedMotion` paints the landing.
 *
 * The preview is a browser rendering: the native switch announces its state
 * through `aria-valuetext` because the runtime has no `aria-checked`, which the
 * page says.
 */

interface SwitchControlProps {
  readonly label: string;
  readonly checked: boolean;
  readonly size?: "sm" | "md" | "lg";
  readonly accent?: "primary" | "destructive";
  readonly invalid?: boolean;
  readonly disabled?: boolean;
  readonly reducedMotion?: boolean;
  readonly glyph?: string;
  readonly onToggle?: (next: boolean) => void;
}

/**
 * One switch in its press band.
 *
 * A press anywhere in the band toggles once, and the keyboard edges are the
 * component's: Enter on key **down**, Space on key **up**, no repeat. A
 * disabled switch leaves the tab order and installs no press path.
 */
const SwitchControl = ({
  label,
  checked,
  size = "md",
  accent = "primary",
  invalid = false,
  disabled = false,
  reducedMotion = false,
  glyph,
  onToggle,
}: SwitchControlProps) => {
  const toggle = (): void => {
    if (!disabled) onToggle?.(!checked);
  };

  return (
    <div
      aria-checked={checked}
      aria-label={label}
      className="gx-switch"
      data-accent={accent}
      data-disabled={disabled ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      data-size={size}
      data-state={checked ? "checked" : "unchecked"}
      onClick={toggle}
      onKeyDown={(event) => {
        // Space must not scroll while the switch waits for the release.
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
      role="switch"
      tabIndex={disabled ? undefined : 0}
    >
      <span
        className="gx-switch-track"
        data-state={checked ? "checked" : "unchecked"}
      >
        <span
          className="gx-switch-thumb"
          style={{ transitionDuration: `${slideMs(reducedMotion)}ms` }}
        >
          {glyph === undefined ? null : (
            <span aria-hidden="true" className="gx-switch-glyph">
              {glyph}
            </span>
          )}
        </span>
      </span>
    </div>
  );
};

/** A sync-settings panel: a master, a dependent and a motion preference. */
const SyncPanel = () => {
  const [settings, setSettings] = useState<SyncSettings>(initialSync);

  return (
    <div className="gx-switch-card">
      <div className="gx-switch-row">
        <SwitchControl
          checked={settings.enabled}
          label="Sync this workspace"
          onToggle={(next) =>
            setSettings((current) => setEnabled(current, next))
          }
        />
        <div className="gx-switch-copy">
          <span className="gx-switch-title">Sync this workspace</span>
          <span className="gx-switch-hint">
            Applies on every machine you sign in to.
          </span>
        </div>
      </div>
      <div className="gx-switch-row">
        <SwitchControl
          checked={settings.metered}
          disabled={!meteredAvailable(settings)}
          label="Sync on metered networks"
          onToggle={(next) =>
            setSettings((current) => setMetered(current, next))
          }
        />
        <div className="gx-switch-copy">
          <span className="gx-switch-title">Sync on metered networks</span>
          <span className="gx-switch-hint">
            {meteredAvailable(settings)
              ? "Uses data on a phone hotspot."
              : "Unavailable while sync is off."}
          </span>
        </div>
      </div>
      <div className="gx-switch-row">
        <SwitchControl
          checked={settings.reducedMotion}
          label="Reduce motion"
          reducedMotion={settings.reducedMotion}
          onToggle={(next) =>
            setSettings((current) => setReducedMotion(current, next))
          }
        />
        <div className="gx-switch-copy">
          <span className="gx-switch-title">Reduce motion</span>
          <span className="gx-switch-hint">
            This knob lands instead of sliding.
          </span>
        </div>
      </div>
      <p className="gx-switch-readout" role="status">
        {describeSync(settings)}
      </p>
    </div>
  );
};

interface StateSpec {
  readonly id: string;
  readonly label: string;
  readonly initial: boolean;
  readonly size?: "sm" | "md" | "lg";
  readonly accent?: "primary" | "destructive";
  readonly invalid?: boolean;
  readonly disabled?: boolean;
  readonly glyph?: string;
  readonly reducedMotion?: boolean;
}

const sizes: ReadonlyArray<StateSpec> = [
  { id: "sm", label: "Small", initial: true, size: "sm" },
  { id: "md", label: "Medium", initial: true, size: "md" },
  { id: "lg", label: "Large", initial: true, size: "lg" },
];

const accents: ReadonlyArray<StateSpec> = [
  { id: "primary", label: "Primary", initial: true, accent: "primary" },
  {
    id: "destructive",
    label: "Destructive",
    initial: true,
    accent: "destructive",
  },
];

const states: ReadonlyArray<StateSpec> = [
  { id: "off", label: "Off", initial: false },
  { id: "on", label: "On", initial: true },
  { id: "invalid", label: "Invalid", initial: false, invalid: true },
  { id: "disabled", label: "Disabled", initial: true, disabled: true },
  { id: "glyph", label: "Glyph on the knob", initial: true, glyph: "☾" },
  {
    id: "still",
    label: "Reduced motion",
    initial: true,
    reducedMotion: true,
  },
];

const StateRow = ({ spec }: { readonly spec: StateSpec }) => {
  const [checked, setChecked] = useState(spec.initial);
  return (
    <div className="gx-switch-item">
      <SwitchControl
        accent={spec.accent}
        checked={checked}
        disabled={spec.disabled}
        glyph={spec.glyph}
        invalid={spec.invalid}
        label={spec.label}
        onToggle={() => setChecked((current) => !current)}
        reducedMotion={spec.reducedMotion}
        size={spec.size}
      />
      <span className="gx-switch-hint">{spec.label}</span>
    </div>
  );
};

const stateGroup = (label: string, specs: ReadonlyArray<StateSpec>) => (
  <>
    <p className="gx-demo-label">{label}</p>
    <div className="gx-switch-grid">
      {specs.map((spec) => (
        <StateRow key={spec.id} spec={spec} />
      ))}
    </div>
  </>
);

export const SwitchWorkflow = () => (
  <div className="gx-demo gx-demo-column gx-switch-scene">
    <p className="gx-demo-label">Sync settings</p>
    <SyncPanel />
  </div>
);

export const SwitchStates = () => (
  <div className="gx-demo gx-demo-column gx-switch-scene">
    {stateGroup("Sizes", sizes)}
    {stateGroup("Accents", accents)}
    {stateGroup("States", states)}
  </div>
);

const workflowSource = `import { Switch } from "@gpuixui/primitives";
import { useState } from "react";

export const SyncSettings = () => {
  const [settings, setSettings] = useState({
    enabled: true,
    metered: false,
    reducedMotion: false,
  });

  return (
    <>
      <Switch
        checked={settings.enabled}
        label="Sync this workspace"
        onCheckedChange={(enabled) =>
          // A dependent setting cannot act under an off master, so it is
          // cleared rather than left reading as on.
          setSettings((current) => ({
            ...current,
            enabled,
            metered: enabled ? current.metered : false,
          }))
        }
      />
      <Switch
        checked={settings.metered}
        disabled={!settings.enabled}
        label="Sync on metered networks"
        onCheckedChange={(metered) =>
          setSettings((current) => ({ ...current, metered }))
        }
      />
      <Switch
        checked={settings.reducedMotion}
        label="Reduce motion"
        onCheckedChange={(reducedMotion) =>
          setSettings((current) => ({ ...current, reducedMotion }))
        }
        reducedMotion={settings.reducedMotion}
      />
    </>
  );
};`;

const statesSource = `import { Switch, useTheme } from "@gpuixui/primitives";
import { Icon } from "@gpuixui/icons";

const theme = useTheme();

<>
  <Switch checked size="sm" label="Small" />
  <Switch checked size="md" label="Medium" />
  <Switch checked size="lg" label="Large" />
  <Switch checked accent="destructive" label="Destructive" />
  <Switch invalid label="Invalid" />
  <Switch checked disabled label="Disabled" />
  <Switch checked label="Reduce motion" reducedMotion>
    {/* A glyph is the thumb's content, drawn inside its pointer guard. */}
    <Icon name="moon" size={theme.iconSize.xs} />
  </Switch>
</>;`;

export {
  statesSource as switchStatesSource,
  workflowSource as switchWorkflowSource,
};
