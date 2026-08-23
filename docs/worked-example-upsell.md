# A worked example: an upsell that touches money and a customer

> **Protocol**: LIP 0.3.0 · **Companion to**: [spec/lip](../spec/lip/README.md),
> [RFC 0003](../rfcs/0003-scope-vocabulary.md)

The logistics scenario in the paper shows coordination. This one shows
**governance**, because it has the two properties that make an agent system
hard to deploy: it commits the company to a discount, and it sends something
to a real customer.

It also ends on an unsolved problem. That is deliberate — the interesting part
of a worked example is the place where the protocol runs out.

---

## 1. The scenario

A CRM system has noticed something and wants to act on it:

> *A customer has a high propensity to buy product X — but only with an 18%
> discount. Send them an email about the product with a coupon valid for 24
> hours, for delivery in two to five days.*

Four things have to happen, and no two of them belong to the same system:
check that the product can actually ship in that window, decide whether 18% is
allowed, issue a coupon bound to that customer, and send an email containing
personal data to an address outside the company.

---

## 2. The participants

Three agents, registered against a coordinator. None of them knows the others
exist.

| Agent | Declares it can | Capability |
|---|---|---|
| `sales-agent` | Issue a discount coupon bound to a customer | `issue_coupon` |
| `sales-agent` | Send a templated marketing email | `send_campaign_email` |
| `stock-agent` | Report availability and dispatch lead time | `check_availability` |

### What registration does and does not establish

```json
{
  "message_type": "register",
  "payload": {
    "agent_id": "sales-agent",
    "mode": "persistent",
    "capabilities": [
      {
        "capability_id": "issue_coupon",
        "description": "Issues a discount coupon bound to one customer and expiring after a stated window",
        "expected_artifacts": ["coupon"],
        "output_schema": {
          "type": "object",
          "required": ["code", "discount", "expires_at"],
          "properties": {
            "code": { "type": "string" },
            "discount": { "type": "number", "maximum": 0.30 },
            "expires_at": { "type": "string", "format": "date-time" }
          }
        }
      }
    ]
  }
}
```

Note what is **absent**: the agent names no scopes. Under
[RFC 0003](../rfcs/0003-scope-vocabulary.md) it describes what it does, and
the deployment decides what that requires. An agent that did declare
`required_scopes` would have made a *request*, not a grant.

The coordinator answers with what was actually granted:

```json
{
  "message_type": "registered",
  "payload": {
    "accepted": true,
    "agent_id": "sales-agent",
    "registered_capabilities": ["issue_coupon", "send_campaign_email"],
    "granted_scopes": ["sales:coupon", "crm:read"],
    "unrecognised_scopes": [],
    "catalogue": []
  }
}
```

`sales:coupon` is held because an administrator bound it. **`email:send` is
not in the list** — nobody bound it, and an unbound capability holds nothing.
That omission decides the outcome of §7 below, four phases before anyone
notices.

---

## 3. The authority for this session

Before any of the five phases, three facts are established from the connection
rather than from anything a participant wrote.

| Fact | Value | Source |
|---|---|---|
| `authenticated_subject` | `auth0|ana.silva` | verified credential on the connection |
| `tenant_ids` | `[12]` | the subject's enrolment |
| `requester_authority` | `["crm:read", "sales:*"]` | the `scope` claim on that credential |

Two consequences worth stating before they bite:

**Discovery is bounded to tenant 12.** Agents belonging to other customers are
not merely filtered out of the results — they are never described to the model
that ranks candidates. A capability description names things.

**Nothing in this session can exceed Ana's own authority.** If Ana cannot
`email:send`, no agent acting for her can, however that agent is configured.
This is the delegation link, and it is why *who submits the intent* is a design
decision rather than a detail.

> **A note on who submits.** If the CRM *agent* submits with its own
> credential, the ceiling is the agent's authority, not a person's. For an
> action that emails a customer and commits a discount, that is almost
> certainly the wrong choice — and it is invisible unless someone asks.

---

## 4. Intent — and the first evaluation

```json
{
  "message_type": "intent",
  "session_id": "",
  "sender": { "kind": "requester", "id": "crm-console", "oidc_subject": "auth0|ana.silva" },
  "payload": {
    "intent_text": "Customer 88213 has high upsell propensity for product X at an 18% discount. Send them an email about the product with a coupon valid for 24 hours, for delivery in 2–5 days.",
    "context": { "customer_id": "88213", "product_id": "X", "discount": 0.18 },
    "requested_outputs": ["coupon", "email_receipt"]
  }
}
```

### ① `intent_admission` — *should this be attempted at all?*

The cheapest possible refusal: nothing has been discovered, no agent has been
asked, nothing has run.

| Layer | Reads | Decides |
|---|---|---|
| invariant | derived facts only | Is Ana's identity verified? Is she in a tenant? |
| grounded | catalogued rules | Does the text match a blocked pattern? Is the discount over the ceiling? |
| semantic | the model, over the stated purpose | Is *marketing to a customer* what this actually is? |

The three are combined by taking the **strictest**. A rule such as
`intent_keywords: ["delete", "purge"]` never fires here — but one reading
`context.discount` against a policy ceiling does, and would end the
interaction before a single agent learned that customer 88213 exists.

Assume 18% is within policy. Admitted.

**Why it could not be decided later:** it could — but every later point costs
a discovery round, a model call, and the disclosure of a customer id to three
agents.

---

## 5. Discovery — and the second evaluation

The coordinator decomposes the intent into sub-intents (*confirm the product
can ship in 2–5 days*, *issue a coupon*, *send the email*) and ranks candidates
**within tenant 12**.

### ② `offer_eligibility` — *may this agent bid on this?*

Per agent, per capability, and the first point where a specific participant is
judged:

- May `sales-agent` offer `issue_coupon`? It holds `sales:coupon`. **Yes.**
- May `sales-agent` offer `send_campaign_email`? It was never bound
  `email:send`. Under enforcement, **no** — and the capability simply does not
  enter the plan.
- May `stock-agent` touch the `inventory` data domain? Yes.
- May either touch `customer_pii`? A rule at this point can refuse it, and
  refusing here means the domain never reaches a plan that someone might
  approve without reading closely.

---

## 6. Negotiation — and the third evaluation

Offers go to the coordinator. **No agent sends anything to another agent**, and
none of them knows who else was asked.

```json
{
  "message_type": "offer",
  "sender": { "kind": "agent", "id": "stock-agent" },
  "payload": {
    "capability_id": "check_availability",
    "capability_description": "Confirms stock and dispatch lead time",
    "constraints": { "lead_time_days": 3 },
    "expected_artifacts": ["availability"],
    "estimated_latency": 1.2
  }
}
```

```json
{
  "message_type": "offer",
  "sender": { "kind": "agent", "id": "sales-agent" },
  "payload": {
    "capability_id": "issue_coupon",
    "constraints": { "max_discount": 0.16 },
    "expected_artifacts": ["coupon"],
    "required_scopes": ["sales:coupon"]
  }
}
```

**The sales agent has just contradicted the intent.** It was asked for 18% and
is offering at most 16%.

### ③ `negotiation_acceptance` — *is this plan acceptable?*

The first point that judges the **whole shape** rather than one participant:

- How many agents were recruited? A plan that grew unexpectedly is more often
  a decomposition that went wrong than a genuinely complex request.
- Does the combination require human approval? *Coupon plus customer email*
  should.
- Do the plan's terms match what the intent asked for? **This is where the
  16% would be caught — and §9 is about why that catch is weaker than it
  looks.**

The composed plan goes to the requester, carrying each step's constraints:

```json
{
  "message_type": "offer",
  "sender": { "kind": "coordinator", "id": "coordinator" },
  "payload": {
    "capability_id": "__composed_plan__",
    "capability_description": "stock-agent:check_availability → sales-agent:issue_coupon",
    "composition_plan": {
      "steps": [
        { "agent_id": "stock-agent", "capability_id": "check_availability", "constraints": { "lead_time_days": 3 } },
        { "agent_id": "sales-agent", "capability_id": "issue_coupon", "constraints": { "max_discount": 0.16 } }
      ]
    },
    "participating_agents": ["stock-agent", "sales-agent"]
  }
}
```

Two things are visible in that payload, and both matter:

1. **`send_campaign_email` is not in the plan.** It was refused at ②, and the
   plan simply does not contain the step. The email will not be sent.
2. **The 16% is right there**, in the step's constraints, for Ana to see.

---

## 7. Approval — the requester decides

Execution proceeds **only** after the requester accepts. This is not a
formality in the implementation; it is a gate.

```json
{
  "message_type": "accept",
  "sender": { "kind": "requester", "id": "crm-console" },
  "payload": {
    "accepted_offers": ["__composed_plan__"],
    "approval_note": "16% accepted; email step to be handled separately"
  }
}
```

Ana could equally have rejected with a renegotiation hint, which returns the
session to discovery for up to three rounds.

> The email did not fail at execution with a confusing error. It was **absent
> from the plan she approved** — which is the difference between a system that
> refuses and one that half-works.

---

## 8. Execution — the fourth and fifth evaluations

### ④ `execution_authorization` — *may this step run, now?*

Per step, immediately before dispatch, because a multi-step plan can outlive
the approval that started it.

The coordinator checks that the agent holds what its capability requires, and
hands it the grant:

```json
{
  "message_type": "execute",
  "payload": {
    "execution_plan": { "customer_id": "88213", "product_id": "X", "discount": 0.16 },
    "authorized_scopes": ["sales:coupon"],
    "capability_id": "issue_coupon"
  }
}
```

Inside the agent, work that a permission governs says so:

```python
@tool
def issue_coupon(customer_id: str, discount: float) -> dict:
    require_scope("sales:coupon")
    ...
```

If the agent's model were talked into calling `send_email` — by an injected
instruction in a product description, say — the call would be refused, and the
attempt recorded. The model chooses what to call; it does not choose whether
the call is checked.

The completion reports what was actually reached for:

```json
{
  "message_type": "complete",
  "payload": {
    "status": "success",
    "artifacts": [{ "code": "UPSL-88213-7QF2", "discount": 0.16, "expires_at": "2026-08-24T18:00:00Z" }],
    "metadata": {
      "agent_id": "sales-agent",
      "capability_id": "issue_coupon",
      "used_scopes": ["sales:coupon"],
      "denied_scopes": []
    }
  }
}
```

The artifact is validated against the `output_schema` from the accepted offer.
A coupon missing `expires_at` — a 24-hour coupon that never expires — is a
`schema_violation` recorded against `sales-agent`, not a mystery discovered by
whatever consumes it next.

### ⑤ `artifact_emission` — *may this leave?*

The last point before anything crosses a boundary, and the only one where the
artifact exists as a fact:

- Does the coupon carry personal data?
- Is the destination outside tenant 12?

Both are **derived**: the classification comes from a system of record and the
destination from the runtime. No phrasing of the original intent changes
either — which is what makes this the layer that carries a guarantee.

> Had the email step survived to here, this is where an artifact containing a
> customer's address would have been stopped. Four phases earlier there was no
> artifact to classify.

---

## 9. The open problem: who owns a term

Return to the 16%.

Suppose company policy permits any discount at or above 15%. Then 16% is
*allowed* — and the sales agent still had no business changing a number the
requester stated.

**This is not negotiation.** LIP negotiates *how* an intent is fulfilled —
which agents, at what cost, in what order. An agent that changes 18 → 16 has
not proposed a means; it has proposed a different objective.

The protocol has no way to express *“this term is fixed”*, and the reason is
plainer than it first appears:

```python
class IntentPayload(BaseModel):
    intent_text: str
    context: dict[str, Any]
    ...
```

**There is no field where a term is a term.** The 18% is prose, or an untyped
key in `context`. So the three available answers are all partial:

| Where | Strength | Limit |
|---|---|---|
| `context` + a rule at ③ | catches an honest divergence | declared against declared — an agent that simply does not declare the change passes |
| the requester's `accept` | a real decision by whoever holds the authority | manual, and easy to skim past in a nine-step plan |
| a rule at ⑤ on the emitted coupon | catches the **deed**, not the claim | only after the coupon exists |

The third is the strongest and the most often forgotten. The coupon that comes
out says `0.16`. That is not a statement of intent to do something — it is the
thing done.

> **What is missing.** A structured `constraints` on the intent, with a notion
> of which terms may not be altered, would give the coordinator something
> *derived from the original intent* to compare a plan against — instead of two
> declarations looking at each other. This generalises well beyond discount:
> every intent carrying a deadline, a budget, a quantity or an SLA has the same
> gap.

---

## 10. Dissolution — what remains

```json
{ "message_type": "dissolve", "payload": { "reason": "session_complete" } }
```

| Destroyed | Kept |
|---|---|
| the negotiated contract | the audit record |
| the execution plan | every IBAC decision, with the layer that made it |
| session memory | which agents were discovered, and why |
| agent bindings for this session | the artifacts produced |

What survives is **the record of what happened**, deliberately not the
machinery that made it happen. The session is reconstructible for an audit;
the contract is not reusable, and there is nothing left to maintain.

---

## 11. What this example is for

Five refusals were available, and each was possible only at its own point:

| Point | Could refuse | Could not have been known earlier |
|---|---|---|
| ① admission | a discount over policy | — |
| ② eligibility | an agent without `email:send` | which agents would offer |
| ③ acceptance | a plan of unexpected shape | what the plan was |
| ④ authorization | a step whose grant is absent | which step was next |
| ⑤ emission | personal data crossing a boundary | that the artifact existed |

A system that authorises once, at the entrance, has ① and nothing else. It
would have approved this interaction in full — including an email it had no
authority to send, carrying a customer's data out of the tenant.

That is the argument for evaluating an interaction rather than a call, and it
is worth more than any of the individual controls.
