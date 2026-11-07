/** @jsxImportSource @gpuix/react */
export const mountMarker = (scenarioId: string): string =>
  `live-probe-${scenarioId}`;

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
