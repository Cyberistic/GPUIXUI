/**
 * Stepper example: a three-step checkout, horizontal and vertical.
 *
 * The stepper is display-only — no step is clickable. The owning workflow
 * decides which step is current and renders the indicator from that value.
 */

import { Stepper, StepperStep } from "../src/stepper.js";

/** The three steps, shared by both orientations. */
const Steps = () => (
  <>
    <StepperStep value={1} label="Account" description="Email and password" />
    <StepperStep value={2} label="Billing" description="Card and address" />
    <StepperStep value={3} label="Review" description="Check and place" />
  </>
);

/** A checkout progress indicator, shown horizontally and vertically. */
export const StepperExample = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
    <Stepper value={2} label="Checkout" style={{ width: 560 }}>
      <Steps />
    </Stepper>

    <Stepper
      value={2}
      label="Checkout, vertical"
      orientation="vertical"
      style={{ width: 280 }}
    >
      <Steps />
    </Stepper>
  </div>
);
