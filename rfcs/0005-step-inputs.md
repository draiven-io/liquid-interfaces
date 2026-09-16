# RFC 0005: Step Inputs

> **Status**: Draft
> **Author**: Dhiogo José Correa de Sá, @dhiogocorrea
> **Created**: 2026-09-16
> **Updated**: 2026-09-16

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

After the plan is composed and before it is dispatched, the coordinator
composes each step's parameters. It has, for every step: the intent text, the
capability's description, the `input_schema`, and what earlier steps produced.

The composition is semantic and a language model is the expected mechanism.
This RFC does not specify the prompt. It specifies what the result must
satisfy.

#### Validation

Composed parameters MUST be validated against the `input_schema` that produced
them, before the `execute` is sent.

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
- Where composition depends on an earlier step's result, parameters cannot be
  composed before the plan starts. Does the plan carry *deferred* steps, or
  does the coordinator compose progressively as results arrive?

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
