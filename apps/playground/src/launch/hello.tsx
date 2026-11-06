import { render } from "@gpuix/react";

render(
  <div
    style={{
      display: "flex",
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#202020",
    }}
  >
    <text style={{ color: "#ffffff" }}>Hello, launch!</text>
  </div>,
  { title: "launch benchmark", width: 800, height: 600 },
);
