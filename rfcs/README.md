# Liquid Interfaces RFCs

> Request for Comments - The process for proposing substantial changes

---

## What is an RFC?

An RFC (Request for Comments) is a design document that describes a proposed change to Liquid Interfaces specifications. RFCs provide a structured way to propose, discuss, and decide on substantial changes.

---

## When to Write an RFC

### RFC Required

- New specifications or major additions
- Breaking changes to existing specifications
- New concepts or terminology
- Changes affecting multiple specifications
- Significant process changes

### RFC Not Required

- Bug fixes in documentation
- Clarifications that don't change meaning
- Minor formatting or typo fixes
- Adding examples to existing specs
- Routine updates

---

## RFC Lifecycle

```
┌──────────┐
│  Draft   │  ← Initial proposal
└────┬─────┘
     │
     ▼
┌──────────┐
│  Review  │  ← Community discussion (PR open)
└────┬─────┘
     │
     ├───────────────┐
     ▼               ▼
┌──────────┐   ┌───────────┐
│ Accepted │   │ Rejected  │
└────┬─────┘   └───────────┘
     │
     ▼
┌──────────┐
│Implemented│  ← Merged into specs
└──────────┘
```

### States

| State | Description |
|-------|-------------|
| **Draft** | Initial proposal being written |
| **Review** | PR open, gathering feedback |
| **Accepted** | Approved by maintainers |
| **Rejected** | Not accepted (with explanation) |
| **Implemented** | Changes merged into specifications |
| **Withdrawn** | Author withdrew the proposal |

---

## How to Submit an RFC

### 1. Fork and Clone

```bash
git clone https://github.com/YOUR_USERNAME/liquid-interfaces.git
cd liquid-interfaces
```

### 2. Create Your RFC

Copy the template and start writing:

```bash
cp rfcs/0000-template.md rfcs/0000-my-proposal.md
```

### 3. Fill Out the Template

See [RFC Template](0000-template.md) for the structure.

Key sections:
- **Summary**: One paragraph overview
- **Motivation**: Why is this needed?
- **Design**: Technical details
- **Alternatives**: What else was considered?
- **Drawbacks**: What are the tradeoffs?

### 4. Submit a Pull Request

```bash
git checkout -b rfc/my-proposal
git add rfcs/0000-my-proposal.md
git commit -m "rfc: propose my-proposal"
git push origin rfc/my-proposal
```

Open a PR with:
- Title: `RFC: Your Proposal Title`
- Label: `rfc`
- Description: Brief summary and motivation

### 5. Participate in Discussion

- Respond to feedback
- Iterate on the design
- Update the RFC as needed
- Be patient with the process

---

## RFC Numbering

- Use `0000` initially
- Maintainers assign a number upon acceptance
- Format: `NNNN-short-title.md` (e.g., `0001-view-versioning.md`)

---

## Review Process

### Timeline

- **Initial Response**: Within 1 week
- **Discussion Period**: Minimum 2 weeks for substantial changes
- **Decision**: After discussion settles

### Who Decides?

- **Core Maintainers** make final decisions
- **Specification Maintainers** have strong input on their areas
- **Community** input is valued and considered

### Acceptance Criteria

RFCs are evaluated on:

- **Need**: Is this change necessary?
- **Design**: Is the approach sound?
- **Compatibility**: Does it fit with existing specs?
- **Clarity**: Is it well-explained?
- **Completeness**: Are edge cases covered?
- **Community**: Is there general support?

---

## After Acceptance

1. RFC is assigned a number
2. RFC is merged into the `rfcs/` directory
3. Implementation work begins
4. Specs are updated
5. RFC marked as implemented

---

## Currently Open RFCs

*No RFCs are currently open for review.*

---

## Accepted RFCs

*No RFCs have been accepted yet.*

---

## Tips for Writing RFCs

### Do

- ✅ Explain the problem clearly
- ✅ Provide concrete examples
- ✅ Consider alternatives
- ✅ Acknowledge tradeoffs
- ✅ Be open to feedback
- ✅ Iterate on the design

### Don't

- ❌ Submit without understanding existing specs
- ❌ Ignore feedback
- ❌ Be vague about the design
- ❌ Assume acceptance
- ❌ Rush the process

---

## Questions?

- Open a [Discussion](../../discussions) for general questions
- Ping maintainers in your RFC PR for process questions
- Check existing RFCs for examples

---

*The RFC process is inspired by [Rust RFCs](https://github.com/rust-lang/rfcs), [React RFCs](https://github.com/reactjs/rfcs), and other open source projects.*
