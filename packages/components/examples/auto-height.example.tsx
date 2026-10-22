/**
 * Auto height example: a settings disclosure that grows to its content.
 *
 * The trigger is the application's; the reveal owns the measurement and the
 * tween. A second, reduced-motion section shows the same content arriving
 * without the journey, and the body has a row that changes height, so a reader
 * sees the reveal re-measure.
 */

import { useState } from "react";
import { AutoHeight } from "../src/auto-height.js";
import { Button } from "../src/internal/button.js";
import { MotionProvider } from "../src/motion.js";

/** One disclosure: a trigger and a revealed body. */
const Section = ({
  title,
  body,
}: {
  readonly title: string;
  readonly body: ReadonlyArray<string>;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Button
        variant="secondary"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {title}
      </Button>
      <AutoHeight open={open} contentClassName="flex flex-col gap-2">
        {body.map((line) => (
          <text key={line}>{line}</text>
        ))}
      </AutoHeight>
    </div>
  );
};

/** Two disclosures: one animated, one reduced. */
export const AutoHeightExample = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
    <Section
      title="Advanced options"
      body={["Retry budget: 5 attempts", "Timeout: 30 seconds"]}
    />
    <MotionProvider preference="reduced">
      <Section
        title="Reduced motion"
        body={["This section arrives without a tween."]}
      />
    </MotionProvider>
  </div>
);
