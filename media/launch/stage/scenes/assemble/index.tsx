/**
 * The film's assemble shot (plan 066, v4.3): the stats block's own cards fall
 * in from above and land on bare paper — no blueprint, no outlines — while the
 * camera makes one slow drone move over the build; the whole real frame then
 * settles over the cards and holds.
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
const SCALE = 0.55;
// The film's line band owns the top 230 px: the screen lands under it, so a
// settled card never sits in the headline.
const ORIGIN = { x: (1920 - FRAME.width * SCALE) / 2, y: 285 };
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

type State = { flown: number; real: boolean };
const initial: State = { flown: 0, real: false };
const poster: State = { flown: cards.length, real: true };

async function script(a: Act<State>) {
  await a.wait(200);
  for (let i = 1; i <= cards.length; i += 1) {
    await a.set({ flown: i });
    await a.wait(150);
  }
  await a.wait(700);
  await a.set({ real: true });
  await a.wait(1000);
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
          <div className="ga-world" data-real={s.real || undefined}>
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
          </div>
        )}
      </Stage>
    </div>
  );
}
