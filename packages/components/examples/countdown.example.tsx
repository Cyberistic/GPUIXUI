/**
 * Countdown example: an offer that expires.
 *
 * The tick lives here, at the application boundary, not in the component: an
 * Effect fiber sleeps for a second and updates the remaining time, which the
 * countdown renders. This is the pattern the docs recommend.
 */

import { Duration, Effect, Fiber } from "effect";
import { useEffect, useState } from "react";
import { Countdown } from "../src/countdown.js";

/** A remaining duration that ticks down once a second while mounted. */
const useTickingRemaining = (startMs: number): number => {
  const [remaining, setRemaining] = useState(startMs);

  useEffect(() => {
    // An example is an application boundary (`Effect.run*` belongs here), and
    // the tick is local display state, not shared state that wants an atom.
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

/** A live offer countdown beside an expired one. */
export const CountdownExample = () => {
  const remaining = useTickingRemaining(90_000);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Countdown remainingMs={remaining} label="Offer ends in" />
      <Countdown remainingMs={0} label="Expired coupon" />
    </div>
  );
};
