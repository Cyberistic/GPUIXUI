/** @jsxImportSource @gpuix/react */

import { ColorSwatches } from "@gpuixui/components/color-swatches";
import { InsetGroup, InsetGroupRow } from "@gpuixui/components/inset-group";
import { SegmentedControl } from "@gpuixui/components/segmented-control";
import { Slider, Switch } from "@gpuixui/primitives";
import { darkTheme, lightTheme, mixThemes } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import type { ReactNode } from "react";
import { alpha, at, center, col, Dot, H, MUTED, PointerAt, RawShader, Root, row, T, TEXT, W } from "./kit.js";
import { ease, sp, track } from "./motion.js";
import { LIGHT_SHADER, lightData, lightParams, srgbf, type LightDesc, type Prim } from "./rune-light.js";

const HERO_SWITCH = { on: "#3b82f6", off: "#2a2a2d", knob: "#ffffff" };
const HERO_METRICS = { width: 152, height: 88, knob: 72, inset: 8, border: 0 };
export const Hello = ({ t }: { t: number }): ReactNode => (
  <Root fill="#111113">
    <ThemeProvider theme={{ ...darkTheme, switch: HERO_SWITCH, switchMetrics: HERO_METRICS }}>
      <div style={{ ...at(0, 164, W), ...center }}><T s={t >= 0.68 ? "Nen on" : "Nen off"} size={52} weight={600} /></div>
      <div style={{ ...at(404, 290, 152, 88), ...center }}><Switch checked={t >= 0.68} label="Nen" /></div>
    </ThemeProvider>
    <PointerAt t={t} start={[760, 450]} path={[[0.1, 480, 334]]} taps={[0.68]} />
  </Root>
);

const ACCENTS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#22c55e", "#6b7280"];
const SWITCH_METRICS = { width: 38, height: 22, knob: 18, inset: 2, border: 0 };
const SETTINGS_DARK = { ...darkTheme, switch: { on: "#3b82f6", off: "#2c2c30", knob: "#ffffff" }, switchMetrics: SWITCH_METRICS, colors: { ...darkTheme.colors, primary: "#3b82f6", background: "#17171a", card: "#222226", foreground: "#f2f2f4", mutedForeground: "#9d9da6", border: "#ffffff0f", muted: "#2c2c30" } };
const SETTINGS_LIGHT = { ...lightTheme, switch: { on: "#3b82f6", off: "#e0e0e4", knob: "#ffffff" }, switchMetrics: SWITCH_METRICS, colors: { ...lightTheme.colors, primary: "#3b82f6", background: "#f2f2f5", card: "#ffffff", foreground: "#17171a", mutedForeground: "#6b6b75", border: "#0000000f", muted: "#e7e7ea" } };
const ROW = { minHeight: 44 };
export const Settings = ({ t }: { t: number }): ReactNode => {
  const k = track(t, 0, [[0.55, 1, sp(0.45, 0)]]), sounds = t >= 0.42, theme = mixThemes(SETTINGS_DARK, SETTINGS_LIGHT, k);
  const speed = 0.5 - 0.28 * ease(t, 0.72, 0.5), hover = t < 0.55;
  return (
    <ThemeProvider theme={theme}>
      <div style={{ position: "relative", width: W, height: H, overflow: "hidden", backgroundColor: theme.colors.background }}>
        <div style={{ ...at(0, 0, W, 40), ...center }}><T s="Settings" size={14} weight={600} color={theme.colors.foreground} /></div>
        <div style={{ ...at(24, 44, W - 48), ...col(23) }}>
          <InsetGroup title="Appearance" titleTone="muted" elevated insetDividers>
            <InsetGroupRow label="Theme" style={ROW} control={<SegmentedControl style={{ width: 204 }} label="Theme" value={t >= 0.55 ? "light" : "auto"} items={[{ value: "auto", label: "Auto" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />} />
            <InsetGroupRow label="Accent colour" style={ROW} control={<ColorSwatches label="Accent colour" colors={ACCENTS} value={ACCENTS[0]} />} />
          </InsetGroup>
          <InsetGroup title="General" titleTone="muted" elevated insetDividers>
            <InsetGroupRow label="Launch at login" style={ROW} control={<Switch checked label="Launch at login" />} />
            <InsetGroupRow label="Show in menu bar" style={ROW} control={<Switch checked label="Show in menu bar" />} />
            <InsetGroupRow label="Play sounds" style={{ ...ROW, ...(hover ? { backgroundColor: "#ffffff0d" } : {}) }} control={<Switch checked={sounds} label="Play sounds" />} />
          </InsetGroup>
          <InsetGroup title="Motion" titleTone="muted" elevated insetDividers>
            <InsetGroupRow label="Animation speed" style={ROW} control={<div style={row(14)}><div style={{ width: 180 }}><Slider label="Animation speed" value={speed * 100} /></div><T s={`${(2 ** (speed * 2 - 1)).toFixed(2)}×`} size={12} color={theme.colors.mutedForeground} /></div>} />
            <InsetGroupRow label="Reduce motion" style={ROW} control={<Switch checked={false} label="Reduce motion" />} />
          </InsetGroup>
        </div>
        <PointerAt t={t} start={[880, 300]} path={[[0.05, 900, 324], [0.5, 882, 92], [0.75, 720, 422]]} taps={[0.42, 0.55]} />
      </div>
    </ThemeProvider>
  );
};

type Tone = "comment" | "plain";
const KEYWORD = /\b(pub|fn|let|mut|self)\b/;
const Code = ({ s }: { s: string }) => {
  const parts = s.split(/(\[\[.*?\]\])/);
  const comment = s.trimStart().startsWith("///");
  return (
    <div style={{ display: "flex", flexDirection: "row", height: 20, alignItems: "center" }}>
      {parts.filter((part) => part.length > 0).map((part, i) => {
        const marked = part.startsWith("[["), body = marked ? part.slice(2, -2) : part;
        const words = body.split(/(\b(?:pub|fn|let|mut|self)\b|\b[a-z_]+(?=\())/);
        return (
          <div key={i} style={{ display: "flex", flexDirection: "row", flexShrink: 0, backgroundColor: marked ? "#3fb96f33" : "#00000000" }}>
            {words.filter((w) => w.length > 0).map((w, j) => <T key={j} s={w} size={13} mono color={comment ? "#8a8a93" : KEYWORD.test(w) ? "#b9a9ff" : /^[a-z_]+$/.test(w) && body.includes(`${w}(`) ? "#8ab4ff" : "#d8d8de"} style={{ whiteSpace: "pre", flexShrink: 0 }} />)}
          </div>
        );
      })}
    </div>
  );
};
const LINES: ReadonlyArray<readonly [number | null, string, number | null, string, "same" | "change", number?]> = [
  [null, "", 13, "[[0.2]] }", "change"],
  [13, "    }", 14, "    }", "same"], [14, "", 15, "", "same"],
  [15, "    /// The wait before the next attempt.", 16, "    /// The wait before the next attempt[[, give or]]\n[[take `jitter` of it]].", "change", 2],
  [16, "    pub fn next(&mut self) -> Duration {", 17, "    pub fn next(&mut self[[, roll: f32]]) -> Duration\n{", "change", 2],
  [17, "        let wait = self.base * 2u32.pow(self.\nattempt);", 18, "        let wait = self.base[[.saturating_mul(]]2u32.\n[[saturating_pow(]]self.attempt[[)]]);", "change", 2],
  [18, "        self.attempt += 1;", 19, "        self.attempt += 1;", "same"],
];
const CodeCell = ({ n, s, tone, w, tall }: { n: number | null; s: string; tone: "same" | "del" | "add"; w: number; tall: number }) => (
  <div style={{ display: "flex", flexDirection: "row", width: w, height: tall, flexShrink: 0, backgroundColor: tone === "del" ? "#2c1b1d" : tone === "add" ? "#1b2c21" : "#00000000", borderLeftWidth: tone === "same" ? 0 : 3, borderColor: tone === "del" ? "#d9606a" : "#3fb96f" }}>
    <div style={{ width: 40, marginRight: 12, height: 20, display: "flex", justifyContent: "flex-end", alignItems: "center" }}><T s={n === null ? "" : String(n)} size={13} mono color={tone === "same" ? "#70707a" : tone === "del" ? "#ee8a90" : "#7fd39d"} /></div>
    <div style={{ ...col(), flexGrow: 1 }}>{s.split("\n").map((l, i) => <Code key={i} s={l} />)}</div>
  </div>
);
export const Diff = ({ t }: { t: number }): ReactNode => {
  const scroll = 12 * t, half = W / 2;
  let y = 96 - scroll;
  return (
    <Root fill="#17171a">
      {LINES.map(([ln, ls, rn, rs, kind, tall]) => {
        const h = 20 * (tall ?? 1), top = y;
        y += h;
        return <div key={String(rn)} style={{ ...at(0, top, W, h), display: "flex", flexDirection: "row" }}><CodeCell n={ln} s={ls} tone={kind === "same" ? "same" : "del"} w={half} tall={h} /><CodeCell n={rn} s={rs} tone={kind === "same" ? "same" : "add"} w={half} tall={h} /></div>;
      })}
      <div style={{ ...at(half + 6, y + 10, half - 22, 118), ...col(8), padding: 12, borderRadius: 8, backgroundColor: "#1f1f23", borderWidth: 1, borderColor: "#ffffff14" }}>
        <div style={row(8)}><T s="Kurapika" size={13} weight={500} /><T s="on line 19" size={12} color={MUTED} /></div>
        <T s="Jitter keeps a crowd of clients that failed together from retrying together. 0.2 matches what the server's rate limiter assumes." size={13} color="#d8d8de" />
        <div style={row(26)}><T s="Reply" size={13} weight={500} style={{ marginLeft: 12 }} /><T s="Resolve" size={13} weight={500} /></div>
      </div>
      {[[19, "        wait.min(self.max)", 20, "        wait.min(self.max)[[.mul_f32(1.0 + self.]]\n[[jitter * (roll * 2.0 - 1.0))]]", 2], [20, "    }", 21, "    }", 0], [21, "", 22, "", 0], [22, "    pub fn reset(&mut self) {", 23, "    pub fn reset(&mut self) {", 0]].map((rowData, i, all) => {
        const [ln, ls, rn, rs, change] = rowData as [number, string, number, string, number];
        const before = all.slice(0, i).reduce((sum, r) => sum + ((r[4] as number) === 2 ? 40 : 20), 0), top = y + 138 + before, h = change === 2 ? 40 : 20;
        return <div key={ln} style={{ ...at(0, top, W, h), display: "flex", flexDirection: "row" }}><CodeCell n={ln} s={ls} tone={change === 2 ? "del" : "same"} w={half} tall={h} /><CodeCell n={rn} s={rs} tone={change === 2 ? "add" : "same"} w={half} tall={h} /></div>;
      })}
      <div style={{ ...at(0, 0, W, 48), ...row(12), paddingLeft: 16, paddingRight: 16, justifyContent: "space-between", backgroundColor: "#17171a" }}>
        <div style={row(12)}><T s="Add jitter to retry backoff" size={14} weight={600} /><T s="5 files  +17 −12" size={13} color={MUTED} /></div>
        <div style={row()}><div style={{ ...center, width: 80, height: 30 }}><T s="Unified" size={13} color={MUTED} /></div><div style={{ ...center, width: 80, height: 30, borderRadius: 6, backgroundColor: "#ffffff0f" }}><T s="Split" size={13} weight={500} /></div></div>
      </div>
      <div style={{ ...at(0, 48, W, 44), ...row(12), paddingLeft: 16, paddingRight: 16, justifyContent: "space-between", backgroundColor: "#17171a" }}>
        <div style={row(14)}><T s="▾" size={12} color={MUTED} /><T s="src/net/backoff.rs" size={13.5} weight={500} /></div><T s="+10 −8" size={12} mono color="#7fd39d" />
      </div>
    </Root>
  );
};

const TARGETS = ["x86_64-unknown-linux-gnu", "aarch64-apple-darwin", "x86_64-pc-windows-msvc", "wasm32-unknown-unknown", "aarch64-apple-ios"];
const hash = (i: number) => { let x = Math.imul(i + 1, 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return x >>> 0; };
export const Table = ({ t }: { t: number }): ReactNode => {
  const rowH = 28, scroll = 148000 + 2100 * t - 300 * ease(t, 0.9, 0.4), first = Math.floor(scroll / rowH), head = 30;
  const selected = 5338;
  return (
    <Root fill="#111113">
      {Array.from({ length: 19 }, (_, k) => {
        const i = first + k, h = hash(i), y = head + i * rowH - scroll + 2, sel = i === selected || i === selected + 1, cached = h % 4 !== 0;
        return (
          <div key={i} style={{ ...at(12, y, W - 24, rowH), ...row(), paddingLeft: 10, backgroundColor: sel ? "#2a3038" : "#00000000" }}>
            <T s={`hunter exam #${i + 1}`} size={13.5} weight={500} style={{ width: 448 }} />
            <T s={TARGETS[(h >>> 7) % 5]!} size={13.5} color="#c9c9d0" style={{ width: 232 }} />
            <T s={`${(((h >>> 11) % 480) / 10 + 2).toFixed(1)} MB`} size={13.5} color="#c9c9d0" style={{ width: 80, textAlign: "right" }} />
            <T s={`${((h >>> 5) % 900) / 10}s`} size={13.5} color="#c9c9d0" style={{ width: 80, textAlign: "right" }} />
            <div style={{ ...row(6), marginLeft: 20 }}><Dot color={cached ? "#34d399" : "#70707a"} size={6} /><T s={cached ? "Hit" : "Miss"} size={13.5} color="#c9c9d0" /></div>
          </div>
        );
      })}
      <div style={{ ...at(12, 2, W - 24, head), ...row(), paddingLeft: 10, backgroundColor: "#16161a" }}>
        <T s="Exam ⌃" size={13.5} weight={600} style={{ width: 448 }} /><T s="Target" size={13.5} weight={600} style={{ width: 232 }} /><T s="Size" size={13.5} weight={600} style={{ width: 80, textAlign: "right" }} /><T s="Time" size={13.5} weight={600} style={{ width: 80, textAlign: "right" }} /><T s="Cache" size={13.5} weight={600} style={{ marginLeft: 20 }} />
      </div>
      <div style={{ ...at(0, H - 30, W, 30), ...row(), paddingLeft: 12, backgroundColor: "#111113" }}><T s="100,000 exams · 1 selected" size={13} color={MUTED} /></div>
    </Root>
  );
};

const NOTES = ["C", "D", "E", "F", "G", "A", "B", "C", "D", "E", "F", "G"];
const ACCENT = new Set([2, 7, 22]);
const KEY_FILL = "#2c2c2f", BODY_FILL = "#262628";
const KEY_RECTS = Array.from({ length: 24 }, (_, i) => ({ x: 104 + (i % 12) * 62.4, y: 311 + Math.trunc(i / 12) * 88, w: 54, h: 72, r: 12 }));
const KNOB_X = [128, 240, 352, 464];
const KEY_MATERIAL = { z0: 10, z1: 18, bevel: 12, lift: 4.5, gloss: 0.85, rough: 0.28 };
const OP1_PRIMS: ReadonlyArray<Prim> = [
  { x: 64, y: 22, w: 831, h: 496, r: 32, z1: 10, bevel: 22, lift: 7, gloss: 0.7, rough: 0.32 },
  ...KNOB_X.map((x) => ({ x: x - 39, y: 118, w: 78, h: 78, r: 39, z0: 10, z1: 22, bevel: 30, lift: 10, gloss: 0.9, rough: 0.26 })),
  { x: 592, y: 110, w: 264, h: 160, r: 18, z0: 10, gloss: 1, rough: 0.18 },
  ...KEY_RECTS.map((k) => ({ ...k, ...KEY_MATERIAL })),
];
export const Op1 = ({ t }: { t: number }): ReactNode => {
  const lights: ReadonlyArray<LightDesc> = [
    { x: 168 + 521 * t, y: 170 + 34 * t, z: 150, radius: 26, color: srgbf(1, 0.93, 0.85), intensity: 3.4, range: 2200, specular: 2.4 },
    { x: 1100, y: 760, z: 700, radius: 200, color: srgbf(0.5, 0.62, 1), intensity: 0.4, range: 3000 },
  ];
  return (
    <Root fill="#101012">
      <div style={{ ...at(64, 22, 831, 496), borderRadius: 32, backgroundColor: BODY_FILL }} />
      {KNOB_X.map((x, i) => <div key={x}><div style={{ ...at(x - 39, 118, 78, 78), borderRadius: 39, backgroundColor: KEY_FILL }} /><Dot color={["#5b8def", "#54c078", "#d9843f", "#d9534f"][i]!} size={9} style={at(x - 4.5, 127)} /></div>)}
      <div style={{ ...at(592, 110, 264, 160), borderRadius: 18, backgroundColor: "#0c0c10" }} />
      {KEY_RECTS.map((k, i) => <div key={i} style={{ ...at(k.x, k.y, k.w, k.h), borderRadius: 12, backgroundColor: ACCENT.has(i) ? "#cb5e3e" : KEY_FILL }} />)}
      <RawShader source={LIGHT_SHADER} readsBackdrop time={t} params={lightParams(2, lights, { ambient: [0.3, 0.31, 0.34], rim: 1.1, ao: 0.5, shaftsOver: 0.35 }, OP1_PRIMS.length)} data={lightData(2, OP1_PRIMS)} style={at(0, 0, W, H)} />
      <T s="Bisky's Field · Control surface" size={15} weight={600} style={at(104, 54)} />
      <T s="Bevels from the SDF catch the light" size={12} color="#9d9da6" style={at(104, 76)} />
      <T s="128 BPM" size={24} weight={600} color="#9de2b0" style={at(612, 130)} />
      <T s="Pattern A · bar 12" size={12} color="#6a9a7a" style={at(612, 166)} />
      {KEY_RECTS.map((k, i) => <T key={i} s={NOTES[i % 12]!} size={11} weight={600} color={ACCENT.has(i) ? "#3a120a" : "#9d9da6"} style={at(k.x + 10, k.y + 10)} />)}
    </Root>
  );
};

const APPS = ["Inbox", "Calendar", "Notes", "Music", "Photos", "Maps", "Files", "Terminal", "Mail", "Weather", "Clock", "Books", "Stocks", "Podcasts", "Home", "Wallet", "Health", "Camera", "Code", "Fleet", "Chat", "Voice", "Launcher", "Gon"];
const HUES = ["#c0568c", "#c26247", "#a18c30", "#90af61", "#7cb29a", "#5992c3", "#6c6cc9", "#915ab5", "#c0586e", "#b67932", "#8e8e32", "#90af61", "#90b5a1", "#6c8ac6", "#7969c6", "#a853a0", "#b65a5a", "#a97f32", "#749136", "#489d77", "#5497b6", "#676cc4", "#8b5ab5", "#ab548b"];
const TILES = APPS.map((_, i) => ({ x: 34 + (i % 8) * 114, y: 157 + Math.trunc(i / 8) * 114, w: 93, h: 93, r: 20 }));
const TILE_PRIMS: ReadonlyArray<Prim> = TILES.map((b) => ({ ...b, z1: 14, bevel: 8, lift: 2.5, gloss: 0.5, rough: 0.4 }));
export const Launcher = ({ t }: { t: number }): ReactNode => {
  const lights: ReadonlyArray<LightDesc> = [{ x: 439 + 125 * t, y: 263, z: 4, radius: 12, color: srgbf(1, 0.8, 0.55), intensity: 1.6, range: 3000, shafts: 1.5, softness: 2.2 }];
  return (
    <Root fill="#0d0c0d">
      {TILES.map((b, i) => <div key={i}><div style={{ ...at(b.x, b.y, b.w, b.h), borderRadius: 20, backgroundColor: "#1c1d24" }} /><div style={{ ...at(b.x + 15, b.y + 15, 30, 30), borderRadius: 9, backgroundColor: HUES[i]! }} /></div>)}
      <RawShader source={LIGHT_SHADER} readsBackdrop time={t} params={lightParams(2, lights, { ambient: [0.5, 0.5, 0.58], rim: 0.8, ao: 0.35, shaftsOver: 0.12 }, TILE_PRIMS.length)} data={lightData(2, TILE_PRIMS)} style={at(0, 0, W, H)} />
      <T s="Good evening, Gon" size={24} weight={600} style={at(34, 30)} />
      <T s="24 apps · light from behind the grid" size={12} color="#9d9da6" style={at(34, 62)} />
      {TILES.map((b, i) => <T key={i} s={APPS[i]!} size={11} weight={600} style={at(b.x + 15, b.y + 62)} />)}
    </Root>
  );
};

export type { Tone };
export { alpha, TEXT };
