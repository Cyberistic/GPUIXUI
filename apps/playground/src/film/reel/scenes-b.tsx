/** @jsxImportSource @gpuix/react */

import { Slider, Switch } from "@gpuixui/primitives";
import { darkTheme, lightTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import type { ReactNode } from "react";
import { alpha, at, center, col, Dot, H, MUTED, PointerAt, RawShader, Root, row, T, TEXT, W } from "./kit.js";
import { ease, sp, track } from "./motion.js";

export const Hello = ({ t }: { t: number }): ReactNode => {
  const on = track(t, 0, [[0.55, 1, sp(0.45, 0.2)]]);
  const k = Math.min(1, Math.max(0, on));
  return (
    <Root fill="#111113">
      <div style={{ ...at(0, 164, W), ...center }}><T s={t >= 0.55 ? "Nen on" : "Nen off"} size={52} weight={600} /></div>
      <div style={{ ...at(404, 290, 152, 88), borderRadius: 44, backgroundColor: k > 0.5 ? "#3b82f6" : "#2a2a2d" }}>
        <div style={{ ...at(8 + 64 * on, 8, 72, 72), borderRadius: 36, backgroundColor: "#ffffff", boxShadow: { offsetX: 0, offsetY: 2, blurRadius: 8, spreadRadius: 0, color: "#00000066" } }} />
      </div>
      <PointerAt t={t} start={[760, 450]} path={[[0.1, 480, 334]]} taps={[0.55]} />
    </Root>
  );
};

const SECTION = { fontSize: 12 };
const Section = ({ title, p, children }: { title: string; p: Paint; children: ReactNode }) => (
  <div style={col(8)}>
    <T s={title} size={SECTION.fontSize} weight={600} color={p.muted} style={{ marginLeft: 12 }} />
    <div style={{ ...col(), padding: 4, borderRadius: 12, backgroundColor: p.card, borderWidth: 0.5, borderColor: p.edge, boxShadow: { offsetX: 0, offsetY: 8, blurRadius: 24, spreadRadius: 0, color: p.soft } }}>{children}</div>
  </div>
);
interface Paint { readonly bg: string; readonly card: string; readonly text: string; readonly muted: string; readonly edge: string; readonly sep: string; readonly soft: string; readonly hover: string; readonly track: string; readonly chip: string }
const DARK: Paint = { bg: "#17171a", card: "#222226", text: "#f2f2f4", muted: "#9d9da6", edge: "#ffffff0f", sep: "#ffffff0f", soft: "#00000040", hover: "#ffffff0d", track: "#2c2c30", chip: "#47474d" };
const LIGHT: Paint = { bg: "#f2f2f5", card: "#ffffff", text: "#17171a", muted: "#6b6b75", edge: "#00000014", sep: "#0000000f", soft: "#0000001a", hover: "#0000000a", track: "#e7e7ea", chip: "#ffffff" };
const Row = ({ label, p, hover, children }: { label: string; p: Paint; hover?: boolean; children: ReactNode }) => (
  <div style={{ ...row(), height: 44, paddingLeft: 12, paddingRight: 12, borderRadius: 8, justifyContent: "space-between", backgroundColor: hover ? p.hover : "#00000000" }}>
    <T s={label} size={14} weight={450} color={p.text} />{children}
  </div>
);
const Sep = ({ p }: { p: Paint }) => <div style={{ height: 1, marginLeft: 12, marginRight: 12, backgroundColor: p.sep }} />;
const blue = (theme: typeof darkTheme): typeof darkTheme => ({ ...theme, colors: { ...theme.colors, primary: "#3b82f6" } });
const PICK = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#22c55e", "#6b7280"];
export const Settings = ({ t }: { t: number }): ReactNode => {
  const lit = t >= 0.67, p = lit ? LIGHT : DARK, sounds = t >= 0.42;
  const speed = 0.5 - 0.28 * ease(t, 0.72, 0.5);
  return (
    <ThemeProvider theme={blue(lit ? lightTheme : darkTheme)}>
      <Root fill={p.bg}>
        <div style={{ ...at(0, 0, W, 40), ...center }}><T s="Settings" size={14} weight={600} color={p.text} /></div>
        <div style={{ ...at(24, 42, W - 48), ...col(17) }}>
          <Section title="Appearance" p={p}>
            <Row label="Theme" p={p}>
              <div style={{ ...row(), height: 28, padding: 2, borderRadius: 8, backgroundColor: p.track }}>
                {["Auto", "Light", "Dark"].map((name) => {
                  const on = name === (lit ? "Light" : "Auto");
                  return <div key={name} style={{ ...center, width: 66, height: 24, borderRadius: 6, backgroundColor: on ? p.chip : "#00000000" }}><T s={name} size={12.5} weight={on ? 600 : 450} color={on ? p.text : p.muted} /></div>;
                })}
              </div>
            </Row>
            <Sep p={p} />
            <Row label="Accent colour" p={p}>
              <div style={row(14)}>
                {PICK.map((c, i) => <div key={c} style={{ ...center, width: 16 + (i === 0 ? 8 : 0), height: 16 + (i === 0 ? 8 : 0), borderRadius: 12, borderWidth: i === 0 ? 2 : 0, borderColor: c }}><Dot color={c} size={i === 0 ? 16 : 16} /></div>)}
              </div>
            </Row>
          </Section>
          <Section title="General" p={p}>
            <Row label="Launch at login" p={p}><Switch checked label="Launch at login" /></Row><Sep p={p} />
            <Row label="Show in menu bar" p={p}><Switch checked label="Show in menu bar" /></Row><Sep p={p} />
            <Row label="Play sounds" p={p} hover={t < 0.67}><Switch checked={sounds} label="Play sounds" /></Row>
          </Section>
          <Section title="Motion" p={p}>
            <Row label="Animation speed" p={p}>
              <div style={row(14)}><div style={{ width: 180 }}><Slider label="Animation speed" value={speed * 100} /></div><T s={`${(2 ** (speed * 2 - 1)).toFixed(2)}×`} size={12} color={p.muted} /></div>
            </Row><Sep p={p} />
            <Row label="Reduce motion" p={p}><Switch checked={false} label="Reduce motion" /></Row>
          </Section>
        </div>
        <PointerAt t={t} start={[880, 300]} path={[[0.05, 900, 324], [0.5, 882, 92], [0.8, 720, 422]]} taps={[0.42, 0.67]} />
      </Root>
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

const LIGHT_SHADER = String.raw`
fn sd_box(p: vec2f, r: vec4f, c: f32) -> f32 { let q = abs(p - r.xy - r.zw * 0.5) - r.zw * 0.5 + c; return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - c; }
fn prims(p: vec2f) -> f32 {
  var d = 1e5;
  let n = u32(frame.params[2].x);
  for (var k = 0u; k < n; k++) { d = min(d, sd_box(p, shader_data_at(k * 2u), shader_data_at(k * 2u + 1u).x)); }
  return d;
}
fn shade(p: vec2f) -> vec4f {
  let L = frame.params[0].xy; let radius = frame.params[0].z; let power = frame.params[0].w;
  let tint = frame.params[1].xyz; let behind = frame.params[1].w; let ambient = frame.params[2].y;
  let base = backdrop_at(p).rgb;
  let d = prims(p);
  let to = L - p; let dist = length(to); let dir = to / max(dist, 0.001);
  let fall = power / (1.0 + dist * dist / (radius * radius));
  var occ = 1.0;
  let steps = 18u;
  for (var k = 1u; k <= steps; k++) {
    let q = p + to * (f32(k) / f32(steps));
    let s = prims(q);
    occ = min(occ, smoothstep(-2.0, 7.0, s + f32(k) * 0.35));
  }
  let e = 1.2;
  let n = normalize(vec2f(prims(p + vec2f(e, 0.)) - prims(p - vec2f(e, 0.)), prims(p + vec2f(0., e)) - prims(p - vec2f(0., e))) + vec2f(1e-5));
  let rim = smoothstep(-5.0, -0.6, d) * smoothstep(0.8, -0.4, d) * max(dot(n, dir), 0.0) * fall;
  var col = base * ambient;
  if (behind > 0.5) {
    let shaft = occ * fall;
    col += tint * fall * mix(0.32, 1.0, occ) * smoothstep(-0.5, 1.0, d) * 0.7;
    col += base * (0.45 * fall + 1.1 * fall * occ) * smoothstep(1.0, -0.5, d);
    col += tint * rim * 1.1;
    col += vec3f(1.0, 0.86, 0.66) * exp(-dist * dist / 1800.0) * occ * 0.8;
  } else {
    col += base * tint * fall * mix(0.35, 1.0, occ) * 1.6;
    col += tint * rim * 1.1;
    col += vec3f(1.0, 0.95, 0.88) * exp(-dist * dist / 180.0) * 0.7 + tint * exp(-dist / 60.0) * 0.16;
  }
  return vec4f(col, 1.0);
}`;
const lightData = (rects: ReadonlyArray<readonly [number, number, number, number, number]>) => rects.flatMap(([x, y, w, h, r]) => [x, y, w, h, r, 0, 0, 0]);

const OP1_KEYS = Array.from({ length: 24 }, (_, i) => [104 + (i % 12) * 62.4, 311 + Math.trunc(i / 12) * 88, 54, 72, 12] as const);
const OP1_KNOBS = [128, 240, 352, 464].map((x) => [x - 39, 118, 78, 78, 39] as const);
const NOTES = ["C", "D", "E", "F", "G", "A", "B", "C", "D", "E", "F", "G"];
const ACCENT = new Set([2, 7, 22]);
export const Op1 = ({ t }: { t: number }): ReactNode => {
  const L = [168 + 521 * t, 170 + 34 * t] as const;
  return (
    <Root fill="#141416">
      <div style={{ ...at(64, 22, 831, 496), borderRadius: 32, backgroundColor: "#2a2a2d", borderWidth: 1, borderColor: "#ffffff0d" }} />
      {[[128, "#5b8def"], [240, "#54c078"], [352, "#d9843f"], [464, "#d9534f"]].map(([x, c]) => <div key={String(x)}><div style={{ ...at((x as number) - 39, 118, 78, 78), borderRadius: 39, backgroundColor: "#37373a" }} /><Dot color={c as string} size={9} style={at((x as number) - 4.5, 127)} /></div>)}
      <div style={{ ...at(592, 110, 264, 160), borderRadius: 18, backgroundColor: "#141419" }} />
      {OP1_KEYS.map(([x, y, w, h], i) => <div key={i}><div style={{ ...at(x, y, w, h), borderRadius: 12, backgroundColor: ACCENT.has(i) ? "#d04a34" : "#37373a" }} /><T s={NOTES[i % 12]!} size={11} weight={600} color={ACCENT.has(i) ? "#3a120a" : "#9d9da6"} style={at(x + 10, y + 10)} /></div>)}
      <RawShader source={LIGHT_SHADER} readsBackdrop time={t} params={[L[0], L[1], 150, 0.8, 1, 0.9, 0.75, 0, OP1_KEYS.length + 5, 0.55, 0, 0]} data={lightData([...OP1_KEYS, ...OP1_KNOBS, [592, 110, 264, 160, 18]])} style={at(0, 0, W, H)} />
      <T s="Bisky's Field · Control surface" size={15} weight={600} style={at(104, 54)} />
      <T s="Bevels from the SDF catch the light" size={12} color="#9d9da6" style={at(104, 76)} />
      <T s="128 BPM" size={24} weight={600} color="#9de2b0" style={at(612, 130)} />
      <T s="Pattern A · bar 12" size={12} color="#6a9a7a" style={at(612, 166)} />
    </Root>
  );
};

const APPS = ["Inbox", "Calendar", "Notes", "Music", "Photos", "Maps", "Files", "Terminal", "Mail", "Weather", "Clock", "Books", "Stocks", "Podcasts", "Home", "Wallet", "Health", "Camera", "Code", "Fleet", "Chat", "Voice", "Launcher", "Gon"];
const HUES = ["#a84e7a", "#a9583e", "#8d7a2a", "#7f9a55", "#6d9c86", "#4e7fab", "#5f5fb0", "#7f4f9e", "#a84e60", "#a06a2c", "#7d7d2c", "#7f9a55", "#7f9f8d", "#5f79ae", "#6a5cae", "#94498c", "#a04f4f", "#94702c", "#667f2f", "#3f8a68", "#4a84a0", "#5a5fac", "#7a4f9e", "#964a7a"];
const TILES = APPS.map((_, i) => [34 + (i % 8) * 114, 157 + Math.trunc(i / 8) * 114, 93, 93, 20] as const);
export const Launcher = ({ t }: { t: number }): ReactNode => {
  const L = [439 + 125 * t, 263] as const;
  return (
    <Root fill="#0d0c0b">
      <T s="Good evening, Gon" size={24} weight={600} style={at(34, 30)} />
      <T s="24 apps · light from behind the grid" size={12} color="#9d9da6" style={at(34, 62)} />
      {APPS.map((name, i) => {
        const [x, y] = TILES[i]!;
        return <div key={name}><div style={{ ...at(x, y, 93, 93), borderRadius: 20, backgroundColor: "#191a20", borderWidth: 1, borderColor: "#ffffff17" }} /><div style={{ ...at(x + 15, y + 15, 30, 30), borderRadius: 9, backgroundColor: HUES[i]! }} /><T s={name} size={11} weight={600} style={at(x + 15, y + 62)} /></div>;
      })}
      <RawShader source={LIGHT_SHADER} readsBackdrop time={t} params={[L[0], L[1], 240, 0.5, 1, 0.7, 0.42, 1, TILES.length, 0.95, 0, 0]} data={lightData(TILES)} style={at(0, 0, W, H)} />
    </Root>
  );
};

export type { Tone };
export { alpha, TEXT };
