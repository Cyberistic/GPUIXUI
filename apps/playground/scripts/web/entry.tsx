/** @jsxImportSource @gpuix/react */
import { render } from "@gpuix/react";
import { useEffect, useState } from "react";
import { Flex } from "../../src/film/reel/flex.js";
import { H, W } from "../../src/film/reel/kit.js";
import { Fire } from "../../src/film/reel/scenes-a.js";

declare global {
  var probeFrames: number;
}
globalThis.probeFrames = 0;
const query = new URLSearchParams(location.search);
const scene = query.get("scene"),
  at = Number(query.get("t") ?? 0);

const App = () => {
  const [now, setNow] = useState(0);
  useEffect(() => {
    let handle = 0;
    const tick = (ms: number) => {
      globalThis.probeFrames += 1;
      setNow(ms / 1000);
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, []);
  return scene === "fire" ? (
    <Fire t={1 + (now % 3)} />
  ) : (
    <Flex t={at + (now % 0.01)} />
  );
};

render(<App />, { title: "probe", width: W, height: H });
