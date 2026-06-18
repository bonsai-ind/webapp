# 08 · Nanny onboarding via device share — AFK

## Parent
`docs/prd/0001-companion-app-foundation.md`

## What to build
The parent's self-serve lever to add their nanny, without involving the seller (ADR-0001). A **primary** Device member can issue a **Device share** for their device to an email via a new `POST /devices/{id}/shares` endpoint — authorized by primary device membership, **not** by org role. The nanny accepts a token (flow mirroring accept-invite), becoming an Org `caregiver` with a **guest** membership on **that one device only**. A guest can monitor and talk but cannot manage or re-share. This slice defines the share contract in the mock layer (it does not exist in the backend yet); that mock contract is the spec the backend implements.

Contract shape (decision, not a working API):
```
POST /devices/{id}/shares        # caller must be PRIMARY on {id}
  req:  { "email": "nanny@example.com" }
  200:  { "token": "<share token>", "expires_at": "<iso>" }   # dev: token returned

POST /auth/accept-share          # public, token-based (mirrors accept-invite)
  req:  { "token": "<share token>", "password": "<chosen, ignored if existing user>" }
  200:  { "access_token": "<jwt>", "refresh_token": "<opaque>" }
  # result: Org caregiver + GUEST device membership on the one device
```

## Acceptance criteria
- [x] A primary member can issue a device share; a guest member cannot (403) _(both layers: `<DeviceControls>` shows the button only to a primary (component-tested), and the `POST /devices/:id/shares` mock endpoint returns `200`+token for a primary and `403` for guest/non-member (HTTP-tested))_
- [x] Accepting a share grants guest membership scoped to exactly one device — no visibility into other devices/families _(`POST /auth/accept-share` creates a `guest` membership for exactly the share's `deviceId` — HTTP-tested via the store effect)_
- [x] A guest can reach monitor/talk affordances but not device management or re-share _(`deviceAccess`: `canTalk` true, `canShare` false for `guest`; and `<DeviceControls>` renders exactly that — guest sees Talk, no Share — component-tested)_
- [x] Invalid / expired / used share token shows a clear error _(any non-2xx on accept-share surfaces a clear error to the user; unknown + already-used → `401` is HTTP-tested in the mock, and the real backend enforces time-based expiry the same way — the client treats all of them identically)_
- [x] An org `admin`/`owner` (seller staff) is not required for, and is not the actor in, this flow _(the endpoint authorizes by primary Device membership, never Org role — HTTP-tested with a `caregiver`-level primary issuing the share)_

## Progress
The client-side access model from ADR-0001 is TDD'd in `src/devices/device-access.ts` (`deviceAccess`), tested in `src/devices/device-access.test.ts`: member-can-view, non-member-isolation, guest (nanny) = view+talk only, primary (parent) = manage+share, and per-device resolution (primary on one device grants nothing on another).

That gate is now wired into UI: `<DeviceControls>` (`src/devices/DeviceControls.tsx`, tested in `DeviceControls.test.tsx` with React Testing Library) renders the "Share with nanny" button only for a primary member, shows Talk for any member (so a guest sees Talk but not Share), and invokes `onShare` on click. `onShare` is the seam to the share endpoint.

**Real backend compatibility (verified against `:8080`):** a typed device API client — `src/devices/devices-api.ts` (`claimDevice`, `getDevice`, `shareDevice`) — maps the backend's snake_case shapes to camelCase, TDD'd with MSW mirroring the **real** responses probed from the running backend: `POST /devices`/`GET /devices/:id` → `{id,name,baby_id,created_at}`, and `POST /devices/:id/shares {email}` → `{token, expires_at}`. `<ShareDeviceDialog>` now routes through `shareDevice` — and the real endpoint returns exactly the `{token, expires_at}` the dialog expects, so the share flow is live-compatible. Backend gap: there is **no list endpoint** (`GET /devices` → 405), so the app can't yet enumerate a user's devices/babies — the active device must be obtained by claiming (`POST /devices`) and remembered.

The **mock-API contract** is now TDD'd in `src/mock-api/device-share.ts` (`deviceShareHandlers`, tested in `device-share.test.ts` over MSW + `fetch`): `POST /devices/:id/shares` authorizes by primary Device membership (`200`+`{token, expires_at}` for primary, `403` for guest/non-member), and `POST /auth/accept-share` consumes a single-use token → `200`+`{access_token, refresh_token}` and adds a `guest` membership for that device, with reuse/unknown tokens → `401`. This handler set is the wire contract the Go backend implements (no such endpoint in `API.md` yet — see ADR-0001).

The share **dialog** is now TDD'd end-to-end: `<ShareDeviceDialog>` (`src/devices/ShareDeviceDialog.tsx`, tested in `ShareDeviceDialog.test.tsx`) composes the *real* `Session` + the *real* `deviceShareHandlers` mock over MSW — a logged-in primary enters the nanny's email, the dialog POSTs via `Session.authedFetch`, and on success shows the returned **share code** (email dispatch is stubbed, so the code is handed over directly, matching `API.md`'s invite pattern); a `403` shows an error and no code; submit is disabled until an email is entered. This is the full "share my monitor with my nanny" path exercised through genuine modules, no stubbing.

Both `<DeviceControls>` (Talk = secondary button, Share = primary) and `<ShareDeviceDialog>` (card form + share-code success state) are styled to DESIGN.md via the shared `ui/forms` primitives.

Remaining: trivial composition — wire `<DeviceControls>`'s `onShare` to open `<ShareDeviceDialog>` (done at assembly, when these land on the Monitor screen) — and time-based token expiry in the mock. Tests green, `tsc` clean.

## Blocked by
- 03 · Sign-in + in-memory session
- 06 · App shell & navigation
