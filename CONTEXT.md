# Bonsai / Hush

Bonsai is a white-label platform for **Hush**, a baby cry-detection product (hardware monitor + companion app). The platform is resold by branded sellers to families; the companion app surfaces live cry alerts, a hardware-monitor feed with 1-to-1 talk, and growth tracking.

## Language

### Platform & tenancy

**Superadmin**:
The platform operator (the product owner). The only actor who creates Orgs and grants access to them. A Platform Role, not an Org Role.
_Avoid_: admin (ambiguous with Org admin), owner

**Org**:
A white-label seller/brand — the top-level tenant. An Org's staff manage the seller's footprint; the families and babies served by that seller live beneath it. Created only by a Superadmin.
_Avoid_: company, account, tenant (in UI), household

**Org Role**:
A member's role within an Org. `owner` / `admin` are **seller staff** (provision devices, manage the seller). `caregiver` is **any end-user** — parent *or* nanny; the parent-vs-nanny distinction is not an Org Role, it lives on the Device membership.
_Avoid_: permission, group

**Platform Role**:
A system-wide role (`superadmin` / `admin` / `maintainer`), independent of any Org. Most users have none.

### Devices, babies & access

**Device**:
A physical Hush hardware monitor, owned by an Org and the anchor for end-user access. A Device holds one or more Baby profiles and has a set of Device members (the parent + nanny attached to it).
_Avoid_: monitor (ambiguous with the "Live Monitor" screen), unit

**Baby**:
A child profile attached to a Device. A Device can hold more than one (twins / siblings); the companion app switches between them.
_Avoid_: child, infant, kid

**Device membership**:
The `(device, user, role)` grant that gates which baby feeds/alerts an end-user can see. Checked at SSE-connect and on every signaling message — *not* encoded in the JWT. The unit of family isolation: you see a baby because you are a member of its Device.

**Invite**:
A seller-issued, single-use token that creates an Org member. Only Org `owner`/`admin` may issue one (`POST /orgs/{id}/invites`). The path the *parent* gets onboarded.
_Avoid_: device share (that's the parent's lever — different actor, different scope)

**Device share**:
A *parent*-issued grant (authorized by primary Device membership, not Org role) that adds a guest — the nanny — to a single Device. Token-based like an Invite, so it honors "no public signup," but scoped to one Device instead of the whole Org.
_Avoid_: invite (seller-only), link

**Parent**:
The end-user who is the **primary** member of a Device — can manage it and share access. An Org `caregiver` with a primary Device membership.
_Avoid_: owner (that's a seller Org Role), guardian

**Nanny**:
The end-user who is a **guest** member of a Device — monitor + 1-to-1 talk only, no managing or sharing. An Org `caregiver` with a guest Device membership.
_Avoid_: babysitter, sitter, caregiver (caregiver is the Org Role, which parents share)

### Product surfaces

**Cry alert**:
A live, time-critical notification that a monitored baby is crying (vs. fussing vs. calm). The product's core promise; must reach a backgrounded/locked phone.
_Avoid_: notification (too generic), warning

**Hardware monitor**:
The physical Hush device that watches a baby and streams audio/telemetry. Distinct from the "Live Monitor" *screen* that displays its feed.

**Push-to-Talk**:
The caregiver's mic is acquired only while the talk button is held, and released on let-go. Holding starts microphone capture; releasing stops the track entirely (clearing the OS mic indicator), so the caregiver is never live except while actively pressing.
_Avoid_: walkie-talkie, intercom

**Notification**:
A persisted, per-recipient record that an event worth surfacing occurred, carrying its own read state, title, body, type, timestamp, and optional action/deep-link. A *generic envelope*: any producer can write any kind (a [[Cry alert]] onset, a device going offline, a share received, a system message), so it is deliberately not tied to crying. Distinct from **Cry alert** (the *live, time-critical delivery* of a crying event) and **Cry episode** (the underlying event). The Notification Center lists these newest-first and tracks unread count.
_Avoid_: alert (that is the live cry delivery), message (overloaded), feed item.

### Realtime

**Live-sync**:
The persistent, user-scoped SSE stream carrying server-authoritative diffs for everything visible while the app is open (dashboards, lists, presence, cry events) — for *all* devices the user belongs to, not just the one on screen. Writes go up as plain `POST`; the UI changes only when the resulting diff echoes back (no optimistic updates). On reconnect the client resyncs (Last-Event-ID replay or refetch).
_Avoid_: websocket, sync engine, subscription

**Cry episode**:
A single continuous crying event, identified by a stable id. That id is the dedup key across the two delivery channels (SSE in-app + Web Push), so an open app and a locked phone never double-alert.
_Avoid_: cry event (the id, not the moment), alert (the delivery, not the thing)

**Signaling stream**:
A separate, *ephemeral* SSE stream owned by the video island — opened when a 1-to-1 call starts, torn down when it ends — carrying only offer/answer/ICE for that room. Distinct from Live-sync so the WebRTC lifecycle stays isolated.
_Avoid_: signaling channel (FRONTEND.md's "existing channel" — we deliberately do not share it)

### Delivery & branding

**Companion app**:
The parent/caregiver-facing client. Delivered as an installable PWA (React + Vite SPA + service worker + Web Push), not a native app — see `docs/adr/`.
_Avoid_: mobile app (implies native)

**Seller domain**:
The branded domain a seller's families reach the app at. All seller domains serve one Vercel deploy; the brand is resolved by hostname, and the gateway's CORS is a registry-backed allowlist of these domains (not a single fixed origin).
_Avoid_: tenant URL, white-label URL

**Brand tokens**:
The per-seller-themeable subset of the design tokens — `--primary*`, the hero gradient, logo, app name — applied as CSS-var overrides before first paint. Everything else is **Locked tokens**.

**Locked tokens**:
The design tokens that are identical across all sellers because they carry safety meaning or AA-contrast tuning: `--alert*` (cry red, used *only* for an active cry), `--calm*`, `--amber*`, and the domain accents `--sleep` / `--feed`. A seller can never recolor these.
_Avoid_: theme colors (these are the ones that are *not* themeable)
