import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  bobThread,
  EmailInboxRender,
  EmailInboxSurface,
  type InboxState,
  inboxMessages,
  inboxReducer,
  initialInboxState,
  messagesInTab,
  selectedMail,
} from "./email-inbox-block";

/**
 * The mail client block's rendered states.
 *
 * The two filters are the block's interaction: the selected message fills the
 * reading pane and the active tab decides which rows exist. A pane that kept
 * showing Bob's thread after a row click, or a tab that listed every category,
 * would still build — so both are asserted against the markup at a chosen
 * state rather than against the default only.
 */

const noop = () => {};

const render = (state: InboxState): string =>
  renderToStaticMarkup(
    <EmailInboxSurface
      onSelectMessage={noop}
      onSelectTab={noop}
      onToggleRail={noop}
      state={state}
    />,
  );

const pane = (markup: string, marker: string, close: string): string => {
  const start = markup.indexOf(marker);
  return start === -1 ? "" : markup.slice(start, markup.indexOf(close, start));
};

const initial = render(initialInboxState);

describe("the email inbox preview", () => {
  it("renders the four panes and the folder rail's counts", () => {
    expect(initial).toContain('class="gx-mail-side"');
    expect(initial).toContain('class="gx-mail-list"');
    expect(initial).toContain('class="gx-mail-read"');
    expect(initial).toContain('class="gx-mail-contact"');
    expect(initial).toContain("All Inboxes");
    expect(initial).toContain(">768<");
    expect(initial).toContain("Gon - Work");
    expect(initial).toContain("Gon - Personal");
    expect(initial).toContain("Local Folders");
  });

  it("carries the whole toolbar and the three tabs", () => {
    for (const action of [
      "Reply",
      "Reply All",
      "Forward",
      "Mark",
      "Archive",
      "Snooze",
      "Quick actions",
      "Delete",
    ]) {
      expect(initial).toContain(`>${action}</button>`);
    }
    expect(initial.match(/role="tab"/g)).toHaveLength(5);
    expect(initial.match(/class="gx-mail-tab"/g)).toHaveLength(3);
    expect(initial).toContain('aria-selected="true"');
    expect(initial).toContain(">Primary<");
    expect(initial).toContain(">Promotions<");
    expect(initial).toContain(">Social<");
  });

  it("lists the Primary rows with their metadata", () => {
    expect(initial.match(/class="gx-mail-row"/g)).toHaveLength(7);
    for (const sender of [
      "Hunter Association",
      "Kurapika",
      "Ging Freecss",
      "Leorio Paladiknight",
      "Chimera Ant Research",
      "Yorknew Times",
    ]) {
      expect(initial).toContain(sender);
    }
    expect(initial).toContain("Welcome to the Hunter Association");
    expect(initial).toContain("10/10/2024");
    expect(initial).toContain('data-icon="paperclip"');
    expect(initial).toContain('data-icon="flag"');
    expect(initial.match(/data-on="true"/g)).toHaveLength(2);
  });

  it("keeps the Promotion row for the Promotions tab", () => {
    expect(initial).not.toContain("Ticket presale opens tonight");
    const promotions = render({ ...initialInboxState, tab: "promotions" });
    expect(promotions.match(/class="gx-mail-row"/g)).toHaveLength(1);
    expect(promotions).toContain("Heavens Arena");
    expect(promotions).toContain("Ticket presale opens tonight");
    expect(promotions).toContain(">Promotion<");
  });

  it("says an empty tab is empty instead of painting a blank list", () => {
    const social = render({ ...initialInboxState, tab: "social" });
    expect(social.match(/class="gx-mail-row"/g)).toBeNull();
    expect(social).toContain("No messages in Social.");
  });

  it("opens Bob's thread by default", () => {
    const read = pane(
      initial,
      'class="gx-mail-read"',
      'class="gx-mail-contact"',
    );
    expect(read).toContain("Long time no see!");
    expect(read).toContain("Killua Zoldyck");
    expect(read).toContain("gon@hunterassociation.org");
    expect(read).toContain("About our picnic");
    expect(read).toContain("Reply to Killua Zoldyck");
  });

  it("repaints the reading pane with the selected message", () => {
    const vox = render({ ...initialInboxState, selectedId: "vox-pride" });
    const read = pane(vox, 'class="gx-mail-read"', 'class="gx-mail-contact"');
    expect(read).toContain("A note from the Dark Continent");
    expect(read).toContain("Ging Freecss");
    expect(read).toContain("brands borrowed the language of Pride");
    expect(read).not.toContain("Long time no see!");
    expect(
      selectedMail({ ...initialInboxState, selectedId: "vox-pride" }).sender,
    ).toBe("Ging Freecss");
  });

  it("carries the sender card, its tabs and the older threads", () => {
    const contact = pane(initial, 'class="gx-mail-contact"', "</aside>");
    expect(contact).toContain("Contact Details");
    expect(contact).toContain("Killua Zoldyck");
    expect(contact).toContain(">Mail<");
    expect(contact).toContain(">Phone<");
    expect(contact).toContain(">History<");
    expect(contact).toContain(">Attachments<");
    expect(contact).toContain(">Older<");
    expect(contact).toContain("Picnic playlist");
  });
});

describe("the inbox filters", () => {
  it("splits the eight messages into the tabs without losing one", () => {
    const primary = messagesInTab("primary");
    const promotions = messagesInTab("promotions");
    expect(primary).toHaveLength(7);
    expect(promotions).toHaveLength(1);
    expect(messagesInTab("social")).toHaveLength(0);
    expect(primary.length + promotions.length).toBe(inboxMessages.length);
    expect(promotions.map((message) => message.sender)).toEqual([
      "Heavens Arena",
    ]);
  });

  it("moves the selected message and the tab independently", () => {
    const selected = inboxReducer(initialInboxState, {
      type: "select-message",
      id: "cristine",
    });
    expect(selected.selectedId).toBe("cristine");
    expect(selected.tab).toBe("primary");
    expect(selectedMail(selected).subject).toBe("Invitation: Yorknew auction");

    expect(
      inboxReducer(initialInboxState, { type: "select-tab", tab: "social" })
        .tab,
    ).toBe("social");
  });

  it("falls back to the open thread for an unknown id", () => {
    expect(selectedMail({ ...initialInboxState, selectedId: "missing" })).toBe(
      bobThread,
    );
  });

  it("collapses the folder rail to icons and expands it again", () => {
    const collapsed = inboxReducer(initialInboxState, {
      type: "toggle-rail",
    });
    const markup = render(collapsed);

    expect(collapsed.railCollapsed).toBe(true);
    expect(markup).toContain('data-collapsed="true"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-label="Expand sidebar"');
    expect(markup).toContain('aria-label="Inbox"');
    expect(markup).toContain("gx-mail-folder-label gx-rail-label");
  });
});

describe("the email inbox block registration", () => {
  it("renders interactively from its own state", () => {
    expect(renderToStaticMarkup(<EmailInboxRender />)).toContain("gx-mail-row");
  });
});
