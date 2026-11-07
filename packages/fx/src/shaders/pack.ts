// CPU side of the effects, from rune-fx (MIT, © Anomaly): parameter packing and per-frame tables.
import { DISTORT, ELECTRIC, EXTRAS, FILL, GLOW, PULSE } from "./rune-wgsl.js";

export interface Rect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
export interface Fx {
  readonly source: string;
  readonly box: Rect;
  readonly params: number[];
  readonly data?: number[];
  readonly readsBackdrop?: boolean;
  readonly time: number;
}
type V4 = readonly [number, number, number, number];
const Z: V4 = [0, 0, 0, 0];
const dec = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export const rgb = (hex: number): V4 => [dec(((hex >> 16) & 255) / 255), dec(((hex >> 8) & 255) / 255), dec((hex & 255) / 255), 0];
const inflate = (r: Rect, m: number): Rect => ({ x: r.x - m, y: r.y - m, w: r.w + 2 * m, h: r.h + 2 * m });

interface Pack { c0?: V4; c1?: V4; c2?: V4; p0?: V4; p1?: V4; p2?: V4; p3?: V4; aux?: V4; aux2?: V4; xf?: V4; morph?: number; frost?: number; seed?: number; variant?: number; opacity?: number; time?: number }
const pack = (rect: Rect, radius: number, box: Rect, p: Pack): number[] => [
  rect.x - box.x, rect.y - box.y, rect.w, rect.h,
  Math.max(0, Math.min(radius, rect.w / 2, rect.h / 2)), 1, Math.min(p.opacity ?? 1, 1), p.morph ?? 0,
  ...(p.c0 ?? Z), ...(p.c1 ?? Z), ...(p.c2 ?? Z), ...(p.p0 ?? Z), ...(p.p1 ?? Z), ...(p.p2 ?? Z), ...(p.p3 ?? Z),
  p.time ?? 0, (p.seed ?? 0) % 65536, p.variant ?? 0, 0,
  ...(p.aux ?? Z), ...(p.aux2 ?? [0, 0, 1, 1]), ...(p.xf ?? Z), p.frost ?? 0, 0, 0, 0,
];

const pcg = (v: number): number => {
  const s = (Math.imul(v, 747796405) + 2891336453) | 0;
  const w = Math.imul(((s >>> ((s >>> 28) + 4)) ^ s) | 0, 277803737);
  return ((w >>> 22) ^ w) >>> 0;
};
const hu = (a: number, b: number): number => pcg((a ^ pcg((b + 0x9e3779b9) >>> 0)) >>> 0);
const u01 = (n: number): number => (pcg(n >>> 0) >>> 8) * (1 / 16777216);
const hcell = (cx: number, cy: number, seed: number) => (pcg((cx ^ pcg((cy ^ pcg(seed >>> 0)) >>> 0)) >>> 0) >>> 8) * (1 / 16777216);
const fade = (f: number) => f * f * f * (f * (f * 6 - 15) + 10);
const gnoise = (x: number, y: number, per: number, seed: number) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const a0 = per > 0 ? ((ix % per) + per) % per : ix;
  const a1 = per > 0 ? (a0 + 1) % per : ix + 1;
  const dot = (cx: number, cy: number, dx: number, dy: number) => { const g = hcell(cx, cy, seed) * Math.PI * 2; return Math.cos(g) * dx + Math.sin(g) * dy; };
  const a = dot(a0, iy, fx, fy), b = dot(a1, iy, fx - 1, fy), c = dot(a0, iy + 1, fx, fy - 1), d = dot(a1, iy + 1, fx - 1, fy - 1);
  const ux = fade(fx), uy = fade(fy);
  const ab = a + (b - a) * ux, cd = c + (d - c) * ux;
  return (ab + (cd - ab) * uy) * 1.41421;
};
const foldT = (t: number) => { const u = ((t / 1024) % 1 + 1) % 1; return u <= 0.5 ? u * 1024 : (1 - u) * 1024; };
const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const glow = (o: { rect: Rect; radius: number; time: number; style?: 0 | 1 | 2; color?: number; core?: number; third?: number; size?: number; intensity?: number; inner?: number; auraSpeed?: number; opacity?: number; hot?: number }): Fx => {
  const size = o.size ?? 14;
  const box = inflate(o.rect, size * 4.5);
  return { source: GLOW, box, time: o.time, params: pack(o.rect, o.radius, box, {
    variant: o.style ?? 0, time: o.time, opacity: o.opacity, c0: rgb(o.color ?? 0x7c5cff), c1: rgb(o.core ?? 0xf4f0ff), c2: rgb(o.third ?? 0x22d3ee),
    p0: [size, o.intensity ?? 1, o.inner ?? 0, 0.15], p1: [0, 2.6, 1, o.hot ?? 0.6], p2: [o.auraSpeed ?? 0.12, 0.6, 4.5, 0],
  }) };
};

export const pulse = (o: { rect: Rect; radius: number; time: number; style?: 0 | 1 | 2; color?: number; period?: number; reach?: number; opacity?: number }): Fx => {
  const style = o.style ?? 0, reach = o.reach ?? 36, width = 1.6;
  const box = inflate(o.rect, style === 1 ? reach * 5 : style === 2 ? reach + width * 16 + 2 : reach + width * 12.8);
  return { source: PULSE, box, time: o.time, params: pack(o.rect, o.radius, box, {
    variant: style, time: o.time, opacity: o.opacity, c0: rgb(o.color ?? 0x3b82f6), c1: rgb(0xe8f1ff),
    p0: [3, o.period ?? 2.4, reach, width], p1: [1, 0, 0.75, 0], p2: [0, 0.16, 2.6, 0.15],
  }) };
};

export const shimmer = (o: { rect: Rect; radius: number; time: number; intensity?: number; period?: number; band?: number; opacity?: number }): Fx => {
  const box = inflate(o.rect, 1);
  return { source: EXTRAS, box, time: o.time, params: pack(o.rect, o.radius, box, {
    variant: 0, time: o.time, opacity: o.opacity, c0: rgb(0xffffff), c1: [...rgb(0x1c1f26).slice(0, 3), 0] as unknown as V4,
    p0: [o.period ?? 1.8, o.band ?? 28, 0.35, o.intensity ?? 0.16], p1: [0, 0.3, 0, 0],
  }) };
};

const BURST_LIFE = 0.55, STAGGER = 0.16;
const starScale = (a: number) => { const x = Math.min(a / 0.22, 1), c = 2.2; return (1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2) * (1 - ss(0.55, 1, a)); };
export const sparkles = (o: { rect: Rect; radius?: number; time: number; burst?: number; count?: number; size?: number; color?: number; margin?: number; life?: number; seed?: number }): Fx => {
  const count = Math.min(o.count ?? 6, 64), size = o.size ?? 8, margin = o.margin ?? 26, life0 = o.life ?? 1.5, seed = o.seed ?? 0, t = o.time, r = o.rect;
  const box = inflate(r, margin + size * 1.566 + 2);
  const lx = r.x - box.x, ly = r.y - box.y, cx = lx + r.w / 2, cy = ly + r.h / 2, hw = r.w / 2, hh = r.h / 2;
  const data: number[] = [];
  let live = 0;
  for (let k = 0; k < count; k++) {
    const h0 = hu((seed + 313) >>> 0, k * 11 + 1);
    let hk: number, age: number, life: number;
    if (o.burst !== undefined) { life = life0 * BURST_LIFE * (0.7 + 0.6 * u01(h0)); hk = h0; age = t - o.burst - STAGGER * u01(h0 + 1); }
    else { life = life0 * (0.7 + 0.6 * u01(h0)); const cycle = life * (1.5 + 0.8 * u01(h0 + 2)); const tau = t / cycle + u01(h0 + 1); const kk = Math.floor(tau); hk = hu(h0, kk >>> 0); age = (tau - kk) * cycle; }
    if (age < 0 || age > life) continue;
    const a = age / life, th = Math.PI * 2 * u01(hk + 2), dx = Math.cos(th), dy = Math.sin(th);
    const edge = 1 / Math.max(Math.abs(dx) / Math.max(hw, 1), Math.abs(dy) / Math.max(hh, 1));
    let out = margin * (0.15 + 0.85 * u01(hk + 3));
    if (o.burst !== undefined) out *= 0.35 + 0.65 * (1 - Math.exp(-age * 5));
    const v = u01(hk + 4), s = size * (0.45 + 0.9 * v * v), fq = 5 + 4 * u01(hk + 5);
    const tw = 0.5 + 0.5 * Math.sin(Math.PI * 2 * fq * age + Math.PI * 2 * u01(hk + 6));
    const sc = starScale(a), env = 1 - 0.3 * tw * tw;
    if (sc * env < 0.01) continue;
    const ang = (u01(hk + 8) - 0.5) * 0.35 + (u01(hk + 7) - 0.5) * 1.2 * age;
    data.push(cx + dx * (edge + out), cy + dy * (edge + out), s * sc, env, Math.cos(ang), Math.sin(ang), 0, 0);
    live++;
  }
  return { source: EXTRAS, box, time: t, data, params: pack(r, o.radius ?? 0, box, {
    variant: 1, time: t, c0: rgb(o.color ?? 0xffe6a8), p0: [count, life0, size, 1], p1: [margin, 0, 0, 0], xf: [0, live, 0, 0],
  }) };
};

const METAL = { tint: 0xe9ecf0, light: 0xffffff, flow: 0.6, scale: 100, speed: 0.35, bevel: 14, dome: 0.55, angle: -0.12, iridescence: 0.08, contrast: 1, anchor: 0 };
export type MetalParams = Partial<typeof METAL>;
export const liquidMetal = (o: { rect: Rect; radius: number; time: number; border?: number; opacity?: number; origin?: { x: number; y: number } } & MetalParams): Fx => {
  const p = { ...METAL, ...o };
  const box = inflate(o.rect, 1);
  return { source: FILL, box, time: foldT(o.time), params: pack(o.rect, o.radius, box, {
    variant: 0, time: foldT(o.time), opacity: o.opacity, c0: rgb(p.tint), c1: rgb(p.light), aux: [o.border ?? 0, 1, 0, 0],
    p0: [p.flow, p.scale, p.speed, p.bevel], p1: [p.dome, p.angle, p.iridescence, p.contrast], p2: [p.anchor, 0, 0, 0],
  }) };
};

export const plastic = (o: { rect: Rect; radius: number; time: number; color: number; roughness?: number; dome?: number; bevel?: number; angle?: number; opacity?: number }): Fx => {
  const box = inflate(o.rect, 1);
  return { source: FILL, box, time: 0, params: pack(o.rect, o.radius, box, {
    variant: 10, opacity: o.opacity, c0: rgb(o.color), aux: [0, 1, 0, 0], p0: [o.roughness ?? 0.15, o.dome ?? 0.35, o.bevel ?? 6, o.angle ?? -0.6],
  }) };
};

const oklab = (c: V4) => {
  const [r, g, b] = c;
  const l = Math.cbrt(Math.max(0, 0.41222146 * r + 0.53633255 * g + 0.051445995 * b));
  const m = Math.cbrt(Math.max(0, 0.2119035 * r + 0.6806995 * g + 0.10739696 * b));
  const s = Math.cbrt(Math.max(0, 0.08830246 * r + 0.28171885 * g + 0.6299787 * b));
  return [0.21045426 * l + 0.7936178 * m - 0.004072047 * s, 1.9779985 * l - 2.4285922 * m + 0.4505937 * s, 0.025904037 * l + 0.78277177 * m - 0.80867577 * s];
};
const POINTS = [[0.12, 0.18], [0.86, 0.12], [0.5, 0.55], [0.14, 0.9], [0.9, 0.86], [0.62, 0.3]] as const;
export const MESH_PALETTES: Record<string, readonly number[]> = {
  dusk: [0x2b1b5a, 0xff6f91, 0xffc46b, 0x6a4cff, 0xff9a5a],
  lagoon: [0x0b3d5c, 0x2ec4b6, 0xcbf3f0, 0x1b6ca8],
  orchid: [0xf9d5e5, 0xc06c84, 0x6c5b7b, 0xf8b195, 0x355c7d, 0xeeac99],
  graphite: [0x15171c, 0x3a3f4b, 0x8a93a3, 0x22262e],
};
export const mesh = (o: { rect: Rect; radius: number; time: number; colors: readonly number[]; speed?: number; drift?: number; sharpness?: number; warp?: number; seed?: number; opacity?: number }): Fx => {
  const box = inflate(o.rect, 1), speed = o.speed ?? 0.35, drift = o.drift ?? 0.18, seed = o.seed ?? 1;
  const tt = foldT(o.time * speed * 0.5);
  const data: number[] = [];
  o.colors.forEach((hex, k) => {
    const c = rgb(hex), l = oklab(c), s = (seed + k * 31) >>> 0, x = tt + k * 13.1;
    const px = POINTS[k]![0] + drift * 1.4 * gnoise(x, 0.5, 0, s), py = POINTS[k]![1] + drift * 1.4 * gnoise(x, 7.5, 0, (s + 97) >>> 0);
    data.push(c[0], c[1], c[2], px, l[0]!, l[1]!, l[2]!, py);
  });
  return { source: FILL, box, time: foldT(o.time), data, params: pack(o.rect, o.radius, box, {
    variant: 1, time: foldT(o.time), seed, opacity: o.opacity, aux: [0, 1, 0, 0], p0: [drift, speed, o.sharpness ?? 1.6, o.warp ?? 0.35], xf: [0, o.colors.length, 0, 0],
  }) };
};

export const fluted = (o: { rect: Rect; radius?: number; time: number; rib?: number; refraction?: number; frost?: number; dispersion?: number; highlight?: number }): Fx => {
  const box = inflate(o.rect, 1), frost = o.frost ?? 0;
  return { source: FILL, box, time: 0, readsBackdrop: true, params: pack(o.rect, o.radius ?? 0, box, {
    variant: 4, c0: rgb(0xffffff), aux: [0, 1, 0, 0], frost: frost * 18 * 1.6, p0: [o.rib ?? 14, 0, o.refraction ?? 9, frost], p1: [o.dispersion ?? 0.2, o.highlight ?? 0.55, 0, 0],
  }) };
};

export const shockwave = (o: { rect: Rect; time: number; at: readonly [number, number]; t0: number; reach?: number; width?: number; amount?: number; chroma?: number; duration?: number }): Fx | null => {
  const duration = o.duration ?? 1.1;
  if (o.time < o.t0 || o.time > o.t0 + duration) return null;
  return { source: DISTORT, box: o.rect, time: o.time, readsBackdrop: true, params: pack(o.rect, 0, o.rect, {
    variant: 1, time: o.time, aux: [o.at[0] - o.rect.x, o.at[1] - o.rect.y, 0, 0], p0: [o.reach ?? 1100, o.width ?? 90, o.amount ?? 30, o.chroma ?? 0.6], p1: [o.t0, duration, 0, 0],
  }) };
};

export const lens = (o: { rect: Rect; radius: number; time?: number; second?: { x: number; y: number; r: number }; frost?: number; bevel?: number; depth?: number; dispersion?: number; magnification?: number; unionK?: number; shadow?: number; rim?: number }): Fx => {
  const r = o.rect, frost = o.frost ?? 0;
  const s2 = o.second ? { x: o.second.x - o.second.r, y: o.second.y - o.second.r, w: o.second.r * 2, h: o.second.r * 2 } : null;
  const x0 = Math.min(r.x, s2?.x ?? r.x), y0 = Math.min(r.y, s2?.y ?? r.y), x1 = Math.max(r.x + r.w, s2 ? s2.x + s2.w : 0), y1 = Math.max(r.y + r.h, s2 ? s2.y + s2.h : 0);
  const box = inflate({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, 28);
  return { source: DISTORT, box, time: o.time ?? 0, readsBackdrop: true, params: pack(r, o.radius, box, {
    variant: 2, time: o.time ?? 0, c0: rgb(0xffffff), frost: frost * 18 * 1.6,
    p0: [o.bevel ?? 14, o.depth ?? 16, o.dispersion ?? 0.14, o.magnification ?? 1.04], p1: [1, frost, o.shadow ?? 0.35, o.rim ?? 1.6],
    p2: [-2.09, 0, s2 ? o.unionK ?? 22 : 0, s2 ? o.second!.r : 0], p3: s2 ? [s2.x - box.x, s2.y - box.y, s2.w, s2.h] : Z,
  }) };
};

const gauss3 = (h: number) => (u01(h) + u01(h + 1) + u01(h + 2) - 1.5) * 2;
const nextMul4 = (n: number) => Math.ceil(n / 4) * 4;
const blur3 = (v: number[], radius: number) => {
  const n = v.length, r = Math.min(n >> 1 - 0, Math.max(0, Math.round(radius * 0.58)));
  if (r === 0) return v.slice();
  let a = v.slice(), b = new Array<number>(n).fill(0);
  const at = (x: number[], i: number) => x[((i % n) + n) % n]!;
  for (let pass = 0; pass < 3; pass++) {
    let acc = 0;
    for (let k = -r; k <= r; k++) acc += at(a, k);
    for (let i = 0; i < n; i++) { b[i] = acc / (2 * r + 1); acc += at(a, i + r + 1) - at(a, i - r); }
    [a, b] = [b, a];
  }
  return a;
};
const perimeter = (r: Rect, radius: number) => { const c = Math.min(radius, Math.min(r.w, r.h) / 2); return 4 * (r.h / 2 - c + (c * Math.PI) / 2 + r.w / 2 - c); };
const crawl = (n: number, cells: number, speed: number, t: number, seed: number, k: number, calm: boolean) => {
  const cc = Math.max(Math.trunc(cells / 3), 2), sp = calm ? speed * 0.35 : speed, out: number[] = [];
  for (let i = 0; i < n; i++) {
    const cx = (i / n) * cc, c = 0.5 + 0.5 * gnoise(cx - t * sp * 0.08 * cc, t * 0.35 + k * 5, cc, (seed + 3) >>> 0);
    out.push(calm ? 0.45 + 0.55 * ss(0.2, 0.8, c) : 0.3 + 0.7 * ss(0.25, 0.75, c));
  }
  return out;
};
const FORK = 16;
const forkWalk = (hk: number, len: number) => { const s = new Array<number>(FORK).fill(0); let acc = 0; for (let i = 1; i < FORK; i++) { acc = Math.max(-len * 0.3, Math.min(len * 0.3, acc + gauss3(hu(hk, 100 + i)) * len * 0.07)); s[i] = acc; } return s; };
const forkEnv = (age: number, life: number) => [1 - (1 - Math.min(age / 0.035, 1)) ** 3, ss(0, 0.01, age) * Math.exp(-age / (life * 0.4)) * (1 - ss(0.75 * life, life, age)), 1 - age / life] as const;
const mpdLoop = (start: number[], levels: number, amp: (l: number) => number, channel: number, strike: number, memory: number) => {
  let pts = start;
  for (let lv = 0; lv < levels; lv++) {
    const m = pts.length, sd = hu(lv < memory ? channel : strike, lv * 7919 + 1), a = amp(lv), next: number[] = [];
    for (let i = 0; i < m; i++) { const p0 = pts[i]!, p1 = pts[(i + 1) % m]!; next.push(p0, (p0 + p1) * 0.5 + a * gauss3(hu(sd, i * 3))); }
    pts = next;
  }
  return pts;
};
const resampleLoop = (ctrl: number[], n: number, limit: number) => {
  const m = ctrl.length, out: number[] = [];
  for (let i = 0; i < n; i++) { const x = (i / n) * m, i0 = Math.min(Math.floor(x), m - 1), f = x - i0, d = ctrl[i0]! + (ctrl[(i0 + 1) % m]! - ctrl[i0]!) * f; out.push(limit * Math.tanh(d / limit)); }
  return out;
};

export const electric = (o: { rect: Rect; radius: number; time: number; charged?: boolean; color?: number; core?: number; cool?: number; intensity?: number; amplitude?: number; seed?: number; opacity?: number }): Fx => {
  const charged = o.charged ?? false, seed = o.seed ?? 0, t = o.time;
  const p = charged
    ? { amplitude: o.amplitude ?? 1.1, frequency: 3, speed: 2, core: 0.5, glow: 4, forks: 0.25, flicker: 0, strands: 1, gap: 2, forkLen: 20 }
    : { amplitude: o.amplitude ?? 5, frequency: 2.4, speed: 3.2, core: 0.6, glow: 5, forks: 0.55, flicker: 0.45, strands: 2, gap: 2, forkLen: 20 };
  const m = p.amplitude * 1.7 + p.glow * 5;
  const box = inflate(o.rect, m + p.gap + p.forkLen * (charged ? 0.6 : 1.3));
  const total = perimeter(o.rect, o.radius), n = nextMul4(Math.min(2048, Math.max(64, Math.ceil(total)))), step = total / n, freq = p.frequency / 100;
  const data: number[] = [0, 0, 0, 0, 0, 0, 0, 0];
  let forks = 0, strands = p.strands;
  if (charged) {
    data[4] = 1;
    const cells = Math.max(Math.round(total * freq), 3), sp = p.speed * 0.35, buf: number[] = [];
    const disp = (x0: number, t0: number) => { let x = x0, tt = t0, a = 1, s = 0, nn = 0, per = cells; for (let oc = 0; oc < 3; oc++) { s += a * gnoise(x, tt, per, (seed + oc * 101) >>> 0); nn += a; x *= 2; per *= 2; tt *= 1.55; a *= 0.5; } return (s / nn) * 1.6; };
    for (let i = 0; i < n; i++) buf.push(disp((i / n) * cells, t * sp) * p.amplitude);
    data.push(...buf, ...blur3(buf, (p.glow * 1.2) / step), ...crawl(n, cells, p.speed, t, seed, 0, true));
    for (let j = 0; j < 5; j++) {
      const hj = hu(seed, j * 977 + 13), pr = 0.3 + 0.25 * u01(hj), tau = t / pr + u01(hj + 1), kk = Math.floor(tau), age = (tau - kk) * pr, hk = hu(hj, kk >>> 0);
      if (u01(hk) > p.forks * 0.5) continue;
      const life = 0.15 + 0.1 * u01(hk + 2);
      if (age > life) continue;
      const len = p.forkLen * 0.4 * (0.6 + 0.6 * u01(hk + 4)), [grow, lifee, heat] = forkEnv(age, life);
      data.push(u01(hk + 3) * total, total, 0, 0, len, grow, lifee, heat, ...forkWalk(hk, len));
      forks++;
    }
    strands = 1;
  } else {
    const sdS = hu(seed, 0x5157), period = Math.max(0.05, Math.min(4, 0.55 / p.speed));
    const start = (k: number) => (k + 0.35 * u01(hu(sdS, k >>> 0))) * period;
    let k = Math.floor(t / period);
    if (t < start(k)) k -= 1;
    const age = t - start(k), dur = start(k + 1) - start(k);
    const strikeSeed = (ks: number) => hu((sdS ^ 0x3d1f) >>> 0, ks >>> 0);
    const channel = (ks: number) => hu((sdS ^ 0xc4a2) >>> 0, Math.floor(ks / 3 + 0.5 * u01(hu(sdS, 77))) >>> 0);
    const noise = (j: number) => 1 - p.flicker * 0.25 * (0.5 + 0.5 * gnoise(t * 14, j * 3.7, 0, (seed + 41) >>> 0));
    const h = strikeSeed(k), a1 = dur * (0.3 + 0.4 * u01(h));
    const ret = u01(h + 1) < 0.6 && age > a1 ? 0.7 * p.flicker * Math.exp(-(age - a1) / 0.03) : 0;
    const env = (1 + 0.65 * Math.exp(-age / 0.022)) * (0.72 + 0.28 * Math.exp(-age / 0.12)) + ret;
    const ghost = (g: number) => 0.9 * Math.exp(-g / 0.07);
    const bright = [env * noise(0), ghost(age) * noise(1), ghost(age + start(k) - start(k - 1)) * noise(2)];
    data[4] = bright[0]!; data[5] = bright[1]!; data[6] = bright[2]!;
    const cells = Math.max(Math.round(total * freq), 3);
    const path = (ks: number) => {
      const ch = channel(ks), coarse: number[] = [];
      for (let i = 0; i < cells; i++) coarse.push(p.amplitude * 0.7 * gauss3(hu(ch, i * 3 + 5)));
      return resampleLoop(mpdLoop(coarse, 3, (lv) => p.amplitude * 0.7 * 2 ** (-0.62 * (lv + 1)), ch, strikeSeed(ks), 1), n, p.amplitude * 1.7);
    };
    const paths = [0, 1].map((j) => path(k - j));
    for (let s = 0; s < strands; s++) data.push(...paths[s]!);
    for (let s = 0; s < strands; s++) data.push(...blur3(paths[s]!, (p.glow * 1.2) / step));
    for (let s = 0; s < strands; s++) data.push(...crawl(n, cells, p.speed, t, (seed + s * 7919) >>> 0, s, false));
    outer: for (let j = 0; j < 2; j++) {
      const ks = k - j, fage = t - start(ks);
      for (let c = 0; c < 3; c++) {
        if (forks === 5) break outer;
        const hk = hu((strikeSeed(ks) ^ 0xf04c) >>> 0, c), life = 0.07 + 0.13 * u01(hk + 2);
        if (u01(hk) > p.forks || fage > life || fage < 0) continue;
        const i0 = Math.min(Math.trunc(u01(hk + 3) * n), n - 1), len = p.forkLen * (0.6 + 0.6 * u01(hk + 4)), [grow, lifee, heat] = forkEnv(fage, life);
        data.push(i0 * step, total, paths[j]![i0]!, 0, len, grow, lifee * Math.max(bright[0]!, 0.6), heat, ...forkWalk(hk, len));
        forks++;
      }
    }
  }
  data[0] = n; data[1] = strands; data[2] = forks;
  return { source: ELECTRIC, box, time: t, data, params: pack(o.rect, o.radius, box, {
    variant: charged ? 2 : 1, time: t, opacity: o.opacity, seed, c0: rgb(o.color ?? 0x4f8dff), c1: rgb(o.core ?? 0xeaf3ff), c2: rgb(o.cool ?? 0x7a4dff),
    p0: [p.amplitude, p.frequency, p.speed, p.core], p1: [o.intensity ?? 1, p.glow, p.forks, p.flicker], p2: [strands, p.gap, p.forkLen, 0.12], xf: [0, n, forks, strands],
  }) };
};
