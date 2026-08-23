# RFC 0003: Scope Vocabulary and Admission

> **Status**: Draft
> **Author**: Dhiogo José Correa de Sá, @dhiogocorrea
> **Created**: 2026-08-23
> **Updated**: 2026-08-23

---

## Summary

An agent currently declares the scopes it requires as free strings, and a
coordinator has no catalogue to check them against. A typo produces an agent
that registers successfully and is protected by nothing, because the rule
guarding `payments:write` does not match `payments:wrtie`.

This RFC moves the vocabulary to where it belongs. **An agent declares what it
does; the coordinator decides what that requires.** Scope names are a property
of a deployment, not of an agent, and are bound to a capability at admission by
someone with the authority to decide.

Vocabulary that a coordinator does not recognise is refused **with the
catalogue**, so an implementer learns the vocabulary by being corrected rather
than by reading documentation that will go stale.

---

## Motivation

### Problem Statement

**A scope is a string nobody validates.** `AgentCapability.required_scopes` is
`list[str]`, populated by the agent author from memory. No catalogue exists, so
no coordinator can tell `carrier:quote` from `carrier:qoute`. The second
registers exactly as successfully as the first, and every grounded rule written
to constrain that capability silently stops applying. The failure presents as
"it worked".

**The agent is made to speak the deployment's language.** Requiring an agent to
declare `payments:write` requires its author to know that *this* organisation
calls it that. An agent built for one bus then needs editing for the next —
which is precisely the coupling §2 of the specification objects to. A logistics
agent should know that it moves money. It should not need to know your
authorisation taxonomy.

**An administrator cannot narrow what was declared.** RFC 0001 already permits
`registered_capabilities` to be a subset of those offered, exactly so a
coordinator can admit an agent while declining an individual capability. No
implementation exercises it: the reference coordinator echoes back everything
the agent declared. So admission today is all-or-nothing, and the natural place
to make a fine-grained decision passes without one being possible.

**An unrecognised scope carries information, and it is discarded.** When an
agent asks for something outside the catalogue it is telling an operator what
it needs. Today that either passes unnoticed or fails without explanation.
Either way nobody learns anything, and the agent author has no way to find out
what they should have written.

### Use Cases

- **An agent that ports between deployments.** The same agent registers against
  two coordinators that name their permissions differently, and each binds it
  to its own vocabulary. Nothing in the agent changes.
- **Admission that can narrow.** An administrator admits a logistics agent's
  quoting capability and declines its booking capability, in one decision, at
  the moment they have the context to make it.
- **A typo that fails loudly.** An agent declaring a misspelt scope is refused
  and told the correct spelling, instead of registering into a protection gap.
- **A request an operator can act on.** An agent needing something new produces
  a reviewable request rather than either a silent pass or an unexplained
  failure.

---

## Design

### Overview

Three things, and they compose:

| | |
|---|---|
| **A catalogue** | The scope names a coordinator recognises. Vocabulary belongs to the deployment. |
| **A binding** | Which catalogued scopes a given agent's capability is granted, decided at admission. |
| **A refusal that teaches** | Unrecognised vocabulary is refused with the alternatives, so the catalogue propagates by correction. |

The last is the same shape as RFC 0002's answer for capabilities, and for the
same reason: **self-declared vocabulary is not a fact until it has been
admitted.** RFC 0002 governs what an agent *produces*; this governs what it
*asks for*.

### Detailed Design

#### The scope catalogue

Each coordinator holds the set of scope names it recognises. A catalogue entry
is a name and a description of what holding it permits — the description exists
so that an administrator binding a capability can tell what they are granting,
and so a refusal can suggest something meaningful.

Scope names are hierarchical, separated by `:`. A grant of `payments:*` covers
`payments:write`; a grant of `payments:write` does not cover `payments:refund`.
Exact string equality across a free vocabulary does not survive contact with a
real deployment.

#### What an agent declares

An agent declares a capability and describes it. Under this RFC the agent
**SHOULD NOT** name scopes at all:

```json
{
  "capability_id": "carrier_rate_quote",
  "description": "Obtains and compares freight quotes from multiple carriers"
}
```

`required_scopes` remains in the register payload for compatibility, and its
meaning changes: it is a **request**, recorded and surfaced to an
administrator, and never an authority. A coordinator MUST NOT grant a scope
because an agent asked for it.

#### The binding

An administrator binds a capability to catalogued scopes. The binding is the
authority; the agent's declaration is at most a hint about what to bind.

An unbound capability is granted **no scopes**. That is a deliberate default:
the alternative — treating "nobody decided" as "everything permitted" — is the
same fail-open shape this protocol has already had to remove elsewhere.

#### Refusal carries the catalogue

When registration names vocabulary a coordinator does not recognise, the
`registered` answer says so and lists what it does recognise:

```json
{
  "accepted": true,
  "agent_id": "carrier-negotiator",
  "registered_capabilities": ["carrier_rate_quote"],
  "granted_scopes": ["carrier:quote"],
  "unrecognised_scopes": ["payments:write"],
  "catalogue": ["carrier:quote", "carrier:book", "logistics:read"]
}
```

Note that the agent is **admitted**. One unrecognised scope is not grounds to
refuse an agent whose other capabilities are fine — it narrows what was
granted, which is what RFC 0001's subset language exists for.

#### Postures

Mirroring agent authentication, the behaviour on unrecognised vocabulary is
chosen by configuration rather than by a flag nobody sets:

| Posture | On an unrecognised scope |
|---|---|
| **Development** (default) | Add it to the catalogue, unbound, and warn. A local bus should not need a catalogue authored before anything runs. |
| **Enforcing** | Refuse the scope, record the request, and answer with the catalogue. |

A deployment that authored a catalogue has said what it recognises, and a
coordinator MUST NOT quietly extend it.

#### Requirements

Coordinators:

- **MUST NOT** grant a scope solely because an agent declared it.
- **MUST** grant an unbound capability no scopes.
- **SHOULD** answer a registration naming unrecognised vocabulary with the
  catalogue, or a bounded subset of it.
- **SHOULD** record an unrecognised scope as a reviewable request rather than
  discarding it.
- **MUST** match scopes hierarchically, treating `a:*` as covering `a:b`.
- **MUST** report the scopes actually granted in the `registered` answer, so an
  agent can tell what it received rather than assuming it received what it
  asked for.

Agents:

- **SHOULD NOT** declare scope names, and **SHOULD** describe the capability
  instead.
- **MUST NOT** assume a declared scope was granted.
- **SHOULD** surface the difference between requested and granted to an
  operator — an agent silently running with less authority than it expected
  fails later, somewhere less obvious.

### Integration

- **LIP** — §8 gains the catalogue concept; the `registered` payload
  (RFC 0001) gains `granted_scopes`, `unrecognised_scopes` and `catalogue`.
  No new performative.
- **IBAC** — grounded rules matching `allowed_scopes` / `blocked_scopes`
  become meaningful, because the vocabulary they match against is now
  established rather than asserted. Note the limit honestly: a scope is still
  a *declared* fact about an agent's intentions until it is enforced at the
  point of use, which is out of scope here.
- **RFC 0002** — the same principle applied to the other direction. Neither
  depends on the other.

### Versioning

Additive under §13, raising the protocol to **0.3.0** alongside RFC 0002. Three
optional fields on an existing payload and a changed *meaning* for
`required_scopes` — from an assertion to a request — which changes no wire
format.

| Agent | Coordinator | Result |
|---|---|---|
| 0.2.0 | 0.3.0 | Declared scopes become requests. In development posture, behaviour is unchanged |
| 0.3.0 | 0.2.0 | The agent declares no scopes; the coordinator grants none. Enforcement is absent there anyway |

---

## Alternatives Considered

### A discovery endpoint the agent reads first

Publish the catalogue; agents fetch it at startup and declare correctly. This
is what OAuth discovery does, and it works.

Rejected because it makes the agent a client of *your* vocabulary. An agent
built against one deployment's catalogue needs editing for the next, which
reintroduces exactly the per-pair coupling the protocol exists to remove. It
also fails the case that matters most: an agent written by someone who does not
work for you, which is the case an open protocol has to serve.

The refusal-carries-the-catalogue design gets the same information to the same
person, without the agent depending on the catalogue existing at build time.

### Keep the agent's declaration authoritative, and only validate spelling

Cheapest option: catalogue the names, reject unknown ones, but still grant what
the agent asked for. Rejected because it fixes the typo and leaves the hole —
an agent would still grant itself authority by declaring it, and the catalogue
would become a list of things an attacker may spell correctly.

### Infer the binding semantically from the description

Have the coordinator's model read *“obtains freight quotes”* and conclude
`carrier:quote`. Attractive, and it removes the administrative step.

Rejected as the **authority**, though not as an aid. A binding inferred by a
model is a grant no human decided, derived from text the agent wrote — which is
declared input deciding an authorisation boundary, the thing IBAC's
declared/derived split exists to prevent. Proposing a binding for an
administrator to confirm is a reasonable use of a model; making the grant is
not.

---

## Drawbacks

- **Admission gains work.** Someone must bind capabilities to scopes. This is
  real friction, and the development posture exists so it is not paid before it
  is worth paying.
- **A catalogue is a maintained artefact**, which is the kind of thing §2 is
  suspicious of. The honest defence is that it scales with the deployment's own
  permission model rather than with the number of pairs of systems that talk —
  and that it is a list an organisation already has, usually in an identity
  provider.
- **Existing agents lose scopes they were granted by declaration.** They were
  never enforced, so nothing breaks today; but a deployment that turns on
  enforcement afterwards must bind first.
- **It does not make a scope a guarantee.** A scope remains a statement about
  what an agent intends to do. Nothing here checks what it *does*.

---

## Unresolved Questions

- Should the catalogue be per coordinator or per tenant? Per tenant is clearly
  right for a multi-customer deployment, and tenant is not yet carried on the
  coordination path.
- Should a binding expire, forcing periodic re-confirmation, or persist until
  revoked?
- Should the catalogue be importable from an identity provider's scope
  registry, given that many deployments already maintain one?

---

## Future Possibilities

- **Enforcement at the point of use.** The gap this RFC deliberately leaves:
  granted scopes are carried to the agent in `execute` and nothing verifies
  what it then does. Closing it requires the tool boundary to consult the
  capability, which is a larger change and belongs in its own proposal.
- **Intersection with the authenticated identity's scopes.** An identity
  provider already decides what a subject may do; a granted scope could be
  bounded by the token's `scope` claim as well as by the binding.
- **A proposed binding**, generated from the capability description, for an
  administrator to confirm rather than author.

---

## References

- [LIP specification](../spec/lip/README.md) — §2, §8, §12, §13
- [RFC 0001: The `register` Performative](0001-register-performative.md) —
  the `registered_capabilities` subset this builds on
- [RFC 0002: Capability Authority](0002-capability-authority.md) — the same
  principle for what an agent produces

---

## Changelog

| Date | Change |
|------|--------|
| 2026-08-23 | Initial draft |
