# Conversations block — the three platform references

The block is one Messages-style window in three platform dresses. This file is
the reference the implementation and the visual passes are held to. The roles
are the library's; a literal below is the reference's own value, and the "role"
line is what ships so light and dark both work. The cast and copy are
**Hunter × Hunter**; only the skins change between variants.

## Shared anatomy

- A title bar, a body split into panes, and a composer.
- The left list: search, then conversation rows (avatar, name 600, 1–2 line
  grey preview, right timestamp), hairline separators, one selected row.
- The right thread: a contact header (avatar, name, "Online" with a green dot),
  incoming bubbles left, outgoing right, timestamps with a double tick, a photo,
  and a composer.
- No layout shift on state: the window keeps its height, the log scrolls, the
  list scrolls, the thread is dropped under 760px of viewport (list only).
- 330px list pane in every variant; the Windows and Linux variants add a 72px
  icon rail to its left.

## Conversation list (all variants, same order and times)

| Name | Preview | Time |
| --- | --- | --- |
| Gon Freecss | Gotcha covered! | Yesterday |
| Killua Zoldyck (selected) | Is your mind blown? 🤯 | Sunday |
| Leorio Paladiknight | Kurapika reacted ❤️ to “The auction is tonight!” | Sunday |
| Kurapika | Looking forward to Friday! | Sunday |
| Bisky Krueger | Now you've got me thinking about my next vacation | Sunday |
| Ging Freecss | Hope the little ones aren't tiring you out! | Saturday |
| Hisoka Morrow | See you tomorrow! 🃏 | Saturday |
| Knov | Cool… I'll be by just before 7 to drop off the cake 🎂 | Friday |

Contact header of the open thread: **Killua Zoldyck — Online**.

## The open thread (Killua)

1. out `Are we doing the Greed Island run or the Hunter exam prep?` — 10:24 AM
2. in `Oh! 🥹 I forgot you still have the card binder` — 10:26 AM
3. in `Let's stick with the exam prep for now`
4. out `Anytime, partner`
5. out `I found the perfect training spot for you to challenge the kids` — 10:27 AM
6. photo attachment, 4:3 rounded — captioned **“Greed Island, south shore”**
7. out `But only if you finish the 1000-piece Nen puzzle before returning it 😅` — 10:28 AM
8. in `Hmm. Maybe just a 500-piece one? 😂` — 10:29 AM
9. in `Or I can just put the Chimera Ants on one?` — 10:30 AM
10. out `Come by if you want them` — 10:31 AM, grey **Read** under it
11. in `Thanks for the cards!` — 10:32 AM

Outgoing timestamps sit at the right of the bubble with the blue double tick;
incoming timestamps sit under the bubble. The four outgoing times are 10:24,
10:27, 10:28 and 10:31; the four incoming times are 10:26, 10:29, 10:30 and
10:32.

## Secondary threads (for the switching test)

- **Gon Freecss**: `I found the card!` / `Meet at Heavens Arena at 6.`
- **Kurapika**: `The auction moved to Friday.` / `Bring the chain.`
- **Bisky**: `Training starts at dawn.` / `Don't be late.`
- Leorio, Ging, Hisoka and Knov open on the empty state.

## macOS — Messages

| Part | Reference | Role |
| --- | --- | --- |
| Window | white, 1px border, 12px radius, soft shadow | `--card`, `--border`, `--shadow` |
| Title bar | traffic lights `#FF5F57` `#FEBC2E` `#28C840`, top-left, no text | literals (the window controls) |
| List pane | `#F5F5F7` | `--muted` |
| Search | white, rounded, magnifier | `--card`, `--placeholder` |
| Selected row | filled `#3478F6`, white text | `--primary` / `--primary-foreground` |
| Incoming | `#E9E9EB`, left, 18px radius | `--secondary` / `--secondary-foreground` |
| Outgoing | green `#3DDC5A`, right, white text | `--success` / `--success-foreground` |
| Thread | white | `--card` |
| Composer | `+` circle, field "iMessage", waveform, smiley circle | `--secondary`, `--card` |

Chrome: sidebar toggle at the top-right of the **left** pane; compose at the
top-left of the **right** pane; video and phone at its top-right. The contact
header is a small pill, centred, with the online dot in `--success`.

## Windows — Fluent 2

| Part | Reference | Role |
| --- | --- | --- |
| Window | light `#F3F3F3`, 8px radius, `1px #E5E5E5` | `--muted`, `--border` |
| Title bar | `− □ ×` at the **right**, no title text | `--muted-foreground` |
| Icon rail | 72px; chat selected as a blue square, people, settings | `--primary` / `--primary-foreground` |
| List pane | 330px, white; separators `#EDEDED` | `--card`, `--border` |
| Search | `#F3F3F3`, 4px radius | `--muted` |
| Selected row | `#D6E4FF` light fill, dark text | `--selected` / `--foreground` |
| Thread | `#FAFAFA` | `--muted` |
| Incoming | `#EDEDED` | `--secondary` / `--secondary-foreground` |
| Outgoing | `#0078D4`, white text | `--primary` / `--primary-foreground` |
| Composer | `+`, "Type a message...", emoji, attach, blue circular send | `--primary` |

4px control corners, 8px window. Segoe UI (`"Segoe UI Variable", "Segoe UI"`).

## Linux — KDE Plasma Breeze dark

| Part | Reference | Role |
| --- | --- | --- |
| Window | `#1E1F2B`, 8px radius, `1px #2A2B36` | `--card`, `--border` |
| Title bar | macOS dots **left** and `− □ ×` **right** | literals, `--muted-foreground` |
| Icon rail | 72px `#23242F`, teal selected chat icon | `--muted`, `--success` |
| List pane | `#23242F`, rows teal `#1F4E5A`, white text | `--muted`, `--success-soft` / `--success-soft-foreground` |
| Thread | `#1A1B26` | `--background` |
| Incoming | `#2A2B36` | `--secondary` / `--secondary-foreground` |
| Outgoing | `#1D9BF0`, white text | `--info` / `--info-foreground` |
| Composer | `#23242F`, "Type a message...", `+`, emoji, attach, blue send | `--muted`, `--info` |

Cantarell / Ubuntu / Noto Sans. Grey timestamps and "Read".

## Ticks

The double tick is drawn in `--info` in every variant: blue reads as
"delivered" on macOS and Windows, and the Linux reference keeps the same blue.

## Landing

`deck.tsx` renders one `ConversationWindow` per platform card, with the macOS
and Windows cards on the light palette and the Linux card on the dark one. The
macOS card is the default block preview; the Windows and Linux cards are the
other two dresses.
