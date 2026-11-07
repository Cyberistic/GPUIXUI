import { Connector, Count, Stage, Text } from "../../kit";
import type { Act, Rect } from "../../kit";
import blocks from "../../../../../examples/blocks/package.json";
import { Footage } from "../footage";
import "./bento.css";

const STEP = 110;
const LEAD = 450;
const BLOCKS = Object.keys(blocks.exports).length;

type Beat = { on: boolean };
const before: Beat = { on: false };
const after: Beat = { on: true };
const beat = (i: number) => async (a: Act<Beat>) => {
  await a.wait(LEAD + i * STEP);
  await a.set({ on: true });
};

function Tile({
  area,
  lead,
  rest,
  dark,
  children,
}: {
  area: string;
  lead?: string;
  rest?: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`gb-tile gb-tile--${area}`}
      data-dark={dark || undefined}
    >
      {lead ? (
        <p className="gb-copy">
          <b>{lead}</b> {rest}
        </p>
      ) : null}
      {children}
    </section>
  );
}

const picture = (
  i: number,
  width: number,
  height: number,
  draw: (on: boolean, rect: (name: string) => Rect | null) => React.ReactNode,
) => (
  <div className="gb-picture" style={{ width, height }}>
    <Stage<Beat>
      width={width}
      height={height}
      initial={before}
      poster={after}
      play="once"
      script={beat(i)}
      className="gb-stage"
    >
      {(s, rect) => draw(s.on, rect)}
    </Stage>
  </div>
);

const TARGETS = ["macOS", "Windows", "Linux", "Terminal"] as const;

export default function Bento() {
  return (
    <div className="gpuixui-bento">
      <div className="gb-grid">
        <Tile
          area="hero"
          lead="Every block, native."
          rest="Painted by GPUI, written in React."
        >
          {picture(0, 1059, 380, (on) => (
            <div className="gb-window">
              <Footage
                take="stats"
                play={on}
                width={2200}
                height={1400}
                scale={0.57}
              />
            </div>
          ))}
        </Tile>
        <Tile area="stat" dark>
          {picture(1, 519, 480, (on) => (
            <div className="gb-stat">
              <span className="gb-stat-lead">Ships with</span>
              <span className="gb-stat-number">
                <Count value={on ? BLOCKS : 0} duration={1100} />
                <span className="gb-stat-unit"> blocks</span>
              </span>
              <span className="gb-stat-label">
                Dashboards, settings, desktops and more, ready to copy.
              </span>
            </div>
          ))}
        </Tile>
        <Tile
          area="switch"
          lead="shadcn's API."
          rest="The props you already know."
        >
          {picture(2, 519, 200, (on) => (
            <div
              className="gb-crop"
              style={{ left: 44, top: 40, width: 432, height: 127 }}
            >
              <Footage
                take="cu-switch"
                play={on}
                width={1920}
                height={1080}
                scale={0.72}
                at={{ x: 660, y: 452 }}
              />
            </div>
          ))}
        </Tile>
        <Tile
          area="slang"
          lead="Slang."
          rest="A whole calculator, built on it."
        >
          {picture(3, 519, 230, (on) => (
            <div
              className="gb-crop"
              style={{ left: 0, top: 0, width: 519, height: 230 }}
            >
              <Footage
                take="slang"
                play={on}
                width={2120}
                height={1520}
                scale={0.718}
                at={{ x: 278, y: 218 }}
              />
            </div>
          ))}
        </Tile>
        <Tile area="platforms" lead="One tree, everywhere." rest="No web view.">
          {picture(4, 519, 230, (on, rect) => {
            const node = rect("gpui");
            return (
              <>
                <div className="gb-targets">
                  {TARGETS.map((name) => (
                    <span
                      key={name}
                      className="gb-target"
                      data-target={`t-${name}`}
                    >
                      <Text>{name}</Text>
                    </span>
                  ))}
                </div>
                <span
                  className="gb-node"
                  data-target="gpui"
                  data-on={on || undefined}
                >
                  <Text>GPUI</Text>
                </span>
                {node &&
                  TARGETS.map((name) => {
                    const from = rect(`t-${name}`);
                    return from ? (
                      <Connector
                        key={name}
                        from={{
                          x: from.x + from.width,
                          y: from.y + from.height / 2,
                        }}
                        to={{ x: node.x, y: node.y + node.height / 2 }}
                        route="step"
                        show={on}
                        className="gb-line"
                      />
                    ) : null;
                  })}
              </>
            );
          })}
        </Tile>
      </div>
    </div>
  );
}
