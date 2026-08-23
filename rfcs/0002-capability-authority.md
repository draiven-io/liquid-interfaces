# RFC 0002: Capability Authority

> **Status**: Accepted
> **Author**: Dhiogo José Correa de Sá, @dhiogocorrea
> **Created**: 2026-08-22
> **Updated**: 2026-08-22
> **Landed in**: LIP 0.3.0

---

## Summary

A coordinator composes execution plans over capabilities that agents declared,
using a language model. Nothing in LIP requires the resulting plan to reference
capabilities that exist, and nothing checks that an artifact matches the shape
its offer promised.

This RFC introduces the **Capability Authority**: a coordinator-held,
agent-derived record of what may be planned and what must be produced, together
with three obligations — constrain composition to it, validate artifacts
against it, and answer a violation with the valid alternatives rather than a
bare failure.

It also specifies `output_schema` and `expected_artifacts` on the offer, which
every implementation already sends and no version of this document has ever
defined.

---

## Motivation

### Problem Statement

LIP's central claim is that interfaces need not be static contracts. The
strongest objection to that claim is not that dynamic interfaces are slow or
complex. It is:

> If the interface is not fixed in advance, what stops the system from
> inventing one?

Today the honest answer is *nothing*, and the gap has three distinct edges.

**A plan may reference a capability that does not exist** — in a coordinator
that composes with a model. §7 matches intents to capabilities semantically,
and the specification permits a coordinator to compose the resulting plan the
same way. A model that has read a hundred offers mentioning
`route_optimization` will cheerfully emit a step for `route_optimisation`, or
for a capability a *different* agent offered in a *previous* session. Nothing
in the specification requires the composed plan to be checked against what was
actually offered.

Worth stating precisely, because the first draft of this RFC did not: **the
reference implementation is not exposed to this.** `compose_offers` builds
each step by reading fields off an accepted offer, so its steps reference real
capabilities by construction, and the only model in that path *explains* the
plan rather than producing it. The requirement below is therefore a
constraint on coordinators that take the freedom the specification allows —
which is worth writing down before someone takes it, rather than after.

**An artifact may not match its offer.** An agent's offer carries an
`output_schema` in every implementation of this protocol. No implementation
validates a `complete` against it, because the specification never says the
field exists, let alone what it means. An agent may promise
`{ "routes": [...] }` and deliver `{ "result": "ok" }`, and the interaction
proceeds.

**A downstream agent inherits the mistake.** Under §9 the output of one step
becomes the context of the next. An artifact whose shape nobody checked is
consumed by an agent that assumes a field it will not find. The failure
surfaces one or two hops from its cause, which is the most expensive place for
a failure to surface.

The second and third failures are not hypothetical, and the pattern behind all
three is well documented in production systems built on this protocol: a model referencing a column that
does not exist in the view it is querying, the query failing, a retry loop
re-issuing the *same* invented reference, retries exhausting, and the user
receiving a confidently-formatted answer of zero. The remedy found
independently, more than once, was the same each time — hold an authoritative
list, constrain generation to it, and reject anything outside it before the
expensive operation rather than after.

### The tension this RFC must not resolve wrongly

An RFC that adds contract enforcement to a protocol founded on the rejection of
static contracts owes the reader an explanation, so here it is plainly.

§2 objects to contracts that are **permanent**, **externally maintained**, and
**agreed in advance of the interaction**. Those are the properties that
accumulate debt: a schema in a repository that outlives the reason it was
written, that some team must migrate, that constrains an interaction nobody has
had yet.

The Capability Authority has none of those properties. It is **derived** from
what agents declared at registration and offered in this session; it is
**held for the life of the session** and dissolves with it under §9; it is
**maintained by nobody**, because an agent changes what the authority says by
registering differently.

The interface remains ephemeral. What changes is that it stops being
*imaginary*. A contract that dissolves is still a contract while it exists —
and "this offer promised these artifacts" is a claim the coordinator already
has in hand. Checking it costs nothing and is the difference between a
negotiated interface and a hallucinated one.

### Use Cases

- **A composer that cannot invent.** A coordinator planning over five agents
  emits only steps naming capabilities those agents offered in this session.
- **An agent held to its word.** An agent that offers `expected_artifacts:
  ["forecast"]` and completes without one is detected at the boundary, not by
  the next agent.
- **A refusal that helps.** A plan referencing an unavailable capability is
  answered with the capabilities that *are* available, so a renegotiation round
  (§11) can succeed instead of repeating the mistake.
- **Attributable drift.** When an agent's artifacts stop matching its declared
  schema, the coordinator can say which agent, which capability, and since
  when.

---

## Design

### Overview

For every session, the coordinator holds a **Capability Authority**: the set of
capabilities admitted into that session, and for each one the artifact shape
its offer promised.

It is consulted at three points.

| Point | Question | On violation |
|---|---|---|
| **Composition** | Does every planned step name an admitted capability? | Reject the plan; recompose with the authority as the whitelist |
| **Emission** | Does this artifact match the schema its offer declared? | `schema_violation`, carrying the expected shape |
| **Handoff** | Is the context passed downstream drawn from validated artifacts? | Withhold the unvalidated artifact |

The authority is built from facts the coordinator already possesses — the
`register` payload (RFC 0001) and the `offer` payloads of this session. It
requires no new performative and no new round trip.

### Detailed Design

#### Specifying what the offer already carries

The offer payload gains two fields in the specification. Both are already sent
by existing implementations; this defines them.

| Field | Type | Required | Description |
|---|---|---|---|
| `expected_artifacts` | array\<string\> | no | Names of the artifacts this capability produces |
| `output_schema` | object | no | JSON Schema describing the artifact payload |

An offer that declares neither makes no promise, and its artifacts are
unvalidated. This is deliberate: an agent that cannot describe its output is
still useful, and demanding a schema from every agent would exclude the
exploratory ones the protocol is meant to accommodate. **Silence is honest;
a promise that is broken is not.**

#### The authority

For each session the coordinator maintains, for every capability admitted
through an accepted offer:

- `agent_id` and `capability_id` as offered
- `expected_artifacts` and `output_schema`, if declared
- the offer's `message_id`, so any decision can be traced to the promise that
  justified it

The authority is scoped to the session. It is created when the first offer is
accepted and destroyed on `dissolve`, alongside every other artifact of the
interaction (§9).

#### Requirements

Coordinators:

- **MUST** reject an execution plan containing a step that names a capability
  not in the authority. A plan is a proposal, not an instruction; a plan
  referencing something nobody offered is a composition error, and executing it
  is undefined behaviour dressed as a request.
- **MUST** include the admitted capabilities in whatever context is used to
  compose the plan. Rejecting an invented capability *after* generation is a
  guard; constraining generation is the fix. A system that only rejects will
  loop on the same invention.
- **SHOULD** validate each artifact in a `complete` against the `output_schema`
  its offer declared, when one was declared.
- **MUST NOT** treat an absent `output_schema` as a validation failure.
- **SHOULD** answer a violation with the valid alternatives — the admitted
  capabilities, or the expected artifact shape. §11 already holds that errors
  are openings for negotiation; an error that omits what would have worked
  forecloses the negotiation it invites.
- **SHOULD** record a validation failure against the offering agent, so
  persistent divergence between what an agent promises and what it produces is
  attributable.

Agents:

- **SHOULD** declare `output_schema` for capabilities with a stable output
  shape.
- **MUST NOT** rely on the coordinator forwarding an artifact that failed
  validation.

#### Where this sits relative to IBAC

Authority and IBAC answer adjacent questions and must not be conflated:

- IBAC asks **may this happen** — is the purpose permitted, by whom, over what
  data.
- Authority asks **is this coherent** — does this step name something real, does
  this artifact match what was promised.

An authority violation is not a policy denial and **MUST NOT** be reported as
one. Conflating them corrupts the audit trail in both directions: a
misconfigured agent appears as an attempted policy breach, and a real breach is
lost among schema noise.

The ordering follows from this. Authority is checked **first**: a plan step
naming a capability that does not exist has no purpose to authorize, and
evaluating IBAC over an incoherent request wastes an evaluation and produces a
decision about nothing.

### Examples

An offer that makes a promise:

```json
{
  "protocol_version": "0.2.0",
  "session_id": "9d1f...",
  "message_type": "offer",
  "sender": { "kind": "agent", "id": "route-optimizer-01" },
  "payload": {
    "capability_id": "alternative_routing",
    "expected_artifacts": ["routes"],
    "output_schema": {
      "type": "object",
      "required": ["routes"],
      "properties": {
        "routes": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["carrier", "transit_hours"],
            "properties": {
              "carrier": { "type": "string" },
              "transit_hours": { "type": "number" }
            }
          }
        }
      }
    }
  }
}
```

A plan rejected before it runs:

```json
{
  "error": {
    "category": "capability_mismatch",
    "message": "Plan step 3 names capability 'route_optimisation', which no agent offered in this session",
    "suggestions": [
      "route-optimizer-01:alternative_routing",
      "route-optimizer-01:route_optimization",
      "carrier-negotiator:carrier_rate_quote"
    ],
    "recoverable": true
  }
}
```

An artifact that broke its promise:

```json
{
  "error": {
    "category": "schema_violation",
    "message": "Artifact from 'route-optimizer-01:alternative_routing' is missing required property 'routes'",
    "suggestions": [
      "The accepted offer declared expected_artifacts: [\"routes\"]",
      "Received keys: [\"result\", \"status\"]"
    ],
    "recoverable": true
  }
}
```

### Integration

- **LIP** — §8 gains the two offer fields. §11 gains one error category,
  `schema_violation`. §9 gains the authority as session state that dissolves
  with the interaction. No new performative; the message set stays closed.
- **IBAC** — unaffected in mechanism, adjacent in purpose, and ordered before
  it. An artifact that fails validation is never emitted, so
  `artifact_emission` evaluates only artifacts that are what they claim to be —
  which makes that evaluation point meaningfully stronger.
- **Views** — `output_schema` describes the artifact payload; a View describes
  its rendering. They compose and neither replaces the other.

### Versioning

This is additive under §13: two optional fields, one error category, and
obligations that fall on coordinators. It raises the protocol to **0.3.0**.

| Agent | Coordinator | Result |
|---|---|---|
| 0.2.0 | 0.3.0 | Works. Offers declare no schema, so artifacts are unvalidated |
| 0.3.0 | 0.2.0 | Works. The coordinator ignores the fields and validates nothing |

Unusually for this protocol, **the matrix is symmetric** — an old peer on
either side degrades to today's behaviour, which is exactly the absence of
validation. Nothing breaks; the guarantee is simply not available until both
sides are current.

---

## Alternatives Considered

### Validate against a registry maintained outside the interaction

Publish capability schemas to a shared registry and validate against that.
Rejected because it is precisely the thing §2 objects to: a permanent artifact,
maintained by someone, that outlives the interaction and must be migrated when
it drifts. It would also be *wrong more often* than the offer — a registry
records what a capability was when someone last updated it, while the offer
records what the agent claims right now.

### Infer the schema by observing artifacts

Build the authority from what agents have actually produced, rather than what
they declared. Attractive because it needs nothing from agents, and it is what
schema introspection does in a database.

Rejected because there is no ground truth to introspect. A database has a real
schema independent of any claim about it; an agent's output has only the agent.
Inferring the contract from behaviour means an agent that has been returning
the wrong shape since its first execution defines the wrong shape as correct,
and the divergence this RFC exists to detect becomes undetectable by
construction.

Observation remains useful for *reporting* — an agent whose artifacts
persistently fail its declared schema is worth surfacing — which is why
recording violations is a SHOULD.

### Make `output_schema` mandatory

Simplifies the design: every artifact is validated, no optional path. Rejected
because it excludes agents whose output genuinely has no stable shape, and
those are disproportionately the exploratory and generative agents this
protocol is meant to accommodate. Forcing a schema on them would produce
schemas written to satisfy the validator, which is worse than none: an accurate
absence beats a decorative promise.

### Reject invented capabilities without constraining composition

Only guard at the boundary, and let composition be free. Rejected because a
model that invented a capability once will invent it again on retry — the
guard converts a wrong answer into a renegotiation loop that cannot converge.
This is the observed failure in production systems: the retry re-issues the
same invalid reference until the budget is exhausted. Constraining generation
is what actually fixes it; rejection is the backstop.

---

## Drawbacks

- **A coordinator obligation, not a shared one.** The MUSTs land almost
  entirely on coordinators, which are the harder component to write. This is
  deliberate — the coordinator is where composition happens — but it widens the
  gap between implementing an agent and implementing a bus.
- **JSON Schema is a dependency.** Validating `output_schema` means every
  conformant coordinator needs a JSON Schema validator. Available everywhere,
  but no longer nothing.
- **Validation is a runtime cost** on every artifact, in a path that is already
  the latency-sensitive one.
- **A promise is still self-reported.** An agent that declares a schema
  matching what it produces, where both are wrong for the intent, passes
  validation. Authority guarantees coherence between offer and artifact, not
  correctness of either. That boundary should not be blurred in how this is
  described.

---

## Unresolved Questions

- Should a step whose *input* assumptions cannot be satisfied by any upstream
  artifact's declared schema be rejected at composition time? That is the
  natural completion of this idea — checking the joins, not just the nodes —
  and it is considerably harder, because it requires the plan to express what
  each step consumes.
- Should a repeatedly-violating agent be de-registered automatically, or is
  that a policy decision belonging to IBAC rather than to the protocol?
- Should `output_schema` be constrained to a JSON Schema dialect, or left open?
  Pinning a dialect aids interoperability and dates the specification.

---

## Future Possibilities

- **Input requirements on capabilities**, making the authority a graph rather
  than a set, and composition checkable end to end.
- **Schema negotiation** — an agent offering to produce a *narrower* artifact
  than requested, and the coordinator accepting the reduction explicitly rather
  than discovering it at emission.
- **Conformance requirements** for authority enforcement, so "LIP-compliant
  coordinator" becomes testable in the way agent conformance already is.

---

## References

- [LIP specification](../spec/lip/README.md) — §2, §7, §8, §9, §11, §13
- [RFC 0001: The `register` Performative](0001-register-performative.md)
- [Generated JSON Schemas](https://github.com/draiven-io/agentic-bus/tree/main/schemas)
- Reference implementation: `draiven-io/agentic-bus`

---

## Changelog

| Date | Change |
|------|--------|
| 2026-08-23 | Corrected the first problem statement: the reference implementation composes plans deterministically from accepted offers, so the invented-capability risk applies to coordinators that compose with a model, not to this one. Artifact validation, the substantive half, is unaffected and is now implemented. |
| 2026-08-22 | Initial draft |
