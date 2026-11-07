/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { Button } from "../src/internal/button.js";
import { CountingNumber } from "../src/counting-number.js";
import { MotionProvider } from "../src/motion.js";

export const CountingNumberExample = () => {
  const [deploys, setDeploys] = useState(1_284);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <CountingNumber
        value={deploys}
        from={0}
        role="display"
        label={`${deploys} deploys this month`}
      />
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <Button variant="secondary" onClick={() => setDeploys((n) => n + 120)}>
          Ship 120 more
        </Button>
        <Button variant="ghost" onClick={() => setDeploys(0)}>
          Reset
        </Button>
      </div>
      <MotionProvider preference="reduced">
        <CountingNumber value={42} from={0} role="h3" decimals={1} />
      </MotionProvider>
    </div>
  );
};
