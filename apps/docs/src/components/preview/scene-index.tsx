import { components } from "@/component-meta/registry";
import {
  LIVE_SCENES,
  SCENE_GESTURE,
  SCENE_INTERACTION,
  SCENE_LABEL,
  SCENE_PAGE,
  type LiveScene,
} from "../../../preview/scenes";

/**
 * One shipped live scene: the page that mounts it and what a reader does to
 * see the state the page documents. Derived from `preview/scenes.ts`; the
 * guide must not keep a second list.
 */
export interface LiveSceneRow {
  readonly scene: LiveScene;
  readonly title: string;
  readonly href: string | null;
  readonly kind: "record" | "composed";
  readonly interaction: string;
}

const interactionFor = (scene: LiveScene): string =>
  SCENE_GESTURE[scene] === undefined
    ? "Mounts in the state it documents."
    : (SCENE_INTERACTION[scene] ?? "Opened by a real gesture.");

/** One row per registered scene, in `LIVE_SCENES` order. */
export const liveSceneRows = (): ReadonlyArray<LiveSceneRow> =>
  LIVE_SCENES.map((scene) => {
    const record = components.find(
      (component) => component.liveScene === scene,
    );
    if (record !== undefined) {
      return {
        scene,
        title: record.title,
        href: `/docs/components/${record.slug}`,
        kind: "record",
        interaction: interactionFor(scene),
      };
    }

    const label = SCENE_LABEL.find((entry) => entry.scene === scene);
    return {
      scene,
      title: label?.title ?? scene,
      href: SCENE_PAGE[scene] ?? null,
      kind: "composed",
      interaction: interactionFor(scene),
    };
  });

/**
 * Every live scene, generated from the contract (`/docs/previews`). A reader
 * who meets "a scene may open by a gesture" can see which scene, on which page,
 * and what the gesture is instead of following a repository link.
 */
export function LiveSceneIndex() {
  const rows = liveSceneRows();
  const records = rows.filter((row) => row.kind === "record").length;
  const composed = rows.length - records;

  return (
    <div className="not-prose my-6 flex flex-col gap-3" data-live-scene-index>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="pb-2 text-left text-sm text-fd-muted-foreground">
            {rows.length} live scenes ship today: {records} run on a component
            page and {composed} are composed pages. The list is read from
            <code className="mx-1">LIVE_SCENES</code>; the smoke drives every
            gesture and asserts the scene's text is absent before it and present
            after it.
          </caption>
          <thead>
            <tr className="border-b border-fd-border">
              <th scope="col" className="px-2 py-2 font-medium">
                Scene
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                Runs on
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                How to see the state
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.scene}
                data-live-scene={row.scene}
                className="border-b border-fd-border align-top"
              >
                <th scope="row" className="px-2 py-2 font-medium">
                  {row.href === null ? (
                    row.title
                  ) : (
                    <a href={row.href}>{row.title}</a>
                  )}
                </th>
                <td className="px-2 py-2 text-fd-muted-foreground">
                  {row.kind === "record" ? "Component page" : "Composed page"}
                </td>
                <td className="px-2 py-2">{row.interaction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
