/**
 * Browser preview for the Spinner page.
 *
 * A spinner is three dots that advance a lit position, because the runtime
 * cannot rotate. The preview draws the three sizes and the accents. The Code
 * tab shows the native usage.
 */

const accents = ["primary", "destructive", "muted"] as const;
const sizes = ["sm", "md", "lg"] as const;

export const SpinnerDemo = () => (
  <div className="gx-demo gx-demo-column gx-spin3-scene">
    <p className="gx-demo-label">Accents</p>
    <div className="gx-demo-row">
      {accents.map((accent) => (
        <span
          aria-label="Loading"
          className="gx-spin3"
          data-accent={accent}
          key={accent}
          role="status"
        >
          <span className="gx-spin3-dot" data-lit="" />
          <span className="gx-spin3-dot" />
          <span className="gx-spin3-dot" />
        </span>
      ))}
    </div>
    <p className="gx-demo-label">Sizes</p>
    <div className="gx-demo-row">
      {sizes.map((size) => (
        <span
          aria-label="Loading"
          className="gx-spin3"
          data-size={size}
          key={size}
          role="status"
        >
          <span className="gx-spin3-dot" data-lit="" />
          <span className="gx-spin3-dot" />
          <span className="gx-spin3-dot" />
        </span>
      ))}
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

/** The sizes, as the component page's own code tab. */
const spinnerSizesSource = `import { Spinner } from "@gpuixui/components/spinner";

<Spinner size="sm" label="Loading" />;
<Spinner size="md" label="Loading" />;
<Spinner size="lg" label="Loading" />;

<Spinner accent="destructive" label="Deleting" />;
<Spinner accent="muted" label="Refreshing" />;`;

export { spinnerSizesSource };

/** The action state a reader meets most often: a button holding the mark. */
export const SpinnerInButtons = () => (
  <div className="gx-demo gx-demo-column gx-spin3-scene">
    <p className="gx-demo-label">In a button</p>
    <div className="gx-demo-row">
      <button className="gx-btn gx-btn-primary" type="button">
        <span
          aria-label="Saving"
          className="gx-spin3"
          data-size="sm"
          role="status"
        >
          <span className="gx-spin3-dot" />
          <span className="gx-spin3-dot" />
          <span className="gx-spin3-dot" />
        </span>
        Saving…
      </button>
      <button className="gx-btn gx-btn-secondary" type="button">
        <span
          aria-label="Loading"
          className="gx-spin3"
          data-size="sm"
          role="status"
        >
          <span className="gx-spin3-dot" />
          <span className="gx-spin3-dot" />
          <span className="gx-spin3-dot" />
        </span>
        Refresh
      </button>
      <button className="gx-btn gx-btn-destructive" disabled type="button">
        <span
          aria-label="Deleting"
          className="gx-spin3"
          data-size="sm"
          role="status"
        >
          <span className="gx-spin3-dot" />
          <span className="gx-spin3-dot" />
          <span className="gx-spin3-dot" />
        </span>
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
