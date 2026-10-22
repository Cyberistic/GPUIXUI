/**
 * ImagePreview example: the three states, over one frame size.
 *
 * The loaded preview composes the shipped `ImageZoom`, so a pointer over it
 * magnifies. The blank source paints the error state with a retry; the last
 * frame is a caller-driven loading state.
 */

import { ImagePreview } from "../src/image-preview.js";

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

export const ImagePreviewExample = () => (
  <div
    style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}
  >
    <ImagePreview
      src={PNG}
      alt="A tiny picture"
      caption="Loaded — the pointer magnifies it"
      width={280}
      height={180}
    />
    <ImagePreview
      src=""
      alt="A missing picture"
      caption="A blank source paints the error state"
      width={280}
      height={140}
      onRetry={() => undefined}
    />
    <ImagePreview
      src="a.png"
      alt="A picture that is still loading"
      status="loading"
      caption="Loading, while the caller produces the bytes"
      width={280}
      height={140}
      zoom={false}
    />
  </div>
);
