/**
 * Browser preview for the OTPField page.
 *
 * An OTP field is one contiguous code held in single-character cells, and the
 * drawing runs the primitive's **own** rules (`@gpuixui/primitives/core`) rather
 * than re-deriving them: a typed character advances, a pasted code fills
 * forward from the cell it landed in, and Backspace on an empty cell clears the
 * one before it. A preview that only appended to the cell under the caret
 * showed a field nobody ships.
 *
 * The Code tab shows the native usage.
 */

import { useRef, useState } from "react";
import * as Option from "effect/Option";
import {
  applyOtpInput,
  decideOtpKey,
  normalizeOtp,
  otpCells,
  otpEmptiedCell,
  type OtpEdit,
} from "@gpuixui/primitives/core";

const CODE_LENGTH = 6;

const Cell = ({
  value,
  invalid = false,
}: {
  readonly value: string;
  readonly invalid?: boolean;
}) => (
  <span
    className="gx-otp-cell"
    data-filled={value === "" ? undefined : ""}
    data-invalid={invalid ? "" : undefined}
  >
    {value}
  </span>
);

export const OTPFieldDemo = () => {
  const [code, setCode] = useState("48");
  const cells = otpCells(code, CODE_LENGTH);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  /** Whether this key's own edit already cleared the cell, so Backspace clears one. */
  const emptied = useRef(false);

  const apply = (edit: OtpEdit) => {
    setCode(edit.value);
    inputs.current[edit.focus]?.focus();
  };

  return (
    <div className="gx-demo gx-demo-column gx-otp-scene">
      <div className="gx-input-block">
        <label className="gx-input-label" htmlFor="gx-otp-demo">
          Verification code
        </label>
        <div className="gx-otp" role="group" aria-label="Verification code">
          {cells.map((cell, index) => (
            <input
              aria-label={`Verification code digit ${index + 1}`}
              autoComplete={index === 0 ? "one-time-code" : "off"}
              className="gx-otp-cell"
              data-filled={cell === "" ? undefined : ""}
              id={index === 0 ? "gx-otp-demo" : undefined}
              inputMode="numeric"
              key={index}
              ref={(element) => {
                inputs.current[index] = element;
              }}
              value={cell}
              onChange={(event) => {
                const edit = applyOtpInput(
                  code,
                  index,
                  event.target.value,
                  CODE_LENGTH,
                );
                emptied.current = otpEmptiedCell(
                  code,
                  edit.value,
                  index,
                  CODE_LENGTH,
                );
                apply(edit);
              }}
              onKeyUp={(event) => {
                const key = event.key.toLowerCase();
                if (key === "backspace" && emptied.current) {
                  emptied.current = false;
                  return;
                }
                const edit = decideOtpKey(code, index, key, CODE_LENGTH);
                if (Option.isSome(edit)) apply(edit.value);
              }}
            />
          ))}
        </div>
        <span className="gx-input-help">
          {normalizeOtp(code, CODE_LENGTH).length === CODE_LENGTH
            ? "Complete — a verifier can run."
            : "Six digits from your authenticator."}
        </span>
      </div>
      <div className="gx-input-block">
        <label className="gx-input-label">Invalid code</label>
        <div className="gx-otp" role="group" aria-label="Invalid code">
          {["1", "2", "3", "4", "5", "6"].map((digit, index) => (
            <Cell invalid key={index} value={digit} />
          ))}
        </div>
        <span className="gx-input-error">The code does not match.</span>
      </div>
    </div>
  );
};

const otpFieldDemoSource = `import { OTPField, Label, Stack } from "@gpuixui/primitives";
import { useState } from "react";

const [code, setCode] = useState("");

<Stack direction="column" gap="xs">
  <Label description="Six digits from your authenticator">
    Verification code
  </Label>
  <OTPField
    label="Verification code"
    value={code}
    onValueChange={setCode}
    onComplete={(complete) => verify(complete)}
  />
</Stack>;

<OTPField label="Invalid code" value="123456" invalid />;`;

export { otpFieldDemoSource };
