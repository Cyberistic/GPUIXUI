/**
 * The launch film v8 (plan 069), written from one timeline table: encodes the
 * takes it uses into `assets/footage/`, then writes `index.html` and one
 * composition per scene. A retime is one edit here; nothing is pasted by hand.
 *
 *   nub media/launch/build.ts
 *
 * Every product picture is a real take (`takes/<name>/`, the native renderer's
 * frames) or a stage recording of real takes (`takes/stage-*`, see
 * `stage/README.md`). The film draws only the ground, the lines, the desktops
 * around the windows, the terminal shell, the cursor and the end card.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";

const FPS = 30;
const HERE = new URL(".", import.meta.url).pathname;
const at = (path: string) => `${HERE}${path}`;
const GROUND = "#F4F2EE";
const INK = "#1D1D1F";

/* ------------------------------------------------------------ footage */

/** Encode a take's frames; `crf` is the quality (lower is cleaner). */
const footage = (take: string, crf = 14): string => {
  const out = at(`assets/footage/${take}.mp4`);
  const first = at(`takes/${take}/0000.png`);
  if (!existsSync(first))
    throw new Error(`build: no take "${take}"; render it first (README)`);
  if (!existsSync(out) || statSync(out).mtimeMs < statSync(first).mtimeMs)
    execFileSync("ffmpeg", [
      "-v",
      "error",
      "-y",
      "-framerate",
      String(FPS),
      "-i",
      at(`takes/${take}/%04d.png`),
      "-vf",
      "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-c:v",
      "libx264",
      "-crf",
      String(crf),
      "-pix_fmt",
      "yuv420p",
      out,
    ]);
  return `assets/footage/${take}.mp4`;
};

const still = (take: string, frame = 0): string => {
  const out = `assets/footage/${take}-${frame}.png`;
  execFileSync("cp", [
    at(`takes/${take}/${String(frame).padStart(4, "0")}.png`),
    at(out),
  ]);
  return out;
};

type Sample = { frame: number; x: number; y: number; down: boolean };
const cursorOf = (take: string): ReadonlyArray<Sample> =>
  JSON.parse(readFileSync(at(`takes/${take}/cursor.json`), "utf8"));

/* ------------------------------------------------------------ html parts */

const CURSOR = `<svg viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg"><path d="M2 2 L2 28.5 L8.6 22.4 L13 32.6 L17.2 30.8 L12.9 20.7 L21.6 20.7 Z" fill="#000" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>`;

/** A take's cursor replayed: one `set` per frame, pressed frames squeezed. */
const cursorTrack = (
  id: string,
  samples: ReadonlyArray<Sample>,
  offset: number,
  k: number,
): string =>
  samples
    .map(
      (s) =>
        `tl.set("#${id}",{x:${(s.x * k).toFixed(1)},y:${(s.y * k).toFixed(1)},scale:${s.down ? 0.86 : 1}},${(offset + s.frame / FPS).toFixed(3)});`,
    )
    .join("");

interface Scene {
  readonly id: string;
  readonly start: number;
  readonly duration: number;
  readonly css: string;
  readonly body: string;
  readonly script: string;
}

const composition = (scene: Scene): string => `<template>
  <style>
    #root { position: absolute; inset: 0; overflow: hidden; background: ${GROUND}; font-family: Inter, sans-serif; }
    #root video, #root img.shot { position: absolute; display: block; }
    #root .cursor { position: absolute; left: 0; top: 0; width: 34px; transform-origin: 8% 6%; filter: drop-shadow(0 3px 6px rgba(0,0,0,.25)); }
    #root .cursor svg { display: block; width: 100%; height: auto; }
    ${scene.css}
  </style>
  <div id="root" data-composition-id="${scene.id}" data-width="1920" data-height="1080">
${scene.body}
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    ${scene.script}
    tl.set({}, {}, ${scene.duration});
    window.__timelines = window.__timelines || {};
    window.__timelines["${scene.id}"] = tl;
  </script>
</template>
`;

const video = (
  id: string,
  src: string,
  start: number,
  duration: number,
  style: string,
  track = 1,
) =>
  `<video id="${id}" class="clip" data-start="${+start.toFixed(3)}" data-duration="${+duration.toFixed(3)}" data-track-index="${track}" muted playsinline src="${src}" style="${style}"></video>`;

/* ------------------------------------------------------------ scenes */

/** A take's cursor over one clip of it: frames `mediaStart … +duration`, placed at `start`. */
const cursorClip = (
  id: string,
  take: string,
  start: number,
  mediaStart: number,
  duration: number,
  k: number,
): string => {
  const samples = cursorOf(take).filter(
    (sample) =>
      sample.frame / FPS >= mediaStart &&
      sample.frame / FPS < mediaStart + duration,
  );
  const first = samples[0];
  // A cursor sits where its take left it at the cut: without this it waits at
  // the frame's top-left corner until its first sample.
  const lead =
    first === undefined
      ? ""
      : `tl.set("#${id}",{x:${(first.x * k).toFixed(1)},y:${(first.y * k).toFixed(1)},scale:1},${start.toFixed(3)});`;
  return lead + cursorTrack(id, samples, start - mediaStart, k);
};

const clip = (
  id: string,
  src: string,
  start: number,
  duration: number,
  mediaStart: number,
  style = "",
  track = 1,
) =>
  video(id, src, start, duration, style, track).replace(
    "<video ",
    `<video data-media-start="${mediaStart}" `,
  );

// 0–4.8: four controls, each held 1.2 s and cut only once its press has
// settled. Every shot is a static framing: the cut is the only motion. The
// first is the switch alone, pushed in — the film's thumbnail.
// Crops stay near 1: the take is already the control at 2× device pixels, and
// anything past 1.5 magnifies the capture instead of framing it.
const MONTAGE = [
  { take: "cu-switch-solo", sound: "press" },
  { take: "cu-tabs", sound: "cap-0" },
  { take: "cu-slider", sound: "cap-1" },
  { take: "cu-checkbox", sound: "cap-2" },
] as const;
const BEAT_CUT = 1;
/** The opening's camera, one continuous push: each clip resumes the last scale. */
const PUSH = [1.1, 1.33, 1.58, 1.84, 2.1] as const;
const PRESS_AT = 0.8; // every close-up presses on its frame 24
const LEAD_IN = 0.42; // each clip starts this far into its take, so the press lands 0.38 s in
/** On-screen pointer width: the camera crops otherwise scale the pointer too. */
const CURSOR_WIDTH = 87;
const montage: Scene = {
  id: "montage",
  start: 0,
  duration: MONTAGE.length * BEAT_CUT,
  css: `#root .cam { position:absolute; inset:0; transform-origin:960px 540px; }
    #root .cam video { left:0; top:0; width:1920px; height:1080px; }`,
  body: MONTAGE.map(
    ({ take }, i) =>
      `    <div id="m-cam${i}" class="cam" style="opacity:${i === 0 ? 1 : 0};transform:scale(${PUSH[i]})">
      ${clip(`m-v${i}`, footage(take, 8), i * BEAT_CUT, BEAT_CUT, LEAD_IN, "", 1 + (i % 2))}
      <div id="m-cur${i}" class="cursor" style="width:${Math.round(CURSOR_WIDTH / PUSH[i])}px">${CURSOR}</div>
    </div>`,
  ).join("\n"),
  script: MONTAGE.map(({ take }, i) => {
    const t = i * BEAT_CUT;
    const cut =
      i + 1 < MONTAGE.length
        ? `tl.set("#m-cam${i}",{opacity:0},${(t + BEAT_CUT).toFixed(1)});`
        : "";
    // One carried move: every clip resumes the scale the last one reached, so the
    // four close-ups are a single push that hands over to the wall's pull-back.
    const push = `tl.fromTo("#m-cam${i}",{scale:${PUSH[i]}},{scale:${PUSH[i + 1]},duration:${BEAT_CUT},ease:"none"},${t.toFixed(1)});`;
    return `${i > 0 ? `tl.set("#m-cam${i}",{opacity:1},${t.toFixed(1)});` : ""}${cut}
    ${push}
    ${cursorClip(`m-cur${i}`, take, t, LEAD_IN, BEAT_CUT, 1)}`;
  }).join("\n    "),
};

/* ------------------------------------------------------------ the tilted screen */

/** A tile on a tilted plane; coordinates are its centre, in plane pixels. */
interface PlaneTile {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Scene seconds at which it lands. */
  readonly land: number;
  /** A take drawn as a still, or played from its landing frame. */
  readonly take?: string;
  readonly play?: boolean;
  readonly src?: string;
  readonly label?: string;
}

const lastTakeFrame = 53;
const TILE_MEDIA = 1.8;
const DROP = 0.42;

const planeCss = `#root .stage { position:absolute; inset:0; perspective:2600px; perspective-origin:50% 42%; }
    #root .plane { position:absolute; left:960px; top:540px; width:0; height:0; transform-style:preserve-3d; }
    #root .tile { position:absolute; overflow:hidden; border-radius:16px; background:#fff; box-shadow:0 0 0 1px rgba(29,29,31,.07), 0 18px 40px -22px rgba(29,29,31,.4); }
    #root .tile img, #root .tile video { position:absolute; left:0; top:0; width:100%; height:100%; object-fit:cover; }
    #root .tile b { position:absolute; left:18px; top:12px; font:500 19px Inter, sans-serif; color:#6e6e73; letter-spacing:-0.01em; }`;

const planeBody = (
  tiles: ReadonlyArray<PlaneTile>,
  duration: number,
  extra = "",
): string => `    <div class="stage" data-layout-allow-overflow>
      <div id="plane" class="plane" data-layout-allow-overflow>
${tiles
  .map((tile) => {
    const box = `left:${tile.x - tile.w / 2}px;top:${tile.y - tile.h / 2}px;width:${tile.w}px;height:${tile.h}px`;
    const remaining = duration - tile.land;
    const settled =
      tile.take === undefined ? "" : still(tile.take, lastTakeFrame);
    const picture =
      tile.src !== undefined
        ? `<img src="${tile.src}" alt="">`
        : tile.play === true
          ? `${video(`${tile.id}-v`, footage(tile.take ?? "", 18), tile.land, Math.min(TILE_MEDIA, remaining), "", 2)}${remaining > TILE_MEDIA ? `<img id="${tile.id}-s" src="${settled}" alt="" style="opacity:0">` : ""}`
          : `<img src="${settled}" alt="">`;
    return `        <div id="${tile.id}" class="tile" style="${box};opacity:0">${picture}${tile.label === undefined ? "" : `<b>${tile.label}</b>`}</div>`;
  })
  .join("\n")}
${extra}
      </div>
    </div>`;

/** Each tile falls from above the plane and settles with a small give. */
const planeDrops = (tiles: ReadonlyArray<PlaneTile>): string =>
  tiles
    .map(
      (tile) =>
        `tl.fromTo("#${tile.id}",{z:820,opacity:0},{z:0,opacity:1,duration:${DROP},ease:"power2.in"},${(tile.land - DROP).toFixed(3)});tl.to("#${tile.id}",{z:14,duration:0.08,ease:"power1.out"},${tile.land.toFixed(3)});tl.to("#${tile.id}",{z:0,duration:0.14,ease:"power1.in"},${(tile.land + 0.08).toFixed(3)});${tile.play === true ? `tl.set("#${tile.id}-s",{opacity:1},${(tile.land + TILE_MEDIA - 0.04).toFixed(3)});` : ""}`,
    )
    .join("\n    ");

/** A stable scatter for a tile's index. */
const jitter = (i: number): number => ((i * 2654435761) % 1000) / 1000;

const TILT = { rotationX: 50, rotationZ: -18 };

/* ------------------------------------------------------------ 4–8: the wall */

const WALL_TAKES = [
  "calendar",
  "table",
  "chat",
  "code-editor",
  "form",
  "kanban",
  "file-tree",
  "diagram",
  "timeline",
  "media-player",
  "tabs",
  "toast",
  "date-picker",
  "diff-viewer",
  "accordion",
  "avatar-group",
  "stepper",
  "log-viewer",
  "card",
  "progress",
  "markdown-editor",
  "qr-code",
  "inset-group",
  "tag-input",
  "time-picker",
  "virtual-table",
  "message",
  "keyboard-shortcuts",
  "alert",
  "property-panel",
  "gradient-text",
  "sidebar",
  "code-block",
  "frozen-table",
  "multi-step-form",
  "image-preview",
  "list",
  "drop-zone",
  "search-input",
  "item",
  "hexagon",
  "expandable-rows",
  "color-picker",
  "tree",
  "slider",
  "theme-toggler",
  "scroll-fade",
  "toggle-group",
  "surfaces",
  "shine-button",
  "input-group",
  "crop-area",
  "field",
  "reveal",
  "bubble",
  "user-menu",
  "pinned-list",
  "command-menu",
  "sliding-number",
  "fieldset",
  "aspect-ratio",
  "breadcrumb",
  "carousel",
  "collapsible",
  "combobox",
  "confirm-dialog",
  "context-menu",
  "copy-button",
  "countdown",
  "counting-number",
  "disclosure",
  "drawer",
  "dropdown-menu",
  "empty-state",
  "glyph",
  "highlight-text",
  "hotkey-recorder",
  "hover-card",
  "image-zoom",
  "inline-edit",
  "message-scroller",
  "mention-input",
  "motion-grid",
] as const;
const WALL_LIVE = new Set([
  "toast",
  "progress",
  "sliding-number",
  "reveal",
  "shine-button",
  "gradient-text",
  "hexagon",
  "chat",
  "timeline",
  "form",
  "stepper",
  "accordion",
]);
const CELL = { w: 400, h: 267, gap: 22 };
const WALL_COLS = 12;
const WALL_ROWS = 7;
const cellX = (col: number, cols: number) =>
  (col - (cols - 1) / 2) * (CELL.w + CELL.gap);
const cellY = (row: number, rows: number) =>
  (row - (rows - 1) / 2) * (CELL.h + CELL.gap);
const WALL_CENTRE = { col: 6, row: 3 };
const WALL_LENGTH = 4;
const wallCells = Array.from({ length: WALL_ROWS * WALL_COLS }, (_, i) => ({
  col: i % WALL_COLS,
  row: Math.floor(i / WALL_COLS),
})).filter(
  ({ col, row }) => col !== WALL_CENTRE.col || row !== WALL_CENTRE.row,
);
const WALL_ORIGIN = {
  x: cellX(WALL_CENTRE.col, WALL_COLS),
  y: cellY(WALL_CENTRE.row, WALL_ROWS),
};
const reach = Math.hypot(6 * (CELL.w + CELL.gap), 3 * (CELL.h + CELL.gap));
const wallTiles: ReadonlyArray<PlaneTile> = WALL_TAKES.map((name, i) => {
  const cell = wallCells[i]!;
  const x = cellX(cell.col, WALL_COLS);
  const y = cellY(cell.row, WALL_ROWS);
  const dist = Math.hypot(x - WALL_ORIGIN.x, y - WALL_ORIGIN.y) / reach;
  return {
    id: `t${i}`,
    take: `${i % 4 === 2 ? "dark-" : ""}tile-${name}`,
    play: WALL_LIVE.has(name),
    x,
    y,
    w: CELL.w,
    h: CELL.h,
    land: 0.45 + dist * 2.95 + jitter(i) * 0.3,
  };
});
const CHECKBOX_SCALE = (1080 * PUSH[4]) / CELL.h;
const wall: Scene = {
  id: "wall",
  start: 4,
  duration: WALL_LENGTH,
  css: planeCss,
  body: planeBody(
    wallTiles,
    WALL_LENGTH,
    `<div id="t-check" class="tile" style="left:${WALL_ORIGIN.x - CELL.w / 2}px;top:${WALL_ORIGIN.y - CELL.h / 2}px;width:${CELL.w}px;height:${CELL.h}px;background:${GROUND}"><img src="${still("cu-checkbox", 59)}" alt=""></div>`,
  ),
  // The last close-up is the first tile: the plane opens flat at exactly the
  // montage's framing, then tips back as the rest of the wall falls onto it.
  script: `tl.set("#plane",{scale:${CHECKBOX_SCALE.toFixed(4)},x:${(-WALL_ORIGIN.x * CHECKBOX_SCALE).toFixed(1)},y:${(-WALL_ORIGIN.y * CHECKBOX_SCALE).toFixed(1)},rotationX:0,rotationZ:0},0);
    tl.to("#plane",{scale:0.92,x:40,y:90,...${JSON.stringify(TILT)},duration:0.7,ease:"expo.inOut"},0.02);
    tl.to("#plane",{scale:0.5,x:-30,y:70,rotationX:46,rotationZ:-14,duration:${WALL_LENGTH - 0.72},ease:"none"},0.72);
    ${planeDrops(wallTiles)}`,
};

/* ------------------------------------------------------------ 8–13: the apps */

const APPS = { start: 8, length: 5, launcherFor: 1, vaultFor: 2 };
const WIN = { x: 110, y: 186, w: 1700 };
const cursorOn = (
  take: string,
  id: string,
  start: number,
  mediaStart: number,
  duration: number,
  w: number,
  logical: number,
) => cursorClip(id, take, start, mediaStart, duration, w / (2 * logical));
const apps: Scene = {
  id: "apps",
  start: APPS.start,
  duration: APPS.length,
  css: `#root .under { position:absolute; inset:0; }
    #root .under img { position:absolute; inset:0; width:100%; height:100%; }
    #root .scrim { position:absolute; inset:0; background:${GROUND}; opacity:0; }
    #root .win { position:absolute; left:${WIN.x}px; top:${WIN.y}px; width:${WIN.w}px; border-radius:18px; overflow:hidden; box-shadow:0 0 0 1px rgba(29,29,31,.1), 0 50px 90px -40px rgba(29,29,31,.5); opacity:0; }
    #root .win video { position:relative; display:block; width:100%; height:auto; }
    #root .hud { position:absolute; left:510px; top:270px; width:900px; border-radius:22px; overflow:hidden; box-shadow:0 0 0 1px rgba(255,255,255,.14), 0 60px 110px -30px rgba(0,0,0,.65); opacity:0; transform-origin:50% 50%; }
    #root .hud video { position:relative; display:block; width:100%; height:auto; }
    #root .cursor { width:56px; }`,
  body: `    <div class="under"><img src="assets/footage/wall-end.png" alt=""></div>
    <div id="a-scrim" class="scrim"></div>
    <div id="a-vault" class="win">${video("a-vault-v", footage("vault-v8", 12), APPS.launcherFor, APPS.vaultFor, "", 2)}<div id="a-vc" class="cursor">${CURSOR}</div></div>
    <div id="a-dash" class="win">${clip("a-dash-v", footage("dashboard-v8", 12), APPS.launcherFor + APPS.vaultFor, 2, 0, "", 3)}<div id="a-dc" class="cursor">${CURSOR}</div></div>
    <div id="a-hud" class="hud">${video("a-hud-v", footage("launcher-v8", 12), 0, APPS.launcherFor + 0.1, "", 1)}</div>`,
  script: `tl.to("#a-scrim",{opacity:0.72,duration:0.25,ease:"power2.out"},0);
    tl.fromTo("#a-hud",{opacity:0,scale:0.94,y:-16},{opacity:1,scale:1,y:0,duration:0.28,ease:"back.out(1.6)"},0);
    // Enter: the panel grows into the window it opened.
    tl.to("#a-hud",{scale:2.05,y:190,opacity:0,duration:0.32,ease:"expo.in"},${(APPS.launcherFor - 0.22).toFixed(2)});
    tl.fromTo("#a-vault",{opacity:0,scale:0.48,y:-60},{opacity:1,scale:1,y:0,duration:0.42,ease:"expo.out"},${APPS.launcherFor.toFixed(2)});
    tl.to("#a-scrim",{opacity:1,duration:0.3},${APPS.launcherFor.toFixed(2)});
    ${cursorOn("vault-v8", "a-vc", APPS.launcherFor, 0, APPS.vaultFor, WIN.w, 980)}
    // Three-finger swipe: the next window pushes this one off.
    tl.to("#a-vault",{x:-1900,duration:0.42,ease:"power3.inOut"},${(APPS.launcherFor + APPS.vaultFor - 0.2).toFixed(2)});
    tl.set("#a-dash",{opacity:1},${(APPS.launcherFor + APPS.vaultFor - 0.2).toFixed(2)});
    tl.fromTo("#a-dash",{x:1900},{x:0,duration:0.42,ease:"power3.inOut"},${(APPS.launcherFor + APPS.vaultFor - 0.2).toFixed(2)});
    // In on the chart for the two range presses, and back out for the handoff.
    tl.set("#a-dash",{transformOrigin:"78% 27%"},0);
    tl.to("#a-dash",{scale:1.55,y:-24,duration:0.4,ease:"power3.inOut"},${(APPS.launcherFor + APPS.vaultFor + 0.12).toFixed(2)});
    tl.to("#a-dash",{scale:1,y:0,duration:0.42,ease:"power3.inOut"},${(APPS.launcherFor + APPS.vaultFor + 1.56).toFixed(2)});
    ${cursorOn("dashboard-v8", "a-dc", APPS.launcherFor + APPS.vaultFor, 0, 2, WIN.w, 1400)}`,
};

/* ------------------------------------------------------------ 13–16: the charts */

const CHARTS = [
  ["bar", "BarChart"],
  ["line", "LineChart"],
  ["donut", "DonutChart"],
  ["area", "AreaChart"],
  ["treemap", "TreemapChart"],
  ["radar", "RadarChart"],
  ["candle", "CandleChart"],
  ["pie", "PieChart"],
  ["funnel", "FunnelChart"],
  ["sankey", "SankeyChart"],
  ["stacked", "StackedBar"],
  ["radial", "RadialChart"],
  ["scatter", "ScatterChart"],
  ["composed", "ComposedChart"],
  ["sunburst", "SunburstChart"],
  ["radial-bar", "RadialBarChart"],
  ["sparkline", "Sparkline"],
] as const;
const CHARTS_START = 13;
const CHARTS_LENGTH = 3;
const CARD = { w: 400, h: 267, gap: 22 };
const CHART_COLS = 5;
const CHART_ROWS = 4;
const SLOTS = Array.from({ length: CHART_COLS * CHART_ROWS }, (_, i) => ({
  col: i % CHART_COLS,
  row: Math.floor(i / CHART_COLS),
}));
const cardX = (col: number) =>
  (col - (CHART_COLS - 1) / 2) * (CARD.w + CARD.gap);
const cardY = (row: number) =>
  (row - (CHART_ROWS - 1) / 2) * (CARD.h + CARD.gap);
const DASH_SLOT = { col: 2, row: 1 };
const SETTINGS_SLOT = { col: 2, row: 2 };
const chartSlots = SLOTS.filter(
  ({ col, row }) =>
    !(col === DASH_SLOT.col && row === DASH_SLOT.row) &&
    !(col === SETTINGS_SLOT.col && row === SETTINGS_SLOT.row),
);
const chartTiles: ReadonlyArray<PlaneTile> = CHARTS.map(([name, label], i) => {
  const slot = chartSlots[i]!;
  const dist = Math.hypot(slot.col - DASH_SLOT.col, slot.row - DASH_SLOT.row);
  return {
    id: `c${i}`,
    take: `${i % 5 === 1 ? "dark-" : ""}chart-${name}`,
    play: true,
    label,
    x: cardX(slot.col),
    y: cardY(slot.row),
    w: CARD.w,
    h: CARD.h,
    land: 0.55 + dist * 0.28 + jitter(i) * 0.14,
  };
});
const DASH_H = Math.round((CARD.w * 900) / 1400);
const SETTINGS_H = Math.round((CARD.w * 470) / 880);
const dashTile = { x: cardX(DASH_SLOT.col), y: cardY(DASH_SLOT.row) };
const settingsTile = {
  x: cardX(SETTINGS_SLOT.col),
  y: cardY(SETTINGS_SLOT.row),
};
/** The Settings window as the desktops show it. */
const SETTINGS_WIN = {
  w: 1320,
  x: 300,
  y: 196,
  h: Math.round((1320 * 470) / 880),
};
const DASH_SCALE = WIN.w / CARD.w;
const SETTINGS_SCALE = SETTINGS_WIN.w / CARD.w;

/* The desktops around one window: wallpaper to the edges and the system's own furniture. */
const dockTile = (fill: string) => `<i style="background:${fill}"></i>`;
const DOCK = [
  "linear-gradient(#5ac8fa,#007aff)",
  "linear-gradient(#ffd60a,#ff9f0a)",
  "linear-gradient(#30d158,#248a3d)",
  "linear-gradient(#ff6482,#ff2d55)",
  "linear-gradient(#bf5af2,#5e5ce6)",
  "linear-gradient(#8e8e93,#48484a)",
];
const desktopCss = `#root .desk { position:absolute; inset:0; overflow:hidden; font-family:Inter, sans-serif; }
    #root .desk > img.wall { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
    #root .gnome-wall { position:absolute; inset:0; background:linear-gradient(160deg,#1c71d8 0%,#3584e4 34%,#26a269 68%,#1b5e4a 100%); }
    #root .macbar { position:absolute; left:0; right:0; top:0; height:34px; display:flex; align-items:center; gap:22px; padding:0 18px; background:rgba(255,255,255,.34); color:#111; font-size:17px; font-weight:500; }
    #root .macbar b { font-weight:700; } #root .macbar span.r { margin-left:auto; }
    #root .dock { position:absolute; left:50%; bottom:12px; transform:translateX(-50%); display:flex; gap:10px; padding:9px 12px; border-radius:24px; background:rgba(255,255,255,.34); box-shadow:0 0 0 1px rgba(255,255,255,.4); }
    #root .dock i { display:block; width:62px; height:62px; border-radius:15px; }
    #root .dock img { display:block; width:62px; height:62px; border-radius:15px; background:#fff; }
    #root .winbar { position:absolute; left:0; right:0; bottom:0; height:62px; display:flex; align-items:center; justify-content:center; gap:10px; background:rgba(243,243,243,.92); color:#111; font-size:16px; }
    #root .winbar i { display:block; width:36px; height:36px; border-radius:7px; }
    #root .winbar .start { display:grid; grid-template-columns:15px 15px; gap:2px; width:32px; height:32px; }
    #root .winbar .start u { display:block; background:#0078d4; }
    #root .winbar .search { width:220px; height:36px; line-height:36px; padding-left:16px; border-radius:18px; background:#fff; color:#666; box-shadow:0 0 0 1px rgba(0,0,0,.08); }
    #root .winbar .tray { position:absolute; right:18px; text-align:right; line-height:21px; }
    #root .gbar { position:absolute; left:0; right:0; top:0; height:36px; display:flex; align-items:center; padding:0 12px; background:#000; color:#fff; font-size:16px; font-weight:600; }
    #root .gbar .act { padding:3px 13px; border-radius:14px; background:rgba(255,255,255,.18); }
    #root .gbar .clock { position:absolute; left:0; right:0; text-align:center; }
    #root .gbar .sys { margin-left:auto; }
    #root .dash { position:absolute; left:50%; bottom:14px; transform:translateX(-50%); display:flex; gap:12px; padding:12px; border-radius:26px; background:rgba(40,40,44,.82); }
    #root .dash i { display:block; width:58px; height:58px; border-radius:50%; }`;
const macDesk = (
  id: string,
) => `<div id="${id}" class="desk"><img class="wall" src="assets/wallpaper/omarchy.jpg" alt="">
      <div class="macbar"><b>Settings</b><span>File</span><span>Edit</span><span>View</span><span>Window</span><span>Help</span><span class="r">Fri 6 Nov 9:41</span></div>
      <div class="dock"><img src="assets/logo.png" alt="">${DOCK.map(dockTile).join("")}</div></div>`;
const winDesk = (
  id: string,
) => `<div id="${id}" class="desk"><img class="wall" src="assets/wallpaper/windows.jpg" alt="">
      <div class="winbar"><div class="start"><u></u><u></u><u></u><u></u></div><div class="search">Search</div>${DOCK.map(dockTile).join("")}<div class="tray">9:41 AM<br>11/6/2026</div></div></div>`;
const gnomeDesk = (
  id: string,
) => `<div id="${id}" class="desk"><div class="gnome-wall"></div>
      <div class="gbar"><span class="act">Activities</span><span class="clock">Fri Nov 6  9:41</span><span class="sys">Wi-Fi  ·  100%</span></div>
      <div class="dash">${DOCK.map(dockTile).join("")}</div></div>`;

const charts: Scene = {
  id: "charts",
  start: CHARTS_START,
  duration: CHARTS_LENGTH,
  css: `${planeCss}\n    ${desktopCss}`,
  body: `    <div id="c-desk" style="position:absolute;inset:0;opacity:0">${macDesk("c-mac")}</div>
${planeBody(
  chartTiles,
  CHARTS_LENGTH,
  `<div id="c-dash" class="tile" style="left:${dashTile.x - CARD.w / 2}px;top:${dashTile.y - DASH_H / 2}px;width:${CARD.w}px;height:${DASH_H}px"><img src="${still("dashboard-v8", 59)}" alt=""></div>
        <div id="c-set" class="tile" style="left:${settingsTile.x - CARD.w / 2}px;top:${settingsTile.y - SETTINGS_H / 2}px;width:${CARD.w}px;height:${SETTINGS_H}px;opacity:0"><img src="${still("settings-v8", 0)}" alt=""></div>`,
)}`,
  // In: the dashboard's window shrinks into its slot as the plane tips back.
  // Out: Settings falls last, and the plane levels until it is the desktop's window.
  script: `tl.set("#plane",{scale:${DASH_SCALE.toFixed(4)},x:${(-dashTile.x * DASH_SCALE).toFixed(1)},y:${(WIN.y + (WIN.w * 900) / 1400 / 2 - 540 - dashTile.y * DASH_SCALE).toFixed(1)},rotationX:0,rotationZ:0},0);
    tl.to("#plane",{scale:0.84,x:20,y:66,...${JSON.stringify(TILT)},duration:0.6,ease:"expo.inOut"},0);
    tl.to("#plane",{scale:0.76,x:-10,y:48,rotationX:46,rotationZ:-15,duration:1.72,ease:"none"},0.6);
    ${planeDrops(chartTiles)}
    tl.fromTo("#c-set",{z:900,opacity:0},{z:0,opacity:1,duration:0.36,ease:"power2.in"},1.96);
    tl.to("#plane",{scale:${SETTINGS_SCALE.toFixed(4)},x:${(-settingsTile.x * SETTINGS_SCALE).toFixed(1)},y:${(SETTINGS_WIN.y + SETTINGS_WIN.h / 2 - 540 - settingsTile.y * SETTINGS_SCALE).toFixed(1)},rotationX:0,rotationZ:0,duration:0.68,ease:"expo.inOut"},2.32);
    ${[...chartTiles.map((t) => `#${t.id}`), "#c-dash"].map((sel) => `tl.to("${sel}",{opacity:0,duration:0.3},2.5);`).join("")}
    tl.to("#c-desk",{opacity:1,duration:0.4,ease:"power2.out"},2.6);`,
};

/* ------------------------------------------------------------ 16–19: three desktops */

const DESK_START = 16;
const DESK_LENGTH = 3;
const PRESS_WIN = 1;
const PRESS_LINUX = 2;
const lookAt = cursorOf("settings-v8");
const pointAt = (frame: number) => {
  const sample = lookAt.find((s) => s.frame === frame)!;
  const k = SETTINGS_WIN.w / (2 * 880);
  return { x: SETTINGS_WIN.x + sample.x * k, y: SETTINGS_WIN.y + sample.y * k };
};
const pW = pointAt(PRESS_WIN * FPS);
const pL = pointAt(PRESS_LINUX * FPS);
const desktops: Scene = {
  id: "desktops",
  start: DESK_START,
  duration: DESK_LENGTH,
  css: `${desktopCss}
    #root .window { position:absolute; left:${SETTINGS_WIN.x}px; top:${SETTINGS_WIN.y}px; width:${SETTINGS_WIN.w}px; height:${SETTINGS_WIN.h}px; box-shadow:0 60px 100px -36px rgba(0,0,0,.6); border-radius:19px; overflow:hidden; }
    #root .window video { position:relative; display:block; width:100%; height:100%; }
    #root .cursor { width:56px; z-index:5; }`,
  body: `    ${macDesk("d-mac")}
    <div id="d-win-layer" style="position:absolute;inset:0;clip-path:circle(0px at ${pW.x.toFixed(0)}px ${pW.y.toFixed(0)}px)">${winDesk("d-win")}</div>
    <div id="d-gnome-layer" style="position:absolute;inset:0;clip-path:circle(0px at ${pL.x.toFixed(0)}px ${pL.y.toFixed(0)}px)">${gnomeDesk("d-gnome")}</div>
    <div id="d-window" class="window">${video("d-v", footage("settings-v8", 12), 0, DESK_LENGTH, "", 2)}<div id="d-cur" class="cursor">${CURSOR}</div></div>`,
  // Each press and its wipe share a frame; the window's own chrome is the take's.
  script: `tl.to("#d-win-layer",{clipPath:"circle(2300px at ${pW.x.toFixed(0)}px ${pW.y.toFixed(0)}px)",duration:0.55,ease:"expo.out"},${(PRESS_WIN + 1 / FPS).toFixed(3)});
    tl.to("#d-gnome-layer",{clipPath:"circle(2300px at ${pL.x.toFixed(0)}px ${pL.y.toFixed(0)}px)",duration:0.55,ease:"expo.out"},${(PRESS_LINUX + 1 / FPS).toFixed(3)});
    ${cursorClip("d-cur", "settings-v8", 0, 0, DESK_LENGTH, SETTINGS_WIN.w / (2 * 880))}`,
};

/* ------------------------------------------------------------ 19–21: Omarchy */

const OM_START = 19;
const OM_LENGTH = 2;
const THEMES = ["rose-pine", "gruvbox", "catppuccin-latte", "tokyo"] as const;
/** The terminal pane in the tiling take, in frame fractions (measured from the still). */
const PANE = { x: 0.55, y: 0.075, w: 0.42, h: 0.46 };
const paneZoom = 1 / PANE.w;
const omarchy: Scene = {
  id: "omarchy",
  start: OM_START,
  duration: OM_LENGTH,
  css: `#root .full { position:absolute; inset:0; width:100%; height:100%; }
    #root #o-all { position:absolute; inset:0; transform-origin:0 0; }
    #root .t { position:absolute; inset:0; }
    #root .fly { position:absolute; left:${SETTINGS_WIN.x}px; top:${SETTINGS_WIN.y}px; width:${SETTINGS_WIN.w}px; border-radius:19px; }
    ${desktopCss}`,
  body: `    ${gnomeDesk("o-gnome")}
    <div id="o-all" style="opacity:0">
${THEMES.map((t, i) => `      <div id="o-t${i}" class="t" style="clip-path:${i === 0 ? "none" : "circle(0px at 960px 18px)"}"><img class="full" src="${still(`omarchy-${t}`, lastTakeFrame)}" alt=""></div>`).join("\n")}
    </div>
    <img id="o-fly" class="fly" src="${still("settings-v8", 89)}" alt="">`,
  script: `tl.to("#o-all",{opacity:1,duration:0.3,ease:"power2.out"},0.05);
    tl.to("#o-fly",{x:-270,y:-110,scale:0.6,opacity:0,duration:0.4,ease:"expo.inOut"},0);
    ${THEMES.slice(1)
      .map(
        (_, i) =>
          `tl.to("#o-t${i + 1}",{clipPath:"circle(2300px at 960px 18px)",duration:0.34,ease:"expo.out"},${(0.5 + i * 0.4).toFixed(2)});`,
      )
      .join("\n    ")}
    // The camera pushes into the terminal pane, which becomes the next scene.
    tl.to("#o-all",{x:${(-PANE.x * 1920 * paneZoom).toFixed(1)},y:${(-PANE.y * 1080 * paneZoom + (1080 - PANE.h * 1080 * paneZoom) / 2).toFixed(1)},scale:${paneZoom.toFixed(3)},duration:0.42,ease:"expo.in"},${(OM_LENGTH - 0.42).toFixed(2)});`,
};

/* ------------------------------------------------------------ 21–24: the terminal */

const TERM_START = 21;
const TERM_LENGTH = 3;
const SSH = "ssh gon@whale-island";
const RUN = "nub run dev settings --terminal";
const CHARS_PER_FRAME = 2;
const TYPE_AT = 0.3;
const typeTime = (text: string) =>
  Math.ceil(text.length / CHARS_PER_FRAME) / FPS;
const T_LOGIN = TYPE_AT + typeTime(SSH) + 0.1;
const T_RUN = T_LOGIN + 0.1;
const T_APP = 1.4;
const typed = (id: string, text: string, from: number): string =>
  Array.from(
    { length: Math.ceil(text.length / CHARS_PER_FRAME) },
    (_, i) =>
      `tl.set("#${id}",{textContent:${JSON.stringify(text.slice(0, (i + 1) * CHARS_PER_FRAME))}},${(from + i / FPS).toFixed(3)});`,
  ).join("");
const APP_W = 1500;
const APP_H = Math.round((APP_W * 576) / 1024);
const APP_X = 210;
const APP_Y = 40;
const TERM_BG = "#1a1b26";
const terminal: Scene = {
  id: "terminal",
  start: TERM_START,
  duration: TERM_LENGTH,
  css: `#root .shell { position:absolute; inset:0; background:${TERM_BG}; padding:44px 60px; font:500 34px/50px "JetBrains Mono", Menlo, monospace; color:#c0caf5; }
    #root .shell b { font-weight:600; color:#7aa2f7; } #root .shell .dim { color:#565f89; } #root .shell .off { opacity:0; }
    #root .app { position:absolute; left:${APP_X}px; top:${APP_Y}px; width:${APP_W}px; height:${APP_H}px; opacity:0; overflow:hidden; }
    #root .app video { position:relative; display:block; width:100%; height:100%; }
    #root .status { position:absolute; left:0; right:0; bottom:0; height:44px; display:flex; align-items:center; gap:24px; padding:0 22px; background:#7aa2f7; color:#1a1b26; font:600 24px "JetBrains Mono", Menlo, monospace; }
    #root .status span:last-child { margin-left:auto; }
    #root .cursor { width:56px; }`,
  body: `    <div id="term" class="shell">
      <div><b>~ ❯</b> <span id="t-ssh"></span></div>
      <div id="t-login" class="dim off">Last login: Fri Nov 6 09:41:07 2026 from 10.0.0.2</div>
      <div id="t-runline" class="off"><b>gon@whale-island ~ ❯</b> <span id="t-run"></span></div>
    </div>
    <div id="t-app" class="app">${video("t-v", footage("term-v8", 12), T_APP, TERM_LENGTH - T_APP, "", 2)}<div id="t-cur" class="cursor">${CURSOR}</div></div>
    <div class="status"><span>0:nub*</span><span>gon@whale-island</span><span>ssh · 120×40 · 09:41</span></div>`,
  script: `${typed("t-ssh", SSH, TYPE_AT)}
    tl.set("#t-login",{opacity:1},${T_LOGIN.toFixed(3)});
    tl.set("#t-runline",{opacity:1},${T_RUN.toFixed(3)});
    ${typed("t-run", RUN, T_RUN)}
    tl.set("#term > div",{opacity:0},${T_APP.toFixed(3)});
    tl.set("#t-app",{opacity:1},${T_APP.toFixed(3)});
    ${cursorClip("t-cur", "term-v8", T_APP, 0, TERM_LENGTH - T_APP, APP_W / (2 * 1024))}`,
};

/* ------------------------------------------------------------ 24–26: the packages */

const PACKAGES = [
  [
    ["TanStack DB", "tanstack"],
    ["TanStack AI", "tanstack"],
    ["TanStack Hotkeys", "tanstack"],
    ["TanStack Virtual", "tanstack"],
    ["TanStack Table", "tanstack"],
  ],
  [
    ["Effect", "effect"],
    ["Better Auth", "better-auth"],
    ["react-doctor", ""],
    ["TanStack Form", "tanstack"],
    ["and more", ""],
  ],
] as const;
const PKG_START = 24;
const PKG_LENGTH = 2;
const chip = (name: string, logo: string, id: string) =>
  `<div id="${id}" class="chip">${logo === "" ? `<i></i>` : `<img src="assets/logos/${logo}.svg" alt="">`}<span>${name}</span></div>`;
const npm: Scene = {
  id: "npm",
  start: PKG_START,
  duration: PKG_LENGTH,
  css: `#root .row { position:absolute; left:0; right:0; display:flex; justify-content:center; gap:16px; white-space:nowrap; }
    #root .chip { display:flex; align-items:center; gap:16px; height:100px; padding:0 30px; border-radius:20px; background:#fff; box-shadow:0 0 0 1px rgba(29,29,31,.07), 0 16px 34px -20px rgba(29,29,31,.4); font:500 36px Inter, sans-serif; letter-spacing:-0.02em; color:${INK}; }
    #root .chip img { width:40px; height:40px; }
    #root .chip i { display:block; width:26px; height:26px; border-radius:7px; background:#c7c7cc; }
    #root .outgoing { position:absolute; inset:0; background:${TERM_BG}; }`,
  body: `    ${PACKAGES.map(
    (row, r) =>
      `<div id="n-row${r}" class="row" style="top:${r === 0 ? 300 : 690}px">${row.map(([name, logo], i) => chip(name, logo, `n-${r}-${i}`)).join("")}</div>`,
  ).join("\n    ")}
    <div id="n-out" class="outgoing"><img src="${still("term-v8", 59)}" alt="" style="position:absolute;left:${APP_X}px;top:${APP_Y}px;width:${APP_W}px;height:${APP_H}px"></div>`,
  // The terminal lifts away on the first stab; a chip lands on every beat after.
  script: `tl.to("#n-out",{y:-1090,duration:0.34,ease:"expo.inOut"},0);
    tl.fromTo("#n-row0",{x:24},{x:-24,duration:${PKG_LENGTH},ease:"none"},0);
    tl.fromTo("#n-row1",{x:-24},{x:24,duration:${PKG_LENGTH},ease:"none"},0);
    ${PACKAGES.flatMap((row, r) =>
      row.map(
        (_, i) =>
          `tl.fromTo("#n-${r}-${i}",{y:${r === 0 ? -60 : 60},opacity:0,scale:0.9},{y:0,opacity:1,scale:1,duration:0.26,ease:"back.out(1.8)"},${(0.1 + r * 0.12 + i * 0.13).toFixed(2)});`,
      ),
    ).join("\n    ")}
    ${PACKAGES.flatMap((row, r) =>
      row.map(
        (_, i) =>
          `tl.to("#n-${r}-${i}",{x:${(2 - i) * 330},y:${r === 0 ? 240 : -150},scale:0.1,opacity:0,duration:0.24,ease:"power3.in"},${(PKG_LENGTH - 0.24).toFixed(2)});`,
      ),
    ).join("\n    ")}`,
};

/* ------------------------------------------------------------ 26–30: the end */

const end: Scene = {
  id: "end",
  start: 26,
  duration: 4,
  css: `#root .lockup { position:absolute; inset:0; }
    #root .mark { position:absolute; left:50%; top:290px; width:200px; height:200px; margin-left:-100px; }
    #root .name { position:absolute; left:0; right:0; top:520px; text-align:center; font:500 92px Inter, sans-serif; letter-spacing:-0.035em; color:${INK}; }
    #root .url { position:absolute; left:0; right:0; top:648px; text-align:center; font:400 46px Inter, sans-serif; letter-spacing:-0.015em; color:#6e6e73; }
    #root .credit { position:absolute; left:0; right:0; top:950px; text-align:center; font:400 30px Inter, sans-serif; color:#6e6e73; }
    #root .credit u { color:${INK}; text-underline-offset:5px; }`,
  body: `    <div class="lockup">
      <img id="e-mark" class="mark" src="assets/logo.png" alt="">
      <div id="e-name" class="name">GPUIxUI</div>
      <div id="e-url" class="url">gpuixui.sudokw.com</div>
      <div id="e-credit" class="credit">Made with ☕ by <u>@sudo_kw</u></div>
    </div>`,
  script: `tl.fromTo("#e-mark",{scale:0.2,opacity:0},{scale:1,opacity:1,duration:0.5,ease:"back.out(1.9)"},0);
    tl.fromTo("#e-name",{y:18,opacity:0},{y:0,opacity:1,duration:0.4,ease:"power3.out"},0.45);
    tl.fromTo("#e-url",{y:14,opacity:0},{y:0,opacity:1,duration:0.4,ease:"power3.out"},1);
    tl.fromTo("#e-credit",{opacity:0},{opacity:1,duration:0.4},1.5);`,
};

const scenes = [
  montage,
  wall,
  apps,
  charts,
  desktops,
  omarchy,
  terminal,
  npm,
  end,
];
const LENGTH = 30;

/* ------------------------------------------------------------ lines and sound */

/** One line at a time; `on` is the colour it needs over a full-bleed picture. */
const LINES: ReadonlyArray<
  readonly [number, number, string, ("light" | "pill" | "ink")?]
> = [
  [4.9, 8, "every component you need"],
  [9, 13, "real apps, in react"],
  [13.6, 15.6, "and every chart"],
  [16.15, 19, "native on mac, windows & linux", "light"],
  [19.2, 20.6, "follows your omarchy theme", "pill"],
  [22.4, 24, "the same app, over ssh", "pill"],
  [24.25, 25.76, "works with your npm packages", "ink"],
];

const F = 1 / FPS;
/** A cue: when, which sample, and an optional level (0.9 is the default bed). */
const keyCues = (
  text: string,
  from: number,
): ReadonlyArray<readonly [number, string, number?]> =>
  Array.from({ length: Math.ceil(text.length / CHARS_PER_FRAME) }, (_, i) => i)
    .filter((i) => i % 2 === 0)
    .map((i, n) => [from + i / FPS, `key-${n % 4}`, 0.7] as const);
const SCENE = (scene: Scene, at: number) => scene.start + at;
const CUES: ReadonlyArray<readonly [number, string, number?]> = [
  ...MONTAGE.map(
    // A close-up's state changes on release, three frames after its press.
    ({ sound }, i) =>
      [i * BEAT_CUT + PRESS_AT - LEAD_IN + 3 * F, sound] as const,
  ),
  ...[20, 24, 28, 32, 36].map(
    (frame, n) =>
      [2 * BEAT_CUT + frame / FPS - LEAD_IN + F, `detent-${n + 2}`] as const,
  ),
  // The wall falls in waves: a tick for a landing every few tiles, thinned so a
  // sound always has a picture.
  [SCENE(wall, 0), "air", 0.6],
  ...wallTiles
    .slice()
    .sort((a, b) => a.land - b.land)
    .filter((_, i) => i % 6 === 0)
    .map((tile, i) => [SCENE(wall, tile.land), `cap-${i % 4}`, 0.5] as const),
  // ⌘K, three keys, Enter.
  [8, "press"],
  ...[12, 15, 18].map((frame, n) => [8 + frame / FPS + F, `key-${n}`] as const),
  [8 + APPS.launcherFor - 0.22, "thud"],
  // The take's own presses.
  ...[24, 46].map(
    (frame) => [8 + APPS.launcherFor + frame / FPS + F, "press"] as const,
  ),
  [8 + APPS.launcherFor + APPS.vaultFor - 0.2, "air", 0.6],
  ...[15, 30].map(
    (frame) =>
      [
        8 + APPS.launcherFor + APPS.vaultFor + frame / FPS + F,
        "press",
      ] as const,
  ),
  [CHARTS_START, "air", 0.6],
  ...chartTiles
    .slice()
    .sort((a, b) => a.land - b.land)
    .filter((_, i) => i % 3 === 0)
    .map(
      (tile, i) => [SCENE(charts, tile.land), `glass-${i % 3}`, 0.45] as const,
    ),
  [SCENE(charts, 2.32), "land"],
  [DESK_START + PRESS_WIN + F, "look-win"],
  [DESK_START + PRESS_LINUX + F, "look-linux"],
  [OM_START, "air", 0.5],
  ...[0, 1, 2].map(
    (i) => [OM_START + 0.5 + i * 0.4 + F, `glass-${i}`, 1] as const,
  ),
  [TERM_START - 0.42, "air", 0.6],
  ...keyCues(SSH, TERM_START + TYPE_AT),
  [TERM_START + T_LOGIN - 0.03, "press", 0.6],
  ...keyCues(RUN, TERM_START + T_RUN),
  [TERM_START + T_APP, "land"],
  ...[15, 30].map(
    (frame) => [TERM_START + T_APP + frame / FPS + F, "press"] as const,
  ),
  [PKG_START, "air", 0.6],
  ...PACKAGES.flatMap((row, r) =>
    row.map(
      (_, i) =>
        [
          PKG_START + 0.1 + r * 0.12 + i * 0.13 + 0.1,
          `cap-${(r + i) % 4}`,
          0.55,
        ] as const,
    ),
  ),
  [26.03, "mark"],
];

/** A sound's own length, so its slot is never longer than the file. */
const lengthOf = (sound: string): number =>
  Number(
    execFileSync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      at(`assets/sfx/${sound}.wav`),
    ])
      .toString()
      .trim(),
  );

const index = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>GPUIxUI — launch</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: ${GROUND}; }
      .line { position: absolute; left: 0; right: 0; top: 0; height: 200px; padding-top: 58px; text-align: center; font: 400 62px Inter, sans-serif; letter-spacing: -0.025em; color: ${INK}; background: linear-gradient(${GROUND} 58%, rgba(244, 242, 238, 0)); }
      .line.light { height: auto; padding-top: 72px; background: none; color: #fff; font-weight: 500; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5), 0 4px 40px rgba(0, 0, 0, 0.6); }
      .line.ink { top: 500px; font-size: 72px; height: auto; padding-top: 0; background: none; }
      .line.pill { top: auto; bottom: 66px; height: auto; padding: 0; background: none; }
      .line.pill span { display: inline-block; padding: 14px 34px; border-radius: 26px; font-size: 50px; color: #fff; background: rgba(12, 12, 16, 0.76); }
    </style>
  </head>
  <body>
    <!-- The launch film v8 (plan 069), written by build.ts: ${LENGTH} s on the score's 120 BPM grid. -->
    <div id="root" data-composition-id="main" data-start="0" data-duration="${LENGTH}" data-width="1920" data-height="1080">
${scenes.map((s) => `      <div id="${s.id}" data-composition-id="${s.id}" data-composition-src="compositions/${s.id}.html" data-start="${s.start}" data-duration="${s.duration}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>`).join("\n")}
${LINES.map(([start, stop, text, on], i) => `      <div id="line-${i}" class="line ${on ?? ""} clip" data-start="${start}" data-duration="${(stop - start).toFixed(2)}" data-track-index="9"><span id="line-${i}-t">${text}</span></div>`).join("\n")}
      <audio id="score" class="clip" data-start="0" data-duration="${LENGTH}" data-track-index="19" data-volume="0.28" data-fade-out="1.5" src="assets/music/score.wav"></audio>
${CUES.map(([time, sound, volume], i) => `      <audio id="sfx-${String(i).padStart(2, "0")}" class="clip" data-start="${time.toFixed(3)}" data-duration="${lengthOf(sound).toFixed(3)}" data-track-index="${20 + (i % 8)}" data-volume="${volume ?? 0.9}" src="assets/sfx/${sound}.wav"></audio>`).join("\n")}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      ${LINES.map(([start], i) => `tl.fromTo("#line-${i}-t",{opacity:0.25},{opacity:1,duration:0.3,ease:"power2.out"},${start});`).join("\n      ")}
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;

const written = [
  ...scenes.map((scene) => at(`compositions/${scene.id}.html`)),
  at("index.html"),
];
scenes.forEach((scene, i) => writeFileSync(written[i]!, composition(scene)));
writeFileSync(at("index.html"), index);
// The written files meet the repo's formatter, as hand-written ones do.
execFileSync(at("../../node_modules/.bin/oxfmt"), ["--write", ...written], {
  stdio: "ignore",
});
