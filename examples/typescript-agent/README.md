# A LIP agent in TypeScript

A second implementation of the agent side of the Liquid Interfaces Protocol,
written from [`spec/lip/README.md`](../../spec/lip/README.md) and the
[published JSON Schemas](https://github.com/draiven-io/agentic-bus/tree/main/schemas)
**without reference to the Python implementation**.

That constraint is the point. A specification only becomes a standard when
someone can build from the document and interoperate; anything the document
leaves out shows up here as a guess.

## Result

```
LIP 0.2.0 conformance — agent ts-weather-01

  [PASS] LIP-REG-001  Sends `register` as the first message on a connection
  [PASS] LIP-REG-002  The register payload carries an agent_id and validates
  [PASS] LIP-REG-003  Declares at least one capability when registering
  [PASS] LIP-INT-001  Responds to a matching `intent` with an `offer`
  [PASS] LIP-EXE-001  Does not execute before receiving `execute`
  [PASS] LIP-EXE-002  Emits `complete` when execution ends
  [PASS] LIP-DIS-001  Stops work for a session on `dissolve`
  [PASS] LIP-MSG-001  Every message is a valid envelope
  [PASS] LIP-MSG-003  Uses only performatives defined by the protocol
  [PASS] LIP-VER-001  Every message carries a protocol_version
  [PASS] LIP-MSG-002  Each payload matches the schema for its message type

CONFORMANT (0 advisory warnings)
```

Roughly 300 lines over one runtime dependency.

That client has since been extracted and published as
**[`liquid-interfaces`](https://www.npmjs.com/package/liquid-interfaces)**;
this example is now a consumer of it, and the findings below are what the
exercise produced.

## Running it

From the repository root:

```bash
npm install && npm run build
```

Against the conformance suite:

```bash
agbus conformance --port 9100
```

```bash
node dist/agent.js ws://127.0.0.1:9100
```

Against a real coordinator, point it at that instead.

## What the specification did not tell me

These are the places the document ran out and I had to decide. Each is a
candidate for a clarification, and they are recorded here rather than quietly
patched because a gap you had to guess past is worth more as evidence than as
a fix.

### 1. How a credential is carried

Section 12 says agents must be authenticated before participating, and the
envelope has a `sender.oidc_subject` field. Neither says how the token
reaches the coordinator.

I guessed a bearer token in the WebSocket upgrade request:

```
Authorization: Bearer <token>
```

That turned out to match, but only because it is the obvious convention. An
implementer who put the token in the first message, or in a query parameter,
would produce something that fails to connect with no indication why.

### 2. That the coordinator forwards intents to agents

The message table gives `intent` as *Requester → Coordinator*, and `offer` as
*Agent → Coordinator*. Nowhere does it say the coordinator sends `intent` on
to candidate agents — it has to be inferred from the fact that an agent could
not otherwise know what to offer against.

The agent side of discovery is the one part of the lifecycle the table does
not describe from the agent's point of view.

### 3. Whether to send `complete` after a `dissolve`

Dissolution triggers mandatory cleanup, and an agent may have work in flight
when it arrives. The specification does not say whether that work should
still report a `complete`.

I chose not to: the interaction context has been invalidated, so there is
nothing left to complete against. A different implementer could reasonably
send `complete` with an error status, and the two would behave differently
under the same specification.

### 4. An ordering trap in the registration text

> An agent joins a bus by sending `register` and waiting for `registered`.

Read literally, that becomes: send, then wait. Which is what I wrote — and it
does not work, because a message handler attached *after* the send misses the
acknowledgement that arrived in between.

The first run of this agent failed `LIP-INT-001` and logged "no 'registered'
answer" for exactly this reason: nothing was listening during the wait, so
both the acknowledgement and an intent sent in that window were dropped.

This is not a specification error so much as a shape the phrasing invites. A
sentence noting that a client must be listening before it registers would
save the next implementer the same hour.

## What the specification got right

Worth recording, since the gaps above are the loud part:

- **The schemas removed all ambiguity about payloads.** Required fields,
  optional fields and types were unambiguous, and nothing needed guessing.
- **Registration being per-connection is stated explicitly**, which is the
  kind of thing an implementer would otherwise get wrong once and debug for
  a long time.
- **"MUST NOT treat a missing `registered` as fatal"** is exactly the sort of
  compatibility instruction usually left implicit. It made the 0.1.0
  fallback path obvious to write.
- **The closed message set** made `MessageType` a finite union rather than an
  open string, which the compiler then enforced.

## Layout

```
src/agent.ts   a weather agent, built on the liquid-interfaces client
```

The client itself lives in
[`packages/liquid-interfaces`](../../packages/liquid-interfaces).
