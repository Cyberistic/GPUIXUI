import { installVirtualClock } from "../kit/clock";

const params = new URLSearchParams(location.search);
if (params.has("record")) installVirtualClock({ fps: 30 });

const scenes = {
  bento: () => import("../scenes/bento/index"),
  assemble: () => import("../scenes/assemble/index"),
} as const;

const name = (params.get("scene") ?? "bento") as keyof typeof scenes;
const [{ createRoot }, { createElement }, scene] = await Promise.all([
  import("react-dom/client"),
  import("react"),
  scenes[name](),
]);
createRoot(document.getElementById("root")!).render(
  createElement(scene.default),
);
