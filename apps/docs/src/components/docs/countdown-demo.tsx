import { useEffect, useState } from "react";
import { formatCountdown } from "@gpuixui/components/countdown/logic";

const OFFER_MS = 90_000;
const RELEASE_MS = 3_723_000;

const TICK_MS = 1_000;

const useCountdown = (durationMs: number): number => {
  const [deadline] = useState(() => Date.now() + durationMs);
  const [remaining, setRemaining] = useState(durationMs);

  useEffect(() => {
    const started = Date.now();
    setRemaining(deadline - started);
    const timer = setInterval(() => {
      setRemaining(deadline - Date.now());
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [deadline]);

  return remaining;
};

export function CountdownDemo() {
  const offer = useCountdown(OFFER_MS);
  const release = useCountdown(RELEASE_MS);

  return (
    <div className="gx-countdown">
      <div className="gx-countdown-cell">
        <p className="gx-countdown-label">Offer ends in</p>
        <p className="gx-countdown-value">{formatCountdown(offer)}</p>
      </div>
      <div className="gx-countdown-cell">
        <p className="gx-countdown-label">Release window</p>
        <p className="gx-countdown-value">
          {formatCountdown(release, { showDays: true })}
        </p>
      </div>
    </div>
  );
}

export const countdownDemoSource = `import { Countdown } from "@gpuixui/components/countdown";

<Countdown remainingMs={90_000} label="Offer ends in" />;
// 01:30

<Countdown remainingMs={3_723_000} label="Release window" showDays />;
// 01:02:03`;
