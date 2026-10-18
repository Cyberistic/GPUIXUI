/**
 * Fieldset example: a billing address group, and the same group while saving.
 *
 * The group owns nothing but the grouping and the disabled state; the values are
 * the app's. `Fieldset` renders its own legend — the example never writes a
 * `FieldsetLegend` itself.
 */

import { useState } from "react";
import { Field, FieldInput } from "../src/field.js";
import { Fieldset } from "../src/fieldset.js";

/** One labelled text input inside a group. */
const Row = ({
  label,
  description,
  value,
  disabled,
  onChange,
}: {
  readonly label: string;
  readonly description: string;
  readonly value: string;
  readonly disabled: boolean;
  readonly onChange: (value: string) => void;
}) => (
  <Field label={label} description={description}>
    <FieldInput
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.value ?? "")}
    />
  </Field>
);

/** The editable billing group: the values live here, the group only groups. */
export const FieldsetExample = () => {
  const [street, setStreet] = useState("1 Infinite Loop");
  const [city, setCity] = useState("Cupertino");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <Fieldset legend="Billing address" style={{ width: 360 }}>
        <Row
          label="Street"
          description="Street and number"
          value={street}
          disabled={false}
          onChange={setStreet}
        />
        <Row
          label="City"
          description="Where the invoice is sent"
          value={city}
          disabled={false}
          onChange={setCity}
        />
      </Fieldset>

      <Fieldset legend="Billing address" disabled style={{ width: 360 }}>
        <Row
          label="Street"
          description="Locked while the order is saving"
          value="1 Infinite Loop"
          disabled
          onChange={() => undefined}
        />
        <Row
          label="City"
          description="Locked while the order is saving"
          value="Cupertino"
          disabled
          onChange={() => undefined}
        />
      </Fieldset>
    </div>
  );
};
