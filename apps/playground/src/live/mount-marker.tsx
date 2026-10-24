/** @jsxImportSource @gpuix/react */
/**
 * The element that proves a probe's own view is the one on screen.
 *
 * The live runner mounts every selected probe into **one** keyed window, so a
 * probe that reads after a fixed settle can read the previous probe's screen.
 * Measured on 2026-10-24: `--only virtual-tree-lifecycle --only
 * data-tree-lifecycle` read the windowed tree's `visible=4000 …` as the plain
 * tree's readout 327 ms into the second probe, while the probe alone paints in
 * 814 ms. The marker is rendered in the same commit as the view and carries the
 * scenario's own id, so waiting for it cannot be satisfied by another probe.
 *
 * The box is out of flow, unfilled and inert: it paints no pixel, takes no
 * press, and moves nothing the probe measures.
 */
export const mountMarker = (scenarioId: string): string =>
  `live-probe-${scenarioId}`;

/**
 * The marker itself: a 1×1 box at the window's origin.
 *
 * It must sit **inside** the root's single host child: the runtime renders only
 * the last child of a multi-child root fragment (measured on 0.11.0 — a root
 * `Fragment` of two divs renders the second alone), so a sibling of the view at
 * the root would either vanish or hide the view. Unfilled and inert, it paints
 * nothing and moves nothing the probe measures.
 */
export const mountMarkerView = (scenarioId: string) => (
  <div
    testId={mountMarker(scenarioId)}
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: 1,
      height: 1,
      pointerEvents: "none",
    }}
  />
);
