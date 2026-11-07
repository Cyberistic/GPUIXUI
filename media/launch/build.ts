/**
 * The launch film v9 (plan 070), written from one timeline table: encodes the
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
import {
  CHARS_PER_FRAME as CODE_SPEED,
  CODE,
  INTRO,
  SHADCN_FRAMES,
  THEMES as BUILDER_THEMES,
} from "../../apps/playground/src/film/shadcn-timeline.ts";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";

const FPS = 30;
const HERE = new URL(".", import.meta.url).pathname;
const at = (path: string) => `${HERE}${path}`;
const GROUND = "#F4F2EE";
const INK = "#1D1D1F";
const INK_DARK = "#09090B";

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
      "scale=trunc(iw/2)*2:trunc(ih/2)*2:out_color_matrix=bt709",
      "-colorspace",
      "bt709",
      "-color_primaries",
      "bt709",
      "-color_trc",
      "iec61966-2-1",
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
    #root .hl { position: relative; display: inline-block; padding: 0 .14em; isolation: isolate; }
    #root .hl i { position: absolute; z-index: -1; left: 0; right: 0; top: .1em; bottom: .02em; border-radius: .14em; background: #FFD84D; transform-origin: 0 50%; }
    #root .on-dark .hl i { background: #2F6FED; }
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
// A take is 1920×1080: past scale 1 the camera magnifies the capture and text blurs.
const MONTAGE = [
  { take: "cu-switch-solo", sound: "press" },
  { take: "cu-tabs", sound: "cap-0" },
  { take: "cu-slider", sound: "cap-1" },
  { take: "cu-checkbox", sound: "cap-2" },
] as const;
const BEAT_CUT = 1;
/** The opening's camera, one continuous push: each clip resumes the last scale. */
const PUSH = [0.76, 0.82, 0.88, 0.94, 1] as const;
const PRESS_AT = 0.8; // every close-up presses on its frame 24
const LEAD_IN = 0.42; // each clip starts this far into its take, so the press lands 0.38 s in
/** On-screen pointer width: the camera crops otherwise scale the pointer too. */
const CURSOR_WIDTH = 87;
const montage: Scene = {
  id: "montage",
  start: 0,
  duration: MONTAGE.length * BEAT_CUT,
  css: `#root .cam { position:absolute; inset:0; transform-origin:960px 540px; }
    #root .cam video { left:0; top:0; width:1920px; height:1080px; mask:linear-gradient(90deg,#0000,#000 14%,#000 86%,#0000),linear-gradient(#0000,#000 14%,#000 86%,#0000); mask-composite:intersect; }`,
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

/* ------------------------------------------------------------ headlines */

const jitter = (i: number): number => ((i * 2654435761) % 1000) / 1000;
/** A word under a marker; `marked` draws every one in a line, left to right. */
const hl = (word: string) => `<span class="hl"><i></i>${word}</span>`;
const marked = (line: string, at: number) =>
  `tl.fromTo("${line} .hl i",{scaleX:0},{scaleX:1,duration:0.32,ease:"power3.out",stagger:0.18},${at.toFixed(2)});`;

/* ------------------------------------------------------------ 4–6.5: the mock */

const MOCK_START = 4;
const MOCK_LENGTH = 2.5;
const MOCK_LINE = 31;
const CODE_BG = "#101014";
const RUST = `impl Render for License {
    fn render(
        &mut self,
        _window: &mut Window,
        cx: &mut Context<Self>,
    ) -> impl IntoElement {
        div()
            .flex()
            .flex_col()
            .gap_4()
            .p_6()
            .w(px(520.))
            .rounded_xl()
            .border_1()
            .border_color(rgb(0x27272a))
            .bg(rgb(0x18181b))
            .child(
                div()
                    .flex()
                    .flex_col()
                    .gap_1()
                    .child(
                        div()
                            .text_lg()
                            .font_weight(FontWeight::SEMIBOLD)
                            .child("Hunter License"),
                    )
                    .child(
                        div()
                            .text_sm()
                            .text_color(rgb(0xa1a1aa))
                            .child("The 287th exam"),
                    ),
            )
            .child(self.email.clone())
            .child(
                div()
                    .id("apply")
                    .flex()
                    .justify_center()
                    .h_9()
                    .rounded_md()
                    .bg(rgb(0xfafafa))
                    .text_color(rgb(0x18181b))
                    .cursor_pointer()
                    .on_click(cx.listener(Self::apply))
                    .child("Apply"),
            )
    }
}`;
const NO_JSX = `return createElement(
  "div",
  {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16,
      padding: 24,
      width: 520,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#27272a",
      backgroundColor: "#18181b",
    },
  },
  createElement(
    "div",
    { style: { gap: 4 } },
    createElement(
      "text",
      { style: { fontSize: 18, fontWeight: 600 } },
      "Hunter License",
    ),
    createElement(
      "text",
      { style: { fontSize: 14, color: "#a1a1aa" } },
      "The 287th exam",
    ),
  ),
  createElement(Input, { placeholder: "gon@whale-island" }),
  createElement(
    "div",
    {
      onClick: apply,
      style: {
        height: 36,
        borderRadius: 6,
        backgroundColor: "#fafafa",
        justifyContent: "center",
      },
    },
    createElement("text", null, "Apply"),
  ),
);`;
const uglify = (code: string) =>
  code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/("[^"]*")/g, "<i>$1</i>")
    .replace(/(createElement|\.\w+(?=\())/g, "<b>$1</b>");
/** Emoji bursting around the word: wide, because the word is, and never off the frame's top. */
const LAUGHS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i * 2 * Math.PI * 5) / 14;
  const reach = 1.25 + jitter(i) * 0.5;
  return {
    fromX: Math.round(Math.cos(angle) * 125),
    fromY: Math.round(Math.sin(angle) * 46),
    x: Math.round(Math.cos(angle) * 125 * reach),
    y: Math.round(Math.max(Math.sin(angle) * 46 * reach, -40)),
    spin: Math.round((jitter(i + 7) - 0.5) * 80),
    at: +(0.5 + i * 0.08).toFixed(2),
  };
});
const MOCK_SIDES = [
  { label: "GPUI, in Rust", code: RUST },
  { label: "React, no JSX", code: NO_JSX },
];
const mock: Scene = {
  id: "mock",
  start: MOCK_START,
  duration: MOCK_LENGTH,
  css: `#root .say { position:absolute; z-index:2; left:0; right:0; top:44px; text-align:center; font:400 62px Inter, sans-serif; letter-spacing:-0.025em; color:${INK}; }
    #root .quoted { position:relative; display:inline-block; }
    #root .laugh { position:absolute; left:50%; top:10px; margin-left:-24px; z-index:2; font-size:44px; line-height:48px; opacity:0; }
    #root .pane { position:absolute; top:150px; width:880px; height:960px; border-radius:20px; overflow:hidden; background:${CODE_BG}; padding:26px 36px; }
    #root .pane h2 { position:absolute; left:0; right:0; top:0; z-index:1; padding:26px 36px 18px; background:${CODE_BG}; font:500 26px Inter, sans-serif; color:#a1a1aa; }
    #root .pane em { font-style:normal; color:#71717a; margin-left:12px; }
    #root .pane pre { position:absolute; left:36px; top:86px; font:500 21px/${MOCK_LINE}px "JetBrains Mono", Menlo, monospace; color:#d4d4d8; }
    #root .pane pre b { font-weight:500; color:#7aa2f7; } #root .pane pre i { font-style:normal; color:#9ece6a; }`,
  body: `    <div id="k-say" class="say">nobody wants to <span class="quoted">“write”${LAUGHS.map((_, i) => `<span id="k-e${i}" class="laugh">😂</span>`).join("")}</span> this.</div>
    ${MOCK_SIDES.map(
      ({ label, code }, i) =>
        `<div id="k-p${i}" class="pane" style="left:${i === 0 ? 60 : 980}px"><h2>${label}<em>${code.split("\n").length} lines</em></h2><pre id="k-c${i}" data-layout-allow-overlap>${uglify(code)}</pre></div>`,
    ).join("\n    ")}`,
  script: `${MOCK_SIDES.map(
    (_, i) =>
      `tl.fromTo("#k-p${i}",{y:1000},{y:0,duration:0.4,ease:"expo.out"},${(i * 0.1).toFixed(2)});
    tl.to("#k-c${i}",{y:${-(MOCK_SIDES[i]!.code.split("\n").length * MOCK_LINE - 840)},duration:${MOCK_LENGTH - 0.3},ease:"power1.in"},0.3);
    tl.to("#k-p${i}",{y:1000,duration:0.32,ease:"expo.in"},${(MOCK_LENGTH - 0.36 + i * 0.03).toFixed(2)});`,
  ).join("\n    ")}
    ${LAUGHS.map(
      ({ fromX, fromY, x, y, spin, at }, i) =>
        `tl.fromTo("#k-e${i}",{x:${fromX},y:${fromY},scale:0.3,rotation:0},{x:${x},y:${y},scale:1,rotation:${spin},duration:0.8,ease:"power2.out"},${at});
    tl.fromTo("#k-e${i}",{opacity:0},{opacity:1,duration:0.1},${at});
    tl.to("#k-e${i}",{opacity:0,duration:0.25},${(at + 0.55).toFixed(2)});`,
    ).join("\n    ")}
    tl.to("#k-say",{opacity:0,duration:0.14},${(MOCK_LENGTH - 0.16).toFixed(2)});`,
};

/* ------------------------------------------------------------ 6.5–10.5: it's just shadcn */

const SHADCN_START = MOCK_START + MOCK_LENGTH;
const SHADCN_LENGTH = SHADCN_FRAMES / FPS;
const SHADCN_F = (frame: number) => frame / FPS;
const highlight = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/(&lt;\/?)([A-Z]\w*)/g, "$1<b>$2</b>")
    .replace(/("[^"]*")/g, "<i>$1</i>")
    .replace(/(--[a-z-]+)/g, "<b>$1</b>")
    .replace(/(oklch\([^)]*\)|\d+(?:\.\d+)?rem)/g, "<i>$1</i>");
/** The left half's look, shared with the npm scene that slides it away. */
const CODE_CSS = `#root .code { position:absolute; left:0; top:0; width:960px; overflow:hidden; height:1080px; background:${CODE_BG}; padding:96px 0 0 64px; font:500 27px/46px "JetBrains Mono", Menlo, monospace; color:#d4d4d8; }
    #root .code b { font-weight:500; color:#7aa2f7; } #root .code .ln i, #root .code .css i { font-style:normal; color:#9ece6a; }
    #root .css { position:absolute; left:64px; top:96px; white-space:pre; font-size:24px; line-height:42px; }
    #root .file { position:absolute; left:64px; top:36px; font:500 22px Inter, sans-serif; color:#71717a; }
    #root .code .say { position:absolute; left:64px; right:64px; top:auto; bottom:60px; text-align:left; font:400 52px Inter, sans-serif; letter-spacing:-0.025em; color:#fff; }`;
const fileOf = (name: string) => `${name}.css · tweakcn.com`;
const TWEAKCN_LINE = `paste any ${hl("tweakcn")} theme. done.`;
const shadcn: Scene = {
  id: "shadcn",
  start: SHADCN_START,
  duration: SHADCN_LENGTH,
  css: `${CODE_CSS}
    #root .ln { height:46px; overflow:hidden; white-space:pre; width:0; }
    #root .css { opacity:0; }
    #root .title { position:absolute; left:64px; top:960px; font:400 56px Inter, sans-serif; letter-spacing:-0.025em; color:${INK}; white-space:nowrap; transform-origin:0 50%; }
    #root .right { position:absolute; left:960px; top:0; width:960px; height:1080px; overflow:hidden; }
    #root .right video { position:relative; display:block; width:100%; height:100%; }`,
  body: `    <div id="s-right" class="right">${video("s-v", footage("shadcn-v8", 12), 0, SHADCN_LENGTH, "", 1)}</div>
    <div id="s-code" class="code">
      <div id="s-file" class="file">license.tsx</div>
      <div id="s-lines">${CODE.map((line, i) => `<div id="s-l${i}" class="ln">${highlight(line.text)}</div>`).join("")}</div>
      ${BUILDER_THEMES.map((theme, i) => `<div id="s-c${i}" class="css">${highlight(theme.css)}</div>`).join("\n      ")}
      <div id="s-say1" class="say on-dark" style="opacity:0">${TWEAKCN_LINE}</div>
    </div>
    <div id="s-title" class="title">it's just ${hl("shadcn")}</div>`,
  // The title holds the frame alone; then the code slides in beneath it and it
  // moves, shrinking, to the place it keeps while the code types.
  script: `tl.fromTo("#s-title",{x:400,y:-448,scale:2.2,opacity:0},{opacity:1,duration:0.2},0.02);
    ${marked("#s-title", 0.25)}
    tl.set("#s-code",{x:-960},0);
    tl.set("#s-right",{opacity:0},0);
    tl.to("#s-code",{x:0,duration:0.5,ease:"expo.inOut"},${SHADCN_F(INTRO - 8).toFixed(3)});
    tl.to("#s-title",{x:0,y:0,scale:1,color:"#ffffff",duration:0.5,ease:"expo.inOut"},${SHADCN_F(INTRO - 8).toFixed(3)});
    tl.to("#s-title .hl i",{backgroundColor:"#2F6FED",duration:0.25},${SHADCN_F(INTRO - 6).toFixed(3)});
    tl.to("#s-right",{opacity:1,duration:0.3},${SHADCN_F(INTRO).toFixed(3)});
    ${CODE.flatMap((line, i) =>
      Array.from(
        { length: Math.ceil(line.text.length / CODE_SPEED) },
        (_, n) =>
          `tl.set("#s-l${i}",{width:"${Math.min(line.text.length, (n + 1) * CODE_SPEED)}ch"},${SHADCN_F(line.frame + n).toFixed(3)});`,
      ),
    ).join("")}
    ${BUILDER_THEMES.map(
      (theme, i) =>
        `tl.set("#s-lines",{opacity:0},${SHADCN_F(theme.frame).toFixed(3)});
    ${i > 0 ? `tl.set("#s-c${i - 1}",{opacity:0},${SHADCN_F(theme.frame).toFixed(3)});` : ""}
    tl.set("#s-c${i}",{opacity:1},${SHADCN_F(theme.frame).toFixed(3)});`,
    ).join("\n    ")}
    ${BUILDER_THEMES.map(
      (theme) =>
        `tl.set("#s-file",{textContent:${JSON.stringify(fileOf(theme.name))}},${SHADCN_F(theme.frame).toFixed(3)});`,
    ).join("")}
    tl.set("#s-title",{opacity:0},${SHADCN_F(BUILDER_THEMES[0]!.frame).toFixed(3)});
    tl.set("#s-say1",{opacity:1},${SHADCN_F(BUILDER_THEMES[0]!.frame).toFixed(3)});
    ${marked("#s-say1", SHADCN_F(BUILDER_THEMES[0]!.frame))}`,
};

/* ------------------------------------------------------------ 10.5–13: the packages */

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
    ["oRPC", "orpc"],
    ["react-doctor", ""],
    ["and more", ""],
  ],
] as const;
const PKG_START = SHADCN_START + SHADCN_LENGTH;
const PKG_LENGTH = 2.5;
const LAST_THEME = BUILDER_THEMES[BUILDER_THEMES.length - 1]!;
const chip = (name: string, logo: string, id: string) =>
  `<div id="${id}" class="chip">${logo === "" ? `<i></i>` : `<img src="assets/logos/${logo}.svg" alt="">`}<span>${name}</span></div>`;
const npm: Scene = {
  id: "npm",
  start: PKG_START,
  duration: PKG_LENGTH,
  css: `${CODE_CSS}
    #root .row { position:absolute; left:0; right:0; display:flex; justify-content:center; gap:16px; white-space:nowrap; }
    #root .chip { display:flex; align-items:center; gap:16px; height:100px; padding:0 30px; border-radius:20px; background:#fff; box-shadow:0 0 0 1px rgba(29,29,31,.07), 0 16px 34px -20px rgba(29,29,31,.4); font:500 36px Inter, sans-serif; letter-spacing:-0.02em; color:${INK}; }
    #root .chip img { width:40px; height:40px; }
    #root .chip i { display:block; width:26px; height:26px; border-radius:7px; background:#c7c7cc; }
    #root .say { position:absolute; left:0; right:0; top:500px; text-align:center; font:400 72px Inter, sans-serif; letter-spacing:-0.025em; color:${INK}; }
    #root .out { position:absolute; inset:0; }
    #root .out img { position:absolute; left:960px; top:0; width:960px; height:1080px; }`,
  body: `    <div id="n-say" class="say">the ${hl("npm packages")} you already use</div>
    ${PACKAGES.map(
      (row, r) =>
        `<div id="n-row${r}" class="row" style="top:${r === 0 ? 300 : 690}px">${row.map(([name, logo], i) => chip(name, logo, `n-${r}-${i}`)).join("")}</div>`,
    ).join("\n    ")}
    <div id="n-out" class="out"><div class="code"><div class="file">${fileOf(LAST_THEME.name)}</div><div class="css">${highlight(LAST_THEME.css)}</div><div class="say on-dark">${TWEAKCN_LINE}</div></div><img src="${still("shadcn-v8", SHADCN_FRAMES - 1)}" alt=""></div>`,
  script: `tl.to("#n-out",{y:-1090,duration:0.42,ease:"expo.inOut"},0);
    ${marked("#n-say", 0.45)}
    tl.fromTo("#n-row0",{x:24},{x:-24,duration:${PKG_LENGTH},ease:"none"},0);
    tl.fromTo("#n-row1",{x:-24},{x:24,duration:${PKG_LENGTH},ease:"none"},0);
    ${PACKAGES.flatMap((row, r) =>
      row.map(
        (_, i) =>
          `tl.fromTo("#n-${r}-${i}",{y:${r === 0 ? -60 : 60},opacity:0,scale:0.9},{y:0,opacity:1,scale:1,duration:0.28,ease:"back.out(1.8)"},${(0.3 + r * 0.14 + i * 0.16).toFixed(2)});`,
      ),
    ).join("\n    ")}`,
};

/* ------------------------------------------------------------ 13–16.5: the tilted screen */

const WALL_TAKES = [
  "calendar",
  "buttons",
  "views",
  "code-block",
  "switches",
  "kanban",
  "file-tree",
  "diagram",
  "timeline",
  "badges",
  "accordion",
  "date-picker",
  "checks",
  "diff-viewer",
  "alert",
  "avatar",
  "stepper",
  "log-viewer",
  "card",
  "progress",
  "markdown-editor",
  "qr-code",
  "radios",
  "tag-input",
  "time-picker",
  "field",
  "sliders",
  "keyboard-shortcuts",
  "toggles",
  "property-panel",
  "gradient-text",
  "inset-group",
  "item",
  "frozen-table",
  "command-menu",
  "crop-area",
  "inputs",
  "drop-zone",
  "code-editor",
  "pinned-list",
  "expandable-rows",
  "confirm-dialog",
  "highlight-text",
  "avatar-group",
  "slider",
  "combobox",
  "search-replace",
  "toggle-group",
  "badge",
  "media-player",
  "popover",
  "color-picker",
  "user-menu",
  "scroll-fade",
  "table",
  "dialog",
  "tab-strip",
  "preview-card",
  "virtual-table",
  "tree",
] as const;
const WALL_START = PKG_START + PKG_LENGTH;
const WALL_LENGTH = 3.5;
const CELL = { w: 400, h: 267, gap: 22 };
const WALL_COLS = 10;
const WALL_ROWS = 6;
const cellX = (col: number) =>
  (col - (WALL_COLS - 1) / 2) * (CELL.w + CELL.gap);
const cellY = (row: number) =>
  (row - (WALL_ROWS - 1) / 2) * (CELL.h + CELL.gap);
const PLANE_WIDTH = WALL_COLS * (CELL.w + CELL.gap);
const DROP = 0.42;
/** The swipe to dark: a line crossing the plane left to right. */
const SWIPE = { at: 1.95, length: 0.75 };
/** The ground behind the plane, reaching past every corner of the frame. */
const SKY_HALF = 6000;
const SWIPE_SPEED = PLANE_WIDTH / SWIPE.length;
const swipeAt = (x: number) =>
  SWIPE.at + ((x + PLANE_WIDTH / 2) / PLANE_WIDTH) * SWIPE.length;
const tileMeta = WALL_TAKES.map((name, i) => {
  const col = i % WALL_COLS;
  const row = Math.floor(i / WALL_COLS);
  const x = cellX(col);
  const y = cellY(row);
  const dist =
    Math.hypot(col - (WALL_COLS - 1) / 2, row - (WALL_ROWS - 1) / 2) / 5.4;
  return {
    id: `t${i}`,
    name,
    x,
    y,
    land: 0.42 + dist * 1.3 + jitter(i) * 0.15,
  };
});
const wall: Scene = {
  id: "wall",
  start: WALL_START,
  duration: WALL_LENGTH,
  css: `#root .stage { position:absolute; inset:0; perspective:2600px; perspective-origin:50% 42%; }
    #root .plane { position:absolute; left:960px; top:540px; width:0; height:0; transform-style:preserve-3d; }
    #root .sky { position:absolute; left:-${SKY_HALF}px; top:-${SKY_HALF}px; width:${SKY_HALF * 2}px; height:${SKY_HALF * 2}px; background:${INK_DARK}; clip-path:inset(0 100% 0 0); }
    #root .tile { position:absolute; overflow:hidden; border-radius:16px; background:#fff; box-shadow:0 0 0 1px rgba(29,29,31,.07), 0 18px 40px -22px rgba(29,29,31,.4); }
    #root .tile img { position:absolute; left:0; top:0; width:100%; height:100%; }
    #root .tile img.d { clip-path:inset(0 100% 0 0); }
    #root .say { position:absolute; left:0; right:0; top:58px; text-align:center; font:400 62px Inter, sans-serif; letter-spacing:-0.025em; color:${INK}; }`,
  body: `    <div class="stage" data-layout-allow-overflow>
      <div id="plane" class="plane" data-layout-allow-overflow>
        <div id="sky" class="sky"></div>
${tileMeta
  .map(
    (t) =>
      `        <div id="${t.id}" class="tile" style="left:${t.x - CELL.w / 2}px;top:${t.y - CELL.h / 2}px;width:${CELL.w}px;height:${CELL.h}px;opacity:0"><img src="${still(`tile-${t.name}`, 53)}" alt=""><img id="${t.id}-d" class="d" src="${still(`dark-tile-${t.name}`, 53)}" alt=""></div>`,
  )
  .join("\n")}
      </div>
    </div>
    <div id="w-say" class="say">${hl("zero web views")}</div>`,
  script: `tl.set("#plane",{scale:0.74,x:0,y:90,rotationX:50,rotationZ:-18},0);
    tl.to("#plane",{scale:0.62,x:-30,y:70,rotationX:46,rotationZ:-14,duration:${WALL_LENGTH},ease:"none"},0);
    ${tileMeta
      .map(
        (t) =>
          `tl.fromTo("#${t.id}",{z:820,opacity:0},{z:0,opacity:1,duration:${DROP},ease:"power2.in"},${(t.land - DROP).toFixed(3)});tl.to("#${t.id}-d",{clipPath:"inset(0 0% 0 0)",duration:${((CELL.w / PLANE_WIDTH) * SWIPE.length).toFixed(3)},ease:"none"},${swipeAt(t.x - CELL.w / 2).toFixed(3)});`,
      )
      .join("\n    ")}
    tl.to("#sky",{clipPath:"inset(0 0% 0 0)",duration:${((SKY_HALF * 2) / SWIPE_SPEED).toFixed(3)},ease:"none"},${swipeAt(-SKY_HALF).toFixed(3)});
    ${marked("#w-say", 0.35)}
    tl.to("#w-say",{color:"#ffffff",duration:0.2},${(SWIPE.at + SWIPE.length * 0.4).toFixed(2)});
    tl.to("#w-say .hl i",{backgroundColor:"#2F6FED",duration:0.2},${(SWIPE.at + SWIPE.length * 0.4).toFixed(2)});`,
};

/* ------------------------------------------------------------ 16.5–20.5: the apps */

const APPS = {
  start: WALL_START + WALL_LENGTH,
  length: 4,
  launcherFor: 1,
  vaultFor: 1.4,
};
const WIN = { x: 110, y: 40, w: 1700 };
const DASH_AT = APPS.launcherFor + APPS.vaultFor;
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
  css: `#root { background:${INK_DARK}; }
    #root .under { position:absolute; inset:0; }
    #root .under img { position:absolute; inset:0; width:100%; height:100%; mask:linear-gradient(#0000 140px,#000 240px); }
    #root .scrim { position:absolute; inset:0; background:${INK_DARK}; opacity:0; }
    #root .win { position:absolute; left:${WIN.x}px; top:${WIN.y}px; width:${WIN.w}px; border-radius:18px; overflow:hidden; box-shadow:0 0 0 1px rgba(255,255,255,.12), 0 50px 90px -40px #000; opacity:0; }
    #root .win video { position:relative; display:block; width:100%; height:auto; }
    #root .hud { position:absolute; left:510px; top:270px; width:900px; border-radius:22px; overflow:hidden; box-shadow:0 0 0 1px rgba(255,255,255,.14), 0 60px 110px -30px #000; opacity:0; transform-origin:50% 50%; }
    #root .hud video { position:relative; display:block; width:100%; height:auto; }
    #root .cursor { width:56px; }`,
  body: `    <div class="under"><img src="assets/footage/wall-end.png" alt=""></div>
    <div id="a-scrim" class="scrim"></div>
    <div id="a-vault" class="win">${video("a-vault-v", footage("vault-v8", 12), APPS.launcherFor, APPS.vaultFor + 0.2, "", 2)}<div id="a-vc" class="cursor">${CURSOR}</div></div>
    <div id="a-dash" class="win">${clip("a-dash-v", footage("dashboard-v8", 12), DASH_AT - 0.2, 1.8, 0, "", 3)}<div id="a-dc" class="cursor">${CURSOR}</div></div>
    <div id="a-hud" class="hud">${video("a-hud-v", footage("launcher-v8", 12), 0, APPS.launcherFor + 0.1, "", 1)}</div>`,
  script: `tl.to("#a-scrim",{opacity:0.78,duration:0.25,ease:"power2.out"},0);
    tl.fromTo("#a-hud",{opacity:0,scale:0.94,y:-16},{opacity:1,scale:1,y:0,duration:0.28,ease:"back.out(1.6)"},0);
    // Enter: the panel grows into the window it opened.
    tl.to("#a-hud",{scale:1.9,y:190,opacity:0,duration:0.26,ease:"expo.in"},${(APPS.launcherFor - 0.16).toFixed(2)});
    tl.fromTo("#a-vault",{opacity:0,scale:0.5,y:-60},{opacity:1,scale:1,y:0,duration:0.42,ease:"expo.out"},${APPS.launcherFor.toFixed(2)});
    tl.to("#a-scrim",{opacity:1,duration:0.3},${APPS.launcherFor.toFixed(2)});
    ${cursorOn("vault-v8", "a-vc", APPS.launcherFor, 0, APPS.vaultFor, WIN.w, 980)}
    tl.to("#a-vault",{x:-1900,duration:0.42,ease:"power3.inOut"},${(DASH_AT - 0.2).toFixed(2)});
    tl.set("#a-dash",{opacity:1},${(DASH_AT - 0.2).toFixed(2)});
    tl.fromTo("#a-dash",{x:1900},{x:0,duration:0.42,ease:"power3.inOut"},${(DASH_AT - 0.2).toFixed(2)});
    // In on the chart for the two range presses, and back out to hand it over.
    tl.set("#a-dash",{transformOrigin:"78% 27%"},0);
    tl.to("#a-dash",{scale:1.45,y:-24,duration:0.36,ease:"power3.inOut"},${(DASH_AT + 0.14).toFixed(2)});
    tl.to("#a-dash",{scale:1,y:0,duration:0.3,ease:"power3.inOut"},${(APPS.length - 0.3).toFixed(2)});
    ${cursorOn("dashboard-v8", "a-dc", DASH_AT, 0, 1.6, WIN.w, 1400)}`,
};

/* ------------------------------------------------------------ 20.5–23: the charts */

/** A chart take is 54 frames; its last frame holds after that. */
const TILE_MEDIA = 1.8;
const CHARTS = [
  ["area", "AreaChart"],
  ["bar", "BarChart"],
  ["donut", "DonutChart"],
  ["treemap", "TreemapChart"],
  ["line", "LineChart"],
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
const CHARTS_START = APPS.start + APPS.length;
const CHARTS_LENGTH = 2.5;
const CARD = { w: 420, h: 280, gap: 20 };
const ROW_Y = [100, 400, 700];
const RUN = [
  [0, 6],
  [6, 12],
  [12, 17],
] as const;
const SETTINGS_WIN = {
  w: 1320,
  x: 300,
  y: 196,
  h: Math.round((1320 * 470) / 880),
};

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
const GNOME_APPS = [
  "Epiphany",
  "Nautilus",
  "Calendar",
  "Music",
  "TextEditor",
  "Settings",
];
const desktopCss = `#root .desk { position:absolute; inset:0; overflow:hidden; font-family:Inter, sans-serif; }
    #root .desk > img.wall { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
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
    #root .dash { position:absolute; left:50%; bottom:14px; transform:translateX(-50%); display:flex; gap:10px; padding:10px 14px; border-radius:22px; background:rgba(36,36,40,.86); }
    #root .dash img { display:block; width:64px; height:64px; }`;
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
) => `<div id="${id}" class="desk"><img class="wall" src="assets/gnome/adwaita.jpg" alt="">
      <div class="gbar"><span class="act">Activities</span><span class="clock">Fri Nov 6  9:41</span><span class="sys">Wi-Fi  ·  100%</span></div>
      <div class="dash">${GNOME_APPS.map((name) => `<img src="assets/gnome/org.gnome.${name}.svg" alt="">`).join("")}</div></div>`;

const charts: Scene = {
  id: "charts",
  start: CHARTS_START,
  duration: CHARTS_LENGTH,
  css: `#root { background:${INK_DARK}; }
    #root .out { position:absolute; left:${WIN.x}px; top:${WIN.y}px; width:${WIN.w}px; border-radius:18px; }
    #root .rows { position:absolute; inset:0; }
    #root .rw { position:absolute; left:0; display:flex; gap:${CARD.gap}px; }
    #root .cd { position:relative; flex:none; width:${CARD.w}px; height:${CARD.h}px; border-radius:18px; overflow:hidden; background:#1b1b1f; box-shadow:0 0 0 1px rgba(255,255,255,.08); }
    #root .cd video, #root .cd img { position:absolute; left:0; top:0; width:100%; height:100%; }
    #root .cd b { position:absolute; left:16px; top:10px; font:500 18px Inter, sans-serif; color:#a1a1aa; }
    #root .next { position:absolute; inset:0; clip-path:circle(0px at 960px 560px); }
    #root .next > img { position:absolute; left:${SETTINGS_WIN.x}px; top:${SETTINGS_WIN.y}px; width:${SETTINGS_WIN.w}px; height:${SETTINGS_WIN.h}px; border-radius:19px; box-shadow:0 60px 100px -36px rgba(0,0,0,.6); }
    ${desktopCss}`,
  body: `    <img id="c-out" class="out" src="${still("dashboard-v8", 59)}" alt="">
    <div id="c-rows" class="rows">
${RUN.map(
  ([from, to], r) =>
    `      <div id="c-r${r}" class="rw" style="top:${ROW_Y[r]}px">${CHARTS.slice(
      from,
      to,
    )
      .map(([name, label], i) => {
        const land = 0.15 + i * 0.16 + r * 0.1;
        const take = `dark-chart-${name}`;
        return `<div class="cd">${video(`c-v${r}-${i}`, footage(take, 18), land, Math.min(TILE_MEDIA, CHARTS_LENGTH - land), "", 2 + r)}${CHARTS_LENGTH - land > TILE_MEDIA ? `<img id="c-s${r}-${i}" src="${still(take, 53)}" alt="" style="opacity:0">` : ""}<b>${label}</b></div>`;
      })
      .join("")}</div>`,
).join("\n")}
    </div>
    <div id="c-next" class="next">${macDesk("c-mac")}<img src="${still("settings-v8", 0)}" alt=""></div>`,
  script: `// Clear of the frame entirely: the window is taller than the frame.
    tl.to("#c-out",{y:-1500,duration:0.45,ease:"power3.inOut"},0);
    tl.fromTo("#c-rows",{y:1080},{y:0,duration:0.5,ease:"power3.out"},0.02);
    tl.fromTo("#c-r0",{x:40},{x:-780,duration:${CHARTS_LENGTH},ease:"none"},0);
    tl.fromTo("#c-r1",{x:-820},{x:0,duration:${CHARTS_LENGTH},ease:"none"},0);
    tl.fromTo("#c-r2",{x:-20},{x:-400,duration:${CHARTS_LENGTH},ease:"none"},0);
    ${RUN.flatMap(([from, to], r) =>
      CHARTS.slice(from, to).flatMap((_, i) => {
        const land = 0.15 + i * 0.16 + r * 0.1;
        return CHARTS_LENGTH - land > TILE_MEDIA
          ? [
              `tl.set("#c-s${r}-${i}",{opacity:1},${(land + TILE_MEDIA - 0.04).toFixed(3)});`,
            ]
          : [];
      }),
    ).join("")}
    tl.to("#c-next",{clipPath:"circle(1300px at 960px 560px)",duration:0.42,ease:"expo.inOut"},${(CHARTS_LENGTH - 0.42).toFixed(2)});`,
};

/* ------------------------------------------------------------ 23–26: three desktops */

const osLine = (id: string) =>
  `<span id="${id}0">${hl("Mac,")}</span> <span id="${id}1">${hl("Windows,")}</span> <span id="${id}2">${hl("Linux")}</span>`;
const OS_SAY_CSS = `#root .say { position:absolute; left:0; right:0; top:72px; text-align:center; font:500 62px Inter, sans-serif; letter-spacing:-0.025em; color:#fff; text-shadow:0 2px 8px rgba(0,0,0,.5), 0 4px 40px rgba(0,0,0,.6); }`;

const DESK_START = CHARTS_START + CHARTS_LENGTH;
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
    ${OS_SAY_CSS}
    #root .cursor { width:56px; z-index:5; }`,
  body: `    ${macDesk("d-mac")}
    <div id="d-win-layer" style="position:absolute;inset:0;clip-path:circle(0px at ${pW.x.toFixed(0)}px ${pW.y.toFixed(0)}px)">${winDesk("d-win")}</div>
    <div id="d-gnome-layer" style="position:absolute;inset:0;clip-path:circle(0px at ${pL.x.toFixed(0)}px ${pL.y.toFixed(0)}px)">${gnomeDesk("d-gnome")}</div>
    <div id="d-window" class="window">${video("d-v", footage("settings-v8", 12), 0, DESK_LENGTH, "", 2)}<div id="d-cur" class="cursor">${CURSOR}</div></div>
    <div id="d-say" class="say on-dark">${osLine("d-os")}</div>`,
  // Each press and its wipe share a frame; the window's own chrome is the take's.
  script: `${[0.12, PRESS_WIN + 1 / FPS, PRESS_LINUX + 1 / FPS]
    .map(
      (at, i) =>
        `tl.fromTo("#d-os${i}",{opacity:0.35},{opacity:1,duration:0.15},${at.toFixed(3)});${marked(`#d-os${i}`, at)}`,
    )
    .join("\n    ")}
    tl.to("#d-win-layer",{clipPath:"circle(2300px at ${pW.x.toFixed(0)}px ${pW.y.toFixed(0)}px)",duration:0.55,ease:"expo.out"},${(PRESS_WIN + 1 / FPS).toFixed(3)});
    tl.to("#d-gnome-layer",{clipPath:"circle(2300px at ${pL.x.toFixed(0)}px ${pL.y.toFixed(0)}px)",duration:0.55,ease:"expo.out"},${(PRESS_LINUX + 1 / FPS).toFixed(3)});
    ${cursorClip("d-cur", "settings-v8", 0, 0, DESK_LENGTH, SETTINGS_WIN.w / (2 * 880))}`,
};

/* ------------------------------------------------------------ 26–30: Omarchy */

const OM_START = DESK_START + DESK_LENGTH;
const OM_LENGTH = 4;
/** A strip of carriages: the sentence, then each theme, stopping on one at a time. */
const NOSE = 140;
const COUPLER = 28;
const ARRIVE = 0.8;
const DEPART = 1.62;
const stopAt = (carriage: number) => -carriage * (1920 + COUPLER);
const OM_FLIP = (i: number) => 2.16 + i * 0.42;
const TRAIN_WORDS = ["Follows", "your", "theme", "in"] as const;
const THEMES = ["rose-pine", "gruvbox", "catppuccin-latte", "tokyo"] as const;
/** The terminal pane in the tiling take, in frame fractions (measured from the still). */
const PANE = { x: 0.55, y: 0.075, w: 0.42, h: 0.46 };
const paneZoom = 1 / PANE.w;
const omarchy: Scene = {
  id: "omarchy",
  start: OM_START,
  duration: OM_LENGTH,
  css: `#root { background:${INK_DARK}; }
    #root .full { position:absolute; inset:0; width:100%; height:100%; }
    #root #o-all { position:absolute; inset:0; transform-origin:0 0; }
    #root .strip { position:absolute; inset:0; }
    #root .car { position:absolute; left:0; top:0; width:1920px; height:1080px; }
    #root .plate { position:absolute; left:-${NOSE}px; top:0; width:${1920 + NOSE}px; height:1080px; background:${INK_DARK}; border-radius:${NOSE}px 0 0 ${NOSE}px; }
    #root .line { position:absolute; left:0; right:0; top:470px; display:flex; justify-content:center; gap:.26em; font:500 116px/140px Inter, sans-serif; letter-spacing:-0.03em; color:#fff; white-space:nowrap; }
    #root .line span.w { display:block; }
    #root .front { position:absolute; inset:0; }
    #root .fly { position:absolute; left:${SETTINGS_WIN.x}px; top:${SETTINGS_WIN.y}px; width:${SETTINGS_WIN.w}px; border-radius:19px; }
    ${OS_SAY_CSS}
    ${desktopCss}`,
  body: `    <div id="o-front" class="front">${gnomeDesk("o-gnome")}<img class="fly" src="${still("settings-v8", 89)}" alt=""><div class="say on-dark">${osLine("o-os")}</div></div>
    <div id="o-all"><div id="o-strip" class="strip" data-layout-allow-overflow>
      <div class="plate"></div>
      <div id="o-line" class="line on-dark">${[...TRAIN_WORDS, hl("omarchy")].map((word, i) => `<span id="o-w${i}" class="w">${word}</span>`).join("")}</div>
${THEMES.map((t, i) => `      <div class="car" style="left:${-stopAt(i + 1)}px"><img class="full" src="${still(`omarchy-${t}`, 53)}" alt=""></div>`).join("\n")}
    </div></div>`,
  script: `tl.fromTo("#o-strip",{x:${1920 + NOSE}},{x:0,duration:${ARRIVE},ease:"power3.out"},0);
    ${[...TRAIN_WORDS, "omarchy"]
      .map(
        (_, i) =>
          `tl.fromTo("#o-w${i}",{x:${i * 170}},{x:0,duration:${ARRIVE + 0.14},ease:"back.out(1.3)"},0);`,
      )
      .join("\n    ")}
    ${marked("#o-line", ARRIVE - 0.1)}
    tl.set("#o-front",{opacity:0},${ARRIVE});
    tl.to("#o-strip",{x:${stopAt(1)},duration:0.42,ease:"power3.inOut"},${DEPART});
    ${THEMES.slice(1)
      .map(
        (_, i) =>
          `tl.to("#o-strip",{x:${stopAt(i + 2)},duration:0.34,ease:"expo.inOut"},${OM_FLIP(i).toFixed(2)});`,
      )
      .join("\n    ")}
    tl.to("#o-all",{x:${(-PANE.x * 1920 * paneZoom).toFixed(1)},y:${(-PANE.y * 1080 * paneZoom + (1080 - PANE.h * 1080 * paneZoom) / 2).toFixed(1)},scale:${paneZoom.toFixed(3)},duration:0.42,ease:"expo.in"},${(OM_LENGTH - 0.42).toFixed(2)});`,
};

/* ------------------------------------------------------------ 30–34: the terminal */

const TERM_START = OM_START + OM_LENGTH;
const TERM_LENGTH = 4;
const SSH = "ssh gon@whale-island";
const RUN_CMD = "huntercli --terminal";
const CHARS_PER_FRAME = 2;
const TYPE_AT = 0.1;
const typeTime = (text: string) =>
  Math.ceil(text.length / CHARS_PER_FRAME) / FPS;
const T_LOGIN = TYPE_AT + typeTime(SSH) + 0.04;
const T_RUN = 0.8;
const T_APP = 1.75;
const CLAUSES = [
  { text: "Run in the terminal,", at: 0.1 },
  { text: "in tmux,", at: 0.5 },
  { text: "over ssh,", at: 0.82 },
  { text: "with animations.", at: 1.12 },
];
const typed = (id: string, text: string, from: number): string =>
  Array.from(
    { length: Math.ceil(text.length / CHARS_PER_FRAME) },
    (_, i) =>
      `tl.set("#${id}",{textContent:${JSON.stringify(text.slice(0, (i + 1) * CHARS_PER_FRAME))}},${(from + i / FPS).toFixed(3)});`,
  ).join("");
const STATUS_H = 44;
const APP_H = 1080 - STATUS_H;
const TERM_BG = "#1a1b26";
const terminal: Scene = {
  id: "terminal",
  start: TERM_START,
  duration: TERM_LENGTH,
  css: `#root .shell { position:absolute; inset:0; background:${TERM_BG}; padding:44px 60px; font:500 34px/50px "JetBrains Mono", Menlo, monospace; color:#c0caf5; }
    #root .shell b { font-weight:600; color:#7aa2f7; } #root .shell .dim { color:#565f89; } #root .shell .off { opacity:0; }
    #root .say { position:absolute; left:0; right:0; top:560px; display:flex; justify-content:center; gap:.3em; font:500 64px/88px Inter, sans-serif; letter-spacing:-0.025em; color:#fff; }
    #root .say .clause { display:block; overflow:hidden; }
    #root .say .clause span { display:block; }
    #root .app { position:absolute; left:0; top:0; width:1920px; height:${APP_H}px; clip-path:inset(0 0 100% 0); overflow:hidden; }
    #root .app video { position:relative; display:block; width:100%; height:100%; }
    #root .status { position:absolute; left:0; right:0; bottom:0; height:${STATUS_H}px; display:flex; align-items:center; gap:24px; padding:0 22px; background:#7aa2f7; color:#1a1b26; font:600 24px "JetBrains Mono", Menlo, monospace; }
    #root .status span:last-child { margin-left:auto; }
    #root .cursor { width:56px; }`,
  body: `    <div id="term" class="shell">
      <div><b>~ ❯</b> <span id="t-ssh"></span></div>
      <div id="t-login" class="dim off">Last login: Fri Nov 6 09:41:07 2026 from 10.0.0.2</div>
      <div id="t-runline" class="off"><b>gon@whale-island ~ ❯</b> <span id="t-run"></span></div>
    </div>
    <div id="t-say" class="say on-dark">${CLAUSES.map(({ text }, i) => `<div class="clause"><span id="t-c${i}">${text}</span></div>`).join("")}</div>
    <div id="t-app" class="app">${video("t-v", footage("console-v8", 12), T_APP, TERM_LENGTH - T_APP, "", 2)}<div id="t-cur" class="cursor">${CURSOR}</div></div>
    <div class="status"><span>0:huntercli*</span><span>gon@whale-island</span><span>ssh · 09:41</span></div>`,
  script: `${CLAUSES.map(
    ({ at }, i) =>
      `tl.fromTo("#t-c${i}",{yPercent:110},{yPercent:0,duration:0.42,ease:"power4.out"},${at});
    tl.to("#t-c${i}",{yPercent:-110,duration:0.26,ease:"power3.in"},${(T_APP - 0.3 + i * 0.03).toFixed(2)});`,
  ).join("\n    ")}
    ${typed("t-ssh", SSH, TYPE_AT)}
    tl.set("#t-login",{opacity:1},${T_LOGIN.toFixed(3)});
    tl.set("#t-runline",{opacity:1},${T_RUN.toFixed(3)});
    ${typed("t-run", RUN_CMD, T_RUN)}
    tl.to("#t-app",{clipPath:"inset(0 0 0% 0)",duration:0.2,ease:"steps(24)"},${T_APP.toFixed(3)});
    ${cursorClip("t-cur", "console-v8", T_APP, 0, TERM_LENGTH - T_APP, 1920 / (2 * 1024))}`,
};

/* ------------------------------------------------------------ 32–38: the stack and the end */

const STACK_START = TERM_START + TERM_LENGTH;
const WORDS = ["GPUI", "React", "shadcn", "Tailwind"] as const;
const stack: Scene = {
  id: "stack",
  start: STACK_START,
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

const END_START = STACK_START + 2;
const end: Scene = {
  id: "end",
  start: END_START,
  duration: 4,
  css: `#root .lockup { position:absolute; inset:0; }
    #root .mark { position:absolute; left:50%; top:330px; width:190px; height:190px; margin-left:-95px; }
    #root .name { position:absolute; left:0; right:0; top:560px; text-align:center; font:600 92px Inter, sans-serif; letter-spacing:-0.035em; color:${INK}; }
    #root .url { position:absolute; left:0; right:0; top:690px; text-align:center; font:500 46px Inter, sans-serif; color:#171717; }
    #root .credit { position:absolute; left:0; right:0; top:950px; text-align:center; font:400 30px Inter, sans-serif; color:#6e6e73; }
    #root .credit u { color:${INK}; text-underline-offset:5px; }`,
  body: `    <div class="lockup">
      <img id="e-mark" class="mark" src="assets/logo.png" alt="">
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

const scenes = [
  montage,
  mock,
  shadcn,
  npm,
  wall,
  apps,
  charts,
  desktops,
  omarchy,
  terminal,
  stack,
  end,
];
const LENGTH = END_START + 4;

/* ------------------------------------------------------------ lines and sound */

const F = 1 / FPS;
/** The frames the slider's value actually changed on, read from its take. */
const sliderTicks: ReadonlyArray<number> = JSON.parse(
  readFileSync(at("takes/cu-slider/changes.json"), "utf8"),
);
const typedCues = (text: string, from: number, speed: number) =>
  Array.from({ length: Math.ceil(text.length / speed) }, (_, i) => i)
    .filter((i) => i % 2 === 0)
    .map((i, n) => [from + i / FPS, `key-${n % 4}`, 0.7] as const);
/** A cue: when, which sample, and an optional level (0.9 is the default bed). */
const CUES: ReadonlyArray<readonly [number, string, number?]> = [
  // A close-up's state changes on release, three frames after its press.
  ...MONTAGE.map(
    ({ sound }, i) =>
      [i * BEAT_CUT + PRESS_AT - LEAD_IN + 3 * F, sound] as const,
  ),
  ...sliderTicks
    .filter(
      (frame) => frame / FPS >= LEAD_IN && frame / FPS < LEAD_IN + BEAT_CUT,
    )
    .map(
      (frame, n) =>
        [2 * BEAT_CUT + frame / FPS - LEAD_IN + F, `detent-${n + 2}`] as const,
    ),
  // The two panels land, then the code types and each pasted theme lands.
  [MOCK_START + 0.2, "thud", 0.7],
  [MOCK_START + 0.3, "thud", 0.7],
  ...CODE.flatMap((line) =>
    typedCues(line.text, SHADCN_START + SHADCN_F(line.frame), CODE_SPEED),
  ),
  ...BUILDER_THEMES.map(
    (theme) => [SHADCN_START + SHADCN_F(theme.frame) + F, "press"] as const,
  ),
  ...PACKAGES.flatMap((row, r) =>
    row.map(
      (_, i) =>
        [
          PKG_START + 0.3 + r * 0.14 + i * 0.16 + 0.1,
          `cap-${(r + i) % 4}`,
          0.55,
        ] as const,
    ),
  ),
  ...tileMeta
    .slice()
    .sort((a, b) => a.land - b.land)
    .filter((_, i) => i % 8 === 0)
    .map((t, i) => [WALL_START + t.land, `cap-${i % 4}`, 0.45] as const),
  [WALL_START + SWIPE.at + 0.1, "glass-1", 0.8],
  // ⌘K, five keys, Enter.
  [APPS.start, "press"],
  ...[12, 15, 18, 21, 24].map(
    (frame, n) => [APPS.start + frame / FPS + F, `key-${n % 4}`] as const,
  ),
  [APPS.start + APPS.launcherFor - 0.16, "thud"],
  // The take's own presses land on release, one frame after.
  ...[16, 32].map(
    (frame) =>
      [APPS.start + APPS.launcherFor + frame / FPS + F, "press"] as const,
  ),
  ...[15, 30].map(
    (frame) => [APPS.start + DASH_AT + frame / FPS + F, "press"] as const,
  ),
  ...[0.35, 0.7, 1.05].map(
    (at, i) => [CHARTS_START + at, `glass-${i}`, 0.45] as const,
  ),
  [DESK_START + PRESS_WIN + F, "look-win"],
  [DESK_START + PRESS_LINUX + F, "look-linux"],
  [OM_START + ARRIVE - 0.2, "thud", 0.8],
  [OM_START + DEPART + 0.28, "land", 0.9],
  ...[0, 1, 2].map(
    (i) => [OM_START + OM_FLIP(i) + 0.17, `glass-${i}`, 1] as const,
  ),
  ...typedCues(SSH, TERM_START + TYPE_AT, CHARS_PER_FRAME),
  [TERM_START + T_LOGIN - 0.03, "press", 0.6],
  ...typedCues(RUN_CMD, TERM_START + T_RUN, CHARS_PER_FRAME),
  [TERM_START + T_APP, "land"],
  ...[15, 34, 54].map(
    (frame) => [TERM_START + T_APP + frame / FPS + F, "press"] as const,
  ),
  [END_START + 0.1, "mark"],
];

/**
 * The score, opened up: bar 4 (its A) plays twice and bars 5–8 play twice, so the
 * stabs land the stack and the last chord the mark. The harmony still resolves: A
 * leads back to the Bm that follows each repeat.
 */
const score = (): string => {
  const out = "assets/music/score-long.wav";
  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    at("assets/music/score.wav"),
    "-filter_complex",
    "[0]atrim=0:8.03,asetpts=N/SR/TB[a];[0]atrim=6:8.03,asetpts=N/SR/TB[r];[0]atrim=8:16.03,asetpts=N/SR/TB[b];[0]atrim=8:16.03,asetpts=N/SR/TB[b2];[0]atrim=start=16,asetpts=N/SR/TB[c];[a][r]acrossfade=d=0.03[ar];[ar][b]acrossfade=d=0.03[ab];[ab][b2]acrossfade=d=0.03[abb];[abb][c]acrossfade=d=0.03[o]",
    "-map",
    "[o]",
    at(out),
  ]);
  return out;
};

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
    </style>
  </head>
  <body>
    <!-- The launch film v9 (plan 070), written by build.ts: ${LENGTH} s on the score's 120 BPM grid. -->
    <div id="root" data-composition-id="main" data-start="0" data-duration="${LENGTH}" data-width="1920" data-height="1080">
${scenes.map((s) => `      <div id="${s.id}" data-composition-id="${s.id}" data-composition-src="compositions/${s.id}.html" data-start="${s.start}" data-duration="${s.duration}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>`).join("\n")}
      <audio id="score" class="clip" data-start="0" data-duration="${LENGTH}" data-track-index="19" data-volume="0.28" data-fade-out="1.5" src="${score()}"></audio>
${CUES.map(([time, sound, volume], i) => `      <audio id="sfx-${String(i).padStart(3, "0")}" class="clip" data-start="${time.toFixed(3)}" data-duration="${lengthOf(sound).toFixed(3)}" data-track-index="${20 + (i % 8)}" data-volume="${volume ?? 0.9}" src="assets/sfx/${sound}.wav"></audio>`).join("\n")}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
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
// `shadcn.html` and `npm.html` hold preformatted code, which it would reflow.
execFileSync(
  at("../../node_modules/.bin/oxfmt"),
  ["--write", ...written.filter((file) => !/(shadcn|npm)\.html$/.test(file))],
  { stdio: "ignore" },
);
