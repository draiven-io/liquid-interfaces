# View Registry Conventions

> Schema flexibility through negotiated data representations

**Status**: Draft  
**Version**: 0.1.0  
**Last updated**: 2026-08

---

## Abstract

View Registry Conventions define how agents discover, register, and negotiate data representations in liquid systems. Views enable schema flexibility, partial data exposure, and version-agnostic compatibility without tight coupling between agents.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Motivation](#2-motivation)
3. [Core Concepts](#3-core-concepts)
4. [View Definition](#4-view-definition)
5. [View Registry](#5-view-registry)
6. [View Negotiation](#6-view-negotiation)
7. [View Transformations](#7-view-transformations)
8. [Integration with LIP](#8-integration-with-lip)
9. [Best Practices](#9-best-practices)
10. [Examples](#10-examples)

---

## 1. Introduction

Traditional API integration requires exact schema agreement:
- Precise field names and types
- Specific versions
- Complete objects

In liquid systems, agents need flexibility:
- Request only relevant fields
- Accept compatible variations
- Evolve independently

Views provide this flexibility through negotiated, partial representations.

---

## 2. Motivation

### The Schema Rigidity Problem

```
Agent A expects:          Agent B provides:
{                         {
  "customer_name": str      "name": str,
  "customer_id": int        "id": str,        ← Type mismatch
  "email": str              "email_address": str  ← Name mismatch
}                         }
```

### The View Solution

```
Agent A requests view:    View Registry provides mapping:
"customer_basic_info"     {
                            "customer_name" ← "name",
                            "customer_id" ← int("id"),
                            "email" ← "email_address"
                          }
```

---

## 3. Core Concepts

### View

A named, versioned representation of data that defines:
- Which fields are included
- How fields are named
- What transformations apply

### Projection

A subset of a larger data structure, exposing only relevant fields.

### Mapping

Rules for translating between different representations of the same concept.

### Compatibility

The degree to which two views can interoperate:
- **Exact**: Identical structure
- **Compatible**: Mappable with transformations
- **Partial**: Some fields mappable
- **Incompatible**: Cannot be reconciled

---

## 4. View Definition

### View Schema

```json
{
  "view": {
    "name": "customer_basic_info",
    "version": "1.0",
    "description": "Basic customer information for display purposes",
    "domain": "customer",
    
    "fields": [
      {
        "name": "id",
        "type": "string",
        "required": true,
        "description": "Unique customer identifier"
      },
      {
        "name": "display_name",
        "type": "string",
        "required": true,
        "description": "Customer's display name"
      },
      {
        "name": "email",
        "type": "string",
        "required": false,
        "format": "email",
        "sensitivity": "pii"
      },
      {
        "name": "created_at",
        "type": "datetime",
        "required": true,
        "format": "iso8601"
      }
    ],
    
    "constraints": {
      "max_size_bytes": 4096
    },
    
    "metadata": {
      "owner": "customer-service-team",
      "classification": "internal",
      "retention": "standard"
    }
  }
}
```

### Field Properties

| Property | Required | Description |
|----------|----------|-------------|
| `name` | Yes | Field identifier |
| `type` | Yes | Data type |
| `required` | No | Whether field must be present (default: false) |
| `description` | No | Human-readable description |
| `format` | No | Specific format (email, uri, iso8601, etc.) |
| `sensitivity` | No | Data classification (pii, confidential, etc.) |
| `default` | No | Default value if not provided |

### Supported Types

| Type | Description |
|------|-------------|
| `string` | Text data |
| `integer` | Whole numbers |
| `number` | Floating point numbers |
| `boolean` | True/false |
| `datetime` | Date and time |
| `array` | Ordered list |
| `object` | Nested structure |
| `any` | Flexible type |

---

## 5. View Registry

### Registry Structure

```
┌─────────────────────────────────────────┐
│             View Registry               │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     Domain: customer            │    │
│  │  ┌───────────────────────────┐  │    │
│  │  │ customer_basic_info v1.0  │  │    │
│  │  │ customer_basic_info v1.1  │  │    │
│  │  │ customer_full_profile v1.0│  │    │
│  │  │ customer_preferences v1.0 │  │    │
│  │  └───────────────────────────┘  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     Domain: order               │    │
│  │  ┌───────────────────────────┐  │    │
│  │  │ order_summary v1.0        │  │    │
│  │  │ order_details v1.0        │  │    │
│  │  │ order_line_item v1.0      │  │    │
│  │  └───────────────────────────┘  │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### Registry Operations

| Operation | Description |
|-----------|-------------|
| `register` | Add a new view to the registry |
| `lookup` | Find a view by name and version |
| `search` | Find views by criteria |
| `list_versions` | Get all versions of a view |
| `check_compatibility` | Compare two views |
| `deprecate` | Mark a view as deprecated |

### Registration

```json
{
  "operation": "register",
  "view": { /* view definition */ },
  "mappings": [
    {
      "from_view": "legacy_customer_record",
      "rules": [
        {"target": "id", "source": "customer_id"},
        {"target": "display_name", "source": "full_name"},
        {"target": "email", "source": "email_address"}
      ]
    }
  ]
}
```

---

## 6. View Negotiation

### Negotiation Process

```
┌──────────┐                         ┌──────────┐
│ Agent A  │                         │ Agent B  │
└────┬─────┘                         └────┬─────┘
     │                                    │
     │  1. Request with preferred view    │
     │ ──────────────────────────────────►│
     │    "I want: customer_basic_info"   │
     │                                    │
     │  2. Check available views          │
     │                                    │
     │  3. Response with view offer       │
     │ ◄──────────────────────────────────│
     │    "I can provide:                 │
     │     - customer_basic_info (exact)  │
     │     - customer_summary (compatible)│
     │                                    │
     │  4. Accept view                    │
     │ ──────────────────────────────────►│
     │    "Using: customer_basic_info"    │
     │                                    │
     │  5. Data in agreed view            │
     │ ◄──────────────────────────────────│
     │                                    │
```

### Negotiation Strategies

| Strategy | Description |
|----------|-------------|
| `exact` | Only accept exact view match |
| `compatible` | Accept compatible views with mapping |
| `best_effort` | Accept partial matches |
| `flexible` | Let provider choose best option |

### Negotiation Request

```json
{
  "view_request": {
    "preferred": ["customer_basic_info@1.0"],
    "acceptable": ["customer_basic_info@*", "customer_summary@1.*"],
    "strategy": "compatible",
    "required_fields": ["id", "display_name"],
    "excluded_fields": ["ssn", "credit_card"]
  }
}
```

### Negotiation Response

```json
{
  "view_response": {
    "selected": "customer_basic_info@1.0",
    "match_type": "exact",
    "transformations_applied": [],
    "fields_available": ["id", "display_name", "email", "created_at"],
    "fields_excluded": []
  }
}
```

---

## 7. View Transformations

### Transformation Types

| Type | Description | Example |
|------|-------------|---------|
| `rename` | Change field name | `full_name` → `display_name` |
| `cast` | Change type | `"123"` → `123` |
| `format` | Change format | `2024-12-21` → `Dec 21, 2024` |
| `compute` | Derive value | `first + " " + last` → `full_name` |
| `filter` | Remove fields | Exclude `password` |
| `default` | Provide missing | `null` → `"N/A"` |

### Transformation Definition

```json
{
  "transformation": {
    "from_view": "raw_customer",
    "to_view": "customer_basic_info",
    "rules": [
      {
        "type": "rename",
        "source": "cust_id",
        "target": "id"
      },
      {
        "type": "compute",
        "target": "display_name",
        "expression": "concat(first_name, ' ', last_name)"
      },
      {
        "type": "cast",
        "source": "created_timestamp",
        "target": "created_at",
        "target_type": "datetime"
      },
      {
        "type": "filter",
        "exclude": ["password_hash", "internal_notes"]
      }
    ]
  }
}
```

---

## 8. Integration with LIP

### Intent with View Preference

```json
{
  "envelope": {
    "type": "intent_request",
    "...": "..."
  },
  "payload": {
    "intent": {
      "goal": "Get customer information",
      "context": {
        "customer_id": "cust-123"
      }
    },
    "view_preferences": {
      "preferred": ["customer_basic_info@1.0"],
      "strategy": "compatible",
      "required_fields": ["id", "display_name"]
    }
  }
}
```

### Response with View Metadata

```json
{
  "envelope": {
    "type": "intent_response",
    "...": "..."
  },
  "payload": {
    "view": {
      "name": "customer_basic_info",
      "version": "1.0"
    },
    "data": {
      "id": "cust-123",
      "display_name": "Jane Doe",
      "email": "jane@example.com",
      "created_at": "2024-01-15T09:30:00Z"
    }
  }
}
```

---

## 9. Best Practices

### View Design

1. **Keep views focused**: One purpose per view
2. **Use semantic names**: `customer_display` not `customer_v2_new`
3. **Version thoughtfully**: Major version for breaking changes
4. **Document sensitivity**: Mark PII and confidential fields
5. **Define defaults**: Reduce negotiation friction

### Registry Management

1. **Organize by domain**: Group related views
2. **Maintain mappings**: Keep compatibility paths current
3. **Deprecate gracefully**: Announce before removing
4. **Monitor usage**: Track which views are actively used

### Negotiation

1. **Prefer specific requests**: Reduce ambiguity
2. **Include fallbacks**: List acceptable alternatives
3. **Specify requirements**: Declare required fields upfront
4. **Handle failures gracefully**: Plan for no-match scenarios

---

## 10. Examples

### Example 1: Simple View Request

**Scenario**: Agent needs to display customer name and email

**Request**:
```json
{
  "view_preferences": {
    "preferred": ["customer_contact@1.0"],
    "required_fields": ["name", "email"]
  }
}
```

**Response**:
```json
{
  "view": {"name": "customer_contact", "version": "1.0"},
  "data": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1-555-0123"
  }
}
```

---

### Example 2: Compatibility Mapping

**Scenario**: Agent A wants `user_profile`, Agent B only has `account_info`

**Registry Mapping**:
```json
{
  "from": "account_info@1.0",
  "to": "user_profile@1.0",
  "compatibility": "partial",
  "rules": [
    {"target": "user_id", "source": "account_id"},
    {"target": "username", "source": "login_name"},
    {"target": "avatar_url", "default": null}
  ]
}
```

**Result**: Agent A receives `user_profile` view with mapped fields

---

### Example 3: IBAC-Aware View Filtering

**Scenario**: View contains PII, requester doesn't have PII access

**Original View**:
```json
{
  "id": "cust-123",
  "display_name": "Jane Doe",
  "email": "jane@example.com",
  "ssn": "123-45-6789"
}
```

**After IBAC Policy**:
```json
{
  "id": "cust-123",
  "display_name": "Jane Doe",
  "email": "jane@example.com"
  // ssn field excluded by policy
}
```

---

## Related Specifications

- [LIP](../lip/README.md) - Liquid Interface Protocol
- [IBAC](../ibac/README.md) - Intent-Based Access Control

## Appendices

- [A. View Schema JSON Schema](view-schema.md) *(planned)*
- [B. Transformation Functions](transformations.md) *(planned)*
- [C. Compatibility Matrix](compatibility.md) *(planned)*
