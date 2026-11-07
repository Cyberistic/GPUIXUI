/** @jsxImportSource @gpuix/react */
import { Duration, Effect, Fiber } from "effect";
import { useEffect, useState } from "react";
import { Countdown } from "../src/countdown.js";

const useTickingRemaining = (startMs: number): number => {
  const [remaining, setRemaining] = useState(startMs);

  useEffect(() => {
    const fiber = Effect.runFork(
      Effect.forever(
        Effect.sleep(Duration.seconds(1)).pipe(
          Effect.flatMap(() =>
            Effect.sync(() =>
              setRemaining((value) => Math.max(0, value - 1000)),
            ),
          ),
        ),
      ),
    );

    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, []);

  return remaining;
};

export const CountdownExample = () => {
  const remaining = useTickingRemaining(90_000);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Countdown remainingMs={remaining} label="Offer ends in" />
      <Countdown remainingMs={0} label="Expired coupon" />
    </div>
  );
};
