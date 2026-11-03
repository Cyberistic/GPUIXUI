/**
 * The launch film v4 (plan 066), written from one timeline table: encodes the
 * takes it uses into `assets/footage/`, then writes `index.html` and one
 * composition per scene. A retime is one edit here; nothing is pasted by hand.
 *
 *   nub media/launch/build.ts
 *
 * Every product picture is a real take (`takes/<name>/`, the native renderer's
 * frames) or a stage recording of real takes (`takes/stage-*`, see
 * `stage/README.md`). The film draws only the ground, the lines, the window
 * frames, the cursor and the end card.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";

const FPS = 30;
const HERE = new URL(".", import.meta.url).pathname;
const at = (path: string) => `${HERE}${path}`;
const GROUND = "#F4F2EE";
const INK = "#1D1D1F";
const ACCENT = "#5F4BDB";

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

/** A still beside the takes (the Slang app's own captures), copied for the film. */
const stillOf = (name: string): string => {
  const out = `assets/footage/${name}`;
  execFileSync("cp", [at(`takes/${name}`), at(out)]);
  return out;
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

// 3.6–8.4: a field of live components in columns sliding opposite ways; the
// camera starts on one being typed into and keeps pulling back to reveal more.
// Every tile a different take, and a span that gives the wall a rhythm: a hero,
// wide panels, two tall ones and a big block — a bento, not a contact sheet.
// Tiles are picked for what they read at 300 px: a bold control or a dense
// screen, never a pale card whose content disappears (measured: the palest
// takes sit at 2.7–9 centre contrast, the chosen ones at 15–93).
interface Cell {
  readonly take: string;
  readonly col: number;
  readonly row: number;
  readonly w: number;
  readonly h: number;
  /** Detail crop: magnify the tile's content by this much (uniform, no stretch). */
  readonly zoom?: number;
  /** The point of the source, in fractions, that the detail crop keeps. */
  readonly focus?: readonly [number, number];
  /** Source width / height, when the take was not recorded at 2200×1400. */
  readonly aspect?: number;
}
/** The tile the montage's last close-up cuts into: a card with one control. */
const MATCH_TILE: Cell = { take: "button", col: 3, row: 2, w: 2, h: 1 };
const WALL: ReadonlyArray<Cell> = [
  { take: "stats", col: 0, row: 0, w: 2, h: 2 },
  {
    take: "license",
    col: 2,
    row: 0,
    w: 2,
    h: 1,
    zoom: 1.15,
    focus: [0.5, 0.45],
  },
  { take: "omarchy", col: 4, row: 0, w: 2, h: 1 },
  { take: "editor", col: 2, row: 1, w: 2, h: 1, zoom: 1.75, focus: [0.5, 0.3] },
  { take: "music", col: 4, row: 1, w: 1, h: 1 },
  { take: "monitor", col: 5, row: 1, w: 1, h: 1 },
  { take: "chat-win", col: 0, row: 2, w: 1, h: 2 },
  { take: "tiling", col: 1, row: 2, w: 2, h: 2 },
  { take: "slang", col: 3, row: 3, w: 2, h: 1 },
  { take: "desktop-aero", col: 5, row: 2, w: 1, h: 2 },
  MATCH_TILE,
  {
    take: "chat-mac",
    col: 0,
    row: 4,
    w: 2,
    h: 1,
    zoom: 2,
    focus: [0.42, 0.22],
  },
  {
    take: "settings",
    col: 2,
    row: 4,
    w: 1,
    h: 1,
    zoom: 2.4,
    focus: [0.52, 0.5],
    aspect: 2048 / 1152,
  },
  { take: "notes", col: 3, row: 4, w: 1, h: 1, zoom: 1.6, focus: [0.4, 0.4] },
  { take: "chat-linux", col: 4, row: 4, w: 1, h: 1 },
  { take: "desktop-luna", col: 5, row: 4, w: 1, h: 1 },
];
const UNIT = { w: 300, h: 200, gap: 16 };
/**
 * Every film take is recorded at 2200×1400. A detail crop sizes the image to that
 * aspect as well, so `cover` has no slack and the focus point is exact.
 */
const SCREEN_ASPECT = 2200 / 1400;
const GRID = { cols: 6, rows: 5 };
const cellBox = (cell: Cell) => ({
  x: cell.col * (UNIT.w + UNIT.gap),
  y: cell.row * (UNIT.h + UNIT.gap),
  w: cell.w * UNIT.w + (cell.w - 1) * UNIT.gap,
  h: cell.h * UNIT.h + (cell.h - 1) * UNIT.gap,
});
const WALL_BOX = {
  w: GRID.cols * UNIT.w + (GRID.cols - 1) * UNIT.gap,
  h: GRID.rows * UNIT.h + (GRID.rows - 1) * UNIT.gap,
};
const lastFrame = (take: string): number =>
  Number(
    execFileSync("sh", [
      "-c",
      `ls "${at(`takes/${take}`)}" | grep png | tail -1`,
    ])
      .toString()
      .slice(0, 4),
  );
/** The wall's opening frame: the match tile, centred exactly where it lands. */
const FOCUS = cellBox(MATCH_TILE);
const FOCUS_CX = FOCUS.x + Math.round(FOCUS.w / 2);
const FOCUS_CY = FOCUS.y + Math.round(FOCUS.h / 2);
const SHOWCASE = 8.5;
const GRID_LENGTH = SHOWCASE - 4 * BEAT_CUT;
const grid: Scene = {
  id: "grid",
  start: 4 * BEAT_CUT,
  duration: GRID_LENGTH,
  css: `#root .cam { position:absolute; left:960px; top:540px; width:0; height:0; }
    #root .wall { position:absolute; left:0; top:0; width:${WALL_BOX.w}px; height:${WALL_BOX.h}px; }
    #root .tile { position:absolute; width:${UNIT.w}px; height:${UNIT.h}px; border-radius:24px; overflow:hidden; background:#fff; box-shadow:0 0 0 1px rgba(0,0,0,.06),0 10px 30px -14px rgba(30,30,60,.25); }
    #root .tile img, #root .tile video { position:absolute; }
    #root .tile img.cover { inset:0; width:100%; height:100%; object-fit:cover; }
    #root .cap { position:absolute; left:0; right:0; top:880px; text-align:center; font:600 64px Inter, sans-serif; letter-spacing:-0.025em; color:${INK}; }
    #root .cap-band { position:absolute; left:0; right:0; height:330px; pointer-events:none; }
    #root .cap-band.down { bottom:0; height:400px; background:linear-gradient(rgba(244,242,238,0) 30%, rgba(244,242,238,.96) 45%, ${GROUND} 58%); }
    #root .cap-band.up { top:0; height:260px; opacity:0; background:linear-gradient(${GROUND} 46%, rgba(244,242,238,0) 78%); }`,
  body: `    <div id="g-cam" class="cam">
      <div id="g-wall" class="wall">
${WALL.map((cell) => {
  const box = cellBox(cell);
  const end = still(cell.take, lastFrame(cell.take));
  // Depth: a tile further from the wall's middle starts a little larger and
  // settles to its own size, so the wall comes forward instead of unzipping.
  const depth = Math.abs(box.y + box.h / 2 - WALL_BOX.h / 2) / (WALL_BOX.h / 2);
  const dz = (1.02 + depth * 0.05).toFixed(3);
  // The further a tile sits from the wall's middle, the later it settles: half a
  // beat of lag at the edges is what turns the scale change into parallax.
  const dl = (depth * 0.32).toFixed(3);
  const [fx, fy] = cell.focus ?? [0.5, 0.5];
  // A detail crop blows the screenshot up and centres the chosen point of it:
  // the image is `zoom` times the tile and offset so (fx, fy) lands in the middle.
  const zoom = cell.zoom ?? 1;
  const width = Math.round(box.w * zoom);
  const height = Math.round(width / (cell.aspect ?? SCREEN_ASPECT));
  const left = Math.round(box.w / 2 - fx * width);
  const top = Math.round(box.h / 2 - fy * height);
  const detail = cell.zoom
    ? ` style="left:${left}px;top:${top}px;right:auto;bottom:auto;width:${width}px;height:${height}px"`
    : "";
  return `        <div class="tile" data-dz="${dz}" data-dl="${dl}" style="left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px"><img class="cover"${detail} src="${end}" alt=""></div>`;
}).join("\n")}
      </div>
    </div>
    <div id="g-band-b" class="cap-band down"></div>
    <div id="g-band-t" class="cap-band up"></div>
    <div id="g-cap" class="cap">every component you need</div>`,
  script: `const cam = { z: Math.log(2.1) };
    const zoom = () => gsap.set("#g-cam", { scale: Math.exp(cam.z) });
    // It opens on one tile, not on the wall's seam: the montage's last close-up
    // is a card with one control on it, and the wall opens on the button card —
    // same shape, same size, same place in the frame — then pulls back.
    gsap.set("#g-wall", { x: ${-FOCUS_CX}, y: ${-FOCUS_CY} });
    tl.to("#g-wall", { x: ${-Math.round(WALL_BOX.w / 2)}, y: ${-Math.round(WALL_BOX.h / 2)}, duration: 3, ease: "power1.inOut" }, 0);
    zoom();
    // Depth: the outer tiles start 7 % larger and settle to their own size late,
    // while the centre settles first — the wall comes forward as a field with
    // parallax, not a contact sheet (every tile lands by 1.8 s, before the line).
    gsap.utils.toArray("#g-wall .tile").forEach((tile) => {
      const delay = +tile.dataset.dl;
      tl.fromTo(tile, { scale: +tile.dataset.dz },
        { scale: 1, duration: 1.8 - delay, ease: "power1.inOut" }, delay);
    });
    tl.to(cam, { z: Math.log(0.82), duration: 2, ease: "power1.inOut", onUpdate: zoom }, 0);
    tl.fromTo("#g-wall",{rotation:0},{rotation:0,duration:${GRID_LENGTH}},0);
    // The wall gets the first two seconds to itself — the whole reveal, calculator
    // included — then the line rises out of the paper under it and the two swap.
    tl.fromTo("#g-cap",{opacity:0},{opacity:1,duration:0.3,ease:"power2.out"},1.9);
    tl.fromTo("#g-band-b",{opacity:0},{opacity:1,duration:0.3,ease:"none"},1.9);
    tl.to("#g-cap",{y:-824,duration:0.5,ease:"power2.inOut"},3);
    // The wall settles below the line: 88 px clears the top band and leaves a
    // bottom margin inside the frame.
    tl.to("#g-cam",{y:88,duration:0.5,ease:"power2.inOut"},3);
    tl.to("#g-band-t",{opacity:1,duration:0.5,ease:"none"},3);
    tl.to("#g-band-b",{opacity:0,duration:0.5,ease:"none"},3);`,
};

// 8.4–19.45: what it builds, cut on the actions — the dashboard assembled, one
// tree across looks and desktops, a chat typed and sent, a calculator used.
interface Shot {
  /** A take's footage, played from `mediaStart` — or a still, when `still` is set. */
  readonly take?: string;
  readonly mediaStart?: number;
  readonly still?: string;
  readonly length: number;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly framed: boolean;
  readonly push: readonly [number, number];
  /** A slow lateral drift, from this offset in px (relative to the shot) to 0. */
  readonly drift?: readonly [number, number];
  readonly cursor?: boolean;
  /** The platform this shot shows; the film names it under the line. */
  readonly platform?: string;
}
const SHOTS: ReadonlyArray<Shot> = [
  {
    take: "stage-assemble",
    mediaStart: 1.7,
    length: 2,
    width: 1920,
    height: 1080,
    scale: 1,
    framed: false,
    push: [1, 1],
    cursor: false,
  },
  // One window, three platforms: the same Settings screen restyled.
  {
    take: "settings",
    mediaStart: 0.15,
    length: 1,
    width: 2048,
    height: 1152,
    scale: 0.76,
    framed: true,
    push: [1.05, 1],
    drift: [-8, 6],
    cursor: false,
    platform: "macOS",
  },
  {
    take: "settings",
    mediaStart: 1.6,
    length: 1,
    width: 2048,
    height: 1152,
    scale: 0.76,
    framed: true,
    push: [1.05, 1],
    drift: [8, -6],
    cursor: true,
    platform: "Windows",
  },
  {
    take: "settings",
    mediaStart: 2.95,
    length: 1,
    width: 2048,
    height: 1152,
    scale: 0.76,
    framed: true,
    push: [1.05, 1],
    drift: [-6, -8],
    cursor: true,
    platform: "Linux",
  },
  // The same chat window on each platform's desktop, flipped.
  {
    still: still("chat-mac", 0),
    length: 0.5,
    width: 1280,
    height: 800,
    scale: 0.75,
    framed: true,
    push: [1.05, 1],
    drift: [8, -6],
    platform: "macOS",
  },
  {
    still: still("chat-win", 0),
    length: 0.5,
    width: 1280,
    height: 800,
    scale: 0.75,
    framed: true,
    push: [1.05, 1],
    drift: [-8, 6],
    platform: "Windows",
  },
  {
    still: still("chat-linux", 0),
    length: 0.5,
    width: 1280,
    height: 800,
    scale: 0.75,
    framed: true,
    push: [1.05, 1],
    drift: [8, 6],
    platform: "Linux",
  },
  // The apps: Slang's fx-991, the editor, the monitor, the player, the tiling
  // desktop. Each one pushes in and drifts a few pixels, so a 1 s beat of real
  // screens reads as camera work rather than five stills.
  {
    still: stillOf("slang-app-history.png"),
    length: 1,
    width: 1720,
    height: 1640,
    scale: 0.52,
    framed: true,
    push: [1.07, 1],
    drift: [12, 10],
  },
  {
    take: "editor",
    mediaStart: 0,
    length: 1,
    width: 2200,
    height: 1400,
    scale: 0.56,
    framed: true,
    push: [1.06, 1],
    drift: [-12, 8],
    cursor: false,
  },
  {
    take: "monitor",
    mediaStart: 0,
    length: 1,
    width: 2200,
    height: 1720,
    scale: 0.56,
    framed: true,
    push: [1.06, 1],
    drift: [10, 12],
    cursor: false,
  },
  // The Omarchy desktop: the same tree, repainted by the palette file.
  {
    take: "music",
    mediaStart: 0,
    length: 1,
    width: 1280,
    height: 972,
    scale: 0.74,
    framed: true,
    push: [1.05, 1],
    drift: [-10, -8],
    cursor: false,
  },
  {
    take: "tiling",
    mediaStart: 0,
    length: 1,
    width: 2560,
    height: 1440,
    scale: 0.6,
    framed: true,
    push: [1.06, 1],
    drift: [10, -6],
    cursor: false,
  },
];
/** Below the line's band: a shot fits the frame under it, centred there. */
const BAND = 170;
const shotStart = (i: number) =>
  SHOTS.slice(0, i).reduce((sum, shot) => sum + shot.length, 0);
const showcase: Scene = {
  id: "showcase",
  start: SHOWCASE,
  duration: shotStart(SHOTS.length),
  css: `#root .cam { position:absolute; inset:0; transform-origin:960px 625px; }
    #root .frame { position:absolute; overflow:hidden; }
    #root .frame.framed { border-radius:20px; box-shadow:0 0 0 1px rgba(0,0,0,.08),0 30px 80px -30px rgba(30,30,60,.35); }
    #root .frame video, #root .frame img { position:absolute; left:0; top:0; width:100%; height:100%; }`,
  body: SHOTS.map((shot, i) => {
    const w = Math.round(shot.width * shot.scale);
    const h = Math.round(shot.height * shot.scale);
    const left = Math.round((1920 - w) / 2);
    const top = shot.scale === 1 ? 0 : Math.round(BAND + (1080 - BAND - h) / 2);
    const media =
      shot.still === undefined
        ? clip(
            `s-v${i}`,
            footage(shot.take ?? ""),
            shotStart(i),
            shot.length,
            shot.mediaStart ?? 0,
            "",
            1 + (i % 2),
          )
        : `<img class="shot" src="${shot.still}" alt="">`;
    const cursor =
      shot.cursor === true
        ? `<div id="s-cur${i}" class="cursor">${CURSOR}</div>`
        : "";
    return `    <div id="s-cam${i}" class="cam" style="opacity:${i === 0 ? 1 : 0}">
      <div class="frame${shot.framed ? " framed" : ""}" style="left:${left}px;top:${top}px;width:${w}px;height:${h}px">
        ${media}
        ${cursor}
      </div>
    </div>`;
  }).join("\n"),
  script: SHOTS.map((shot, i) => {
    const t = shotStart(i);
    const follow =
      shot.take !== undefined && shot.cursor === true
        ? cursorClip(
            `s-cur${i}`,
            shot.take,
            t,
            shot.mediaStart ?? 0,
            shot.length,
            shot.scale,
          )
        : "";
    return `${i > 0 ? `tl.set("#s-cam${i}",{opacity:1},${t.toFixed(3)});` : ""}tl.set("#s-cam${i}",{opacity:0},${(t + shot.length).toFixed(3)});
    tl.fromTo("#s-cam${i}",{scale:${shot.push[0]},x:${shot.drift?.[0] ?? 0},y:${shot.drift?.[1] ?? 0}},{scale:${shot.push[1]},x:0,y:0,duration:${shot.length},ease:"power2.out"},${t.toFixed(3)});
    ${follow}`;
  }).join("\n    "),
};

// The console in a terminal, reached over ssh — the local prompt, the login,
// the command, its output, then the app taking the whole screen over.
const TERM = { x: 371, y: 187, scale: 1.15, bar: 44 };
const TERM_W = Math.round(1024 * TERM.scale);
const TERM_SCREEN_H = Math.round(576 * TERM.scale);
const TERMINAL = SHOWCASE + shotStart(SHOTS.length);
const TERMINAL_LENGTH = 24 - TERMINAL;
const SSH = "ssh gon@whale-island";
const RUN = "nub run dev settings --terminal";
const TYPE_AT = 0.1; // the first keystroke
const CHAR = 0.016; // seconds per character
const T_LOGIN = TYPE_AT + SSH.length * CHAR + 0.06;
const T_RUN = T_LOGIN + 0.06;
const T_READY = T_RUN + RUN.length * CHAR + 0.08;
const T_APP = 1.5; // the app takes the screen — on the beat grid
const typed = (id: string, text: string, from: number): string =>
  [...text]
    .map(
      (_, i) =>
        `tl.set("#${id}",{textContent:${JSON.stringify(text.slice(0, i + 1))}},${(from + i * CHAR).toFixed(3)});`,
    )
    .join("");
const terminal: Scene = {
  id: "terminal",
  start: TERMINAL,
  duration: TERMINAL_LENGTH,
  css: `#root .term { position:absolute; left:${TERM.x}px; top:${TERM.y}px; width:${TERM_W}px; height:${TERM.bar + TERM_SCREEN_H}px; border-radius:12px; overflow:hidden; background:#0d0e10; border:1px solid rgba(0,0,0,.18); box-shadow:0 40px 90px -40px rgba(20,20,40,.55), 0 12px 30px -18px rgba(20,20,40,.35); }
    #root .bar { position:relative; height:${TERM.bar}px; display:flex; align-items:center; gap:8px; padding-left:18px; background:linear-gradient(#fbfbfb, #ececed); border-bottom:1px solid #d7d7d9; color:#4b4b4f; font:500 26px Inter, sans-serif; }
    #root .bar i { width:12px; height:12px; border-radius:50%; display:inline-block; }
    #root .bar span { position:absolute; left:0; right:0; text-align:center; font-weight:500; }
    #root .hist { position:absolute; left:0; top:${TERM.bar}px; width:100%; padding:18px 28px 0; font:500 22px/30px "JetBrains Mono", Menlo, monospace; color:#e8e8ea; }
    #root .hist .dim { color:#8b8b93; }
    #root .hist .off { opacity:0; }
    #root .hist b { font-weight:600; color:#8ab4ff; }
    #root .caret { display:inline-block; width:10px; height:20px; margin-left:2px; vertical-align:-3px; background:#c9c9d2; }
    #root .frame { position:absolute; left:0; top:${TERM.bar}px; width:${TERM_W}px; height:${TERM_SCREEN_H}px; overflow:hidden; }
    #root .frame video, #root .frame img { position:absolute; left:0; top:0; width:100%; height:100%; }`,
  body: `    <div class="term">
      <div class="bar"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><span>gon@whale-island — ssh</span></div>
      <div id="t-hist" class="hist" data-layout-ignore>
        <div class="ln"><b>gon@macbook ~ %</b> <span id="t-ssh"></span><span id="t-caret1" class="caret"></span></div>
        <div id="t-login" class="ln dim off">Last login: Sun Nov 1 19:41:07 2026 from 10.0.0.2</div>
        <div id="t-runline" class="ln off"><b>gon@whale-island ~ %</b> <span id="t-run"></span><span id="t-caret3" class="caret"></span></div>
        <div id="t-ready" class="ln dim off">console · ready in 1.4 s</div>
        <div id="t-out1" class="ln off"><span class="dim">VITE v7.1.3</span>  ready in 412 ms</div>
        <div id="t-out2" class="ln off"><b>➜</b>  Local:   <span class="dim">http://localhost:5173/</span></div>
        <div id="t-out3" class="ln off"><b>➜</b>  GPUix:   <span class="dim">http://localhost:5173/terminal</span></div>
      </div>
      <div class="frame">
        ${["term-light-linux", "term-dark", "term-light-win"]
          .map(
            (take, i) =>
              `<img id="t-v${i}" class="look" src="${still(take, 80)}" alt="" style="opacity:0">`,
          )
          .join("\n        ")}
        <div id="t-cur" class="cursor" style="opacity:0">${CURSOR}</div>
      </div>
    </div>`,
  script: `${typed("t-ssh", SSH, TYPE_AT)}
    // The four-second hold is a slow dolly: 3 % closer and a few pixels up-left.
    tl.fromTo(".term",{scale:1,x:0,y:0},{scale:1.03,x:-8,y:-6,duration:${TERMINAL_LENGTH},ease:"none"},0);
    tl.set("#t-caret1",{opacity:0},${T_LOGIN.toFixed(2)});
    tl.set("#t-login",{opacity:1},${T_LOGIN.toFixed(2)});
    tl.set("#t-runline",{opacity:1},${T_RUN.toFixed(2)});
    ${typed("t-run", RUN, T_RUN)}
    tl.set("#t-caret3",{opacity:0},${T_READY.toFixed(2)});
    tl.set("#t-ready",{opacity:1},${T_READY.toFixed(2)});
    // The command's own output, so the prompt is a screen and not a line.
    tl.set("#t-out1",{opacity:1},${(T_READY + 0.06).toFixed(2)});
    tl.set("#t-out2",{opacity:1},${(T_READY + 0.16).toFixed(2)});
    tl.set("#t-out3",{opacity:1},${(T_READY + 0.26).toFixed(2)});
    tl.set("#t-hist",{opacity:0},${T_APP.toFixed(2)}); tl.set("#t-v0",{opacity:1},${T_APP.toFixed(2)}); tl.set("#t-cur",{opacity:1},${T_APP.toFixed(2)});
    // Three real terminal captures: the platform paints a state change only into
    // the next frame it commits, so each state is recorded as its own take (one
    // press before the first paint) and the film cuts between them. The order puts
    // a theme flip on both cuts — Linux light → Linux dark → Windows light — so
    // each change reads at a glance instead of moving one chip.
    tl.set("#t-v0",{opacity:0},${(T_APP + 0.5).toFixed(2)}); tl.set("#t-v1",{opacity:1},${(T_APP + 0.5).toFixed(2)});
    tl.set("#t-v1",{opacity:0},${(T_APP + 1.0).toFixed(2)}); tl.set("#t-v2",{opacity:1},${(T_APP + 1.0).toFixed(2)});
    ${cursorTrack("t-cur", cursorOf("term-app"), T_APP, TERM.scale / 2)}`,
};

// 24–26: the stack, one word per chord stab (the score's bar 12).
const WORDS = ["GPUI", "React", "shadcn", "Tailwind"] as const;
const stack: Scene = {
  id: "stack",
  start: 24,
  duration: 2,
  css: `#root .words { position:absolute; left:0; right:0; top:470px; text-align:center; font:600 104px Inter, sans-serif; letter-spacing:-0.035em; color:${INK}; }
    #root .words span { opacity:.18; margin:0 26px; }
    #root .words b { color:#c7c7cc; font-weight:600; }`,
  body: `    <div class="words">${WORDS.map((w, i) => `<span id="w${i}">${w}</span>`).join("<b>·</b>")}</div>`,
  script: `tl.fromTo(".words",{scale:1,x:0,y:0},{scale:1.03,x:-10,y:-6,duration:2,ease:"none"},0);
    ${WORDS.map(
      (_, i) =>
        `tl.to("#w${i}",{opacity:1,duration:0.18},${(i * 0.5).toFixed(2)});`,
    ).join("")}`,
};

// 26–30: the mark, the URL, the credit.
const end: Scene = {
  id: "end",
  start: 26,
  duration: 4,
  css: `#root .lockup { position:absolute; inset:0; }
    #root .mark { position:absolute; left:50%; top:330px; width:190px; height:190px; margin-left:-95px; background:${ACCENT}; -webkit-mask:url(assets/logo-outline.svg) center/contain no-repeat; mask:url(assets/logo-outline.svg) center/contain no-repeat; }
    #root .name { position:absolute; left:0; right:0; top:560px; text-align:center; font:600 92px Inter, sans-serif; letter-spacing:-0.035em; color:${INK}; }
    #root .url { position:absolute; left:0; right:0; top:690px; text-align:center; font:500 46px Inter, sans-serif; color:${ACCENT}; }
    #root .credit { position:absolute; left:0; right:0; top:950px; text-align:center; font:400 30px Inter, sans-serif; color:#6e6e73; }
    #root .credit u { color:${INK}; text-underline-offset:5px; }`,
  body: `    <div class="lockup">
      <div id="e-mark" class="mark"></div>
      <div id="e-name" class="name">GPUIxUI</div>
      <div id="e-url" class="url">gpuixui.sudokw.com</div>
      <div id="e-credit" class="credit">Made with ☕ by <u>@sudo_kw</u></div>
    </div>`,
  script: `tl.fromTo(".lockup",{scale:1,x:0,y:0},{scale:1.03,x:-8,y:-6,duration:4,ease:"none"},0);
    tl.from("#e-mark",{opacity:0,duration:0.5},0.1);
    tl.from("#e-name",{opacity:0.35,duration:0.35},0.5);
    tl.from("#e-url",{opacity:0,duration:0.5},1.1);
    tl.from("#e-credit",{opacity:0,duration:0.5},1.6);`,
};

const scenes = [montage, grid, showcase, terminal, stack, end];
const LENGTH = 30;

/* ------------------------------------------------------------ lines and sound */

/** Few words: the pictures carry the film, a line names what they show. */
const LINES: ReadonlyArray<readonly [number, number, string]> = [
  // The story ladder: each line is the verb of the beat under it — the controls
  // you know, all of them, composed into blocks, one tree on every platform and
  // desktop, real apps, and the same tree in a terminal.
  [1.2, 4, "the components you know"],
  [8.5, 10.5, "compose them into blocks"],
  [
    SHOWCASE + shotStart(1),
    SHOWCASE + shotStart(4),
    "one tree, every platform",
  ],
  [SHOWCASE + shotStart(4), SHOWCASE + shotStart(7), "on every desktop"],
  [SHOWCASE + shotStart(7), TERMINAL, "real apps, built with it"],
  [TERMINAL, 24, "even in your terminal, through ssh"],
];
/** The platform each shot shows, named under the line as the cut lands. */
const PLATFORMS: ReadonlyArray<readonly [number, number, string]> =
  SHOTS.flatMap((shot, i) =>
    shot.platform === undefined
      ? []
      : [
          [
            SHOWCASE + shotStart(i),
            SHOWCASE + shotStart(i) + shot.length,
            shot.platform,
          ] as const,
        ],
  );

/** Every cue sits one frame after the picture that causes it. */
const F = 1 / FPS;
const shot = (i: number): Shot => {
  const found = SHOTS[i];
  if (found === undefined) throw new Error(`build: no shot ${i}`);
  return found;
};
const shotAt = (i: number, takeSeconds: number) =>
  SHOWCASE + shotStart(i) + takeSeconds - (shot(i).mediaStart ?? 0) + F;
const platformCue = (i: number, sound: string): readonly [number, string] => [
  SHOWCASE + shotStart(i) + F,
  sound,
];
/** Keys under a typed line: every fifth character, four takes rotated. */
const keyCues = (
  text: string,
  from: number,
): ReadonlyArray<readonly [number, string]> =>
  Array.from(text, (_, i) => i)
    .filter((i) => i % 5 === 0)
    .map((i, n) => [from + i * CHAR, `key-${n % 4}`] as const);
/** A cue: when, which sample, and an optional level (0.9 is the default bed). */
const CUES: ReadonlyArray<readonly [number, string, number?]> = [
  ...MONTAGE.map(
    ({ sound }, i) => [i * BEAT_CUT + PRESS_AT - LEAD_IN + F, sound] as const,
  ),
  ...[20, 24, 28, 32, 36].map(
    (frame, n) =>
      [2 * BEAT_CUT + frame / FPS - LEAD_IN + F, `detent-${n + 2}`] as const,
  ),
  ...[26, 29, 32].map(
    (frame, n) => [4 * BEAT_CUT + frame / FPS - 0.3 + F, `key-${n}`] as const,
  ),
  // Each card lands at 0.95 s + 150 ms after the one before it (the stage's own
  // script); the shot opens at 1.7 s, so only the landings still on screen get a
  // hit — a hit for an off-screen landing would sound on the previous scene.
  ...[5, 6].map((i) => [shotAt(0, 0.95 + i * 0.15), "land"] as const),
  [shotAt(0, 1.95), "glass-1"],
  // The palette flip inside the tiling take, on its own frame.
  [shotAt(11, 0.6), "glass-2"],
  platformCue(1, "look-mac"),
  platformCue(2, "look-win"),
  platformCue(3, "look-linux"),
  platformCue(4, "look-mac"),
  platformCue(5, "look-win"),
  platformCue(6, "look-linux"),
  ...keyCues(SSH, TERMINAL + TYPE_AT),
  ...keyCues(RUN, TERMINAL + T_RUN),
  // The app takes the terminal over, and the take's one repaint lands on the frame
  // it actually paints (frame 61 of takes/term-settings at 30 fps). The two
  // "presses" that used to sit between them had no picture to land on.
  [TERMINAL + T_APP, "land"],
  [TERMINAL + T_APP + 0.5, "thud"],
  [TERMINAL + T_APP + 1.0, "press"],
  // A cut is a whoosh: the scene starts and the showcase's shot boundaries, read
  // from the same table the compositions are written from.
  // Every cut is a whoosh: the scene starts at full level, and every shot
  // boundary inside the showcase a little softer, because those come half a beat
  // apart. `shotStart(0)` is the showcase itself.
  ...[4 * BEAT_CUT, TERMINAL, 24, 26].map((at) => [at, "air"] as const),
  // The montage's own three cuts, quiet: the opening is one carried push, so the
  // whoosh is felt as a swish under the move rather than a hit on each card.
  ...[1, 2, 3].map((at) => [at, "air", 0.35] as const),
  ...SHOTS.map((_, i) => [SHOWCASE + shotStart(i), "air", 0.55] as const),
  [26.1, "mark"],
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
      .line { position: absolute; left: 0; right: 0; top: 0; height: 230px; padding-top: 62px; text-align: center; font: 600 64px Inter, sans-serif; letter-spacing: -0.025em; color: ${INK};
        background: linear-gradient(${GROUND} 62%, rgba(244, 242, 238, 0)); }
      .platform { position: absolute; left: 0; right: 0; top: 146px; text-align: center; font: 600 30px Inter, sans-serif; letter-spacing: 0.04em; color: ${ACCENT}; }
    </style>
  </head>
  <body>
    <!-- The launch film v4 (plan 066), written by build.ts: ${LENGTH} s on the score's 120 BPM grid. -->
    <div id="root" data-composition-id="main" data-start="0" data-duration="${LENGTH}" data-width="1920" data-height="1080">
${scenes.map((s) => `      <div id="${s.id}" data-composition-id="${s.id}" data-composition-src="compositions/${s.id}.html" data-start="${s.start}" data-duration="${s.duration}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>`).join("\n")}
${LINES.map(([start, stop, text], i) => `      <div id="line-${i}" class="line clip" data-start="${start}" data-duration="${(stop - start).toFixed(2)}" data-track-index="9">${text}</div>`).join("\n")}
${PLATFORMS.map(([start, stop, name], i) => `      <div id="platform-${i}" class="platform clip" data-start="${start.toFixed(2)}" data-duration="${(stop - start).toFixed(2)}" data-track-index="9">${name}</div>`).join("\n")}
      <audio id="score" class="clip" data-start="0" data-duration="${LENGTH}" data-track-index="19" data-volume="0.28" data-fade-out="1.5" src="assets/music/score.wav"></audio>
${CUES.map(([time, sound, volume], i) => `      <audio id="sfx-${String(i).padStart(2, "0")}" class="clip" data-start="${time.toFixed(3)}" data-duration="${lengthOf(sound).toFixed(3)}" data-track-index="${20 + (i % 8)}" data-volume="${volume ?? 0.9}" src="assets/sfx/${sound}.wav"></audio>`).join("\n")}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      ${LINES.map((_, i) => `tl.fromTo("#line-${i}",{opacity:0.35},{opacity:1,duration:0.35,ease:"power2.out"},${LINES[i]![0]});`).join("\n      ")}
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
