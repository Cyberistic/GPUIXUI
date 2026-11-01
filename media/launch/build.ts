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

const footage = (take: string): string => {
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
      "14",
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

// 0–3: the mark as an app icon, pressed; the Settings window opens out of it.
const open: Scene = {
  id: "open",
  start: 0,
  duration: 3,
  css: `#root .icon { position:absolute; left:900px; top:420px; width:120px; height:120px; border-radius:28px; background:#fff; box-shadow:0 0 0 1px rgba(0,0,0,.06),0 10px 30px -10px rgba(30,30,60,.25); display:flex; align-items:center; justify-content:center; }
    #root .icon i { width:78px; height:78px; background:${ACCENT}; -webkit-mask:url(assets/logo-outline.svg) center/contain no-repeat; mask:url(assets/logo-outline.svg) center/contain no-repeat; }
    #root .window { position:absolute; left:300px; top:230px; width:1640px; height:922px; transform-origin:660px 250px; opacity:0; }
    #root .window img { width:100%; height:100%; }`,
  body: `    <div id="o-icon" class="icon"><i></i></div>
    <div id="o-win" class="window"><img class="shot" src="${still("settings")}" alt=""></div>
    <div id="o-cur" class="cursor">${CURSOR}</div>`,
  script: `tl.set("#o-cur",{x:1180,y:700});
    tl.to("#o-cur",{x:972,y:492,duration:0.7,ease:"power2.inOut"},0.15);
    tl.to("#o-cur",{scale:0.86,duration:0.06},0.9).to("#o-cur",{scale:1,duration:0.08},1.0);
    tl.to("#o-icon",{scale:0.92,duration:0.08},0.9).to("#o-icon",{scale:1,duration:0.12},1.0);
    tl.fromTo("#o-win",{opacity:0,scale:0.08},{opacity:1,scale:1,duration:0.9,ease:"power3.out"},1.08);
    tl.to("#o-icon",{opacity:0,duration:0.2},1.1);
    tl.to("#o-cur",{x:1400,y:820,opacity:0,duration:0.6},1.2);
    tl.to("#o-win",{x:-20,y:-8,duration:1.8,ease:"none"},1.2);`,
};

// 3–8.4: three close-ups, 1.8 s each, pushed in on their card, crossfaded.
const CLOSE = ["cu-switch", "cu-tabs", "cu-slider"] as const;
const closeups: Scene = {
  id: "closeups",
  start: 3,
  duration: 5.4,
  css: `#root .cam { position:absolute; left:0; top:0; width:1920px; height:1080px; transform-origin:960px 560px; }
    #root .cam video { left:0; top:0; width:1920px; height:1080px; }`,
  body: CLOSE.map(
    (
      take,
      i,
    ) => `    <div id="c-cam${i}" class="cam" style="opacity:${i === 0 ? 1 : 0}">
      ${video(`c-v${i}`, footage(take), i * 1.8, 1.8 + (i < 2 ? 0.25 : 0), "", 1 + i)}
      <div id="c-cur${i}" class="cursor" style="width:44px"></div>
    </div>`,
  )
    .join("\n")
    .replace(
      /<div id="c-cur(\d)" class="cursor" style="width:44px"><\/div>/g,
      (_, n) =>
        `<div id="c-cur${n}" class="cursor" style="width:44px">${CURSOR}</div>`,
    ),
  script: CLOSE.map((take, i) => {
    const t = i * 1.8;
    return `${i > 0 ? `tl.to("#c-cam${i}",{opacity:1,duration:0.25},${t});` : ""}
    tl.fromTo("#c-cam${i}",{scale:1.45},{scale:1.62,duration:2.05,ease:"none"},${t});
    ${i < 2 ? `tl.set("#c-cam${i}",{opacity:0},${t + 2.05});` : ""}
    ${cursorTrack(`c-cur${i}`, cursorOf(take), t, 1)}`;
  }).join("\n    "),
};

// 8.4–12.4 and 12.4–16.4: the two stage recordings (stageshow), full frame.
const stageScene = (
  id: string,
  take: string,
  start: number,
  duration: number,
): Scene => ({
  id,
  start,
  duration,
  css: `#root video { left:0; top:0; width:1920px; height:1080px; }`,
  body: `    ${video(`${id}-v`, footage(take), 0, duration, "")}`,
  script: "",
});
const bento = stageScene("bento", "stage-bento", 8.4, 4);
const assemble = stageScene("assemble", "stage-assemble", 12.4, 4);

// 16.4–20.4: one tree, every desktop — Settings switching looks, the Aero
// desktop's Start menu, the Linux tiling desktop changing palette.
const DESKS = [
  // The Settings take draws its own window on the film's ground; the desktops are whole screens.
  {
    take: "settings",
    length: 1.3,
    width: 2048,
    height: 1152,
    scale: 0.8,
    top: 160,
    framed: false,
  },
  {
    take: "desktop-aero",
    length: 1.1,
    width: 2560,
    height: 1600,
    scale: 0.58,
    top: 175,
    framed: true,
  },
  {
    take: "tiling",
    length: 1.6,
    width: 2560,
    height: 1440,
    scale: 0.58,
    top: 190,
    framed: true,
  },
] as const;
const desktops: Scene = {
  id: "desktops",
  start: 16.4,
  duration: 4,
  css: `#root .screen { position:absolute; border-radius:20px; overflow:hidden; box-shadow:0 0 0 1px rgba(0,0,0,.08),0 30px 80px -30px rgba(30,30,60,.35); }
    #root .plain { position:absolute; }
    #root .screen video, #root .plain video { left:0; top:0; width:100%; height:100%; }`,
  body: DESKS.map((d, i) => {
    const t = DESKS.slice(0, i).reduce((sum, x) => sum + x.length, 0);
    const w = d.width * d.scale;
    return `    <div id="d-s${i}" class="${d.framed ? "screen" : "plain"}" style="opacity:${i === 0 ? 1 : 0};left:${(1920 - w) / 2}px;top:${d.top}px;width:${w}px;height:${d.height * d.scale}px">
      ${video(`d-v${i}`, footage(d.take), t, d.length + 0.2, "", 1 + i)}
      <div id="d-cur${i}" class="cursor">${CURSOR}</div>
    </div>`;
  }).join("\n"),
  script: DESKS.map((d, i) => {
    const t = DESKS.slice(0, i).reduce((sum, x) => sum + x.length, 0);
    return `${i > 0 ? `tl.to("#d-s${i}",{opacity:1,duration:0.2},${t});` : ""}
    ${i < DESKS.length - 1 ? `tl.set("#d-s${i}",{opacity:0},${t + d.length + 0.2});` : ""}
    ${cursorTrack(`d-cur${i}`, cursorOf(d.take), t, d.scale)}`;
  }).join("\n    "),
};

// 20.4–24: the console block in a terminal, the command typed first.
const TERM = { x: 269, y: 236, scale: 1.34 };
const COMMAND = "nub run dev console --terminal";
const terminal: Scene = {
  id: "terminal",
  start: 20.4,
  duration: 3.6,
  css: `#root .term { position:absolute; left:${TERM.x}px; top:${TERM.y - 56}px; width:${1024 * TERM.scale}px; height:${576 * TERM.scale + 56}px; border-radius:16px; overflow:hidden; background:#1e1e1e; box-shadow:0 30px 80px -30px rgba(0,0,0,.5); }
    #root .bar { height:56px; display:flex; align-items:center; gap:9px; padding-left:20px; background:#2a2a2a; color:#b0b0b0; font:500 28px Inter, sans-serif; }
    #root .bar i { width:13px; height:13px; border-radius:50%; display:inline-block; }
    #root .bar span { flex:1; text-align:center; margin-right:90px; }
    #root .prompt { position:absolute; left:28px; top:70px; font:500 30px "JetBrains Mono", Menlo, monospace; color:#e6e6e6; white-space:pre; }
    #root .term video { top:56px; left:0; width:100%; height:${576 * TERM.scale}px; }`,
  body: `    <div class="term">
      <div class="bar"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><span>gon@whale-island — ${COMMAND}</span></div>
      <div id="t-prompt" class="prompt" data-layout-ignore>$ <b id="t-typed" style="font-weight:500"></b></div>
      ${video("t-v", footage("term-console"), 0.9, 2.7, "opacity:0")}
      <div id="t-cur" class="cursor" style="top:56px"></div>
    </div>`.replace(
    `<div id="t-cur" class="cursor" style="top:56px"></div>`,
    `<div id="t-cur" class="cursor" style="top:56px;opacity:0">${CURSOR}</div>`,
  ),
  script: `${[...COMMAND].map((_, i) => `tl.set("#t-typed",{textContent:${JSON.stringify(COMMAND.slice(0, i + 1))}},${(0.1 + i * 0.022).toFixed(3)});`).join("")}
    tl.set("#t-v",{opacity:1},0.9); tl.set("#t-prompt",{opacity:0},0.9); tl.set("#t-cur",{opacity:1},0.9);
    ${cursorTrack("t-cur", cursorOf("term-console"), 0.9, TERM.scale)}`,
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
  script: WORDS.map(
    (_, i) =>
      `tl.to("#w${i}",{opacity:1,duration:0.18},${(i * 0.5).toFixed(2)});`,
  ).join(""),
};

// 26–30: the mark, the URL, the credit.
const end: Scene = {
  id: "end",
  start: 26,
  duration: 4,
  css: `#root .mark { position:absolute; left:50%; top:330px; width:190px; height:190px; margin-left:-95px; background:${ACCENT}; -webkit-mask:url(assets/logo-outline.svg) center/contain no-repeat; mask:url(assets/logo-outline.svg) center/contain no-repeat; }
    #root .name { position:absolute; left:0; right:0; top:560px; text-align:center; font:600 92px Inter, sans-serif; letter-spacing:-0.035em; color:${INK}; }
    #root .url { position:absolute; left:0; right:0; top:690px; text-align:center; font:500 46px Inter, sans-serif; color:${ACCENT}; }
    #root .credit { position:absolute; left:0; right:0; top:950px; text-align:center; font:400 30px Inter, sans-serif; color:#6e6e73; }
    #root .credit u { color:${INK}; text-underline-offset:5px; }`,
  body: `    <div id="e-mark" class="mark"></div>
    <div id="e-name" class="name">GPUIxUI</div>
    <div id="e-url" class="url">gpuixui.sudokw.com</div>
    <div id="e-credit" class="credit">Made with ☕ by <u>@sudo_kw</u></div>`,
  script: `tl.from("#e-mark",{opacity:0,duration:0.5},0.1);
    tl.from("#e-name",{opacity:0.35,duration:0.35},0.5);
    tl.from("#e-url",{opacity:0,duration:0.5},1.1);
    tl.from("#e-credit",{opacity:0,duration:0.5},1.6);`,
};

const scenes = [
  open,
  closeups,
  bento,
  assemble,
  desktops,
  terminal,
  stack,
  end,
];
const LENGTH = 30;

/* ------------------------------------------------------------ lines and sound */

/** One centred lowercase line at a time, Paper's way: grey to ink, never sliding. */
const LINES: ReadonlyArray<readonly [number, number, string]> = [
  [1.2, 3.0, "native apps, now in react"],
  [3.0, 5.7, "with the components you know"],
  [5.7, 8.4, "drawn by the gpu, every frame"],
  [8.4, 12.4, "composed into blocks"],
  [12.4, 16.4, "put together in seconds"],
  [16.4, 20.4, "on every desktop"],
  [20.4, 24.0, "can you believe this is in a terminal through ssh?"],
];

/** Every cue sits one frame after the picture that causes it. */
const CUES: ReadonlyArray<readonly [number, string]> = [
  [0.93, "press"],
  [1.12, "air"],
  ...CLOSE.map(
    (_, i) =>
      [
        3 + i * 1.8 + 24 / FPS + 1 / FPS,
        ["press", "cap-1", "detent-2"][i]!,
      ] as const,
  ),
  ...[0, 1, 2, 3, 4, 5].map(
    (n) => [3 + 3.6 + (20 + n * 4) / FPS, `detent-${n + 3}`] as const,
  ),
  [8.4 + 0.67 + 25 / FPS, "press"],
  ...[12, 30, 46, 62].map(
    (f, n) => [8.4 + 0.78 + f / FPS, `key-${n}`] as const,
  ),
  [8.4 + 0.89, "air"],
  ...[0, 1, 2, 3, 4, 5, 6].map(
    (i) => [12.4 + 2.15 + i * 0.16, "land"] as const,
  ),
  [12.4 + 3.33, "glass-1"],
  [16.4 + 16 / FPS, "look-win"],
  [16.4 + 31 / FPS, "look-linux"],
  [16.4 + 1.3 + 25 / FPS, "press"],
  [16.4 + 2.4 + 13 / FPS, "press"],
  [16.4 + 2.4 + 31 / FPS, "glass-2"],
  ...[0, 4, 8, 12, 16, 20, 24, 28].map(
    (n, i) => [20.4 + 0.1 + n * 0.022, `key-${i % 4}`] as const,
  ),
  [20.4 + 0.9 + 13 / FPS, "press"],
  [20.4 + 0.9 + 61 / FPS, "press"],
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
      .line { position: absolute; left: 0; right: 0; top: 70px; text-align: center; font: 600 64px Inter, sans-serif; letter-spacing: -0.025em; color: ${INK}; }
    </style>
  </head>
  <body>
    <!-- The launch film v4 (plan 066), written by build.ts: ${LENGTH} s on the score's 120 BPM grid. -->
    <div id="root" data-composition-id="main" data-start="0" data-duration="${LENGTH}" data-width="1920" data-height="1080">
${scenes.map((s) => `      <div id="${s.id}" data-composition-id="${s.id}" data-composition-src="compositions/${s.id}.html" data-start="${s.start}" data-duration="${s.duration}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>`).join("\n")}
${LINES.map(([start, stop, text], i) => `      <div id="line-${i}" class="line clip" data-start="${start}" data-duration="${(stop - start).toFixed(2)}" data-track-index="9">${text}</div>`).join("\n")}
      <audio id="score" class="clip" data-start="0" data-duration="${LENGTH}" data-track-index="19" data-volume="0.55" data-fade-out="1.5" src="assets/music/score.wav"></audio>
${CUES.map(([time, sound], i) => `      <audio id="sfx-${String(i).padStart(2, "0")}" class="clip" data-start="${time.toFixed(3)}" data-duration="${lengthOf(sound).toFixed(3)}" data-track-index="${20 + (i % 8)}" data-volume="0.55" src="assets/sfx/${sound}.wav"></audio>`).join("\n")}
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
