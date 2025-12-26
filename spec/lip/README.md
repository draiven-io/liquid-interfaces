# Liquid Interface Protocol (LIP)

> The core protocol for intent-driven agent interaction

**Status**: Draft  
**Version**: 0.1.0  
**Last Updated**: 2024-12

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
       │                    │ Semantic Bus  │               │
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

```json
{
  "message": {
    "type": "intent_request",
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
  }
}
```

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

## 8. Message Envelope

All LIP messages are wrapped in a standard envelope.

### Envelope Structure

```json
{
  "envelope": {
    "version": "0.1.0",
    "type": "intent_request",
    "id": "msg-789",
    "trace_id": "abc-123",
    "session_id": "session-456",
    "timestamp": "2024-12-21T10:00:00Z",
    "sender": {
      "agent_id": "agent-a",
      "capabilities": []
    },
    "routing": {
      "target": null,
      "policy": "semantic_match"
    }
  },
  "payload": {
    // Intent or response content
  }
}
```

### Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `intent_request` | A → B | New intent expression |
| `intent_response` | B → A | Response to intent |
| `clarification_request` | B → A | Request for more information |
| `clarification_response` | A → B | Additional information |
| `contract_proposal` | Bus → Both | Proposed ephemeral contract |
| `contract_accept` | Agent → Bus | Accept contract |
| `contract_dissolve` | Either → Bus | End contract |

---

## 9. Error Handling

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

## 10. Security Considerations

### Authentication

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

## Related Specifications

- [IBAC](../ibac/README.md) - Intent-Based Access Control
- [Views](../views/README.md) - View/Schema Registry Conventions

## Appendices

- [A. JSON Schema Definitions](schemas.md) *(planned)*
- [B. Protocol Examples](examples.md) *(planned)*
- [C. Compatibility Guidelines](compatibility.md) *(planned)*
