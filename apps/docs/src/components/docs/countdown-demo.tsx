/**
 * Browser preview for the Countdown page.
 *
 * The native control prints a remaining duration as locale-free clock text; the
 * preview shows the two formats it composes from the same `remainingMs`.
 */

export function CountdownDemo() {
  return (
    <div className="gx-countdown">
      <div className="gx-countdown-cell">
        <p className="gx-countdown-label">Offer ends in</p>
        <p className="gx-countdown-value">01:30</p>
      </div>
      <div className="gx-countdown-cell">
        <p className="gx-countdown-label">Release window</p>
        <p className="gx-countdown-value">01:02:03</p>
      </div>
    </div>
  );
}

export const countdownDemoSource = `import { Countdown } from "@gpuixui/components/countdown";

<Countdown remainingMs={90_000} label="Offer ends in" />;
// 01:30

<Countdown remainingMs={3_723_000} label="Release window" showDays />;
// 01:02:03`;
