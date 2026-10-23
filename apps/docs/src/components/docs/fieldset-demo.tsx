/**
 * Browser preview for the Fieldset page.
 *
 * The shipped group is a `div role="group"` named by its legend — 0.11.0 has no
 * `fieldset` element and no `aria-disabled`, so `disabled` reaches the controls
 * that opt in (today `FieldInput`) and only the legend dims. The preview draws
 * the enabled group and the disabled one side by side, reusing the field page's
 * chrome, with the legend carrying the only paint the disabled state changes.
 */

import { useState } from "react";

const street = "Street and number";
const city = "Where the invoice is sent";

function FieldRow({
  label,
  description,
  value,
}: {
  readonly label: string;
  readonly description: string;
  readonly value: string;
}) {
  return (
    <div className="gx-field-block">
      <label className="gx-field-label">{label}</label>
      <input className="gx-field" defaultValue={value} readOnly />
      <p className="gx-field-desc">{description}</p>
    </div>
  );
}

export function FieldsetDemo() {
  const [disabled, setDisabled] = useState(false);

  return (
    <div className="gx-fieldset-scene">
      <div className="gx-fieldset-panel">
        <div
          className="gx-fieldset"
          data-disabled={disabled ? "" : undefined}
          role="group"
          aria-label="Billing address"
        >
          <p className="gx-fieldset-legend">Billing address</p>
          <FieldRow label="Street" description={street} value="14 Iris Lane" />
          <FieldRow label="City" description={city} value="Lisbon" />
        </div>
        <label className="gx-fieldset-toggle">
          <input
            checked={disabled}
            onChange={(event) => setDisabled(event.currentTarget.checked)}
            type="checkbox"
          />
          Disabled — the legend dims and the inputs leave the tab order
        </label>
      </div>

      <p className="gx-fieldset-note">
        A named group of fields. Only the legend dims; a control that reads the
        context paints its own disabled roles, so dimming the subtree would
        double-dim it.
      </p>
    </div>
  );
}

export const fieldsetDemoSource = `import { Field, FieldInput, Fieldset } from "@gpuixui/components";

<Fieldset legend="Billing address" disabled={saving}>
  <Field label="Street" description="Street and number">
    <FieldInput value={street} onChange={(event) => setStreet(event.value ?? "")} />
  </Field>
  <Field label="City" description="Where the invoice is sent">
    <FieldInput value={city} onChange={(event) => setCity(event.value ?? "")} />
  </Field>
</Fieldset>;`;
