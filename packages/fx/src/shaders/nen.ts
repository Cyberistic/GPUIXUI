// Backdrop effects over whatever is already painted: each factory is a pure function of time.
import type { Fx, Rect } from "./pack.js";

const HASH =
  "fn hash(v: vec2f) -> f32 { return fract(sin(dot(v, vec2f(12.9898, 78.233))) * 43758.5453); }";
const WATER = `
fn ring(p: vec2f, drop: vec4f) -> vec3f {
  let d = p - drop.yz; let r = max(length(d), 1.0); let age = drop.x;
  if (age <= 0.0) { return vec3f(0.0); }
  let front = 80.0 + age * 620.0;
  let env = (1.0 - smoothstep(front - 150.0, front, r)) * exp(-age * 1.2) * smoothstep(front - 420.0, front - 300.0, r + 300.0);
  let w = sin((r - front) * 0.085) * env;
  return vec3f(d / r * w, w);
}
fn shade(p: vec2f) -> vec4f {
  let w = ring(p, frame.params[0]) + ring(p, frame.params[1]) + ring(p, frame.params[2]);
  let off = w.xy * 30.0;
  let c = vec3f(backdrop_at(p + off * 1.06).r, backdrop_at(p + off).g, backdrop_at(p + off * 0.94).b);
  let spec = pow(max(w.z, 0.0), 3.0) * 0.9;
  return vec4f(c * mix(vec3f(1.0), vec3f(0.74, 0.92, 1.12), min(1.0, abs(w.z) * 2.0)) + spec * vec3f(0.7, 0.92, 1.0), 1.0);
}`;
const GUM = `
fn shade(p: vec2f) -> vec4f {
  let a = frame.params[0].xy; let d = frame.params[0].zw; let tip = a + d;
  let v = p - tip; let f = exp(-dot(v, v) / (210.0 * 210.0));
  var c = backdrop_at(p - d * f).rgb;
  let h = clamp(dot(p - a, d) / max(dot(d, d), 1.0), 0.0, 1.0);
  let q = p - a - d * h; let n = length(q);
  let wob = 1.2 * sin(h * 22.0 + frame.time * 18.0) * length(d) * 0.004;
  let width = mix(13.0, 5.0, sin(h * 3.14159)) + wob;
  let cover = (1.0 - smoothstep(width - 1.0, width + 1.0, n)) * step(1.0, length(d));
  let sheen = 1.0 - smoothstep(0.0, width, abs(dot(q, vec2f(-d.y, d.x) / max(length(d), 1.0)) + width * 0.35));
  c = mix(c, vec3f(1.0, 0.36, 0.66) + sheen * vec3f(0.0, 0.5, 0.34), cover);
  return vec4f(c, 1.0);
}`;
const EN = `
fn luma(p: vec2f) -> f32 { return dot(backdrop_at(p).rgb, vec3f(0.3, 0.6, 0.1)); }
fn shade(p: vec2f) -> vec4f {
  let r = length(p - frame.params[0].xy); let front = frame.params[0].z;
  let inside = 1.0 - smoothstep(front - 2.0, front + 2.0, r);
  let bd = backdrop_at(p).rgb;
  let gx = luma(p + vec2f(1.5, 0.0)) - luma(p - vec2f(1.5, 0.0));
  let gy = luma(p + vec2f(0.0, 1.5)) - luma(p - vec2f(0.0, 1.5));
  let edge = min(1.0, length(vec2f(gx, gy)) * 5.0);
  let sense = bd * 0.22 + vec3f(0.03, 0.07, 0.11) + edge * vec3f(0.38, 0.92, 1.0);
  let rings = 0.05 * smoothstep(0.75, 1.0, sin(r * 0.11 - frame.time * 8.0));
  let band = exp(-pow((r - front) / 9.0, 2.0));
  return vec4f(mix(bd, sense + rings * vec3f(0.4, 0.9, 1.0), inside) + band * vec3f(0.55, 0.95, 1.0), 1.0);
}`;
const GODSPEED = `${HASH}
fn shade(p: vec2f) -> vec4f {
  let amp = frame.params[0].x; let beat = floor(frame.time * 24.0);
  let band = floor(p.y / (10.0 + 26.0 * hash(vec2f(beat, 3.0))));
  let h = hash(vec2f(band, beat));
  let x = step(0.68, h) * (h - 0.68) * 340.0 * amp * sign(h - 0.84);
  let split = amp * (4.0 + 12.0 * step(0.8, h));
  let o = vec2f(x, 0.0);
  let c = vec3f(backdrop_at(p + o + vec2f(split, 0.0)).r, backdrop_at(p + o).g, backdrop_at(p + o - vec2f(split, 0.0)).b);
  let flash = amp * 0.16 * step(0.5, hash(vec2f(beat, 9.0)));
  return vec4f(c * (1.0 + amp * 0.2) + flash * vec3f(0.36, 0.72, 1.0), 1.0);
}`;
const NANIKA = `
fn shade(p: vec2f) -> vec4f {
  let k = frame.params[0].x; let d = p - frame.params[0].yz; let r = max(length(d), 1.0);
  let hole = 74.0 * k;
  let ang = k * 2600.0 / (r + 70.0) * 0.26 + frame.time * 0.5 * k;
  let far = r + k * 26000.0 / (r + 36.0);
  let s = vec2f(cos(ang), sin(ang));
  let u = d / r * far;
  let q = vec2f(u.x * s.x - u.y * s.y, u.x * s.y + u.y * s.x);
  var c = backdrop_at(frame.params[0].yz + q).rgb;
  let theta = atan2(d.y, d.x);
  let disk = (0.5 + 0.5 * sin(theta * 3.0 + 230.0 / (r * 0.3 + 12.0) - frame.time * 9.0));
  let ring = exp(-pow((r - hole * 1.22) / (3.0 + 7.0 * k), 2.0));
  let halo = exp(-max(r - hole, 0.0) / (46.0 * k + 1.0)) * disk;
  c += (ring * vec3f(1.0, 0.86, 0.68) * 1.5 + halo * vec3f(0.95, 0.32, 0.72) * 0.9) * k;
  return vec4f(c * smoothstep(hole * 0.92, hole * 1.06, r), 1.0);
}`;
const ZETSU = `${HASH}
fn shade(p: vec2f) -> vec4f {
  let wipe = frame.params[0].x; let cell = 9.0;
  let id = floor(p / cell); let local = p - (id + 0.5) * cell;
  let v = length((id * cell - frame.params[0].yz) / 980.0) + hash(id) * 0.14;
  let life = (v - wipe) / 0.16;
  if (life >= 1.0) { return vec4f(backdrop_at(p).rgb, 1.0); }
  if (life <= 0.0) { return vec4f(0.0, 0.0, 0.0, 1.0); }
  let half_size = cell * 0.5 * smoothstep(0.0, 0.8, life);
  let inner = step(abs(local.x), half_size) * step(abs(local.y), half_size);
  let glow = (1.0 - life) * (1.0 - life);
  return vec4f((backdrop_at((id + 0.5) * cell).rgb + glow * vec3f(0.42, 0.72, 1.0)) * inner, 1.0);
}`;

const layer = (
  source: string,
  box: Rect,
  time: number,
  params: ReadonlyArray<number>,
): Fx => ({ source, box, time, params: [...params], readsBackdrop: true });

export interface Drop {
  readonly age: number;
  readonly x: number;
  readonly y: number;
}
export const waterRipple = (o: {
  box: Rect;
  time: number;
  drops: readonly [Drop, Drop, Drop];
}): Fx =>
  layer(
    WATER,
    o.box,
    o.time,
    o.drops.flatMap((d) => [d.age, d.x - o.box.x, d.y - o.box.y, 0]),
  );
export const bungeeGum = (o: {
  box: Rect;
  time: number;
  from: readonly [number, number];
  pull: readonly [number, number];
}): Fx =>
  layer(GUM, o.box, o.time, [
    o.from[0] - o.box.x,
    o.from[1] - o.box.y,
    o.pull[0],
    o.pull[1],
  ]);
export const enScan = (o: {
  box: Rect;
  time: number;
  center: readonly [number, number];
  radius: number;
}): Fx =>
  layer(EN, o.box, o.time, [
    o.center[0] - o.box.x,
    o.center[1] - o.box.y,
    o.radius,
    0,
  ]);
export const godspeed = (o: { box: Rect; time: number; amount: number }): Fx =>
  layer(GODSPEED, o.box, o.time, [o.amount, 0, 0, 0]);
export const singularity = (o: {
  box: Rect;
  time: number;
  center: readonly [number, number];
  pull: number;
}): Fx =>
  layer(NANIKA, o.box, o.time, [
    o.pull,
    o.center[0] - o.box.x,
    o.center[1] - o.box.y,
    0,
  ]);
export const zetsu = (o: {
  box: Rect;
  time: number;
  center: readonly [number, number];
  wipe: number;
}): Fx =>
  layer(ZETSU, o.box, o.time, [
    o.wipe,
    o.center[0] - o.box.x,
    o.center[1] - o.box.y,
    0,
  ]);
