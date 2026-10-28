/**
 * Browser preview for the Liquid button page.
 *
 * The native action floods a soft fill into the label on hover; the preview
 * expands a fill layer across the button under the pointer.
 */

export function LiquidButtonDemo() {
  return (
    <div className="gx-liquid">
      <button className="gx-btn gx-btn-secondary gx-liquid-btn" type="button">
        <span aria-hidden="true" className="gx-liquid-fill" />
        <span className="gx-liquid-label">Save draft</span>
      </button>
      <button className="gx-btn gx-btn-primary gx-liquid-btn" type="button">
        <span aria-hidden="true" className="gx-liquid-fill" />
        <span className="gx-liquid-label">Publish</span>
      </button>
    </div>
  );
}

export const liquidButtonDemoSource = `import { LiquidButton } from "@gpuixui/components/liquid-button";

<LiquidButton variant="primary" onClick={save}>
  Save draft
</LiquidButton>;`;
