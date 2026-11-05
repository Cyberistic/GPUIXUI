import { useLocation } from "@tanstack/react-router";
import { HighlightedCode } from "@/components/highlighted-code";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "fumadocs-ui/components/tabs";
import {
  componentIdFromPath,
  nativeCaptureFrame,
  nativeCaptureOf,
  nativeExampleHref,
} from "@/lib/native-captures";
import { platformLabel } from "@/lib/platform";
import { usePlatform } from "./platform-toggle";
import { demos } from "./demos";
import { PreviewSurface } from "./preview-surface";

/**
 * The component page preview: a live browser rendering, the real native frame
 * rendered at build time, and the native usage, exactly as shadcn/ui pairs
 * Preview and Code.
 *
 * The rendering sits on a `PreviewSurface`, which carries the variables of the
 * platform theme the switch selected — the library's roles, not a docs style.
 * The Native tab appears only when `scripts/native-previews.ts` has a capture
 * for this page's component: it is the real GPUix tree painted by the wasm
 * renderer, not another drawing.
 */
export function ComponentPreview({ name }: { name: string }) {
  const demo = demos[name];
  if (demo === undefined) {
    throw new Error(`ComponentPreview: no demo named "${name}"`);
  }
  // The drawing is an element, never a call: `demo.render()` would run the
  // demo's hooks as this component's own, and the next page's demo would open
  // with a different hook list — the hook-order crash that used to take a
  // package page down until a refresh remounted it.
  const Drawing = demo.render;
  const { pathname } = useLocation();
  const component = componentIdFromPath(pathname);
  const capture =
    component === undefined ? undefined : nativeCaptureOf(component);
  const { platform, theme } = usePlatform();

  return (
    <div className="gx-component not-prose">
      <Tabs defaultValue="preview" className="gx-component-tabs">
        <div className="gx-component-bar">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
            {capture === undefined ? null : (
              <TabsTrigger value="native">Native</TabsTrigger>
            )}
          </TabsList>
        </div>
        <TabsContent className="gx-component-panel" value="preview">
          <PreviewSurface>
            <Drawing />
          </PreviewSurface>
        </TabsContent>
        {capture === undefined || component === undefined ? null : (
          <TabsContent className="gx-component-panel" value="native">
            <figure className="gx-native-capture">
              <img
                alt={`${name} rendered by the GPUix wasm renderer`}
                decoding="async"
                loading="lazy"
                src={capture}
              />
              <figcaption>
                {`A real GPUix frame, rendered at build time by the wasm build on ${platformLabel(nativeCaptureFrame.platform)}, ${nativeCaptureFrame.mode}. The still is one palette and one platform; `}
                <a href={nativeExampleHref(component, platform, theme.mode)}>
                  open the same scene live
                </a>
                {"."}
              </figcaption>
            </figure>
          </TabsContent>
        )}
        <TabsContent
          className="gx-component-panel gx-component-code"
          value="code"
        >
          <HighlightedCode lang="tsx" code={demo.source} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
