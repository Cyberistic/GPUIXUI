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
