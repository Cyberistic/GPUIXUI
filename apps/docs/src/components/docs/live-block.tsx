import { liveBlockOf } from "../../lib/live-blocks";
import { usePlatform } from "./platform-toggle";

/**
 * A block page's screen: the **real block**, painted by the same renderer the
 * library ships on.
 *
 * The docs' browser build of GPUix is a wasm surface that owns one
 * document-level canvas, so a live block needs its own document — this frame is
 * an iframe onto `/live/block/<slug>`, which mounts the block's package. The
 * native capture sits behind it: until the first frame paints (and in a browser
 * with no WebGPU or WebGL2) the reader still sees the block, and the live
 * surface covers it once it has pixels.
 *
 * The label under the frame is the same honesty the component previews carry:
 * this is the real block, but it is the web build in a browser, not the native
 * macOS runtime.
 */
export const liveBlockLabel =
  "The real block, painted by the GPUix web build in this browser — not the native macOS runtime.";

export function LiveBlock({
  slug,
  variant,
  capture,
}: {
  readonly slug: string;
  /** `desktop` ships two looks; the page frames each one. */
  readonly variant?: string;
  /** The capture behind the surface; `desktop` carries one per look. */
  readonly capture?: string;
}) {
  const { look, platform } = usePlatform();
  const block = liveBlockOf(slug);
  const query = new URLSearchParams({ platform, look });
  if (variant !== undefined) query.set("variant", variant);
  const title = variant === undefined ? slug : `${slug} (${variant})`;
  const shotName = capture ?? slug;
  return (
    <figure className="not-prose" style={figure}>
      <div
        style={{
          ...frame,
          aspectRatio:
            block === undefined ? "11 / 7" : `${block.width} / ${block.height}`,
        }}
      >
        <img
          alt={`${title}: a capture of the native renderer`}
          src={`/blocks/${shotName}.webp`}
          style={shot}
        />
        <iframe
          allow="fullscreen"
          loading="lazy"
          src={`/live/block/${slug}?${query.toString()}`}
          style={surface}
          title={`${title}: the real block, painted by GPUix`}
        />
      </div>
      <figcaption style={caption}>{liveBlockLabel}</figcaption>
    </figure>
  );
}

const figure = { margin: 0 } as const;

const frame = {
  position: "relative",
  width: "100%",
  overflow: "hidden",
  borderRadius: 12,
  background: "#f4f2ee",
} as const;

const shot = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
} as const;

const surface = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  border: 0,
  background: "transparent",
} as const;

const caption = {
  marginTop: 8,
  font: "400 12px/18px system-ui, sans-serif",
  color: "#6e6e73",
} as const;
