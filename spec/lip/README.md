# Liquid Interface Protocol (LIP)

> The core protocol for intent-driven agent interaction

**Status**: Draft  
**Protocol version**: 0.2.0  
**Last updated**: 2026-08

> **Normative sources.** This document, §4.1 of the
> [paper](https://arxiv.org/abs/2601.21993), and the
> [reference implementation](https://github.com/draiven-io/agentic-bus)
> describe one protocol. Where prose and schema disagree, the
> [generated JSON Schemas](https://github.com/draiven-io/agentic-bus/tree/main/schemas)
> are authoritative — they are produced from the implementation's models, so
> they cannot drift from what actually goes over the wire.

---

## Abstract

The Liquid Interface Protocol (LIP) defines how agents express intentions, discover capabilities, negotiate meaning, and establish ephemeral contracts for interaction. LIP is the foundational protocol of the Liquid Interfaces ecosystem.

Unlike traditional integration protocols that specify endpoints, contracts, and static schemas, **LIP regulates the process by which interfaces emerge, temporarily stabilize, and dissolve** as a function of intentions, contexts, and constraints.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Philosophical Foundation](#2-philosophical-foundation)
3. [Design Goals](#3-design-goals)
4. [Protocol Overview](#4-protocol-overview)
5. [Intent Expression](#5-intent-expression)
6. [Messages as Intentional Acts](#6-messages-as-intentional-acts)
7. [Semantic Matching](#7-semantic-matching)
8. [Capability Discovery](#8-capability-discovery)
9. [Contract Lifecycle](#9-contract-lifecycle)
10. [Message Envelope](#10-message-envelope)
11. [Error Handling](#11-error-handling)
12. [Security Considerations](#12-security-considerations)
13. [Protocol Versioning](#13-protocol-versioning)

---

## 1. Introduction

Traditional APIs require callers to know:
- The exact endpoint to invoke
- The precise schema of request/response
- The authentication mechanism
- The version compatibility

LIP inverts this model. Agents express **what** they want to achieve, and the protocol handles discovery, matching, and negotiation.

The fundamental shift is from **interface as artifact** to **interface as event**.

---

## 2. Philosophical Foundation

### Interface as Process, Not Artifact

In the solid paradigm, a protocol defines *what can be called* and *how it must be called*. In the liquid paradigm, the protocol defines **how agents negotiate the meaning of interaction**.

LIP is grounded in the principle that:

> The interface does not exist before interaction. It emerges from the negotiation between agents, stabilizes temporarily, and dissolves when the interaction completes.

This reflects the hermeneutic concept of the **fusion of horizons** (Gadamer): meaning is not transmitted but co-constructed through dialogue.

### Anti-Accumulation of Technical Debt

A central principle of LIP is the **explicit temporality** of interfaces. Unlike traditional API contracts that tend to perpetuate and accumulate dependencies, agreements established in the context of a liquid interface have:

- **Limited temporal validity**
- **Functional scope restricted to the negotiated intent**
- **No existence outside the context of that specific interaction**

This characteristic prevents the accumulation of structural technical debt and promotes an ecosystem where interoperability is **reconstructed at each interaction**, rather than rigidly maintained.

---

## 3. Design Goals

| Goal | Description |
|------|-------------|
| **Intent-First** | Goals before mechanics |
| **Semantic Discovery** | Find capabilities by meaning, not location |
| **Negotiated Agreements** | Contracts emerge from dialogue |
| **Ephemeral Coupling** | No long-lived dependencies |
| **Observable Reasoning** | Every decision is traceable |
| **Hermeneutic Error Handling** | Errors invite clarification, not collapse |

---

## 4. Protocol Overview

LIP regulates a temporal sequence of conceptual states:

1. **Intent Emission** — An agent expresses a goal (Φ), accompanied by context (C) and constraints (R), without presupposing the existence of a specific receiver
2. **Capability Recognition** — One or more agents interpret the intent and evaluate whether they can fulfill it
3. **Semantic Negotiation** — Parties negotiate requirements, formats, adaptations, and limits, seeking a convergence of meaning
4. **Temporary Stabilization** — A minimal operational agreement is formed, constituting an ephemeral interface
5. **Adaptive Execution** — Interaction occurs, admitting renegotiation in case of partial failures or contextual changes
6. **Dissolution** — The interface is explicitly terminated, leaving no persistent contracts or structural coupling

The protocol describes a **relational choreography**, not a fixed sequence of function calls.

### Interaction Flow

```
┌─────────────┐                                      ┌─────────────┐
│   Agent A   │                                      │   Agent B   │
│ (Horizon₁)  │                                      │ (Horizon₂)  │
└──────┬──────┘                                      └──────┬──────┘
       │                                                    │
       │  1. Express Intent (Φ, C, R)                       │
       │ ─────────────────────────────►                     │
       │                                                    │
       │                    ┌───────────────┐               │
       │                    │  Coordinator  │               │
       │                    └───────┬───────┘               │
       │                            │                       │
       │         2. Match & Route   │                       │
       │         ◄──────────────────┤                       │
       │                            │                       │
       │                            │  3. Deliver Intent    │
       │                            ├──────────────────────►│
       │                            │                       │
       │                            │  4. Negotiate/Respond │
       │                            │◄──────────────────────┤
       │                            │                       │
       │  5. Ephemeral Contract     │                       │
       │ ◄──────────────────────────┤                       │
       │   (scoped, timed)          │                       │
       │                            │                       │
       │  6. Interaction            │                       │
       │ ◄──────────────────────────┼──────────────────────►│
       │                            │                       │
       │  7. Contract Dissolution   │                       │
       │ ─────────────────────────►─┴──────────────────────►│
       │   (no residual coupling)                           │
```

---

## 5. Intent Expression

An intent is a structured expression of a goal with context and constraints.

### Intent Structure

```json
{
  "intent": {
    "goal": "translate text from English to Portuguese",
    "context": {
      "domain": "technical documentation",
      "formality": "professional",
      "source_text": "The system processes requests asynchronously."
    },
    "constraints": {
      "max_latency_ms": 5000,
      "preserve_formatting": true
    },
    "preferences": {
      "style": "concise"
    }
  },
  "metadata": {
    "trace_id": "abc-123",
    "session_id": "session-456",
    "timestamp": "2024-12-21T10:00:00Z"
  }
}
```

### Intent Components

| Component | Required | Description |
|-----------|----------|-------------|
| `goal` | Yes | Natural language or structured description of the desired outcome |
| `context` | No | Situational information relevant to fulfilling the goal |
| `constraints` | No | Hard requirements that must be satisfied |
| `preferences` | No | Soft requirements that should be optimized for |

---

## 6. Messages as Intentional Acts

In LIP, the messages exchanged between agents are not merely data carriers, but **intentional acts**. Each message carries not only syntactic information, but also:

- An **explicit purpose** (the "why" of the action)
- A **semantic horizon** (the domain of meaning)
- A **normative context** (ethical, legal, or organizational constraints)

### The Hermeneutic Principle

In this perspective, error ceases to be interpreted as a formal protocol violation and becomes treated as a **semantic misalignment**, triggering mechanisms of clarification or renegotiation.

LIP institutionalizes **dialogue as a technical principle**.

### Message Intentionality Structure

An intent therefore carries more than a goal string. Purpose, semantic
horizon and normative context travel in the intent payload's `context`, and
they are what [IBAC](../ibac/README.md) evaluates:

```json
{
  "message_type": "intent",
  "payload": {
    "intent_text": "Generate the quarterly compliance report",
    "context": {
      "purpose": {
        "declared": "Generate quarterly compliance report",
        "category": "regulatory_compliance"
      },
      "semantic_horizon": {
        "domain": "financial_reporting",
        "ontology_refs": ["fin-onto:quarterly-report"]
      },
      "normative_context": {
        "policies": ["data-export-restrictions", "pii-handling"],
        "compliance_frameworks": ["SOX", "GDPR"]
      }
    },
    "ibac_claims_requested": ["finance:read", "report:generate"]
  }
}
```

This is the structural difference from protocols that carry only a method and
its arguments: the *why* travels with the request, which is what makes
purpose-bound authorization possible at all.

---

## 7. Semantic Matching

Semantic matching discovers agents capable of fulfilling an intent.

### Matching Process

1. **Parse Intent**: Extract goal, context, and constraints
2. **Query Registry**: Find agents with matching capabilities
3. **Rank Candidates**: Score by semantic similarity and constraint satisfaction
4. **Select Target(s)**: Choose best match(es) for routing

### Matching Criteria

- **Semantic Similarity**: Goal alignment with capability descriptions
- **Constraint Satisfaction**: Ability to meet hard requirements
- **Preference Optimization**: Best fit for soft requirements
- **Context Relevance**: Domain and situational fit

---

## 8. Capability Discovery

Agents register capabilities that describe what they can do.

### Capability Descriptor

```json
{
  "agent_id": "translator-agent-001",
  "capabilities": [
    {
      "name": "text_translation",
      "description": "Translates text between languages",
      "intents": [
        "translate text",
        "convert language",
        "localize content"
      ],
      "constraints": {
        "supported_languages": ["en", "pt", "es", "fr", "de"],
        "max_text_length": 10000
      },
      "views": {
        "input": ["text/plain", "text/markdown"],
        "output": ["text/plain", "text/markdown"]
      }
    }
  ]
}
```

---

## 9. Contract Lifecycle

Ephemeral contracts govern interactions. Unlike traditional API contracts that persist indefinitely, LIP contracts are **designed to dissolve**.

### The Anti-Debt Principle

Permanent contracts accumulate permanent debt. LIP contracts deliberately:

- Have **limited temporal validity**
- Are **scoped to the specific negotiated intent**
- **Do not exist** outside the context of that specific interaction

This prevents the accumulation of structural technical debt and promotes an ecosystem where interoperability is reconstructed at each interaction.

### States

```
┌─────────────┐
│  Proposed   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│  Accepted   │────►│   Active    │
└─────────────┘     └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌───────────┐ ┌───────────┐ ┌───────────┐
       │ Completed │ │  Expired  │ │ Terminated│
       └───────────┘ └───────────┘ └───────────┘
              │            │            │
              └────────────┴────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Dissolved  │ ← No residual coupling
                    └─────────────┘
```

### Contract Properties

| Property | Description |
|----------|-------------|
| `scope` | What the contract covers (limited to negotiated intent) |
| `duration` | How long it remains valid (explicit expiration) |
| `parties` | Participating agents |
| `terms` | Agreed conditions |
| `dissolution` | How it ends |

---

## 10. Message Envelope

Every LIP message is a JSON document with the following envelope. There is no
nesting: the envelope fields and the `payload` sit at the same level.

### Envelope Structure

```json
{
  "protocol_version": "0.1.0",
  "message_id": "0d6f2f1e-1b4a-4c62-9f6a-2c0f0c9a1d33",
  "session_id": "b1f2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  "message_type": "intent",
  "timestamp": "2026-08-20T10:00:00+00:00",
  "sender": {
    "kind": "requester",
    "id": "agent-a",
    "oidc_subject": "auth0|abc123"
  },
  "trace": {
    "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
    "span_id": "00f067aa0ba902b7"
  },
  "payload": {}
}
```

| Field | Type | Description |
|-------|------|-------------|
| `protocol_version` | string | The LIP version this message conforms to. Absent on messages from pre-versioning peers, which MUST be treated as `0.1.0`. See [§13](#13-protocol-versioning) |
| `message_id` | string (UUID) | Unique per message |
| `session_id` | string | Identifies the interaction context. Every message after the opening `intent` MUST carry it |
| `message_type` | enum | One of the performative acts below |
| `timestamp` | string (RFC 3339) | Emission time, UTC |
| `sender.kind` | enum | `requester`, `coordinator`, or `agent` |
| `sender.id` | string | Stable identifier of the sender |
| `sender.oidc_subject` | string | Authenticated subject, when transport authentication is in use |
| `trace` | object | W3C Trace-Context compatible propagation fields |
| `payload` | object | Type-specific content |

Routing is deliberately **not** an envelope field. A requester expresses what
it wants; selecting a counterparty is the coordinator's responsibility, and
allowing the sender to name a target would reintroduce the endpoint coupling
the protocol exists to remove.

### Message Types

Message types are **performative acts**: each one does something to the
interaction context rather than merely reporting on it. The set is closed —
an implementation that needs a new one needs an RFC.

| Type | Direction | Effect on the interaction |
|------|-----------|---------------------------|
| `register` | Agent → Coordinator | Declares an agent and the capabilities it offers. Sent on every connection, before anything else |
| `registered` | Coordinator → Agent | Accepts or refuses that declaration, with a reason |
| `intent` | Requester → Coordinator | Articulates an objective; **instantiates** the interaction context |
| `offer` | Agent → Coordinator, Coordinator → Requester | Declares a capability relevant to the intent. From the coordinator it carries the full composed execution plan for approval |
| `accept` | Requester → Coordinator, Coordinator → Requester | Signals agreement; **stabilises** the context |
| `reject` | Either | Signals refusal with a structured reason, optionally requesting renegotiation rather than termination |
| `execute` | Coordinator → Agent | Authorises execution under the negotiated terms |
| `complete` | Agent → Coordinator | Signals termination of execution, successful or not |
| `dissolve` | Coordinator → All | **Invalidates** the context and triggers mandatory cleanup |
| `event` | Coordinator or Agent → Any | Progress and status notification. Carries no performative weight and MUST NOT alter session state |

Note that `reject` is not an error type. A rejection carrying a
`renegotiation_hint` is a move in the conversation, and the coordinator
SHOULD attempt a further negotiation round incorporating it. See
[§11](#11-error-handling).

`register` and `registered` do not belong to an interaction context, so
their `session_id` is empty. Every other performative carries the session it
acts on.

The table gives each performative's origin. Note that a coordinator
**relays** `intent` to the agents it considers candidates, carrying the
session it opened; an agent could not otherwise know what to offer against.
Offers are returned under that same `session_id`.

Every message is wrapped in the envelope defined above, and the payload of
each type is specified by its
[JSON Schema](https://github.com/draiven-io/agentic-bus/tree/main/schemas).

### Agent Admission

An agent joins a bus by sending `register` and waiting for `registered`.
Registration is **per connection**, not per process: a coordinator holds its
capability registry against the live socket, so an agent that reconnects MUST
register again — one that does not is connected but undiscoverable.

```
Agent                               Coordinator
  │                                      │
  │  register (capabilities, mode)       │
  │ ────────────────────────────────────►│
  │                                      │ admission decision
  │  registered (accepted | reason)      │
  │ ◄────────────────────────────────────│
  │                                      │
  │            … intent / offer / execute …
```

Agents:

- MUST be receiving before they register. The acknowledgement can arrive
  before the send returns, so a client that attaches its message handler
  after registering may miss it — along with anything else sent in that
  window. An independent implementation lost both its `registered` answer and
  a subsequent `intent` to exactly this.
- MUST send `register` as the first message on every connection.
- SHOULD wait for `registered` before considering themselves live.
- MUST NOT treat a missing `registered` as fatal — a coordinator implementing
  0.1.0 never sends one. Agents SHOULD warn.
- SHOULD surface a refusal. A refusal MAY be transient (an agent awaiting
  approval becomes valid once approved), so agents MAY stay connected and
  retry on the next reconnection.

Coordinators:

- MUST answer every `register` with `registered`, including on failure — an
  agent waiting on that answer would otherwise wait indefinitely.
- MAY accept an agent while declining individual capabilities, reporting what
  was accepted in `registered_capabilities`.
- SHOULD still accept the deprecated pre-0.2.0 form (`complete` with
  `session_id="__registration__"`), logging a deprecation warning.

> **Before 0.2.0**, agents registered by sending `complete` with
> `session_id="__registration__"`. That form was never described here, so an
> agent written from this document alone would connect and never be
> discovered. See [RFC 0001](../../rfcs/0001-register-performative.md).

---

### Dissolution During Execution

An agent may be executing when `dissolve` arrives. It MUST abandon that work,
and MUST NOT send `complete` for the dissolved session: the interaction
context has been invalidated, so there is nothing left to complete against. A
coordinator MUST tolerate a `complete` that was already in flight when it
sent the `dissolve`.

---

## 11. Error Handling

Errors in LIP are opportunities for negotiation, not failures.

### Error Categories

| Category | Description | Resolution |
|----------|-------------|------------|
| `clarification_needed` | Intent unclear | Request more information |
| `constraint_violation` | Cannot satisfy constraints | Negotiate alternatives |
| `capability_mismatch` | No matching agents | Suggest alternatives |
| `policy_denial` | IBAC policy rejected | Explain requirements |
| `contract_expired` | Interaction timed out | Renegotiate if needed |

### Error Response

```json
{
  "error": {
    "category": "clarification_needed",
    "message": "The target language was not specified",
    "suggestions": [
      "Please specify the target language for translation",
      "Did you mean Portuguese (pt-BR or pt-PT)?"
    ],
    "recoverable": true
  }
}
```

---

## 12. Security Considerations

### Authentication

- Credentials are carried in the transport's connection handshake, not in
  protocol messages. Over WebSocket that is an `Authorization: Bearer
  <token>` header on the upgrade request. Stating this matters: an
  implementation that put the token in its first message, or in a query
  parameter, would fail to connect with nothing to indicate why.
- Agents must be authenticated before participating
- Identity is established but not solely relied upon for authorization
- See [IBAC](../ibac/README.md) for purpose-based access control

### Transport Security

- All communications should use encrypted transport (TLS 1.3+)
- Message integrity must be verifiable
- Replay attacks must be prevented

### Privacy

- Intents may contain sensitive information
- Semantic matching should not leak intent content to unauthorized parties
- Traces must be access-controlled

---

## 13. Protocol Versioning

Every envelope carries `protocol_version`. Semantic versioning applies to the
**wire format**:

| Component | Changes when |
|-----------|--------------|
| Patch | Editorial clarification only; no implementation need change |
| Minor | Backwards-compatible addition — a new optional field, or a new message type a peer may safely ignore |
| Major | Anything that would break an existing implementation: a removed or renamed field, a changed type, a new required field, or a change to the meaning of an existing performative |

Implementations:

- MUST populate `protocol_version` on every message they emit.
- MUST treat a message with no `protocol_version` as `0.1.0`.
- MUST reject a message whose major version they do not implement, using a
  `reject` carrying `reason: "unsupported_protocol_version"`.
- SHOULD accept a higher minor version, ignoring fields and message types
  they do not recognise. This is what makes minor additions safe.

Ignoring an unknown `event` message is always safe by construction; ignoring
an unknown performative is not.

### Compatibility is not always symmetric

A minor version can still constrain the order in which peers are upgraded.
`register` (0.2.0) is the worked example:

| Agent | Coordinator | Result |
|-------|-------------|--------|
| 0.2.0 | 0.2.0 | Full handshake |
| 0.1.0 | 0.2.0 | Works — the deprecated form is still accepted |
| 0.2.0 | 0.1.0 | **Agent never registers** — the coordinator ignores `register` |

**Upgrade coordinators before agents.** A specification that adds a
performative one side must understand SHOULD state the upgrade ordering
explicitly, rather than leaving implementers to discover it.

### Reading an unversioned message

An envelope with no `protocol_version` MUST be read as `0.1.0` — the last
version predating the field. Implementations MUST NOT substitute their own
current version, which would read a legacy peer's message as whatever version
the implementation happens to be, and is precisely the misreading the field
exists to prevent.

---

## Related Specifications

- [IBAC](../ibac/README.md) - Intent-Based Access Control
- [Views](../views/README.md) - View/Schema Registry Conventions

## Appendices

- **A. JSON Schema definitions** — [generated from the reference implementation](https://github.com/draiven-io/agentic-bus/tree/main/schemas).
  Regenerate with `python -m app.core.protocol.export_schemas`; CI fails if
  they drift from the models.
- [B. Protocol Examples](examples.md) *(planned)*
- [C. Compatibility Guidelines](compatibility.md) *(planned)*
