/**
 * Browser preview for the Image zoom page.
 *
 * The native frame magnifies its picture under the pointer; the preview grows
 * the same picture inside a fixed frame on hover, so the lens reads without
 * reflowing the page.
 */

const chart = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200"><rect width="360" height="200" fill="#191D25"/><path d="M0 170 L90 150 L180 160 L270 90 L360 60 L360 200 L0 200 Z" fill="#2E2370"/><path d="M0 170 L90 150 L180 160 L270 90 L360 60" fill="none" stroke="#A7A9FF" stroke-width="2"/><circle cx="90" cy="150" r="3" fill="#E0E3FF"/><circle cx="180" cy="160" r="3" fill="#E0E3FF"/><circle cx="270" cy="90" r="3" fill="#E0E3FF"/></svg>`,
)}`;

export function ImageZoomDemo() {
  return (
    <div className="gx-imagezoom">
      <img alt="A chart of the harbour with four approaches" src={chart} />
      <p className="gx-imagezoom-readout">Hover to magnify</p>
    </div>
  );
}

export const imageZoomDemoSource = `import { ImageZoom } from "@gpuixui/components/image-zoom";

<ImageZoom
  src="/maps/harbour.png"
  alt="A chart of the harbour with four approaches"
  width={360}
  height={200}
/>;`;
