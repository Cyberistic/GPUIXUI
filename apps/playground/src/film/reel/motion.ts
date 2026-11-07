export interface Spring {
  readonly duration: number;
  readonly bounce: number;
}
export const sp = (duration: number, bounce: number): Spring => ({
  duration,
  bounce,
});

const sample = (
  s: Spring,
  x0: number,
  v0: number,
  target: number,
  t: number,
): readonly [number, number] => {
  if (t <= 0) return [x0, v0];
  const w = (Math.PI * 2) / s.duration;
  const z = s.bounce >= 0 ? 1 - s.bounce : 1 / (1 + s.bounce);
  const d = x0 - target;
  if (z < 1 - 1e-4) {
    const wd = w * Math.sqrt(1 - z * z),
      a = d,
      b = (v0 + z * w * d) / wd,
      e = Math.exp(-z * w * t);
    const c = Math.cos(wd * t),
      n = Math.sin(wd * t);
    return [
      target + e * (a * c + b * n),
      e * ((b * wd - a * z * w) * c - (a * wd + b * z * w) * n),
    ];
  }
  if (z > 1 + 1e-4) {
    const r = w * Math.sqrt(z * z - 1),
      r1 = -z * w + r,
      r2 = -z * w - r,
      c2 = (v0 - r1 * d) / (r2 - r1),
      c1 = d - c2;
    return [
      target + c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t),
      c1 * r1 * Math.exp(r1 * t) + c2 * r2 * Math.exp(r2 * t),
    ];
  }
  const b = v0 + w * d,
    e = Math.exp(-w * t);
  return [target + (d + b * t) * e, (b - w * (d + b * t)) * e];
};

export const track = (
  t: number,
  from: number,
  keys: ReadonlyArray<readonly [number, number, Spring]>,
): number => {
  let x = from,
    v = 0,
    target = from,
    t0 = 0,
    spring = sp(0.3, 0);
  for (const [tk, to, s] of keys) {
    if (t < tk) break;
    [x, v] = sample(spring, x, v, target, tk - t0);
    target = to;
    t0 = tk;
    spring = s;
  }
  return sample(spring, x, v, target, t - t0)[0];
};

export const ease = (t: number, t0: number, dur: number): number => {
  const x = Math.min(1, Math.max(0, (t - t0) / dur));
  return x * x * (3 - 2 * x);
};

export const pressed = (t: number, tp: number): number =>
  track(t, 0, [
    [tp, 1, sp(0.12, 0)],
    [tp + 0.14, 0, sp(0.35, 0.45)],
  ]);
