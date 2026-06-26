# 05 — Pro Social (Messaging · Reactions · Polls)

Domain: Jetonomy **Pro** extensions `private-messaging`, `reactions`, `polls`. All routes live under the **same** `jetonomy/v1` namespace as free and go through the foundation `client` (Basic auth, no nonces — see 01). Every screen/component/hook here is **gated** and renders `null` / is unmounted when its flag is off:

- `useFeatures().features.messaging` → Messages tab + all `app/conversation/*`
- `useFeatures().features.reactions` → `ReactionBar` + `ReactionPicker`
- `useFeatures().features.polls` → `PollView`

> `useFeatures()` is the foundation accessor over `useAppConfig().features` (the same object the Content stubs in `02` already check). One source of truth; no second probe.

---

## Ground truth vs manifest (READ FIRST)

Contracts below are transcribed from the **registered `register_rest_route` calls** in each `class-extension.php` (the routes the running plugin actually serves). The Pro `audit/manifest.json` is **stale** for these three extensions and must NOT be coded against:

| manifest says (WRONG) | code actually serves (USE THIS) |
|---|---|
| `POST /reactions`, `GET /reactions` | `POST/GET /posts/{id}/reactions`, `POST/GET /replies/{id}/reactions` |
| `POST /polls`, `GET /polls/{id}`, `POST /polls/{id}/votes` | `POST/GET /posts/{post_id}/poll`, `POST/DELETE /polls/{id}/vote`, `PATCH /polls/{id}` |

Action item (not app work): refresh `jetonomy-pro/audit/manifest.json` rest block to match the extensions. Flagged, not fixed here.

---

## Endpoint inventory (registered routes, all `jetonomy/v1`)

**Messaging** (`Private_Messaging::*`, all require login; mutations use `REST_Auth::auth_mutation('read')`):
- `GET  /conversations` — args `limit`(1–100,def 20), `offset`, `filter`(`active`|`archived`,def `active`) → `rest_list_conversations`
- `POST /conversations` — body `recipient_ids:int[]`(req), `message:string`(req), `title:string` → `rest_create_conversation`
- `GET  /conversations/{id}` → `rest_get_conversation`
- `PATCH /conversations/{id}` — `is_muted:bool` → `rest_update_conversation`
- `GET  /conversations/{id}/messages` — `before:int`(message-id cursor, def 0), `limit`(1–100,def 30) → `rest_get_messages`
- `POST /conversations/{id}/messages` — `content:string`(req) → `rest_send_message`
- `GET  /conversations/unread-count` → `rest_unread_count`
- `GET  /messaging/recipient-suggestions` — `q:string`(req, min 3 / max 64 chars) → `rest_recipient_suggestions`
- `POST /conversations/{id}/mute` — `muted:bool` → `rest_mute_conversation`
- `POST /conversations/{id}/archive` — `archived:bool` → `rest_archive_conversation`
- `POST /conversations/{id}/leave` → `rest_leave_conversation`
- `POST /conversations/{id}/block` — `blocked:bool` → `rest_block_conversation`

**Reactions** (`Reactions::*`; POST needs `auth_mutation('jetonomy_vote')`, GET is public `__return_true`). The POST is a **toggle** — one endpoint covers both add & remove; server decides from current state and returns `action`:
- `POST /posts/{id}/reactions` — `emoji:string`(req, a **slug**) → `toggle_reaction`
- `GET  /posts/{id}/reactions` → `get_post_reactions`
- `POST /replies/{id}/reactions` — `emoji:string`(req) → `toggle_reply_reaction`
- `GET  /replies/{id}/reactions` → `get_reply_reactions`

**Polls** (`Polls::*`; GET public, mutations `auth_mutation('read')`). Every mutation returns `{ data: Poll }`:
- `POST /posts/{post_id}/poll` — `question`(req), `type`(`single`|`multiple`,def `single`), `options:string[]`(req), `closes_at:string` → `create_poll` (201)
- `GET  /posts/{post_id}/poll` → `get_poll` (404 `jetonomy_not_found` if none)
- `POST /polls/{id}/vote` — `option_id:int` (single) **or** `option_ids:int[]` (multiple) → `vote`
- `DELETE /polls/{id}/vote` → `unvote`
- `PATCH /polls/{id}` — `closes_at:string` → `update_poll` (close/reopen)

---

## types/ (fields transcribed from the PHP formatters — exact JSON)

### types/conversation.ts
From `format_conversation()` + `get_participants()`.
```ts
export type ConversationType = 'direct' | 'group';

export interface Participant {
  user_id: number;
  display_name: string;
  avatar: string;          // 40px get_avatar_url
  last_read_at: string | null;
  is_muted: boolean;
  is_archived: boolean;
  left_at: string | null;
  is_blocked: boolean;     // server stores block on the OTHER row
  joined_at: string;
}

export interface Conversation {
  id: number;
  title: string;           // for 'direct' w/o title server fills the other person's name
  type: ConversationType;
  created_by: number;
  participants: Participant[];
  last_message_at: string | null;
  last_message_preview: string | null;
  message_count: number;
  unread: boolean;         // derived server-side vs my last_read_at
  is_muted: boolean;       // MY participant row
  is_archived: boolean;    // MY participant row
  left_at: string | null;  // MY participant row
  is_blocked: boolean;     // did *I* block the other side (direct only)
  created_at: string;
}

// GET /messaging/recipient-suggestions row (NOT PublicUser — own shape)
export interface RecipientSuggestion {
  id: number;
  user_login: string;
  display_name: string;
  avatar_url: string;      // 32px
}
```

### types/message.ts
From `format_message()`.
```ts
export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;     // 'Deleted User' fallback
  sender_avatar: string;   // 40px
  content: string;         // rendered HTML -> ContentBody / utils/html
  content_plain: string;
  is_system: boolean;      // join/leave/system notices -> render centered, no bubble
  created_at: string;      // ISO
  created_at_human: string;// pre-localised time_format string
}
```

### types/reaction.ts
From `REACTIONS` const + `get_reaction_data()` + toggle response. Note `emoji` is a **slug**, not a unicode char; the char/Fluent-SVG is a server render concern — RN maps slug→char locally.
```ts
export type ReactionSlug =
  | 'thumbsup' | 'heart' | 'laugh' | 'hooray'
  | 'thinking' | 'eyes' | 'rocket' | 'thumbsdown';

export const REACTION_EMOJI: Record<ReactionSlug, string> = {
  thumbsup: '👍', heart: '❤️', laugh: '😂', hooray: '🎉',
  thinking: '🤔', eyes: '👀', rocket: '🚀', thumbsdown: '👎',
};

export type ReactionCounts = Partial<Record<ReactionSlug, number>>;

export interface ReactionData {           // GET response
  counts: ReactionCounts;                 // only slugs with >0 present
  user_reactions: ReactionSlug[];         // slugs the caller has toggled on
}
export interface ReactionToggleResponse extends ReactionData { // POST response
  action: 'added' | 'removed';
  emoji: ReactionSlug;
}
```
> The set of *offerable* slugs is server-configurable (`get_enabled_emojis()` → option, default all 8). The app has no endpoint for it; render the picker from the full 8 and let the server 400 a disabled slug (rare; admins rarely prune). Counts/`user_reactions` always reflect server truth.

### types/poll.ts
From `build_poll_data()`. Every poll response is enveloped `{ data: Poll }`.
```ts
export interface PollOption {
  id: number;
  label: string;
  vote_count: number;
  percentage: number;      // 0–100, 1dp, computed over total_votes
}
export interface Poll {
  id: number;
  post_id: number;
  question: string;
  type: 'single' | 'multiple';
  allow_other: boolean;
  closes_at: string | null;
  closed: boolean;         // server is_closed() (manual or past closes_at)
  created_by: number;
  created_at: string;
  total_voters: number;    // distinct users
  total_votes: number;     // sum of option vote_count (>voters for multiple)
  options: PollOption[];
  user_votes: number[];    // option_ids the caller voted for
}
export interface PollEnvelope { data: Poll }
```

---

## api/ (thin wrappers over foundation `client`; throw `ApiError` via `toApiError`)

### api/conversations.ts
```ts
listConversations(p:{limit?:number;offset?:number;filter?:'active'|'archived'}): Promise<Conversation[]>   // GET /conversations
getConversation(id:number): Promise<Conversation>                                                          // GET /conversations/{id}
createConversation(b:{recipient_ids:number[];message:string;title?:string}): Promise<Conversation>         // POST /conversations
listMessages(id:number,p:{before?:number;limit?:number}): Promise<Message[]>                               // GET /conversations/{id}/messages
sendMessage(id:number,content:string): Promise<Message>                                                     // POST /conversations/{id}/messages
setMuted(id:number,muted:boolean): Promise<Conversation>          // POST /conversations/{id}/mute  (PATCH is_muted is the dup; prefer the action route — returns full convo)
archive(id:number,archived:boolean): Promise<Conversation>       // POST /conversations/{id}/archive
leave(id:number): Promise<Conversation>                          // POST /conversations/{id}/leave
block(id:number,blocked:boolean): Promise<Conversation>          // POST /conversations/{id}/block
unreadCount(): Promise<number>                                   // GET /conversations/unread-count
recipientSuggestions(q:string): Promise<RecipientSuggestion[]>   // GET /messaging/recipient-suggestions  (caller enforces q.length>=3)
```
All four action routes (mute/archive/leave/block) return the **freshly formatted Conversation** — write straight back into cache, no refetch.

### api/reactions.ts
```ts
listPostReactions(postId:number): Promise<ReactionData>          // GET  /posts/{id}/reactions
togglePostReaction(postId:number,emoji:ReactionSlug): Promise<ReactionToggleResponse>   // POST /posts/{id}/reactions
listReplyReactions(replyId:number): Promise<ReactionData>        // GET  /replies/{id}/reactions
toggleReplyReaction(replyId:number,emoji:ReactionSlug): Promise<ReactionToggleResponse> // POST /replies/{id}/reactions
```
> Spec's `add`/`remove` both resolve to the **single toggle** POST — there is no distinct remove route. `useReactions` calls toggle and trusts `action` in the response to reconcile.

### api/polls.ts
```ts
getPollForPost(postId:number): Promise<Poll|null>   // GET /posts/{post_id}/poll  (404 -> null, NOT an error)
vote(pollId:number,sel:{option_id?:number;option_ids?:number[]}): Promise<Poll>   // POST   /polls/{id}/vote -> unwrap .data
removeVote(pollId:number): Promise<Poll>            // DELETE /polls/{id}/vote -> .data
closePoll(pollId:number,closes_at:string): Promise<Poll>  // PATCH /polls/{id} -> .data (author menu only)
createPoll(...)                                     // n/a in app v1 — see coverage table
```

---

## hooks/

### hooks/useConversations.ts  (gated `features.messaging`)
- `useConversationList(filter)` — React Query infinite list over `listConversations` (`offset += limit`; `pageSize 20`). Exposes `active`/`archived` via `filter`. `staleTime` short; **poll** `refetchInterval` ~30s while Messages tab focused.
- `useConversationThread(id)` — `getConversation(id)` (header/participants) + **infinite** `listMessages(id,{before})` keyed by oldest loaded `message.id` (cursor = `before`). New-message **poll**: `refetchInterval` ~10s while thread focused, merging only `id > newestLoaded`. Marks read implicitly (server advances `last_read_at` on `getMessages`).
- `useUnreadCount()` — `unreadCount()` polled ~30s; drives the tab badge. Single source for badge so list + tab don't double-count.
- Mutations: `useSendMessage(id)` (optimistic, below), `useArchive/useMute/useLeave/useBlock` — all write the returned Conversation back into list + detail caches; handle concurrent "already left/blocked" by reconciling to server response.

### hooks/useReactions.ts  (gated `features.reactions`)
- `useReactions(target:{kind:'post'|'reply';id:number}, seed?:ReactionData)` — seeds from `Post.reactions`/`Reply.reactions` if Content already inlined them (narrows the `unknown` seam), else lazy `list*Reactions`.
- `toggle(slug)` — **optimistic**: flip presence in `user_reactions`, ±1 in `counts` (drop key at 0), fire toggle POST, reconcile to `ReactionToggleResponse`, rollback + toast on error. De-dupe rapid taps per slug (in-flight guard).

### hooks/usePoll.ts  (gated `features.polls`)
- `usePoll(postId, seed?)` — seeds from `Post.poll` seam or `getPollForPost`.
- `vote(optionId)` — **optimistic**: `single` replaces prior `user_votes` (decrement old option, increment new); `multiple` toggles the option; recompute `percentage` from local `total_votes`; POST then reconcile to `.data`; rollback on error. Blocked when `closed`.
- `removeVote()` (retract) and `close()` (author-only, `closePoll`) update from returned `.data`.

---

## components/

| File | Responsibility | Endpoints (via api) | Types | States | Gating |
|---|---|---|---|---|---|
| `ConversationItem` | list row: title, last_message_preview, relative `last_message_at`, unread dot (`unread`), muted/archived glyphs, avatar(s) of other participants | — (data row) | `Conversation` | n/a; skeleton variant | messaging |
| `MessageBubble` | one message; mine vs theirs alignment, `sender_avatar`/`sender_name` on group, `content` via `ContentBody`, `created_at_human`; `is_system` → centered notice (no bubble); pending/failed tick for optimistic | — | `Message` | sent/pending(optimistic)/failed(retry) | messaging |
| `MessageComposer` | sticky bottom input → `useSendMessage`; disabled when `left_at` set or `is_blocked`; multiline grow, send button | `POST …/messages` | — | idle/sending/disabled(left/blocked)/error | messaging |
| `RecipientPicker` | debounced (≥3 chars) typeahead over `recipientSuggestions`; multi-select chips; "no shared-space members" empty copy (scope is shared spaces, not global users) | `GET /messaging/recipient-suggestions` | `RecipientSuggestion` | idle/typing/<3-chars/empty/error | messaging |
| `ReactionBar` | **seam impl** (replaces 02 stub): row of slug pills with counts from `counts`, active state from `user_reactions`, tap toggles via `useReactions`, "+" opens `ReactionPicker` | `GET`+`POST …/reactions` | `ReactionData` | inert/loading/optimistic/error | reactions |
| `ReactionPicker` | popover of the 8 `REACTION_EMOJI` slugs; pick → `toggle(slug)` | — (delegates) | `ReactionSlug` | open/closed | reactions |
| `PollView` | **seam impl** (replaces 02 stub): question, options as vote rows; pre-vote = tappable, post-vote/`closed` = result bars with `percentage` + `vote_count`; `total_voters` footer; `closes_at` countdown / "Closed" badge; single vs multiple affordance; author "Close poll" action | `GET /posts/{post_id}/poll`, `POST/DELETE /polls/{id}/vote`, `PATCH /polls/{id}` | `Poll` | loading/no-poll(render null)/open/voting(optimistic)/results/closed/error | polls |

---

## screens/

### app/(tabs)/messages.tsx  (tab hidden entirely unless `features.messaging`)
- Header segmented control **Active / Archived** → `useConversationList(filter)`. FlatList of `ConversationItem`, infinite scroll (`fetchNextPage`), pull-to-refresh.
- Tab bar **unread badge** ← `useUnreadCount()` (shared hook).
- FAB "New message" → `app/conversation/new`.
- States: loading(skeleton rows) / empty("No conversations yet" + CTA) / error(retry).

### app/conversation/[id].tsx  (gated; redirect home if flag off)
- `useConversationThread(id)`: header = `title` + participant avatars + **kebab menu** (Mute/Unmute → `setMuted`, Archive/Unarchive → `archive`, Leave → `leave` + back, Block/Unblock → `block`, direct only). Inverted FlatList of `MessageBubble`; **load-older** via `before` cursor on scroll-to-top. New-message poll merges newest.
- `MessageComposer` pinned bottom.
- States: loading / not-found(404) / forbidden(403 non-participant) / empty(no messages) / left(read-only banner) / blocked(composer disabled) / error.

### app/conversation/new.tsx  (gated)
- `RecipientPicker` (multi-select) + first-message `MessageComposer` (+ optional `title` for group) → `createConversation`. On success navigate `replace` to `app/conversation/[id]` with returned `Conversation`.
- States: editing / no-recipients(disabled send) / submitting / error(400 self/blocked/validation inline).

---

## Content seam contract (PINNED — what 02 must expose, unchanged signatures)

The Content (02) stubs already mount these exact elements in `app/post/[id].tsx` and `ReplyItem`, rendering `null` unless the flag is on. This section **swaps the stub bodies for real impls without changing the mount sites or props**. Required contract:

1. **`app/post/[id].tsx` (PostDetail)** mounts, after `ContentBody`:
   - `<ReactionBar target={{ kind: 'post', id: post.id }} seed={post.reactions} />`
   - `<PollView postId={post.id} seed={post.poll} />`
2. **`ReplyItem`** mounts, in its action row:
   - `<ReactionBar target={{ kind: 'reply', id: reply.id }} seed={reply.reactions} />`
3. **Props the seam needs from Content** (narrows the `unknown` seams in `types/post.ts`):
   - `ReactionBar`: `target: { kind: 'post' | 'reply'; id: number }` (required) + optional `seed?: ReactionData` sourced from `Post.reactions` / `Reply.reactions` (typed `unknown` in 02 → narrowed to `ReactionData | undefined` here).
   - `PollView`: `postId: number` (required) + optional `seed?: Poll` from `Post.poll` (`unknown` → `Poll | undefined`). No poll → renders `null`.
4. **Gating stays in the components**, not the mount site: 02 keeps mounting unconditionally; `ReactionBar`/`PollView` self-return `null` when `!useFeatures().features.reactions` / `.polls`. So free-only builds and flag-off Pro builds both stay inert with zero crashes and no prop churn.
5. **No new Content props required** beyond passing `post`/`reply` (already in scope) — seed is read off the already-fetched object; if absent the component lazy-fetches. This keeps 02 free of Pro imports (seam stays a typed boundary).

---

## Pagination, polling & optimistic notes

- **Conversation list**: `limit`/`offset` (page 20), `filter` active/archived. `COUNT`-free — list is the only surface; infinite scroll until a short page.
- **Messages**: **cursor** pagination via `before` = oldest loaded `message.id`, `limit` 30, newest-first server order → inverted list; load-older prepends. Avoid offset (new inbound messages would shift offsets).
- **Polling (no websockets server-side)**: unread-count ~30s, conversation list ~30s on focus, open thread ~10s on focus; all pause on blur to spare battery/requests. Merge by id, never blind-replace (preserves optimistic/in-flight).
- **Optimistic send**: push a temp `Message` (`id: -Date.now()`, `is_system:false`, local `created_at_human`) in `pending` state; on 201 replace temp with server row; on error mark `failed` + retry. Sender's own messages also arrive via the next poll — de-dupe by real id so no double bubble.
- **Optimistic reactions/poll-vote**: described in hooks; always reconcile to the authoritative response (`action` / `.data`) and rollback+toast on failure; in-flight guards prevent rapid-tap races. Multi-actor concurrency (poll closed mid-vote, convo already left) reconciles to server truth on the failing call.

---

## COVERAGE TABLE — every messaging/reactions/polls endpoint → file/fn

| METHOD route | controller:method | api fn | hook / UI |
|---|---|---|---|
| GET `/conversations` | Private_Messaging::rest_list_conversations | conversations.listConversations | useConversationList → messages.tsx |
| POST `/conversations` | rest_create_conversation | conversations.createConversation | conversation/new.tsx |
| GET `/conversations/{id}` | rest_get_conversation | conversations.getConversation | useConversationThread → conversation/[id].tsx |
| PATCH `/conversations/{id}` | rest_update_conversation | conversations.setMuted (dup of /mute) | kebab menu — **prefer /mute action route** (returns full convo); PATCH kept as fallback |
| GET `/conversations/{id}/messages` | rest_get_messages | conversations.listMessages | useConversationThread (cursor) |
| POST `/conversations/{id}/messages` | rest_send_message | conversations.sendMessage | useSendMessage + MessageComposer |
| GET `/conversations/unread-count` | rest_unread_count | conversations.unreadCount | useUnreadCount → tab badge |
| GET `/messaging/recipient-suggestions` | rest_recipient_suggestions | conversations.recipientSuggestions | RecipientPicker |
| POST `/conversations/{id}/mute` | rest_mute_conversation | conversations.setMuted | kebab menu |
| POST `/conversations/{id}/archive` | rest_archive_conversation | conversations.archive | kebab menu + Archived segment |
| POST `/conversations/{id}/leave` | rest_leave_conversation | conversations.leave | kebab menu |
| POST `/conversations/{id}/block` | rest_block_conversation | conversations.block | kebab menu (direct only) |
| POST `/posts/{id}/reactions` | Reactions::toggle_reaction | reactions.togglePostReaction | useReactions.toggle → ReactionBar (post seam) |
| GET `/posts/{id}/reactions` | Reactions::get_post_reactions | reactions.listPostReactions | useReactions (lazy when no seed) |
| POST `/replies/{id}/reactions` | Reactions::toggle_reply_reaction | reactions.toggleReplyReaction | useReactions.toggle → ReactionBar (reply seam) |
| GET `/replies/{id}/reactions` | Reactions::get_reply_reactions | reactions.listReplyReactions | useReactions (lazy) |
| GET `/posts/{post_id}/poll` | Polls::get_poll | polls.getPollForPost | usePoll → PollView |
| POST `/polls/{id}/vote` | Polls::vote | polls.vote | usePoll.vote → PollView |
| DELETE `/polls/{id}/vote` | Polls::unvote | polls.removeVote | usePoll.removeVote → PollView (retract) |
| PATCH `/polls/{id}` | Polls::update_poll | polls.closePoll | usePoll.close → PollView author "Close" |
| POST `/posts/{post_id}/poll` | Polls::create_poll | polls.createPoll (defined, unused in v1) | **n/a (v1)** — poll *authoring* belongs to the compose flow (Content `app/post/new.tsx`, domain 02), not the social-consumption screens in this section. Wrapper shipped so 02 can attach it later; no UI here. |

**21/21 endpoints mapped** (12 messaging + 4 reactions + 5 polls; `create_poll` mapped as a shipped-but-unused wrapper with documented reason).
