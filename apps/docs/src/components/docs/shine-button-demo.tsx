/**
 * Browser preview for the Shine button page.
 *
 * The native action crosses a soft sheen over the label while the pointer is
 * over it; the preview sweeps the same sheen on entry.
 */

export function ShineButtonDemo() {
  return (
    <div className="gx-shine">
      <button className="gx-shine-btn" type="button">
        <span aria-hidden="true" className="gx-shine-sheen" />
        Deploy
      </button>
      <button className="gx-shine-btn gx-shine-btn-ghost" type="button">
        <span aria-hidden="true" className="gx-shine-sheen" />
        Share
      </button>
    </div>
  );
}

export const shineButtonDemoSource = `import { ShineButton } from "@gpuixui/components/shine-button";

<ShineButton variant="primary" onClick={deploy}>
  Deploy
</ShineButton>;`;
