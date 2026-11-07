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

export const shineButtonDemoSource = `import { ShineButton } from "@gpuixui/fx/shine-button";

<ShineButton variant="primary" onClick={deploy}>
  Deploy
</ShineButton>;`;
