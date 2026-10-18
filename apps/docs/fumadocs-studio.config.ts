import { defineConfig } from "@fumadocs-editor/studio";
import { admonitionSpec, fumadocsUiComponents } from "@fumadocs-editor/ui";

/**
 * Authoring only: `nub run --filter docs studio`.
 * The docs reader is the Fumadocs app; this opens its MDX files in Studio.
 * This site's own MDX components are not registered as specs yet, so Studio
 * keeps them verbatim and edits their source in place (README §Authoring).
 */
export default defineConfig({
  root: "content/docs",
  components: [...fumadocsUiComponents, admonitionSpec],
  theme: "system",
});
