# RFC 0004: Intent Terms

> **Status**: Draft
> **Author**: Dhiogo José Correa de Sá, @dhiogocorrea
> **Created**: 2026-08-23
> **Updated**: 2026-08-23

---

## Summary

An intent can state a term — an 18% discount, a five-day deadline, a budget of
R$ 40,000 — and has nowhere to put it. `IntentPayload` carries `intent_text`
and an untyped `context`, so a term is prose or an unlabelled key, and a
coordinator has nothing derived from the intent to compare a plan against.

An agent can therefore alter a stated term, and nothing distinguishes that
from proposing a means. This RFC adds `terms` to the intent, with a marker for
the ones an agent may not change, so a plan that contradicts one is refused
rather than presented as a line in a nine-step summary.

It is deliberate about what this cannot do. Both sides of the comparison are
*declared*, so this catches an honest divergence and a misconfiguration. It
does not catch an agent that changes a term without saying so — that is caught
where the artifact is, and the RFC says so rather than implying otherwise.

---

## Motivation

### Problem Statement

**LIP negotiates how an intent is fulfilled, not what it is.** Which agents,
at what cost, in what order, under which constraints they each declare. That
distinction is load-bearing and the specification relies on it everywhere —
and there is no field in which it is expressed.

Consider a requester asking for an upsell email at an 18% discount, and an
agent offering:

```json
{
  "message_type": "offer",
  "payload": {
    "capability_id": "issue_coupon",
    "constraints": { "max_discount": 0.16 }
  }
}
```

The agent has not proposed a *means*. It has proposed a **different
objective**, and the protocol cannot tell the difference, because:

```python
class IntentPayload(BaseModel):
    intent_text: str
    context: dict[str, Any]
    ...
```

There is no field where a term is a term. The 18% is prose in `intent_text`,
or an unlabelled key in `context` that nothing knows to be a commitment rather
than a hint.

**Three consequences follow, and the third is the one that costs.**

A coordinator cannot check a plan against the intent, because it has nothing
structured to check against.

An agent cannot tell which parts of an intent it may adapt. Most agents that
alter a term are not adversarial — they are being helpful about a number they
had no way to know was a commitment.

And a requester's only defence is to read carefully. The accept gate is real
and it works, but "the term was changed" is one line among nine steps, at the
end of a flow whose whole purpose was to save them from reading nine steps.
A control that depends on attention will fail on the day attention is short,
which is the day it mattered.

### Where it already bites

The specification has been living with this. §11 defines
`constraint_violation` — *"cannot satisfy constraints"* — as an error category,
which presumes constraints exist as something an implementation can identify.
They do not.

And [the worked example](../docs/worked-example-upsell.md) ends on precisely
this: it traces one interaction through all five IBAC evaluation points, and
the term-alteration is the one thing none of them is designed to catch.

### Use Cases

- **A commitment that is not a preference.** A budget, an SLA, a delivery
  window, a regulatory limit — stated by the requester and not an agent's to
  adjust.
- **An adaptable target.** A requester asking for delivery *within* five days
  wants a plan proposing three; the same requester asking for a coupon at
  exactly 18% does not want 16. Both are numbers in an intent, and today they
  are indistinguishable.
- **An agent that can be honest.** An agent reading `terms` knows what it may
  adapt, rather than guessing from prose.
- **A refusal with a reason.** *"No plan can satisfy `discount = 0.18`"* is
  actionable; a plan that quietly says 16% is not.

---

## Design

### Overview

An intent carries a list of **terms**. Each names a quantity the requester
stated, its value, and whether an agent may propose a different one.

```json
{
  "terms": [
    { "name": "discount",      "value": 0.18, "fixed": true },
    { "name": "delivery_days", "value": 5,    "fixed": false },
    { "name": "coupon_hours",  "value": 24,   "fixed": true }
  ]
}
```

An offer that wishes to constrain a term names it the same way. A coordinator
compares, and a contradicted **fixed** term stops the plan.

### Detailed Design

#### The term

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | What the term refers to, in the requester's vocabulary |
| `value` | any | yes | The stated value |
| `fixed` | boolean | no | Whether an agent may propose a different value. Default `false` |

`fixed` defaults to `false` deliberately. A requester who has not thought about
fixity has not committed to anything, and reading silence as a commitment
would refuse plans that are fine — the same reasoning that makes an empty
credential ceiling mean *no limit expressed* rather than *nothing permitted*
(RFC 0003).

#### Naming

A term's `name` is the requester's, and the coordinator relays the intent to
candidate agents, so an agent can read the terms it is being asked about and
answer in the same vocabulary. No catalogue is required.

This is a departure from RFC 0003, where scope names belong to the deployment,
and the reason is that the two are different kinds of thing. A scope is a
permission the deployment defines and reuses across every interaction. A term
belongs to *one intent* and is meaningful only within it. Imposing a catalogue
would require a deployment to enumerate every quantity anyone might ever
state, which is not a list that can be finished.

#### Comparison

A coordinator MUST treat an offer as contradicting a term when the offer's
constraints carry the same `name` with a different value.

Equality is the whole of the required semantics. Anything richer — that
`max_discount: 0.16` *narrows* `discount: 0.18` rather than merely differing
from it, that `delivery_days: 3` *satisfies* a term of 5 — requires knowing
what the term means, and a coordinator does not. Ordering and satisfaction
semantics are left open below rather than guessed at here.

#### Requirements

Requesters:

- **SHOULD** state as a term any quantity a plan could get wrong, rather than
  relying on it being read out of `intent_text`.
- **SHOULD** mark `fixed` only what is genuinely not an agent's to change. A
  requester who marks everything fixed has written a script, not an intent,
  and should expect no plans.

Coordinators:

- **MUST** refuse a plan containing an offer that contradicts a `fixed` term,
  and **MUST** report which term, with both values.
- **MUST NOT** silently reconcile the difference by preferring either value.
- **SHOULD** relay `terms` to candidate agents, so an agent can offer against
  them rather than guess.
- **SHOULD** surface a contradicted non-fixed term in the proposed plan rather
  than merely permitting it — a divergence a requester may accept is still one
  they should see.

Agents:

- **MUST NOT** assume a term is adjustable because it is a number.
- **SHOULD** decline rather than adapt when they cannot meet a `fixed` term.
  An offer that cannot honour a commitment is more useful than a plan that
  quietly does not.

### Examples

An intent with a commitment and a target:

```json
{
  "message_type": "intent",
  "payload": {
    "intent_text": "Send customer 88213 an upsell email for product X with an 18% coupon valid 24 hours, delivered in 2–5 days.",
    "context": { "customer_id": "88213", "product_id": "X" },
    "terms": [
      { "name": "discount",      "value": 0.18, "fixed": true },
      { "name": "coupon_hours",  "value": 24,   "fixed": true },
      { "name": "delivery_days", "value": 5,    "fixed": false }
    ]
  }
}
```

An offer that contradicts one:

```json
{
  "message_type": "offer",
  "payload": {
    "capability_id": "issue_coupon",
    "constraints": { "discount": 0.16 }
  }
}
```

The refusal, at negotiation acceptance:

```json
{
  "error": {
    "category": "constraint_violation",
    "message": "sales-agent:issue_coupon proposes discount 0.16; the intent fixes it at 0.18",
    "suggestions": [
      "Resubmit with discount 0.16 if that is acceptable",
      "The term is marked fixed, so no agent may change it"
    ],
    "recoverable": true
  }
}
```

The first suggestion is the important one. **The requester changes their own
terms; agents do not.** A resubmission at 16% is a decision by whoever holds
the authority to make it, which is exactly what the accept gate exists to
protect and what a quiet substitution bypasses.

An offer meeting a non-fixed target better than asked:

```json
{ "capability_id": "check_availability", "constraints": { "delivery_days": 3 } }
```

Three is not five, so it is a divergence, and `delivery_days` is not fixed —
so it proceeds, and appears in the plan the requester sees. Under equality
semantics a coordinator cannot tell that three is *better*; it can only tell
that it differs. That is a real limitation and is listed as one.

### Integration

- **LIP** — §5 (Intent Expression) gains `terms`; §11's existing
  `constraint_violation` finally has something it can identify. No new
  performative and no change to any other payload.
- **IBAC** — a fixed term is a fact *about the intent*, not about the actor,
  so it does not belong to any of the five evaluation points. The check sits
  beside negotiation acceptance and is deterministic: no model reads it, and
  no wording of the intent text changes its outcome.
- **RFC 0002 / 0003** — the same shape a third time. 0003 governs what an
  agent asks for, 0002 what it produces, and this what it may *alter*.

### Versioning

Additive: one optional field on one payload. Raises the protocol to **0.4.0**,
with a symmetric matrix.

| Requester | Coordinator | Result |
|---|---|---|
| 0.4.0 | 0.4.0 | Fixed terms enforced |
| 0.3.0 | 0.4.0 | No terms declared; nothing to enforce, as today |
| 0.4.0 | 0.3.0 | Terms ignored — the requester's accept remains the only gate |

The third row is worth stating plainly rather than leaving to be discovered: a
requester marking a term `fixed` against an older coordinator gets **no**
protection from it, and no indication of that. A coordinator implementing this
SHOULD report it in `registered` or an equivalent capability announcement so
the absence is visible.

---

## Alternatives Considered

### Leave it in `context` and add `fixed_terms: list[str]`

Name the inviolable keys and keep values where they are. Genuinely smaller,
and it was the first shape I tried.

Rejected because `context` is an open bag whose keys mean whatever the
requester and agents have agreed offline, so `fixed_terms: ["discount"]`
constrains a key that no agent knows to answer in. Terms need to be a distinct
structure precisely so that both sides can see they are talking about the same
thing.

### A comparator language

`{ "name": "discount", "op": "eq", "value": 0.18 }`, with `lte`, `gte`, ranges
and units. This is where the design wants to go, and it is why `delivery_days`
is awkward above.

Rejected **for now**, not on principle. A comparator vocabulary is a small
language, and a small language invented without implementations to check it
against is how a specification acquires a section nobody uses correctly.
Equality covers the case that motivated the RFC. Ordering is listed as
unresolved, to be settled by someone who has hit it.

### Enforce terms in IBAC as a policy rule

Express *"discount may not exceed 18%"* as a grounded rule and let the
existing machinery refuse it.

Rejected because it confuses two different things. A policy is a property of
the **deployment** and applies to every interaction; a term is a property of
**one intent**. Writing an IBAC rule per intent would mean authoring policy at
request time, which is neither auditable nor sane.

Worth noting they compose: a deployment may cap discounts at 20% *and* a
requester may fix theirs at 18%. The first is IBAC's; the second is this.

### Make the requester's accept the whole answer

It already exists, and it is a real decision by whoever holds the authority.

Rejected as *sufficient*, not as valuable — the accept gate stays. But it
relies on someone reading a nine-step plan carefully, at the end of a flow
whose purpose was to spare them that. A control that depends on attention
fails on the day attention is short.

---

## Drawbacks

- **It does not catch an adversary.** Both sides are declared. An agent that
  changes a term *without declaring it* passes this check entirely, and is
  caught — if at all — at artifact emission, where the coupon says `0.16` and
  that is the deed rather than the claim. This RFC catches honest divergence
  and misconfiguration. Describing it as more would be worse than not having
  it.
- **Equality is coarse.** A plan that beats a target reads as a divergence.
- **A requester can over-fix.** Marking everything fixed produces an intent no
  plan satisfies, and the failure is a discovery that returns nothing —
  correct, and not obviously self-explanatory.
- **One more thing in the intent.** The protocol's appeal is that a requester
  states an objective in a sentence, and this asks for structure alongside it.
  Optional, defaulting to absent, and not required for any intent that has no
  commitments — but the cost is real and worth naming.

---

## Unresolved Questions

- **Ordering and satisfaction.** How does a coordinator learn that
  `delivery_days: 3` satisfies a target of 5 while `discount: 0.16` does not
  satisfy 0.18? A `comparator` is the obvious answer and the obvious way to
  over-build.
- **Units.** `delivery_days: 5` and `delivery_hours: 120` are the same term.
  Nothing here notices.
- **Fixed terms and renegotiation.** A rejection carrying a hint returns to
  discovery. May a hint change a fixed term — the requester revising their own
  commitment — or must that be a new intent? The argument for a new intent is
  that a hint is not obviously an act of authority.
- **Derived terms.** Some commitments are not the requester's to state: a
  regulatory cap belongs to the deployment. Those are IBAC's today, and
  whether they should also appear as terms is open.

---

## Future Possibilities

- **Comparators**, once someone has hit the ordering case in a real
  deployment.
- **Terms in the audit record**, so *"which term did we commit to, and did the
  plan honour it"* is answerable after dissolution.
- **Verification at emission** — comparing an artifact's actual values against
  the terms, which is the only check in this area that examines a deed rather
  than a claim, and the natural completion of the idea.

---

## References

- [LIP specification](../spec/lip/README.md) — §5, §11
- [Worked example: an upsell that touches money and a customer](../docs/worked-example-upsell.md) — §9 states this problem in situ
- [RFC 0002: Capability Authority](0002-capability-authority.md) — what an agent produces
- [RFC 0003: Scope Vocabulary and Admission](0003-scope-vocabulary.md) — what an agent asks for

---

## Changelog

| Date | Change |
|------|--------|
| 2026-08-23 | Initial draft |
