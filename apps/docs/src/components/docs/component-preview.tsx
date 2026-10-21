import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "fumadocs-ui/components/tabs";
import { platformLabel } from "../../lib/platform";
import { demos } from "./demos";
import { usePlatform } from "./platform-toggle";
import { PreviewSurface } from "./preview-surface";

/**
 * The component page preview: a live browser rendering and the native usage
 * side by side, exactly as shadcn/ui pairs Preview and Code.
 *
 * The rendering sits on a `PreviewSurface`, which carries the variables of the
 * platform theme the switch selected — the library's roles, not a docs style.
 */
export function ComponentPreview({ name }: { name: string }) {
  const demo = demos[name];
  if (demo === undefined) {
    throw new Error(`ComponentPreview: no demo named "${name}"`);
  }

  const { platform } = usePlatform();

  return (
    <div className="gx-component not-prose">
      <Tabs defaultValue="preview" className="gx-component-tabs">
        <div className="gx-component-bar">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent className="gx-component-panel" value="preview">
          <PreviewSurface>{demo.render()}</PreviewSurface>
        </TabsContent>
        <TabsContent
          className="gx-component-panel gx-component-code"
          value="code"
        >
          <DynamicCodeBlock lang="tsx" code={demo.source} />
        </TabsContent>
      </Tabs>
      <p className="gx-component-note">
        Browser preview: the geometry, palette and states of the native
        component, drawn in the {platformLabel(platform)} type style. The
        shipped component renders through GPUix, not the DOM.
      </p>
    </div>
  );
}
