import { components } from "@/component-meta/registry";
import {
  LIVE_SCENES,
  SCENE_GESTURE,
  SCENE_INTERACTION,
  SCENE_LABEL,
  SCENE_PAGE,
  type LiveScene,
  type SceneStep,
} from "../../preview/scene-contract";

/**
 * One shipped live scene: the page that mounts it, what a reader does to see
 * the documented state, and the words for the steps the smoke drives (plan
 * 582). The row logic lives here, not in the React table, so the search
 * document and the page read one list instead of two.
 */
export interface LiveSceneRow {
  readonly scene: LiveScene;
  readonly title: string;
  readonly href: string | null;
  readonly kind: "record" | "composed";
  readonly interaction: string;
  readonly gesture: string;
}

const interactionFor = (scene: LiveScene): string =>
  SCENE_GESTURE[scene] === undefined
    ? "Mounts in the state it documents."
    : (SCENE_INTERACTION[scene] ?? "Opened by a real gesture.");

/**
 * The reader's words for one automation step; never a second prose table.
 *
 * A native switch is deliberate: the docs bundle must not import `effect`
 * (`architecture.test.ts`). It is exhaustive over `SceneStep` and has no
 * default, so a new step kind is a compile error.
 */
const stepWords = (step: SceneStep): string => {
  switch (step.kind) {
    case "hover":
      return "hover";
    case "click":
      return step.button === 2 ? "right click" : "click";
    case "click-text":
      return "click";
    case "fill":
      return "type";
    case "press":
      return `press ${step.keys}`;
    case "wheel":
      // COMPONENTS.md records that a positive deltaY scrolls up.
      return step.deltaY > 0 ? "wheel up" : "wheel down";
  }
};

const gestureFor = (scene: LiveScene): string =>
  (SCENE_GESTURE[scene] ?? []).map(stepWords).join(" ");

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
        gesture: gestureFor(scene),
      };
    }

    const label = SCENE_LABEL.find((entry) => entry.scene === scene);
    return {
      scene,
      title: label?.title ?? scene,
      href: SCENE_PAGE[scene] ?? null,
      kind: "composed",
      interaction: interactionFor(scene),
      gesture: gestureFor(scene),
    };
  });
