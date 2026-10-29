/**
 * Browser preview for the Input group page.
 *
 * The page's drawing is the row itself: one border, one ring, and the field
 * inside wearing none of its own. `:focus-within` stands in for the native
 * component's focus state — the browser is the only part approximated.
 */

import { BlockIcon } from "./block-icons";

export function InputGroupDemo() {
  return (
    <div className="gx-ig-scene">
      <label className="gx-ig-label" htmlFor="gx-ig-search">
        Search
      </label>
      <div className="gx-ig-group">
        {/* A field's leading glyph is the icon set's, at the size a field
            uses: the text character it replaced rendered at 14px in the
            page's own family and read as a punctuation mark. */}
        <span aria-hidden="true" className="gx-ig-addon">
          <BlockIcon name="search" size={16} />
        </span>
        <input
          className="gx-ig-input"
          id="gx-ig-search"
          placeholder="Search…"
          type="search"
        />
        <span className="gx-ig-addon gx-ig-addon-end">⌘K</span>
      </div>
      <p className="gx-ig-help">Files and people in this space.</p>

      <label className="gx-ig-label" htmlFor="gx-ig-site">
        Website
      </label>
      <div className="gx-ig-group">
        <span className="gx-ig-addon">https://</span>
        <input
          className="gx-ig-input"
          defaultValue="example.com"
          id="gx-ig-site"
          type="text"
        />
      </div>
    </div>
  );
}

export const inputGroupDemoSource = `import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@gpuixui/components/input-group";
import { Icon } from "@gpuixui/icons";

<InputGroup label="Search" description="Files and people in this space.">
  <InputGroupInput placeholder="Search…" />
  <InputGroupAddon align="inline-start">
    <Icon name="search" size="sm" />
  </InputGroupAddon>
  <InputGroupAddon align="inline-end">
    <InputGroupText>⌘K</InputGroupText>
  </InputGroupAddon>
</InputGroup>;

// A block addon takes its own line above the field.
<InputGroup label="Note">
  <InputGroupAddon align="block-start">
    <InputGroupText>Markdown</InputGroupText>
  </InputGroupAddon>
  <InputGroupTextarea minRows={3} />
</InputGroup>;`;
