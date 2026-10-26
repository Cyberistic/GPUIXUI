import { HighlightedCode } from "@/components/highlighted-code";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "fumadocs-ui/components/tabs";
import { demos } from "./demos";
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
          <HighlightedCode lang="tsx" code={demo.source} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
