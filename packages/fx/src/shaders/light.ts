// rune-light (MIT, © Anomaly): its surface, field, soft shadow, shaft and composite passes as one fragment shader.
export interface Prim {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly r: number;
  readonly z0?: number;
  readonly z1?: number;
  readonly bevel?: number;
  readonly lift?: number;
  readonly gloss?: number;
  readonly rough?: number;
  readonly floor?: boolean;
}
export interface LightDesc {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radius: number;
  readonly color: readonly [number, number, number];
  readonly intensity: number;
  readonly range: number;
  readonly shafts?: number;
  readonly bulb?: number;
  readonly specular?: number;
  readonly softness?: number;
}
export interface LightSettings {
  readonly ambient: readonly [number, number, number];
  readonly rim: number;
  readonly ao: number;
  readonly shaftsOver: number;
  readonly floor?: number;
}

const dec = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
export const srgbf = (
  r: number,
  g: number,
  b: number,
): readonly [number, number, number] => [dec(r), dec(g), dec(b)];

export const lightParams = (
  s: number,
  lights: ReadonlyArray<LightDesc>,
  st: LightSettings,
  count: number,
): number[] => [
  lights.length,
  count,
  st.rim,
  st.ao,
  ...st.ambient,
  st.shaftsOver,
  st.floor ?? 0.025,
  0.4,
  0.55,
  0,
  ...lights.flatMap((l) => {
    const peak = Math.max(...l.color, 1e-6),
      k = l.intensity / peak;
    return [
      l.x * s,
      l.y * s,
      l.z * s,
      l.radius * s,
      l.color[0] * k,
      l.color[1] * k,
      l.color[2] * k,
      l.range * s,
      l.shafts ?? 0,
      l.bulb ?? 0,
      l.specular ?? 1,
      l.softness ?? 1,
    ];
  }),
];
export const lightData = (s: number, prims: ReadonlyArray<Prim>): number[] =>
  prims.flatMap((p) => {
    const z0 = (p.z0 ?? 0) * s,
      z1 = (p.z1 ?? p.z0 ?? 0) * s,
      occ = z1 > z0 ? 1 : 0,
      raised = (p.bevel ?? 0) > 0 ? 4 : 0;
    return [
      p.x * s,
      p.y * s,
      p.w * s,
      p.h * s,
      p.r * s,
      z0,
      z1,
      (p.bevel ?? 0) * s,
      (p.lift ?? 0) * s,
      p.gloss ?? 0,
      p.rough ?? 0.6,
      occ + raised,
    ];
  });

export const LIGHT_SHADER = String.raw`
const PI: f32 = 3.14159265;
const REF: f32 = 200.0;
const CLAMP: f32 = 256.0;
struct L { pos: vec4f, color: vec4f, extra: vec4f }
fn light_at(i: u32) -> L { return L(frame.params[3u + i * 3u], frame.params[4u + i * 3u], frame.params[5u + i * 3u]); }
fn sd_rrect(p: vec2f, half_: vec2f, r0: f32) -> f32 {
  let r = min(r0, min(half_.x, half_.y));
  let q = abs(p) - half_ + vec2f(r);
  return min(max(q.x, q.y), 0.0) + length(max(q, vec2f(0.0))) - r;
}
fn prim_sd(k: u32, p: vec2f) -> f32 {
  let rect = shader_data_at(k * 3u); let a = shader_data_at(k * 3u + 1u);
  let half_ = rect.zw * 0.5;
  return sd_rrect(p - rect.xy - half_, half_, a.x);
}
fn field_at(q: vec2f) -> vec3f {
  var best = CLAMP; var bot = 0.0; var top = 0.0;
  let n = u32(frame.params[0].y);
  for (var k = 0u; k < n; k++) {
    let b = shader_data_at(k * 3u + 2u);
    if ((u32(b.w + 0.5) & 1u) == 0u) { continue; }
    let d = prim_sd(k, q);
    if (d < best) { let a = shader_data_at(k * 3u + 1u); best = d; bot = a.y; top = a.z; }
  }
  return vec3f(best, bot, top);
}
fn slab(f: vec3f, z: f32) -> f32 {
  let dz = max(z - f.z, f.y - z);
  let a = vec2f(f.x, dz);
  return length(max(a, vec2f(0.0))) + min(max(a.x, a.y), 0.0);
}
fn trace(P: vec3f, T: vec3f, radius: f32, t_start: f32) -> f32 {
  let D = T - P; let dist = length(D);
  if (dist < 1e-3) { return 1.0; }
  let rd = D / dist; let theta = max(radius / dist, 1e-3);
  var t = t_start; var res = 1.0; var ph = 1e10;
  let t_end = dist - radius; let zmax = frame.params[2].w;
  for (var i = 0; i < 64; i++) {
    if (t >= t_end) { break; }
    let q = P + rd * t;
    if (rd.z >= 0.0 && q.z > zmax) { break; }
    let h = slab(field_at(q.xy), q.z);
    if (h <= 0.0) { res = min(res, h / (t * theta)); } else {
      let y = h * h / (2.0 * ph);
      let dd = sqrt(max(h * h - y * y, 0.0));
      res = min(res, dd / (max(t - y, 1e-3) * theta));
    }
    ph = max(h, 1e-3);
    if (res <= -1.0) { break; }
    t = t + clamp(abs(h), 0.6 + t * 0.012, 96.0);
  }
  let k = clamp(0.5 + 0.5 * res, 0.0, 1.0);
  return k * k * (3.0 - 2.0 * k);
}
fn shaft(p: vec2f, l: L) -> f32 {
  let D = l.pos.xy - p; let len = length(D);
  let R = max(l.pos.w * l.extra.w, 1.0);
  let n = 48; let step = len / f32(n); let w = max(step * 0.6, 26.0);
  var acc = 0.0;
  for (var i = 0; i < n; i++) {
    let q = p + D * ((f32(i) + 0.5) / f32(n));
    let open = smoothstep(-w, w, field_at(q).x);
    let r = length(l.pos.xy - q);
    acc += open * R * R / (r * r + R * R);
  }
  return acc / f32(n);
}
fn light_term(l: L, P: vec3f) -> vec4f {
  let D = l.pos.xyz - P; let d2 = dot(D, D); let d = sqrt(d2);
  let x = d / max(l.color.w, 1.0);
  let w = clamp(1.0 - x * x * x * x, 0.0, 1.0);
  return vec4f(D / max(d, 1e-4), REF * REF / (d2 + l.pos.w * l.pos.w) * w * w);
}
fn ggx(nh: f32, a: f32) -> f32 { let a2 = a * a; let d = nh * nh * (a2 - 1.0) + 1.0; return a2 / (PI * d * d); }
fn shoulder(x: vec3f) -> vec3f { let k = 0.8; let over = max(x - vec3f(k), vec3f(0.0)); return min(x, vec3f(k)) + (1.0 - k) * (vec3f(1.0) - exp(-over / (1.0 - k))); }
fn to_srgb(c: vec3f) -> vec3f { let lo = c * 12.92; let hi = 1.055 * pow(max(c, vec3f(0.0)), vec3f(1.0 / 2.4)) - 0.055; return select(hi, lo, c <= vec3f(0.0031308)); }
fn to_lin(c: vec3f) -> vec3f { let lo = c / 12.92; let hi = pow((max(c, vec3f(0.0)) + 0.055) / 1.055, vec3f(2.4)); return select(hi, lo, c <= vec3f(0.04045)); }
fn ign(p: vec2f) -> f32 { return fract(52.9829189 * fract(dot(p, vec2f(0.06711056, 0.00583715)))); }
fn shade(point: vec2f) -> vec4f {
  let px = point * frame.scale;
  let base = to_lin(backdrop_at(point).rgb);
  let n_prims = u32(frame.params[0].y);
  var id = n_prims; var sd = 1e5; var zr = 0.0;
  for (var k = n_prims; k > 0u; k--) {
    let d = prim_sd(k - 1u, px);
    if (d <= 0.5) { id = k - 1u; sd = d; zr = shader_data_at(id * 3u + 1u).z; break; }
  }
  var grad = vec2f(0.0); var n = vec3f(0.0, 0.0, 1.0);
  let ambient = frame.params[1].xyz;
  var gloss = frame.params[2].y; var rough = frame.params[2].z; var rim = 0.0;
  if (id < n_prims) {
    let e = 0.5;
    let g = vec2f(prim_sd(id, px + vec2f(e, 0.)) - prim_sd(id, px - vec2f(e, 0.)), prim_sd(id, px + vec2f(0., e)) - prim_sd(id, px - vec2f(0., e)));
    let gl = length(g);
    grad = select(vec2f(0.0), g / gl, gl > 1e-5);
    let a = shader_data_at(id * 3u + 1u); let b = shader_data_at(id * 3u + 2u);
    gloss = b.y; rough = b.z;
    let flags = u32(b.w + 0.5);
    if ((flags & 4u) != 0u) {
      let bw = max(a.w, 0.5); let x = clamp(-sd / bw, 0.0, 1.0);
      n = normalize(vec3f(grad * (b.x / bw * 3.0 * (1.0 - x) * (1.0 - x)), 1.0));
    }
    rim = frame.params[0].z * (1.0 - smoothstep(0.0, 2.0, -sd)) * select(0.0, 1.0, (flags & 1u) != 0u);
  }
  let P = vec3f(px, zr + 0.35);
  var irr = ambient;
  let f = field_at(px); let below = max(f.z - zr, 0.0);
  if (below > 0.0 && f.x > 0.0) {
    let occ = 1.0 - smoothstep(0.0, below * 3.0 + 6.0, f.x);
    irr *= 1.0 - frame.params[0].w * occ * occ;
  }
  var diffuse = vec3f(0.0); var spec = vec3f(0.0); var airc = vec3f(0.0);
  let nl = u32(frame.params[0].x);
  for (var li = 0u; li < nl; li++) {
    let l = light_at(li);
    let lt = light_term(l, P); let dir = lt.xyz;
    var v = 1.0;
    if (lt.w > 1e-5 && l.pos.z > zr + 0.35) { v = trace(P, l.pos.xyz, l.pos.w * l.extra.w, 0.75); }
    let ndl = max(dot(n, dir), 0.0);
    let e_ = l.color.rgb * lt.w * v;
    let front = select(1.0, 0.0, l.extra.x > 0.0);
    diffuse += e_ * ndl * front;
    let h = normalize(dir + vec3f(0.0, 0.0, 1.0));
    let dist = length(l.pos.xyz - P);
    let a = clamp(rough * rough + l.pos.w / (2.0 * dist), 0.02, 1.0);
    let fres = 0.04 + 0.96 * pow(1.0 - max(dot(dir, h), 0.0), 5.0);
    spec += e_ * ndl * ggx(max(dot(n, h), 0.0), a) * ((rough * rough) / a) * fres * gloss * l.extra.z * front;
    let lxy = l.pos.xy - px;
    let face = max(dot(grad, lxy / max(length(lxy), 1e-3)), 0.0);
    spec += e_ * rim * face * face * max(dir.z, 0.15);
    let d2 = length(lxy);
    if (l.extra.x > 0.0) {
      let over = select(1.0, frame.params[1].w, zr > 0.5);
      let fall = 1.5 * REF / (d2 + 1.5 * REF);
      airc += l.color.rgb * l.extra.x * shaft(px, l) * over * fall * fall;
    }
    if (l.extra.y > 0.0) {
      let r = max(l.pos.w, 1.0); let q = r * r / (d2 * d2 + r * r);
      airc += l.color.rgb * l.extra.y * (q * sqrt(q) + 0.05 * q);
    }
  }
  let col = base * irr + (base + vec3f(frame.params[2].x)) * diffuse + spec + airc;
  let dn = ign(px) + ign(px.yx + vec2f(17.0, 0.0)) - 1.0;
  return vec4f(to_srgb(shoulder(col)) + vec3f(dn / 255.0), 1.0);
}`;
