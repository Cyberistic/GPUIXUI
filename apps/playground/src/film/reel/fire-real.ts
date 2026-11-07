import { FIRE_SIMULATION } from "./rune-firesim.js";

export { FIRE_SIMULATION };

const pcg = (v: number): number => {
  const s = (Math.imul(v, 747796405) + 2891336453) | 0;
  const w = Math.imul(((s >>> ((s >>> 28) + 4)) ^ s) | 0, 277803737);
  return ((w >>> 22) ^ w) >>> 0;
};
const hu = (a: number, b: number): number => pcg((a ^ pcg((b + 0x9e3779b9) >>> 0)) >>> 0);
const u01 = (n: number): number => (pcg(n >>> 0) >>> 8) * (1 / 16777216);

export interface FireInput {
  readonly rect: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly radius: number;
  readonly time: number;
  readonly height: number;
  readonly maxHeight: number;
  readonly intensity: number;
  readonly seed?: number;
  readonly smoke?: number;
  readonly scale?: number;
  readonly embers?: number;
  readonly emberRise?: number;
  readonly emberSize?: number;
  readonly emberLife?: number;
  readonly occlusion?: number;
  readonly rise?: number;
  readonly cooling?: number;
  readonly domain?: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
}

const DRAG = 2.4;

const embersOf = (i: FireInput, seed: number): number[] => {
  const { rect: r, radius, time: t, height } = i;
  const rise = i.emberRise ?? 58, size = i.emberSize ?? 0.8, life0 = i.emberLife ?? 1.5;
  const out: number[] = [];
  for (let e = 0; e < Math.min(i.embers ?? 24, 30); e++) {
    const hk0 = hu((seed + 991) >>> 0, e * 7 + 3);
    const life = life0 * (0.6 + 0.8 * u01(hk0 + 0));
    const tau = t / life + u01(hk0 + 1);
    const kk = Math.floor(tau);
    const a = tau - kk;
    const hk = hu(hk0, kk >>> 0);
    const age = a * life;
    const x0 = r.x + radius * 0.6 + (r.w - radius * 1.2) * u01(hk + 2);
    const y0 = r.y - height * (0.1 + 0.45 * u01(hk + 3));
    const v0 = -rise * (1 + 0.8 * u01(hk + 4));
    const vt = -rise * 0.32;
    const ek = Math.exp(-DRAG * age);
    const y = y0 + vt * age + ((v0 - vt) * (1 - ek)) / DRAG;
    const vy = vt + (v0 - vt) * ek;
    const sway = 2.5 + 5 * u01(hk + 5);
    const fq = 3 + 4 * u01(hk + 6);
    const ph = Math.PI * 2 * u01(hk + 7);
    const drift = (u01(hk + 8) - 0.5) * 14;
    const grow = 1 - Math.exp(-age * 3);
    const x = x0 + drift * age + sway * Math.sin(age * fq + ph) * grow;
    const vx = drift + sway * (Math.cos(age * fq + ph) * fq * grow + Math.sin(age * fq + ph) * 3 * Math.exp(-age * 3));
    const sz = size * (0.5 + 0.8 * u01(hk + 9)) * (1 - 0.4 * a);
    const attack = Math.min(1, age / 0.05);
    const temp = Math.exp(-age / (life * 0.42)) * (1 - a * a) * (0.8 + 0.3 * u01(hk + 10)) * attack;
    if (temp < 0.004) continue;
    const shutter = 0.6 / 60;
    out.push(x, y, vx * shutter, vy * shutter, sz, temp, 0, 0);
  }
  return out;
};

export const firePlan = (i: FireInput) => {
  const { rect: r, radius, height, maxHeight } = i;
  const seed = i.seed ?? 0;
  const rise = i.emberRise ?? 58;
  const life = (i.emberLife ?? 1.5) * 1.4;
  const emberUp = maxHeight * 0.55 + rise * (1.48 / DRAG + 0.32 * life) + (i.emberSize ?? 0.8) * 4;
  const side = 7.5 * life + 9;
  const up = Math.max(maxHeight * 2.6 + 8, emberUp) + 4;
  const box = i.domain ?? { x: r.x - side, y: r.y - up, w: r.w + 2 * side, h: up + 4 };
  const cell = Math.min(3, Math.max(1, Math.sqrt(Math.max(box.w * box.h, 1) / 16000)));
  const n: [number, number] = [Math.max(8, Math.ceil(box.w / cell)), Math.max(8, Math.ceil(box.h / cell))];
  const simRise = i.rise ?? Math.min(140, Math.max(20, height * 2.2));
  const cooling = i.cooling ?? (1.15 * simRise) / Math.max(height, 4);
  const local = { ...i, rect: { ...r, x: r.x - box.x, y: r.y - box.y } };
  const uniform = [
    n[0], n[1], cell, 1 / 60,
    0, 0, 0, 0,
    local.rect.x + r.w / 2, local.rect.y + r.h / 2, r.w / 2, r.h / 2,
    radius, seed % 65536, simRise, Math.max(i.scale ?? 26, 2),
    simRise * 3, cooling, Math.max(i.smoke ?? 0.6, 0) * 0.6, 0.25 + 0.6,
    simRise * 0.3, 1, 1.4, 2,
  ];
  const embers = embersOf(local, seed);
  const params = [0, 0, n[0] * cell, n[1] * cell, box.w, box.h, i.intensity, i.occlusion ?? 0.25, embers.length / 8, 0, 0, 0, ...embers];
  return { box, grid: n, uniform, params };
};

// Flame shading from rune-fx (MIT, © Anomaly), crates/rune-fx/src/shaders/fire.wgsl.
export const FIRE_SHADER = String.raw`
fn gauss(x: f32, w: f32) -> f32 { return exp(-(x * x) / max(w * w, 1e-6)); }
fn to_srgb(c: vec3f) -> vec3f {
  let lo = c * 12.92;
  let hi = 1.055 * pow(max(c, vec3f(0.0)), vec3f(1.0 / 2.4)) - 0.055;
  return select(hi, lo, c <= vec3f(0.0031308));
}
fn to_lin(c: vec3f) -> vec3f {
  let lo = c / 12.92;
  let hi = pow((max(c, vec3f(0.0)) + 0.055) / 1.055, vec3f(2.4));
  return select(hi, lo, c <= vec3f(0.04045));
}
fn segdist(p: vec2f, a: vec2f, b: vec2f) -> vec2f {
  let ab = b - a;
  let h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  return vec2f(length(p - a - ab * h), h);
}
fn blackbody(k: f32) -> vec3f {
  let t = k / 100.0;
  let g = clamp((99.4708 * log(t) - 161.1196) / 255.0, 0.0, 1.0);
  let b = select(clamp((138.5177 * log(max(t - 10.0, 1.0)) - 305.0448) / 255.0, 0.0, 1.0), 0.0, t <= 19.0);
  return to_lin(vec3f(1.0, g, b));
}
fn flame_light(T: f32, gain: f32) -> vec3f {
  let x = max(T, 0.0);
  let e = gain * x * x * x * smoothstep(0.08, 0.3, x);
  return vec3f(1.0) - exp(-blackbody(1000.0 + 1700.0 * min(x, 1.3)) * e);
}
fn sim_at(uv: vec2f) -> vec4f {
  let dim = vec2f(textureDimensions(simulation_state, 0));
  let g = uv * dim - 0.5;
  let i = floor(g);
  let f = g - i;
  let w0 = (1.0 - f) * (1.0 - f) * (1.0 - f) / 6.0;
  let w1 = (4.0 - 6.0 * f * f + 3.0 * f * f * f) / 6.0;
  let w3 = f * f * f / 6.0;
  let w2 = 1.0 - w0 - w1 - w3;
  let s0 = w0 + w1;
  let s1 = w2 + w3;
  let o0 = (i - 0.5 + w1 / s0) / dim;
  let o1 = (i + 1.5 + w3 / s1) / dim;
  let a = textureSampleLevel(simulation_state, backdrop_sampler, vec2f(o0.x, o0.y), 0.0);
  let b = textureSampleLevel(simulation_state, backdrop_sampler, vec2f(o1.x, o0.y), 0.0);
  let c = textureSampleLevel(simulation_state, backdrop_sampler, vec2f(o0.x, o1.y), 0.0);
  let d = textureSampleLevel(simulation_state, backdrop_sampler, vec2f(o1.x, o1.y), 0.0);
  return mix(mix(a, b, s1.x), mix(c, d, s1.x), s1.y);
}
fn shade(p: vec2f) -> vec4f {
  let aux = frame.params[0];
  let box_ = frame.params[1].xy;
  let inten = frame.params[1].z;
  let occlusion = frame.params[1].w;
  var emis = vec3f(0.0);
  var alpha = 0.0;
  let uv = (p - aux.xy) / aux.zw;
  if (all(uv >= vec2f(0.0)) && all(uv <= vec2f(1.0))) {
    let s = sim_at(uv);
    let T = s.z;
    let m = min(min(p.x - aux.x, aux.x + box_.x - p.x), p.y - aux.y);
    let win = smoothstep(0.0, 18.0, m);
    emis = flame_light(T, 6.0) * win;
    let sm = s.w * win;
    if (sm > 0.002) {
      alpha = (1.0 - exp(-sm * 1.2)) * occlusion * 1.6;
      var lit = 0.0;
      for (var k = 1; k < 5; k++) {
        let tk = sim_at(uv + vec2f(0.0, f32(k) * 7.0 / aux.w)).z;
        lit += tk * tk / f32(k);
      }
      let warm = vec3f(1.0, 0.45, 0.18) * min(lit, 1.0) * 0.3;
      emis += alpha * (vec3f(0.11, 0.11, 0.115) + warm);
    }
    let vis = smoothstep(0.12, 0.35, T) * win;
    alpha = min(alpha + vis * occlusion * 0.5, 1.0);
  }
  let count = u32(frame.params[2].x);
  for (var k = 0u; k < count; k++) {
    let a = frame.params[3u + k * 2u];
    let b = frame.params[4u + k * 2u];
    let sd = segdist(p, a.xy - a.zw, a.xy);
    let T = b.y;
    let core = gauss(sd.x, b.x);
    let halo = gauss(sd.x, b.x * 3.0) * 0.12;
    emis += flame_light(0.45 + T * 0.75, 6.0) * (core * 1.4 + halo) * T;
    alpha += core * T * 0.5;
  }
  let c = vec4f(emis * inten, min(alpha, 1.0) * inten);
  let cover = min(max(c.rgb, vec3f(0.0)), vec3f(c.a));
  let straight = select(vec3f(0.0), cover / c.a, c.a > 1e-6);
  return vec4f(to_srgb(straight) * c.a + to_srgb(max(c.rgb, vec3f(0.0)) - cover), c.a);
}`;

// Soft glow from rune-fx (MIT, © Anomaly), crates/rune-fx/src/shaders/glow.wgsl.
export const GLOW_SHADER = String.raw`
fn gauss(x: f32, w: f32) -> f32 { return exp(-(x * x) / max(w * w, 1e-6)); }
fn knee(x: f32) -> f32 { return 1.0 - exp(-max(x, 0.0)); }
fn bloom(d: f32, r: f32, reach: f32) -> f32 {
  let o = max(d, 0.0);
  let w = 1.0 - smoothstep(reach * 0.5, reach, o);
  return (0.65 * gauss(o, r * 0.35) + 0.35 * gauss(o, r * 1.2)) * w;
}
fn to_srgb(c: vec3f) -> vec3f {
  let lo = c * 12.92;
  let hi = 1.055 * pow(max(c, vec3f(0.0)), vec3f(1.0 / 2.4)) - 0.055;
  return select(hi, lo, c <= vec3f(0.0031308));
}
fn shade(p: vec2f) -> vec4f {
  let rect = frame.params[0];
  let radius = frame.params[1].x;
  let corner = frame.params[1].y;
  let intensity = frame.params[1].z;
  let half_ = rect.zw * 0.5;
  let q = abs(p - rect.xy - half_) - half_ + corner;
  let d = length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - corner;
  let reach = radius * 4.5;
  let edge = smoothstep(-0.5, 0.5, d);
  let gl = bloom(d, radius, reach) * edge;
  let corew = gauss(max(d, 0.0), 0.3 * radius) * 0.6;
  let col = mix(frame.params[2].rgb, vec3f(0.904, 0.871, 1.0), corew * 0.8);
  let e = knee(gl * intensity * 1.1);
  return vec4f(col * e, e * 0.15);
}`;

export const HEAT_HAZE = String.raw`
fn pcg(v: u32) -> u32 { let s = v * 747796405u + 2891336453u; let w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
fn hcell(c: vec2i, seed: u32) -> f32 { return f32(pcg(bitcast<u32>(c.x) ^ pcg(bitcast<u32>(c.y) ^ pcg(seed))) >> 8u) * (1.0 / 16777216.0); }
fn grad2(c: vec2i, seed: u32) -> vec2f { let a = hcell(c, seed) * 6.2831853; return vec2f(cos(a), sin(a)); }
fn gnoise(p: vec2f, seed: u32) -> f32 {
  let i = vec2i(floor(p)); let f = p - floor(p); let u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(dot(grad2(i, seed), f), dot(grad2(i + vec2i(1, 0), seed), f - vec2f(1., 0.)), u.x), mix(dot(grad2(i + vec2i(0, 1), seed), f - vec2f(0., 1.)), dot(grad2(i + vec2i(1, 1), seed), f - vec2f(1., 1.)), u.x), u.y) * 1.41421;
}
const ROT = mat2x2f(0.8, 0.6, -0.6, 0.8);
fn fbm3(p0: vec2f, seed: u32) -> f32 {
  var p = p0; var a = 0.5; var s = 0.0;
  for (var o = 0u; o < 3u; o++) { s += a * gnoise(p, seed + o * 131u); p = ROT * p * 2.02; a *= 0.5; }
  return s / 0.875;
}
fn shade(p: vec2f) -> vec4f {
  let rect = frame.params[0];
  let H = frame.params[1].x; let scale = frame.params[1].y; let speed = frame.params[1].z; let amount = frame.params[1].w;
  let half_ = rect.zw * 0.5;
  let above = rect.y - p.y;
  let side = smoothstep(half_.x + 2.0, half_.x - 4.0, abs(p.x - rect.x - half_.x));
  let m = smoothstep(1.0, 1.0 + H * 0.3, above) * (1.0 - smoothstep(H * 0.45, H, above)) * side;
  if (m <= 0.0) { return vec4f(0.0); }
  let q = p / max(scale, 1.0) + vec2f(0.0, frame.time * speed);
  let o = vec2f(fbm3(q, 0u), fbm3(q * vec2f(1.0, 0.7) + vec2f(7.3, 2.1), 5u)) * amount;
  return vec4f(backdrop_at(p + o * m).rgb, 1.0) * smoothstep(0.0, 0.02, m);
}`;

export const BURN_FRONT = String.raw`
fn pcg(v: u32) -> u32 { let s = v * 747796405u + 2891336453u; let w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
fn hcell(c: vec2i, seed: u32) -> f32 { return f32(pcg(bitcast<u32>(c.x) ^ pcg(bitcast<u32>(c.y) ^ pcg(seed))) >> 8u) * (1.0 / 16777216.0); }
fn grad2(c: vec2i, seed: u32) -> vec2f { let a = hcell(c, seed) * 6.2831853; return vec2f(cos(a), sin(a)); }
fn gnoise(p: vec2f, seed: u32) -> f32 {
  let i = vec2i(floor(p)); let f = p - floor(p); let u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(dot(grad2(i, seed), f), dot(grad2(i + vec2i(1, 0), seed), f - vec2f(1., 0.)), u.x), mix(dot(grad2(i + vec2i(0, 1), seed), f - vec2f(0., 1.)), dot(grad2(i + vec2i(1, 1), seed), f - vec2f(1., 1.)), u.x), u.y) * 1.41421;
}
fn fbm(p0: vec2f, seed: u32) -> f32 {
  var p = p0; var a = 0.5; var s = 0.0;
  for (var o = 0u; o < 4u; o++) { s += a * gnoise(p, seed + o * 131u); p = p * 2.03 + vec2f(1.7, 9.2); a *= 0.5; }
  return s;
}
fn shade(p: vec2f) -> vec4f {
  let front = frame.params[0].x;
  let ground = frame.params[1].rgb;
  let edge = front + fbm(vec2f(p.x / 70.0, front / 90.0), 3u) * 46.0 + fbm(vec2f(p.x / 16.0, p.y / 16.0), 7u) * 9.0;
  let d = p.y - edge;
  if (d < -44.0) { return vec4f(0.0); }
  let char_ = smoothstep(-44.0, 0.0, d);
  let flicker = 0.75 + 0.25 * gnoise(vec2f(p.x / 9.0, frame.time * 9.0), 11u);
  let glow = exp(-(d * d) / 16.0) * flicker;
  let ember = exp(-max(d, 0.0) / 9.0) * smoothstep(-3.0, 0.5, d) * (0.5 + 0.5 * gnoise(p / 5.0 + vec2f(0.0, frame.time * 2.0), 13u));
  let light = vec3f(1.0, 0.42, 0.07) * glow * 1.4 + vec3f(0.9, 0.16, 0.02) * ember * 0.9;
  let cover = char_ * char_;
  return vec4f(ground * smoothstep(0.0, 2.0, d) + light, max(cover, smoothstep(0.0, 2.0, d)));
}`;
