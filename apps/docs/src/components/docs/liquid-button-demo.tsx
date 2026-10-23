/**
 * Browser preview for the Liquid button page.
 *
 * The native action floods a soft fill into the label on hover; the preview
 * expands a fill layer across the button under the pointer.
 */

export function LiquidButtonDemo() {
  return (
    <div className="gx-liquid">
      <button className="gx-liquid-btn" type="button">
        <span aria-hidden="true" className="gx-liquid-fill" />
        Save draft
      </button>
      <button className="gx-liquid-btn gx-liquid-btn-primary" type="button">
        <span aria-hidden="true" className="gx-liquid-fill" />
        Publish
      </button>
    </div>
  );
}

export const liquidButtonDemoSource = `import { LiquidButton } from "@gpuixui/components/liquid-button";

<LiquidButton variant="primary" onClick={save}>
  Save draft
</LiquidButton>;`;
