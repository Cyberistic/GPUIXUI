/** @jsxImportSource @gpuix/react */
import type { ReactNode } from "react";
import { BURN_FRONT, FIRE_SHADER, FIRE_SIMULATION, firePlan } from "./fire-real.js";
import { alpha, at, center, H, RawShader as Shader, Root, T, W } from "./kit.js";
import { ease } from "./motion.js";

const sst = (a: number, b: number, x: number) => ease(x, a, b - a);
const IGNITE = 0.7, CLIMB = 3.7;

export const Opening = ({ t, tweet }: { t: number; tweet: string }): ReactNode => {
  const burn = Math.min(1, Math.max(0, (t - IGNITE) / CLIMB));
  const front = 470 - burn * 600;
  const lit = sst(IGNITE - 0.05, IGNITE + 0.35, t);
  const out = 1 - sst(IGNITE + CLIMB - 0.25, IGNITE + CLIMB + 0.9, t);
  const reveal = ease(t, 4.45, 0.5);
  const plan = firePlan({
    rect: { x: -60, y: Math.max(front, -60), w: 1080, h: 700 }, radius: 24, time: t, height: 200, maxHeight: 200, rise: 300, cooling: 0.85,
    intensity: 1.5 * lit * out, embers: 28, emberRise: 90, emberSize: 1, smoke: 0.7,
    domain: { x: 0, y: 0, w: W, h: H },
  });
  return (
    <Root fill="#000000">
      <img src={tweet} objectFit="fill" style={{ position: "absolute", left: 48, top: 145, width: 864, height: 273 }} />
      <Shader source={BURN_FRONT} time={t} params={[front, 0, 0, 0, 0.067, 0.067, 0.075, 1]} style={at(0, 0, W, H)} />
      <Shader source={FIRE_SHADER} simulationSource={FIRE_SIMULATION} simulationGrid={plan.grid} simulationUniform={plan.uniform} time={t} params={plan.params} style={at(0, 0, W, H)} />
      <div style={{ ...at(0, 164, W), ...center }}><T s="Nen off" size={52} weight={600} a={reveal} /></div>
      <div style={{ ...at(404, 290, 152, 88), borderRadius: 44, backgroundColor: alpha("#2a2a2d", reveal) }}><div style={{ ...at(8, 8, 72, 72), borderRadius: 36, backgroundColor: alpha("#ffffff", reveal) }} /></div>
    </Root>
  );
};

