/**
 * The film's assemble shot (plan 066), on the stageshow skill's `Fly` as its
 * gold `subscriptions` uses it. The stats block's blueprint (`boxes.json`, every
 * box and text run the native renderer painted on its first frame) draws in
 * reading order; the screen's seven real cards, cropped from that same native
 * frame, fall in from above and land in their slots one by one; then the whole
 * real frame settles over the blueprint and holds.
 */
import { Fly, Stage } from "../../kit";
import type { Act, Rect } from "../../kit";
import boxes from "../../../takes/blueprint/boxes.json";
import { framesOf } from "../footage";
import "./assemble.css";

type Box = {
  kind: "box" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
};

const FRAME = { width: 2200, height: 1400 };
const SCALE = 0.62;
const ORIGIN = { x: (1920 - FRAME.width * SCALE) / 2, y: 170 };
const SHOT = framesOf("blueprint")[0];

const place = (b: Box): Rect => ({
  x: ORIGIN.x + b.x * SCALE,
  y: ORIGIN.y + b.y * SCALE,
  width: b.width * SCALE,
  height: b.height * SCALE,
});

const all = boxes as ReadonlyArray<Box>;
const cards = all.filter(
  (b) => b.kind === "box" && b.width > 250 && b.height > 120 && b.width < 2100,
);

type State = { drawn: boolean; flown: number; real: boolean };
const initial: State = { drawn: false, flown: 0, real: false };
const poster: State = { drawn: true, flown: cards.length, real: true };

async function script(a: Act<State>) {
  await a.wait(200);
  await a.set({ drawn: true });
  await a.wait(1200);
  for (let i = 1; i <= cards.length; i += 1) {
    await a.set({ flown: i });
    await a.wait(160);
  }
  await a.wait(800);
  await a.set({ real: true });
  await a.wait(1200);
}

/** A card: its own pixels from the native frame, at its slot's size. */
const Card = ({ box }: { box: Box }) => (
  <div
    className="ga-card"
    style={{
      width: box.width * SCALE,
      height: box.height * SCALE,
      borderRadius: box.radius * SCALE,
      backgroundImage: `url(${SHOT})`,
      backgroundSize: `${FRAME.width * SCALE}px ${FRAME.height * SCALE}px`,
      backgroundPosition: `${-box.x * SCALE}px ${-box.y * SCALE}px`,
    }}
  />
);

export default function Assemble() {
  return (
    <div className="gpuixui-assemble">
      <Stage<State>
        width={1920}
        height={1080}
        initial={initial}
        poster={poster}
        play="once"
        script={script}
        className="ga-stage"
      >
        {(s) => (
          <>
            {all.map((b, i) => {
              const r = place(b);
              return (
                <span
                  key={i}
                  className={b.kind === "box" ? "ga-box" : "ga-text"}
                  data-on={s.drawn || undefined}
                  style={{
                    left: r.x,
                    top: b.kind === "box" ? r.y : r.y + r.height * 0.3,
                    width: r.width,
                    height: b.kind === "box" ? r.height : r.height * 0.4,
                    borderRadius: b.kind === "box" ? b.radius * SCALE : 3,
                    transitionDelay: `${i * 9}ms`,
                  }}
                />
              );
            })}
            {cards.map((box, i) => {
              const to = place(box);
              const from = {
                ...to,
                x: to.x + (i % 2 === 0 ? -90 : 90),
                y: -to.height - 60,
              };
              return (
                <Fly
                  key={i}
                  from={from}
                  to={to}
                  go={s.flown > i}
                  duration={750}
                >
                  <Card box={box} />
                </Fly>
              );
            })}
            <img
              alt=""
              src={SHOT}
              className="ga-real"
              data-on={s.real || undefined}
              style={{
                left: ORIGIN.x,
                top: ORIGIN.y,
                width: FRAME.width * SCALE,
                height: FRAME.height * SCALE,
              }}
            />
          </>
        )}
      </Stage>
    </div>
  );
}
