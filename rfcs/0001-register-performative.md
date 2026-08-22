# RFC 0001: The `register` Performative

> **Status**: Draft
> **Author**: Dhiogo José Correa de Sá, @dhiogocorrea
> **Created**: 2026-08-21
> **Updated**: 2026-08-21

---

## Summary

Agents currently join a bus through a mechanism the specification does not
describe. This RFC adds two performatives — `register` and `registered` — so
that agent admission is part of the protocol rather than an implementation
detail, and raises the protocol version to **0.2.0**.

---

## Motivation

### Problem Statement

LIP 0.1.0 defines a closed set of performatives, and states that `complete`
"signals termination of execution, successful or not."

The reference implementation registers agents by sending `complete` with
`session_id` set to the sentinel `"__registration__"` and a payload nested
under a `registration` key. Its own source comments the line as *"Re-use
complete as registration ack vehicle."*

Three things follow, and each is a problem on its own:

1. **The specification cannot be implemented.** Nothing in LIP 0.1.0 tells a
   reader how an agent announces itself. Someone writing an agent from the
   document alone produces one that connects and is never discovered. A
   specification that cannot be independently implemented is not a standard,
   whatever else it is.

2. **`complete` means two unrelated things**, distinguished by a magic string
   in a field meant to identify an interaction context. The protocol's own
   framing — performatives as acts that *do* something to the interaction —
   is broken by a performative whose meaning depends on a sentinel elsewhere
   in the envelope.

3. **Registration cannot fail visibly.** It is fire-and-forget. A coordinator
   that refuses an agent — not approved, offering a capability it may not —
   logs locally and says nothing. The agent stays connected, believing it is
   live, and is never asked to do anything. This is the same failure shape as
   an agent that silently stops reconnecting: healthy to a process
   supervisor, absent from the bus.

### Use Cases

- **A second implementation.** A Go or TypeScript agent library can be
  written from the specification, which is the point of having one.
- **Admission control.** A coordinator can refuse an agent and say why, and
  the agent can surface that to an operator instead of failing silently.
- **Version negotiation.** An agent learns the coordinator's protocol version
  at handshake time rather than inferring it from things not working.

---

## Design

### Overview

Two performatives, forming one request/response exchange at the start of
every connection:

| Performative | Direction | Effect |
|---|---|---|
| `register` | Agent → Coordinator | Declares the agent and the capabilities it offers |
| `registered` | Coordinator → Agent | Accepts or refuses that declaration, with a reason |

Registration is **per connection**, not per process. A coordinator holds its
capability registry against the live socket, so an agent that reconnects MUST
register again; one that does not is connected but undiscoverable.

Neither message belongs to an interaction context, so `session_id` is empty.
The sentinel `"__registration__"` is retired.

### Detailed Design

#### `register`

Sent by an agent immediately after the connection is established, before any
other message.

| Field | Type | Required | Description |
|---|---|---|---|
| `agent_id` | string | yes | Stable identifier for the agent |
| `version` | string | no | The agent's own version, not the protocol's |
| `mode` | enum | no | `ephemeral` (registry only, discarded on disconnect) or `persistent` (also recorded by the coordinator). Default `ephemeral` |
| `capabilities` | array | no | Capability descriptors being offered |
| `semantic_description` | string | no | Free-text description used in semantic discovery |
| `required_scopes` | array<string> | no | Scopes the agent's work requires |
| `supported_data_domains` | array<string> | no | Data domains the agent may operate on |
| `operational_constraints` | object | no | Limits the coordinator should respect |

#### `registered`

Sent by the coordinator in response to every `register` it receives —
including ones it refuses, and ones it cannot parse.

| Field | Type | Required | Description |
|---|---|---|---|
| `accepted` | boolean | yes | Whether the agent is now registered |
| `agent_id` | string | no | Echoed back for correlation |
| `reason` | string | no | Why it was refused. Empty when accepted |
| `registered_capabilities` | array<string> | no | Capability IDs actually accepted, which MAY be a subset of those offered |
| `coordinator_protocol_version` | string | no | The LIP version the coordinator implements |

`registered_capabilities` being a subset is deliberate: a coordinator may
admit an agent while declining an individual capability, and the agent should
be able to tell.

#### Requirements

Agents:

- MUST send `register` as the first message on every connection, including
  reconnections.
- SHOULD wait for `registered` before considering themselves live.
- MUST NOT treat a missing `registered` as fatal. A coordinator implementing
  LIP 0.1.0 never sends one, and refusing to run against it is a worse
  outcome than running without confirmation. Agents SHOULD warn.
- SHOULD surface a refusal to an operator. A refusal MAY be transient — an
  agent awaiting approval becomes valid once approved — so agents MAY stay
  connected and retry on the next reconnection.

Coordinators:

- MUST answer every `register` with `registered`, including on failure.
- MUST NOT leave a registration unanswered because it could not be parsed;
  an agent waiting on that answer would otherwise wait forever.
- SHOULD continue to accept the deprecated `complete` +
  `session_id="__registration__"` form, to admit agents built against
  0.1.0. Coordinators SHOULD log a deprecation warning when they do.

### Examples

Registration:

```json
{
  "protocol_version": "0.2.0",
  "message_id": "0d6f2f1e-1b4a-4c62-9f6a-2c0f0c9a1d33",
  "session_id": "",
  "message_type": "register",
  "timestamp": "2026-08-21T10:00:00+00:00",
  "sender": { "kind": "agent", "id": "weather-01" },
  "payload": {
    "agent_id": "weather-01",
    "version": "1.2.0",
    "mode": "ephemeral",
    "semantic_description": "Weather forecasting for European cities",
    "capabilities": [
      { "capability_id": "forecast", "description": "Weather forecast by city" }
    ]
  }
}
```

Acceptance:

```json
{
  "protocol_version": "0.2.0",
  "session_id": "",
  "message_type": "registered",
  "sender": { "kind": "coordinator", "id": "coordinator" },
  "payload": {
    "accepted": true,
    "agent_id": "weather-01",
    "registered_capabilities": ["forecast"],
    "coordinator_protocol_version": "0.2.0"
  }
}
```

Refusal:

```json
{
  "payload": {
    "accepted": false,
    "agent_id": "weather-01",
    "reason": "agent is not approved; an administrator must approve enrolment"
  }
}
```

### Integration

- **LIP** — §10 gains both performatives; the message set stays closed.
- **IBAC** — registration is a natural evaluation point: a coordinator may
  refuse an agent, or narrow `registered_capabilities`, based on policy. This
  RFC does not mandate that, but `reason` is where such a decision would be
  explained.
- **Views** — unaffected.

### Versioning

This raises the protocol to **0.2.0**, a minor bump under §13 (an addition to
the message set). The compatibility matrix is not symmetric, and saying so
plainly matters more than the version number:

| Agent | Coordinator | Result |
|---|---|---|
| 0.2.0 | 0.2.0 | Full handshake |
| 0.1.0 | 0.2.0 | Works — the deprecated form is still accepted |
| 0.2.0 | 0.1.0 | **Agent never registers.** The coordinator ignores `register` |

**Coordinators must therefore be upgraded before agents.** This is the usual
ordering for a client/server protocol, but it is a real constraint rather
than a formality, and deployments should treat it as one.

---

## Alternatives Considered

### Keep `complete` + `__registration__`, and specify it

Cheapest option: document what the implementation already does. Rejected
because it writes the flaw into the standard. `complete` would permanently
mean two unrelated things, disambiguated by a sentinel in an unrelated field,
and every future implementer would inherit that.

### `register` only, with no acknowledgement

One new performative instead of two, preserving today's fire-and-forget
behaviour. Rejected because it leaves the third problem unsolved: an agent
still cannot distinguish "registered" from "refused", which is the failure
mode that motivated much of this. The extra performative is cheap; the
silence is not.

### Reuse `accept` / `reject` for the response

Tempting — they already mean agreement and structured refusal, and the
message set would grow by one instead of two. Rejected because it repeats the
mistake being fixed: `accept` and `reject` are defined against offers and
plans, and overloading them for admission would again make a performative's
meaning depend on context outside itself.

### Carry registration in the connection handshake

Put capabilities in an HTTP header or query string at WebSocket upgrade time.
Rejected because it binds registration to one transport. LIP is transport-
independent by design (§6 of the manifesto), and this would not survive a
move to QUIC or gRPC.

---

## Drawbacks

- **A breaking change in one direction.** New agents cannot register with old
  coordinators. Mitigated by the deprecated path and by an explicit upgrade
  ordering, but it is a genuine cost.
- **Two more performatives.** The set grows from eight to ten. Justified by
  the fact that admission was always happening — it was simply undocumented.
- **A handshake wait.** Agents now pause briefly for `registered`. Bounded by
  a timeout, after which they carry on.

---

## Unresolved Questions

- Should a coordinator be able to *revoke* a registration mid-connection —
  an `unregistered` push when an admin disables an agent? Today the
  coordinator closes the socket, which works but says nothing about why.
- Should `registered` carry the negotiated protocol version explicitly, so
  the two peers agree a version rather than each reporting its own?
- Should IBAC evaluation at registration be normative rather than permitted?

---

## Future Possibilities

- A conformance suite driven by the JSON Schemas, so "LIP-compliant" becomes
  testable rather than asserted.
- Capability *updates* on a live connection, letting an agent add or withdraw
  a capability without reconnecting.

---

## References

- [LIP specification](../spec/lip/README.md)
- [Generated JSON Schemas](https://github.com/draiven-io/agentic-bus/tree/main/schemas)
- Reference implementation: `draiven-io/agentic-bus`

---

## Changelog

| Date | Change |
|------|--------|
| 2026-08-21 | Initial draft |
