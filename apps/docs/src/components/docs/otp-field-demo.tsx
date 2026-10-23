/**
 * Browser preview for the OTPField page.
 *
 * An OTP field is one contiguous code held in single-character cells. The
 * preview draws the six cells, a partially-filled and an invalid state. The
 * Code tab shows the native usage.
 */

import { useState } from "react";

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
  const [code, setCode] = useState("4 8");
  const digits = Array.from({ length: 6 }, (_, index) => {
    const character = code.replace(/\s/g, "")[index] ?? "";
    return character;
  });

  return (
    <div className="gx-demo gx-demo-column gx-otp-scene">
      <div className="gx-input-block">
        <label className="gx-input-label" htmlFor="gx-otp-demo">
          Verification code
        </label>
        <div className="gx-otp" role="group" aria-label="Verification code">
          {digits.map((digit, index) => (
            <input
              aria-label={`Verification code digit ${index + 1}`}
              className="gx-otp-cell"
              id={index === 0 ? "gx-otp-demo" : undefined}
              key={index}
              maxLength={1}
              onChange={(event) => {
                const next = digits.slice();
                next[index] = event.target.value.slice(-1);
                setCode(next.join(" "));
              }}
              value={digit}
            />
          ))}
        </div>
        <span className="gx-input-help">
          Six digits from your authenticator.
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
