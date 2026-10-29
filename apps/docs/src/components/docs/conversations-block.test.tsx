import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { blocks } from "./blocks";
import {
  ConversationWindow,
  ConversationsRender,
  ConversationsSurface,
  conversations,
  conversationsReducer,
  filterConversations,
  initialConversationsState,
  selectedConversation,
  type ConversationPlatform,
  type ConversationsState,
} from "./conversations-block";

/**
 * The conversations block, as it renders.
 *
 * Each platform dress carries one marker that a wrong skin would lose: the
 * outgoing bubble's role (green / blue / info-blue), the selected row's fill
 * and the composer's placeholder. Those are asserted in the markup and in the
 * sheet that paints them, because a component that quietly fell back to the
 * macOS green would still build. The state cases hold the three interactions —
 * select, send, search — to the reducer the surface dispatches to.
 */

const noop = () => {};

const render = (
  state: ConversationsState,
  platform: ConversationPlatform = "macos",
): string =>
  renderToStaticMarkup(
    <ConversationsSurface
      onSearch={noop}
      onSelect={noop}
      onSend={noop}
      onToggleRail={noop}
      platform={platform}
      state={state}
    />,
  );

const initial = render(initialConversationsState);

const selectedRow = (markup: string): string => {
  const start = markup.indexOf('data-selected="true"');
  return start === -1
    ? ""
    : markup.slice(start, markup.indexOf("</button>", start));
};

const count = (markup: string, pattern: RegExp): number =>
  markup.match(pattern)?.length ?? 0;

const css = readFileSync(
  fileURLToPath(new URL("../../styles/blocks.css", import.meta.url)),
  "utf8",
);

/** One authored rule block, from its selector to its first closing brace. */
const rule = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

const variants: ReadonlyArray<{
  readonly platform: ConversationPlatform;
  readonly tone: string;
  readonly placeholder: string;
  readonly rail: boolean;
  readonly lights: boolean;
  readonly wincontrols: boolean;
}> = [
  {
    platform: "macos",
    tone: "success",
    placeholder: "iMessage",
    rail: false,
    lights: true,
    wincontrols: false,
  },
  {
    platform: "windows",
    tone: "primary",
    placeholder: "Type a message...",
    rail: true,
    lights: false,
    wincontrols: true,
  },
  {
    platform: "linux",
    tone: "info",
    placeholder: "Type a message...",
    rail: true,
    lights: false,
    wincontrols: true,
  },
  {
    platform: "omarchy",
    tone: "primary",
    placeholder: "Type a message...",
    rail: true,
    lights: false,
    wincontrols: true,
  },
];

describe("the conversations window", () => {
  it("draws one Messages window: lights, search, list, thread and composer", () => {
    expect(initial).toContain('class="gx-conv"');
    expect(initial).toContain('data-platform="macos"');
    expect(initial).toContain('class="gx-conv-lights"');
    expect(count(initial, /<i><\/i>/g)).toBe(3);
    expect(initial).toContain('placeholder="Search"');
    expect(initial).toContain('class="gx-conv-list"');
    expect(initial).toContain('class="gx-conv-log"');
    expect(initial).toContain('placeholder="iMessage"');
    expect(initial).toContain('aria-label="Collapse sidebar"');
    expect(initial).toContain('aria-expanded="true"');
    expect(initial).toContain('aria-label="New message"');
    expect(initial).toContain('aria-label="Start video call"');
    expect(initial).toContain('aria-label="Start voice call"');
  });

  it("draws the list pane as a titled conversation list with one open row", () => {
    expect(initial).toContain('class="gx-conv-side-top"');
    expect(initial).toContain(">Messages<");
    expect(initial).toContain('class="gx-conv-group gx-rail-label"');
    expect(initial).toContain('class="gx-conv-row-text gx-rail-label"');
    expect(count(initial, /data-selected="true"/g)).toBe(1);
  });

  it("lists the eight Hunter × Hunter conversations with previews and times", () => {
    expect(count(initial, /class="gx-conv-row"/g)).toBe(8);
    for (const name of [
      "Gon Freecss",
      "Killua Zoldyck",
      "Leorio Paladiknight",
      "Kurapika",
      "Bisky Krueger",
      "Ging Freecss",
      "Hisoka Morrow",
      "Knov",
    ]) {
      expect(initial).toContain(name);
    }
    expect(initial).toContain("Gotcha covered!");
    expect(initial).toContain("Is your mind blown? 🤯");
    expect(initial).toContain("drop off the cake 🎂");
    expect(initial).toContain("auction is tonight");
    expect(initial).toContain(">Yesterday<");
    expect(initial).toContain(">Friday<");
    expect(count(initial, />Sunday</g)).toBe(4);
    expect(count(initial, />Saturday</g)).toBe(2);
  });

  it("fills Killua's row and opens Killua's thread", () => {
    expect(count(initial, /data-selected="true"/g)).toBe(1);
    expect(count(initial, /aria-current="true"/g)).toBe(1);
    const selected = selectedRow(initial);
    expect(selected).toContain("Killua Zoldyck");
    expect(selected).not.toContain("Gon Freecss");
    expect(selected).toContain("KZ");
    expect(initial).toContain('aria-label="Conversation with Killua Zoldyck"');
    expect(initial).toContain('class="gx-conv-contact-name">Killua Zoldyck<');
    expect(initial).toContain(">Online<");
  });

  it("shows both sides of Killua's thread with times, ticks and the receipt", () => {
    expect(initial).toContain("Are we doing the Greed Island run");
    expect(initial).toContain("I forgot you still have the card binder");
    expect(initial).toContain("Anytime, partner");
    expect(initial).toContain(
      "But only if you finish the 1000-piece Nen puzzle",
    );
    expect(initial).toContain("Maybe just a 500-piece one?");
    expect(initial).toContain("Thanks for the cards!");
    expect(count(initial, /class="gx-conv-bubble"/g)).toBe(10);
    expect(count(initial, /class="gx-conv-bubble" data-mine="true"/g)).toBe(5);
    expect(count(initial, /class="gx-conv-bubble" data-mine="false"/g)).toBe(5);
    expect(count(initial, /class="gx-conv-attach"/g)).toBe(1);
    expect(initial).toContain(
      'aria-label="Attachment: Greed Island, south shore"',
    );
    expect(count(initial, /class="gx-conv-read">Read</g)).toBe(1);
    expect(count(initial, /class="gx-conv-meta"/g)).toBe(8);
    expect(count(initial, /class="gx-conv-ticks"/g)).toBe(4);
    for (const time of [
      "10:24 AM",
      "10:27 AM",
      "10:28 AM",
      "10:31 AM",
      "10:26 AM",
      "10:29 AM",
      "10:30 AM",
      "10:32 AM",
    ]) {
      expect(initial).toContain(time);
    }
  });
});

describe("the four platform dresses", () => {
  it.each(variants)(
    "renders $platform with its own $tone outgoing bubbles",
    ({ platform, tone, placeholder, rail, lights, wincontrols }) => {
      const markup = render(initialConversationsState, platform);
      expect(markup).toContain(`data-platform="${platform}"`);
      expect(count(markup, new RegExp(`data-tone="${tone}"`, "g"))).toBe(5);
      expect(markup).toContain(`placeholder="${placeholder}"`);
      expect(markup.includes('class="gx-conv-rail"')).toBe(rail);
      expect(markup.includes('class="gx-conv-lights"')).toBe(lights);
      expect(markup.includes('class="gx-conv-wincontrols"')).toBe(wincontrols);
      expect(markup).toContain('aria-label="Collapse sidebar"');
    },
  );

  it("gives every dress the same actions, only restyled", () => {
    const actions = [
      "New message",
      "Start video call",
      "Start voice call",
      "Send with an emoji",
      "Attach a file",
      "Send message",
    ];
    for (const { platform } of variants) {
      const markup = render(initialConversationsState, platform);
      for (const action of actions) {
        expect(markup, `${platform} lacks ${action}`).toContain(
          `aria-label="${action}"`,
        );
      }
      expect(markup).not.toContain('aria-label="Record an audio message"');
    }
  });

  it("paints each outgoing role from the sheet, not a literal", () => {
    const roles = {
      macos: "success",
      windows: "primary",
      linux: "info",
      omarchy: "primary",
    };
    for (const { platform, tone } of variants) {
      const bubble = rule(`.gx-conv-bubble[data-tone="${tone}"]`);
      expect(bubble).toContain(`background: var(--${roles[platform]})`);
      expect(bubble).toContain(`color: var(--${roles[platform]}-foreground)`);
    }
  });

  it("fills the selected row with each platform's own role", () => {
    expect(rule(".gx-conv-side")).toContain("width: 330px");
    expect(css.indexOf('.gx-conv-row[data-selected="true"],')).toBeGreaterThan(
      -1,
    );
    expect(css).toContain("background: var(--primary)");
    const windows = css.slice(
      css.indexOf(
        '.gx-conv[data-platform="windows"] .gx-conv-row[data-selected="true"]',
      ),
    );
    expect(windows.slice(0, windows.indexOf("\n}\n"))).toContain(
      "background: var(--selected)",
    );
    const linux = css.slice(
      css.indexOf(
        '.gx-conv[data-platform="linux"] .gx-conv-row[data-selected="true"]',
      ),
    );
    expect(linux.slice(0, linux.indexOf("\n}\n"))).toContain(
      "background: var(--success-soft)",
    );
  });

  it("gives every dress the same send control, in its own role", () => {
    expect(rule(".gx-conv-send")).toContain("background: var(--primary)");
    expect(rule('.gx-conv[data-platform="linux"] .gx-conv-send')).toContain(
      "background: var(--info)",
    );
  });

  it("keeps the geometry: a 72px rail, a 540px window and the 760px drop", () => {
    expect(rule(".gx-conv")).toContain("height: 540px");
    expect(rule(".gx-conv")).toContain("max-width: 100%");
    expect(rule(".gx-conv-rail")).toContain("width: 72px");
    expect(rule(".gx-conv-lights i:nth-child(1)").toLowerCase()).toContain(
      "#ff5f57",
    );
    expect(rule(".gx-conv-lights i:nth-child(2)").toLowerCase()).toContain(
      "#febc2e",
    );
    expect(rule(".gx-conv-lights i:nth-child(3)").toLowerCase()).toContain(
      "#28c840",
    );
    const start = css.indexOf("---- conversations");
    const section = css.slice(start, css.indexOf("/* ----", start + 10));
    const media = section.slice(
      section.lastIndexOf("@media (max-width: 760px)"),
    );
    const narrow = media.slice(0, media.indexOf("\n}\n"));
    expect(narrow).toContain(".gx-conv-thread");
    expect(narrow).toContain("display: none");
  });
});

describe("the conversations' state", () => {
  it("folds the list pane away whole and expands it again", () => {
    // The bug this guards: collapsing painted a 64px column of avatars with no
    // names — a broken column, not a conversation list. The pane now folds to
    // zero width and the thread header's toggle brings it back.
    const collapsed = conversationsReducer(initialConversationsState, {
      type: "toggle-rail",
    });
    const markup = render(collapsed);

    expect(collapsed.railCollapsed).toBe(true);
    expect(markup).toContain('data-collapsed="true"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-label="Expand sidebar"');
    expect(markup).toContain("gx-conv-row-text gx-rail-label");
    expect(rule('.gx-conv-side[data-collapsed="true"]')).toContain("width: 0");
    expect(
      conversationsReducer(collapsed, { type: "toggle-rail" }).railCollapsed,
    ).toBe(false);
  });

  it("swaps the thread to the clicked conversation", () => {
    const gon = render({ ...initialConversationsState, selectedId: "gon" });
    expect(gon).toContain('aria-label="Conversation with Gon Freecss"');
    expect(gon).toContain("I found the card!");
    expect(gon).toContain("Meet at Heavens Arena at 6.");
    expect(gon).not.toContain("Greed Island run");
    expect(count(gon, /class="gx-conv-bubble"/g)).toBe(2);
    expect(selectedRow(gon)).toContain("Gon Freecss");
  });

  it("opens a short thread for Kurapika and Bisky too", () => {
    const kurapika = render({
      ...initialConversationsState,
      selectedId: "kurapika",
    });
    expect(kurapika).toContain("Bring the chain.");
    const bisky = render({ ...initialConversationsState, selectedId: "bisky" });
    expect(bisky).toContain("Training starts at dawn.");
    expect(bisky).toContain("be late.");
  });

  it("opens an empty state for a conversation with no thread", () => {
    const knov = render({ ...initialConversationsState, selectedId: "knov" });
    expect(knov).toContain("No messages with Knov yet. Say hello.");
    expect(count(knov, /class="gx-conv-bubble"/g)).toBe(0);
    expect(knov).toContain('placeholder="iMessage"');
  });

  it("falls back to the sample thread for an unknown selection", () => {
    expect(
      selectedConversation({ ...initialConversationsState, selectedId: "gone" })
        .name,
    ).toBe("Killua Zoldyck");
  });

  it("appends one outgoing bubble to the open thread and trims it", () => {
    const sent = conversationsReducer(initialConversationsState, {
      type: "send",
      text: "  On my way  ",
    });
    const open = selectedConversation(sent);
    expect(open.messages).toHaveLength(
      selectedConversation(initialConversationsState).messages.length + 1,
    );
    expect(open.messages[open.messages.length - 1]).toMatchObject({
      mine: true,
      text: "On my way",
    });
    expect(
      sent.threads.find((thread) => thread.id === "gon")?.messages,
    ).toHaveLength(2);
  });

  it("sends to the selected thread, not to the sample", () => {
    const selected = conversationsReducer(initialConversationsState, {
      type: "select",
      id: "gon",
    });
    const sent = conversationsReducer(selected, {
      type: "send",
      text: "On my way",
    });
    expect(
      sent.threads.find((thread) => thread.id === "gon")?.messages,
    ).toHaveLength(3);
    expect(
      sent.threads.find((thread) => thread.id === "killua")?.messages,
    ).toHaveLength(11);
  });

  it("treats an empty send as no state change", () => {
    expect(
      conversationsReducer(initialConversationsState, {
        type: "send",
        text: "   ",
      }),
    ).toBe(initialConversationsState);
  });
});

describe("the conversations' search", () => {
  it("filters by name or preview, case-insensitively", () => {
    expect(
      filterConversations(conversations, "REACTED").map((thread) => thread.id),
    ).toEqual(["leorio"]);
    expect(
      filterConversations(conversations, "bisky").map((thread) => thread.id),
    ).toEqual(["bisky"]);
    expect(filterConversations(conversations, "vacation")).toHaveLength(1);
  });

  it("leaves the list whole for a blank query and empty for no match", () => {
    expect(filterConversations(conversations, "   ")).toHaveLength(8);
    expect(filterConversations(conversations, "zebra")).toEqual([]);
  });

  it("renders only the matching rows, or says there are none", () => {
    const gon = render({ ...initialConversationsState, query: "gon" });
    expect(count(gon, /class="gx-conv-row"/g)).toBe(1);
    const list = gon.slice(
      gon.indexOf('class="gx-conv-list"'),
      gon.indexOf("</aside>"),
    );
    expect(list).toContain("Gon Freecss");
    expect(list).not.toContain("Killua Zoldyck");

    const none = render({ ...initialConversationsState, query: "zebra" });
    expect(count(none, /class="gx-conv-row"/g)).toBe(0);
    expect(none).toContain("No conversations");
  });
});

describe("the conversations block registration", () => {
  it("mounts this window from the registry the index reads", () => {
    const entry = blocks["conversations-01"];
    expect(entry?.slug).toBe("conversations");
    const Render = entry?.render;
    expect(
      Render === undefined ? "" : renderToStaticMarkup(createElement(Render)),
    ).toContain('class="gx-conv"');
  });

  it("renders interactively from its own state", () => {
    expect(renderToStaticMarkup(<ConversationsRender />)).toContain(
      'class="gx-conv-log"',
    );
    expect(
      renderToStaticMarkup(<ConversationWindow platform="linux" />),
    ).toContain('data-platform="linux"');
  });
});
