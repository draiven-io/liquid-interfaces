# RFC 0005: Step Inputs

> **Status**: Draft
> **Author**: Dhiogo José Correa de Sá, @dhiogocorrea
> **Created**: 2026-09-16
> **Updated**: 2026-09-17

---

## Summary

A capability declares the shape of what it **produces** and is held to it
(RFC 0002). It declares nothing about the shape of what it must be **told**.

So a plan names the agents that will run and says nothing about what they run
with. The requester's context travels to every step unchanged, which means
whoever writes an intent has to know that step two will be a document agent
expecting a field called `descricao`.

That is a contract. It is written in a JSON object rather than an OpenAPI
document, and it binds a requester to an agent it never chose, but it is a
contract — the thing this protocol exists to dissolve, moved rather than gone.

This RFC adds the other half of the symmetry. A capability publishes an
`input_schema`; the coordinator composes each step's parameters from the
intent and validates them against that schema before dispatch.

**Where the composition happens is the argument, not an implementation
detail.** Somebody must turn prose into parameters. Done in the agent, it puts
a language model next to a credential, reading text an attacker may have
influenced. Done in the coordinator, it puts that model where there is nothing
to steal — and the coordinator is the only party holding the intent, every
capability's declared shape, and no credential at all.

---

## Motivation

### Problem Statement

LIP replaces a contract written at design time with one negotiated at runtime.
The negotiation covers *who participates* thoroughly: an agent declares what it
does, the coordinator discovers candidates, offers are composed into a plan,
and the plan is approved.

It covers *what each participant is told* not at all.

An `execute` carries the requester's context verbatim. Every step receives the
same object. An agent therefore finds its parameters by looking for keys it
hopes are there, and a requester supplies those keys by knowing in advance
which agents the coordinator will select and what each one calls its fields.

Three consequences follow, and they compound:

**The contract comes back, relocated.** A requester that must write
`{"modelo": {"descricao": ...}}` has a design-time dependency on step two. It
is not stated in a schema, not versioned, and not checked — which makes it
worse than the OpenAPI document it replaced, not better.

**Parsing prose falls to the agent.** With no parameters composed for it, an
agent that needs specifics has only `intent_text`. Parsing it requires a
language model, in the process that holds a credential, over text that
upstream data may have influenced. Every deployment guideline this protocol
implies argues against putting one there — and the absence of step inputs is
what forces it.

**The composition is not intelligent, while everything around it is.** A
coordinator runs a model for intent admission, for discovery, for offer
eligibility, for negotiation acceptance, for artifact emission. All of it
answers *may this happen?* The step that decides *what exactly should happen*
is a projection of accepted offers. The system reasons carefully about
permission and not at all about instruction.

### Use Cases

**A document step that must be told what to look for.** "Send the welcome
email" implies a search. The agent publishes that it needs a description; the
coordinator composes `{"descricao": "modelo de e-mail de boas-vindas"}` from
the intent. Neither the requester nor the agent needed to know about the other.

**A requester that is not a programmer.** An intent typed by a person carries
no context object. Today that means every step runs unparameterised.

**An agent whose inputs change.** A capability that adds an optional filter
publishes a new `input_schema` on its next registration. No requester changes,
because no requester was ever writing those parameters.

**A deployment with no model configured.** Composition produces nothing and
the interaction proceeds exactly as it did before this RFC. The feature is
additive in behaviour as well as in schema.

---

## Design

### Overview

Four moving parts:

1. A capability MAY publish an `input_schema` describing the parameters it
   needs.
2. The `offer` carries it, so the coordinator sees it during composition.
3. After the plan is composed, the coordinator composes each step's parameters
   from the intent against that schema.
4. What is composed is validated against the same schema before it is sent.

The agent's programming interface does not change. Composed parameters reach
it the way context always has.

### Detailed Design

#### What a capability publishes

```json
{
  "capability_id": "doc.buscar_modelo",
  "description": "Encontra um modelo de documento a partir de uma descrição",
  "input_schema": {
    "type": "object",
    "properties": {
      "descricao": {
        "type": "string",
        "description": "O documento procurado, em linguagem natural"
      }
    },
    "required": ["descricao"]
  },
  "output_schema": { "...": "..." }
}
```

The field descriptions are not decoration. They are what the composing party
reads to decide what belongs in each slot, exactly as an agent's
`semantic_description` is what discovery reads. **A schema with no descriptions
is a schema nothing can fill well.**

#### Composition

The coordinator composes a step's parameters **at dispatch** — immediately
before that step's `execute` — not when the plan is composed. At plan time no
step has run, so nothing produced by an earlier step can reach a later one;
composing then leaves a consumer no way to be parameterised from a producer
except by reaching into the producer's memory by name, which is the coupling
this protocol exists to dissolve.

At dispatch the coordinator has: the intent text, the capability's description,
its `input_schema`, the artifacts earlier steps reported, and what earlier
steps left in shared memory that *this* step may read.

The composition is semantic and a language model is the expected mechanism.
This RFC does not specify the prompt. It specifies what the result must
satisfy, and one thing about what the model is shown.

#### Shapes, not data

What earlier steps left in memory is shown to the composing model as
**shapes** — `list[4] of {id, nome, email, criado_em}` — never as values. The
model fills a parameter from memory by returning a **reference**, which the
coordinator resolves deterministically before validation:

```json
{"$from": "<memory key>"}
{"$from": "<memory key>", "$path": "a.b"}
{"$from": "<memory key>", "$fields": {"dest": "src"}}
```

The model decides the mapping; code applies it to the data. This is the same
split that keeps a dataset out of an agent's model context, applied to the
coordinator's own model. A reference to a key this step was not granted is a
composition violation, not an exception.

This is also where two agents that never met are joined. The producer
published the shape of what it made; the consumer published the shape of what
it needs; neither named the other. The mapping between the two is computed
here, for this interaction, and does not outlive it.

#### Ordering

Composition at dispatch presumes the steps run in an order in which a
consumer follows its producers. A coordinator that decomposes an intent into
sub-intents with dependencies SHOULD order the plan by those dependencies. The
step set is authoritative and the order advisory: an ordering that drops,
repeats or invents a step MUST be discarded in favour of the original order.

#### Validation

Composed parameters MUST be validated against the `input_schema` that produced
them, after references are resolved and before the `execute` is sent — so what
is checked is what the agent will receive.

This mirrors RFC 0002 in the other direction, and for the same reason. An
artifact that does not match its promised shape fails one or two hops from its
cause; a *parameter set* that does not match fails inside an agent, which then
reports a failure that describes a symptom rather than the composition error
that caused it.

#### What happens when composition fails

A step whose parameters could not be composed, or whose composed parameters
the schema refuses, MUST NOT be dispatched with them.

It falls back to the requester's context — the behaviour every implementation
had before this RFC — and the failure is recorded.

The alternative, dispatching what was composed anyway, is worse than composing
nothing: the agent acts on a shape nobody validated, having been told it would
receive one that was.

#### On the agent

The declared shape is the source of truth on both sides of the wire. An agent
SHOULD validate the context it receives against its own published
`input_schema` before acting on it, and report a mismatch as `invalid_input`,
distinct from an execution error: the agent did not fail, it was handed a
shape it never agreed to receive. The fields that failed SHOULD travel on the
completion, so the composition upstream can be corrected rather than guessed
at.

This matters on one path in particular. When composition fails validation the
step falls back to the requester's context, which nobody validated. There, the
agent's own check is the only one.

To know *which* of its capabilities a step executes, an agent needs the
capability's own identifier on the `execute`. Reference coordinators send the
session's IBAC capability in `capability_id`; the agent's own is sent as
`agent_capability_id`.

#### Precedence

Where both exist, a step's composed parameters take precedence over the
requester's context for the keys they define. The requester's other keys still
reach the agent.

Composed parameters were derived for *this* step and validated against *this*
agent's published shape. The requester's context was written without knowing
which agents would be selected.

#### Requirements

An implementation claiming conformance:

- **MUST** accept an absent `input_schema`. A capability that cannot describe
  its input is still useful, and requiring one would exclude exactly the
  exploratory agents this protocol exists to accommodate.
- **MUST** validate composed parameters against the declaring capability's
  `input_schema` before dispatch.
- **MUST NOT** dispatch a step with parameters that failed validation.
- **MUST NOT** fail an interaction because composition failed. A coordinator
  with no model available, or one whose model is unreachable, proceeds without
  composed parameters.
- **SHOULD** report a composition failure as an event naming the step, so the
  reason a step ran unparameterised is visible rather than inferred.
- **SHOULD** pass what earlier steps produced to the composition, so a later
  step can be parameterised from an earlier result.
- **MUST NOT** treat an absent schema as a successful composition of nothing.
  "Nobody published a shape" and "we composed and found nothing to fill" are
  different facts, and an audit trail that conflates them says more than it
  knows.
- **MUST NOT** show the composing model the contents of shared memory. It is
  shown shapes and answers with references; the coordinator resolves them.
- **MUST** resolve references before validating, so the schema checks what
  the agent will receive.
- **SHOULD** order steps by the intent's decomposition, and **MUST NOT** let
  that ordering change the step set.
- An agent **SHOULD** validate its received context against its own
  `input_schema` and report a mismatch as `invalid_input`.

### Integration

**RFC 0001** — `input_schema` travels on the capability in `register`, with
the other per-capability metadata.

**RFC 0002** — the same idea in the other direction. Together they close the
loop: an agent publishes both shapes, and both are checked at the boundary
where they can be.

**RFC 0003** — scope answers *may this agent do this*; this answers *what is
it being asked to do*. A step can be perfectly authorised and still
unparameterised, which is the state every implementation is in today.

**RFC 0004** — where intent terms exist, a term marked fixed constrains what
composition may produce for the field it governs. Composition proposes; a
fixed term is not a proposal.

### Versioning

Additive. `input_schema` is optional on the capability and on the offer; a
capability that omits it behaves exactly as before. An older coordinator
ignores an unknown field. An older agent receives composed parameters as
ordinary context.

**Minor** version bump.

---

## Alternatives Considered

### Let the agent parse the intent text

Rejected. It requires a language model in the process holding the credential,
reasoning over text that upstream data may have influenced. It also duplicates
the work across every agent, each solving it slightly differently, when the
coordinator already holds everything needed to do it once.

### Have the requester supply parameters per step

This is the status quo. It requires the requester to know which agents will be
selected and what each calls its fields — a design-time dependency on a
runtime decision, which is the coupling this protocol exists to remove.

### Derive parameters from the capability description alone, without a model

A deterministic mapping from prose to a schema is not available. A keyword
heuristic would produce plausible-looking parameters that are wrong, which is
worse than none: an agent cannot tell a badly composed parameter from a
deliberate one.

### Make the agent validate its own inputs

It already may, and should. But an agent that rejects malformed input reports
it as a failed execution, one hop from the composition that caused it. Both
checks are worth having; only the coordinator's can prevent the dispatch.

### Compose all steps at once, in one call

Attractive for latency and for coherence between steps. Rejected for now
because a single failure then costs every step's parameters rather than one,
and because a later step's parameters may depend on an earlier step's result,
which does not exist yet at composition time. Worth revisiting.

---

## Drawbacks

**A model call per parameterised step**, on the path between approval and
execution. Steps that publish no schema cost nothing.

**A new way to be wrong.** A model that composes plausible but incorrect
parameters produces a step that runs on the wrong instruction. Validation
catches shape, never intent — a syntactically perfect `{"descricao": "política
de reembolso"}` for an intent about welcome emails passes every check here.
This RFC narrows the failure from *unparameterised* to *possibly misparameterised*,
which is an improvement and not a solution.

**Schema quality becomes load-bearing.** A capability whose field descriptions
are thin gets parameters composed from guesswork, and the agent has no way to
tell. The same exposure `semantic_description` already has for discovery, now
on a second surface.

**The coordinator learns more about each agent.** It composes parameters, so
it reads what each capability needs. That is a larger surface than routing
alone, and a coordinator that is compromised now knows more.

---

## Unresolved Questions

- Should a failed composition be surfaced to the **requester** for correction,
  rather than only logged? The information is most useful to the party that
  wrote the intent, and reaching them costs a round trip.
- Should composed parameters be part of what the requester **approves** in the
  plan? They are part of what will happen, and today the approval covers who
  runs but not with what.
- Is there a case for an agent **rejecting** composed parameters as
  semantically wrong while schema-valid, and what performative carries that?
  `reject` with a `renegotiation_hint` is the obvious candidate.
- ~~Where composition depends on an earlier step's result, parameters cannot
  be composed before the plan starts.~~ Resolved: composition happens at
  dispatch, progressively, as results arrive (see *Composition*).
- With composition at dispatch, the plan the requester approves no longer
  contains the parameters each step will run with. Whether approval should
  cover them — and what it would mean to approve a mapping over shapes rather
  than values — is open.

---

## Future Possibilities

**Parameters as a negotiation move.** An agent that receives parameters it can
improve on could counter, making composition part of the negotiation rather
than a step before it.

**Schema-guided decomposition.** If the coordinator reads every candidate's
`input_schema` before composing the plan, it can prefer a decomposition whose
steps it can actually parameterise from the intent it holds.

**Examples on the schema.** A capability that publishes worked examples of its
parameters alongside the schema would compose better, the way a few-shot
example improves any semantic task.

---

## References

- [LIP specification](../spec/lip/README.md) — §4, §5
- [RFC 0001: The `register` Performative](0001-register-performative.md) —
  where a capability's metadata travels
- [RFC 0002: Capability Authority](0002-capability-authority.md) — the same
  principle for what an agent produces
- [RFC 0003: Scope Vocabulary and Admission](0003-scope-vocabulary.md) —
  authority, as distinct from instruction
- [RFC 0004: Intent Terms](0004-intent-terms.md) — what composition may not
  propose

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-16 | Initial draft |
| 2026-09-17 | Composition moves to dispatch; shapes and references; ordering by decomposition; agent-side validation and `invalid_input`; `agent_capability_id` |
