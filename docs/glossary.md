# Glossary

> Key terms and definitions in the Liquid Interfaces ecosystem

---

## A

### Agent

A participant in a liquid system—human or artificial—capable of expressing intent, interpreting meaning, negotiating constraints, and assuming responsibility. Agents are not merely clients or services; they are autonomous actors.

---

## C

### Capability Descriptor

A semantic declaration of what an agent can do, expressed in terms of intents it can fulfill, constraints it operates under, and views it can produce or consume.

### Contract (Ephemeral)

A temporary, scoped agreement between agents for a specific interaction. Unlike traditional API contracts, ephemeral contracts have explicit lifetimes and dissolution conditions.

---

## E

### Envelope

The protocol structure that wraps intent expressions, containing metadata such as trace IDs, session context, policy references, and routing information.

---

## H

### Hermeneutic Integration

Integration based on interpretation and meaning negotiation, as opposed to syntactic validation. Errors become opportunities for clarification rather than failures.

---

## I

### IBAC (Intent-Based Access Control)

A governance model where access decisions are based on the **purpose** of a request rather than the identity of the requester. Policies evaluate why an action is requested, what data it affects, and which risks it introduces.

### Intent

A goal expression with context and constraints. Intents describe **what** an agent wants to achieve without specifying **how** to achieve it. They are the primary input to liquid systems.

### Intent Expression

The formal declaration of an intent, including:
- The goal to be achieved
- Contextual information
- Constraints and preferences
- Required outcomes

### Interface (Liquid)

An emergent, temporal agreement between agents that exists only for the duration of an interaction. Unlike static APIs, liquid interfaces are not predefined—they are negotiated at runtime.

---

## L

### LIP (Liquid Interface Protocol)

The core protocol specification for intent expression, semantic matching, and agent interaction in liquid systems.

### Liquidity

The property of a system that enables it to adapt its shape without breaking. Liquidity is not chaos—it is resilience under change.

---

## M

### Meaning Negotiation

The process by which agents establish shared understanding through dialogue. In liquid systems, meaning is not assumed from syntax alone but actively constructed through interaction.

---

## P

### Policy Engine

The component responsible for evaluating intents against governance rules. In IBAC, the policy engine determines whether an intent should be allowed, modified, or denied based on purpose and context.

### Purpose

The reason behind an action or request. In liquid systems, purpose is a first-class citizen used for governance, routing, and observability.

---

## S

### Semantic Bus

A reference implementation infrastructure for liquid interfaces that provides intent routing, agent orchestration, and semantic matching capabilities.

### Semantic Matching

The process of finding agents capable of fulfilling an intent based on semantic similarity rather than exact endpoint matching. Enables discovery and routing without rigid coupling.

### Semantic Observability

The ability to audit and understand the reasoning behind system behavior, including intent expressions, policy decisions, routing choices, and outcome justifications. Goes beyond technical logging to capture meaning.

### Session

A bounded context for a series of related interactions. Sessions maintain state, history, and context across multiple intent expressions.

---

## T

### Temporal Agreement

See [Contract (Ephemeral)](#contract-ephemeral).

### Trace

A record of an interaction's journey through the system, including intent expression, matching decisions, policy evaluations, and outcomes. Enables semantic observability.

---

## V

### View

A specific representation or projection of data agreed upon by interacting agents. Views enable schema flexibility and partial data exposure without tight coupling.

### View Registry

A system for registering, discovering, and negotiating data views between agents. Enables agents to agree on compatible representations at runtime.

---

## Related Documents

- [Architecture Overview](overview.md)
- [LIP Specification](../spec/lip/README.md)
- [IBAC Specification](../spec/ibac/README.md)
- [View Conventions](../spec/views/README.md)
