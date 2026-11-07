import { useEffect, useState } from "react";

const TICKS = 12;
const ARC = 7;
const FLOOR = 0.2;
const STEP_MS = 120;

const arcOpacity = (index: number, step: number): number => {
  const distance = (step - index + TICKS) % TICKS;
  return distance >= ARC
    ? 0
    : 1 - (distance / Math.max(1, ARC - 1)) * (1 - FLOOR);
};

interface RingProps {
  readonly side?: number;
  readonly accent?:
    | "primary"
    | "destructive"
    | "muted"
    | "on-primary"
    | "on-secondary"
    | "on-destructive";
  readonly label?: string;
}

const Ring = ({
  side = 24,
  accent = "primary",
  label = "Loading",
}: RingProps) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(
      () => setStep((current) => (current + 1) % TICKS),
      STEP_MS,
    );
    return () => clearInterval(id);
  }, []);

  const tick = Math.max(1.5, side / 6);
  const radius = (side - tick) / 2;

  return (
    <span
      aria-label={label}
      className="gx-spin-ring"
      data-accent={accent}
      role="status"
      style={{ width: side, height: side }}
    >
      {Array.from({ length: TICKS }, (_, index) => {
        const angle = -Math.PI / 2 + (index / TICKS) * Math.PI * 2;
        return (
          <span
            className="gx-spin-tick"
            key={index}
            style={{
              left: side / 2 + radius * Math.cos(angle) - tick / 2,
              top: side / 2 + radius * Math.sin(angle) - tick / 2,
              width: tick,
              height: tick,
              opacity: arcOpacity(index, step),
            }}
          />
        );
      })}
    </span>
  );
};

export const SpinnerDemo = () => (
  <div className="gx-demo gx-demo-column gx-spin-scene">
    <p className="gx-demo-label">Sizes</p>
    <div className="gx-demo-row">
      <Ring side={16} />
      <Ring side={24} />
      <Ring side={32} />
    </div>
    <p className="gx-demo-label">Accents</p>
    <div className="gx-demo-row">
      <Ring accent="primary" label="Loading" />
      <Ring accent="destructive" label="Deleting" />
      <Ring accent="muted" label="Refreshing" />
    </div>
  </div>
);

const spinnerDemoSource = `import { Spinner, Stack, Text } from "@gpuixui/primitives";

<Stack direction="row" align="center" gap="sm">
  <Spinner label="Refreshing revenue" />
  <Text role="caption" tone="muted">Refreshing…</Text>
</Stack>;

<Spinner size="sm" label="Loading" />;
<Spinner accent="destructive" label="Loading" />;
<Spinner accent="muted" label="Loading" />;`;

export { spinnerDemoSource };

const spinnerSizesSource = `import { Spinner } from "@gpuixui/components/spinner";

<Spinner size="sm" label="Loading" />;
<Spinner size="md" label="Loading" />;
<Spinner size="lg" label="Loading" />;

<Spinner accent="destructive" label="Deleting" />;
<Spinner accent="muted" label="Refreshing" />;`;

export { spinnerSizesSource };

export const SpinnerInButtons = () => (
  <div className="gx-demo gx-demo-column gx-spin-scene">
    <p className="gx-demo-label">In an action</p>
    <div className="gx-demo-row">
      <button className="gx-btn gx-btn-primary" type="button">
        <Ring accent="on-primary" label="Saving" side={16} />
        Saving…
      </button>
      <button className="gx-btn gx-btn-secondary" type="button">
        <Ring accent="on-secondary" label="Loading" side={16} />
        Refresh
      </button>
      <button className="gx-btn gx-btn-destructive" disabled type="button">
        <Ring accent="on-destructive" label="Deleting" side={16} />
        Deleting…
      </button>
    </div>
    <p className="gx-demo-label">Button loading</p>
  </div>
);

const spinnerInButtonsSource = `import { Button } from "@gpuixui/primitives";

<Button variant="primary" loading loadingLabel="Saving">
  Save changes
</Button>;

<Button loading>Refresh</Button>;

<Button variant="destructive" loading disabled>
  Deleting…
</Button>;`;

export { spinnerInButtonsSource };
