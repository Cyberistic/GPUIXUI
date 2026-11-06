import { HighlightedCode } from "@/components/highlighted-code";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "fumadocs-ui/components/tabs";
import { demos } from "./demos";
import { PreviewSurface } from "./preview-surface";

export function ComponentPreview({ name }: { name: string }) {
  const demo = demos[name];
  if (demo === undefined) {
    throw new Error(`ComponentPreview: no demo named "${name}"`);
  }

  const Drawing = demo.render;

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
          <PreviewSurface>
            <Drawing />
          </PreviewSurface>
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
