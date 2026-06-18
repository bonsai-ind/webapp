# Device-anchored tenancy under white-label Orgs

An **Org is a white-label seller/brand** (the top-level tenant, created only by a Superadmin), *not* a household — even though `API.md` says "Org owns babies/devices/memberships," which reads like one family. Within an Org, the **physical Device is the unit of family isolation**: an end-user sees a baby's feed/alerts because they hold a `(device, user, role)` **device membership**, checked at SSE-connect and per signaling message — never encoded in the JWT (which carries only `org_id` + `org_role`). The Org Role `caregiver` therefore means *any* end-user (parent or nanny); the **parent-vs-nanny distinction lives on the device membership** (parent = primary, nanny = guest), not on the Org Role.

## Considered Options

- **Org = household, with a new "Reseller" tier above it** — keeps `API.md` literal, but contradicts the stated business model (Org *is* the seller).
- **Per-baby ACL instead of per-device** — anchor membership on the Baby. Works, but "share my whole monitor with the nanny" becomes per-baby; the hardware is the thing people actually buy and share.
- **Household entity nested under Org** — clean, but adds a layer the hardware-first model doesn't need: a Device already groups a family's babies + members.

## Consequences

- The not-yet-built domain layer must add a device-membership table and authorize feeds/signaling against it, not against the JWT's Org Role.
- Family isolation within a seller is per-device; there is no first-class "family/household" object.
