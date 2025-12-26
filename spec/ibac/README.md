# Intent-Based Access Control (IBAC)

> Governance that acts on purpose, not identity

**Status**: Draft  
**Version**: 0.1.0  
**Last Updated**: 2024-12

---

## Abstract

Intent-Based Access Control (IBAC) is a governance model for liquid systems where access decisions are based on the **purpose** of a request rather than solely on the identity of the requester. IBAC evaluates *why* an action is requested, *what* data it affects, and *which* risks it introduces.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [From Walls to Guardrails](#2-from-walls-to-guardrails)
3. [Motivation](#3-motivation)
4. [Core Concepts](#4-core-concepts)
5. [Policy Model](#5-policy-model)
6. [Evaluation Process](#6-evaluation-process)
7. [Policy Language](#7-policy-language)
8. [Semantic Observability](#8-semantic-observability)
9. [Integration with LIP](#9-integration-with-lip)
10. [Security Considerations](#10-security-considerations)
11. [Examples](#11-examples)

---

## 1. Introduction

Traditional access control models—RBAC, ABAC, ACLs—assume:
- Fixed roles and permissions
- Predefined resources
- Static authorization rules

In autonomous agent systems, these assumptions break down:
- Agents act with varying purposes
- Resources are dynamically discovered
- Context changes continuously

IBAC addresses this by making **intent** the primary subject of governance.

---

## 2. From Walls to Guardrails

How can we ensure security in an environment where the "doors" change location? Liquid governance replaces static Profile-Based Access Control (RBAC) with Intent-Based Access Control (IBAC).

### Policies as Guardrails, Not Walls

In the solid paradigm, business rules are encoded in endpoints: if you can reach the endpoint, you have permission. In the liquid paradigm, rules are not encoded in the endpoints but in a **"System Constitution"** layer.

| Solid Rule | Liquid Rule |
|------------|-------------|
| "User X cannot access table Y" | "No agent may extract sensitive financial data unless the Intent is classified as 'Fiscal Audit' and signed by a human" |
| Binary (allow/deny) | Contextual (allow/deny/modify/require) |
| Identity-centric | Purpose-centric |
| Static | Dynamic |

### The Fundamental Shift

```
RBAC:   Identity → Role → Permission → Resource
IBAC:   Intent → Purpose → Context → Risk Assessment → Decision
```

---

## 3. Motivation

### The Problem with Identity-Based Control

```
Traditional:  "Agent X has role Y, therefore can access resource Z"

The gap:      Why does Agent X want to access Z?
              Is this access appropriate for the current purpose?
              What are the risks given the current context?
```

### The IBAC Approach

```
IBAC:         "Agent X expresses intent I with purpose P"
              "Purpose P requires access to resource Z"
              "Given context C and risks R, is this appropriate?"
```

---

## 4. Core Concepts

### Intent

The goal an agent is trying to achieve, including context and constraints.

### Purpose

The reason behind an intent—*why* the agent wants to achieve the goal.

### Context

Situational factors that influence policy evaluation:
- Session state
- Environmental conditions
- Historical patterns
- Active contracts

### Risk

Potential negative outcomes associated with allowing an intent:
- Data exposure
- Resource consumption
- Downstream effects
- Reversibility

---

## 4. Policy Model

### Policy Structure

IBAC policies consist of:

| Component | Description |
|-----------|-------------|
| **Conditions** | When the policy applies |
| **Evaluations** | What to assess |
| **Actions** | What to do based on evaluation |

### Policy Hierarchy

```
┌─────────────────────────────────────┐
│         Global Policies             │  ← System-wide rules
├─────────────────────────────────────┤
│         Domain Policies             │  ← Domain-specific rules
├─────────────────────────────────────┤
│         Agent Policies              │  ← Agent-specific rules
├─────────────────────────────────────┤
│         Session Policies            │  ← Session-specific rules
└─────────────────────────────────────┘
```

Lower-level policies can refine but not override higher-level denials.

---

## 5. Evaluation Process

### Evaluation Flow

```
┌──────────────────┐
│  Intent Received │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Extract Purpose  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Gather Context   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Assess Risks    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Evaluate Policies│
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐
│ Allow │ │ Deny  │ │Modify │
└───────┘ └───────┘ └───────┘
```

### Evaluation Inputs

| Input | Source | Description |
|-------|--------|-------------|
| Intent | Request | The expressed goal |
| Purpose | Extracted/Declared | Why the goal is sought |
| Identity | Authentication | Who is asking (context, not primary) |
| Context | Session/Environment | Situational factors |
| History | Trace Store | Previous interactions |

### Evaluation Outputs

| Output | Description |
|--------|-------------|
| `allow` | Intent may proceed |
| `deny` | Intent is rejected with reason |
| `modify` | Intent may proceed with constraints |
| `require` | Additional information needed |

---

## 6. Policy Language

### Policy Definition

```yaml
policy:
  name: "data-export-restrictions"
  version: "1.0"
  description: "Restricts bulk data exports based on purpose"
  
  conditions:
    intent_matches:
      - "export data"
      - "download records"
      - "bulk retrieve"
    
  evaluations:
    - check: purpose
      allowed:
        - "compliance_audit"
        - "authorized_backup"
      denied:
        - "unspecified"
        - "competitive_analysis"
    
    - check: data_volume
      threshold: 10000
      action: require_justification
    
    - check: destination
      must_be_internal: true
      exceptions:
        purposes: ["authorized_partner_share"]
  
  actions:
    on_allowed:
      log_level: info
      notify: false
    
    on_denied:
      log_level: warn
      notify: security_team
      explain: true
    
    on_modified:
      log_level: info
      attach_constraints: true
```

### Built-in Checks

| Check | Description |
|-------|-------------|
| `purpose` | Evaluate declared/inferred purpose |
| `data_classification` | Check data sensitivity levels |
| `data_volume` | Assess quantity of data involved |
| `destination` | Validate where data/results go |
| `reversibility` | Can the action be undone? |
| `time_window` | Is this an appropriate time? |
| `frequency` | How often has this been requested? |
| `session_state` | Current session context |

---

## 7. Integration with LIP

### Intent Envelope Extension

IBAC adds fields to the LIP envelope:

```json
{
  "envelope": {
    "version": "0.1.0",
    "type": "intent_request",
    "...": "...",
    "ibac": {
      "declared_purpose": "Generate quarterly compliance report",
      "data_scope": ["customer_records", "transaction_history"],
      "sensitivity_acknowledgment": true
    }
  }
}
```

### Policy Attachment

Contracts can include policy references:

```json
{
  "contract": {
    "id": "contract-123",
    "parties": ["agent-a", "agent-b"],
    "ibac_policies": [
      "data-export-restrictions",
      "pii-handling-requirements"
    ],
    "evaluated_at": "2024-12-21T10:00:00Z",
    "evaluation_result": "allowed_with_constraints",
    "constraints": {
      "max_records": 5000,
      "exclude_fields": ["ssn", "credit_card"]
    }
  }
}
```

---

## 8. Audit & Observability

### Policy Decision Log

Every policy evaluation produces an auditable record:

```json
{
  "decision_id": "dec-456",
  "timestamp": "2024-12-21T10:00:00Z",
  "trace_id": "abc-123",
  "intent_summary": "Export customer data for compliance audit",
  "declared_purpose": "compliance_audit",
  "inferred_purpose": "compliance_audit",
  "purpose_confidence": 0.95,
  "policies_evaluated": [
    {
      "policy": "data-export-restrictions",
      "version": "1.0",
      "result": "allow",
      "checks": [
        {"name": "purpose", "result": "pass"},
        {"name": "data_volume", "result": "pass", "value": 2500},
        {"name": "destination", "result": "pass"}
      ]
    }
  ],
  "final_decision": "allow",
  "constraints_applied": [],
  "explanation": "Purpose 'compliance_audit' is explicitly allowed for data export operations."
}
```

### Audit Requirements

| Requirement | Description |
|-------------|-------------|
| **Completeness** | Every decision is logged |
| **Immutability** | Logs cannot be altered |
| **Traceability** | Decisions link to traces |
| **Explainability** | Reasons are human-readable |

---

## 9. Security Considerations

### Purpose Verification

- Declared purposes should be verifiable when possible
- Purpose inference should use multiple signals
- High-risk actions require higher purpose confidence

### Policy Integrity

- Policies should be versioned and signed
- Policy changes require audit trails
- Conflicting policies must be explicitly resolved

### Evasion Prevention

- Purpose declarations alone are insufficient
- Behavioral analysis should complement declarations
- Anomaly detection for purpose patterns

---

## 10. Examples

### Example 1: Data Export Request

**Intent:**
```
"Export all customer records from the last quarter"
```

**Declared Purpose:**
```
"Generate compliance report for regulatory audit"
```

**Evaluation:**
1. Purpose "compliance_audit" → Allowed category
2. Data scope "customer_records" → Requires PII handling policy
3. Volume check → Within limits
4. Destination check → Internal system → Pass

**Decision:** Allow with constraint (exclude sensitive fields)

---

### Example 2: Cross-Agent Data Sharing

**Intent:**
```
"Share user preferences with recommendation agent"
```

**Declared Purpose:**
```
"Personalize content recommendations"
```

**Evaluation:**
1. Purpose "personalization" → Requires user consent check
2. User consent status → Verified
3. Data classification "preferences" → Low sensitivity
4. Recipient agent → Trusted partner

**Decision:** Allow

---

### Example 3: Denied Request

**Intent:**
```
"Access all employee salary information"
```

**Declared Purpose:**
```
Not specified
```

**Evaluation:**
1. Purpose "unspecified" → Denied for sensitive data
2. Data classification "salary" → High sensitivity
3. No business justification attached

**Decision:** Deny with explanation

**Response:**
```json
{
  "decision": "deny",
  "reason": "Access to high-sensitivity data requires explicit purpose declaration",
  "suggestions": [
    "Declare a valid business purpose",
    "Request approval from data steward",
    "Limit scope to specific records with justification"
  ]
}
```

---

## Related Specifications

- [LIP](../lip/README.md) - Liquid Interface Protocol
- [Views](../views/README.md) - View/Schema Registry Conventions

## Appendices

- [A. Policy Schema](policy-schema.md) *(planned)*
- [B. Purpose Taxonomy](purpose-taxonomy.md) *(planned)*
- [C. Implementation Guide](implementation.md) *(planned)*
