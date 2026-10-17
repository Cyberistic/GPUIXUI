/**
 * One-time-code example: two-factor verification.
 *
 * The code is caller-owned state, the field only reports it, and the action
 * that consumes it is a real button with a real failure path: the demo accepts
 * `123456`, and anything else paints the field invalid. A code field that has
 * never been wired to a submit step proves nothing.
 */

import { useState, type ReactElement } from "react";
import { Box, Button, OTPField, Separator, Stack, Text } from "../src/index.js";

/** The only code the demo accepts. */
const DEMO_CODE = "123456";

/** Two-factor verification: a six-cell code, a submit step and a reset. */
export const OtpExample = (): ReactElement => {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "verified" | "rejected">(
    "idle",
  );
  const complete = code.length === DEMO_CODE.length;

  return (
    <Box
      tone="card"
      padding="lg"
      radius="md"
      border
      testId="otp-example"
      style={{ width: 460 }}
    >
      <Stack direction="column" gap="md">
        <Text role="h3">Two-factor verification</Text>
        <Text role="caption" tone="muted">
          Enter the six-digit code from your authenticator app. This demo
          accepts 123456.
        </Text>

        <OTPField
          testId="otp-example-code"
          label="Verification code"
          value={code}
          onChange={(next) => {
            setCode(next);
            if (status === "rejected") setStatus("idle");
          }}
          onComplete={() => setStatus("idle")}
          invalid={status === "rejected"}
          size="lg"
          autoFocus
        />

        <Stack direction="row" gap="sm">
          <Button
            testId="otp-example-verify"
            variant="primary"
            disabled={!complete}
            onActivate={() =>
              setStatus(code === DEMO_CODE ? "verified" : "rejected")
            }
          >
            Verify
          </Button>
          <Button
            testId="otp-example-reset"
            variant="ghost"
            onActivate={() => {
              setCode("");
              setStatus("idle");
            }}
          >
            Start over
          </Button>
        </Stack>

        <Separator orientation="horizontal" />

        <Text
          testId="otp-example-status"
          role="caption"
          tone={status === "rejected" ? "destructive" : "muted"}
        >
          {status === "verified"
            ? "Verified. Signed in as cyberistic@example.com."
            : status === "rejected"
              ? "That code does not match. Try 123456."
              : complete
                ? "Code complete — press Verify."
                : `${DEMO_CODE.length - code.length} digits to go.`}
        </Text>
      </Stack>
    </Box>
  );
};
