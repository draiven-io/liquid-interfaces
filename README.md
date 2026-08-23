# Liquid Interfaces

> *The interface of the future is not something you deploy. It is something that happens.*

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![RFCs](https://img.shields.io/badge/RFCs-Open-green.svg)](rfcs/)
[![npm](https://img.shields.io/npm/v/liquid-interfaces?label=npm)](https://www.npmjs.com/package/liquid-interfaces)
[![PyPI](https://img.shields.io/pypi/v/agentic-bus?label=pypi)](https://pypi.org/project/agentic-bus/)

**Liquid Interfaces** is an open standard for intent-driven, semantically negotiated interoperability in autonomous agent systems.

This repository hosts the core specifications, governance documents, and design proposals that define the Liquid Interfaces ecosystem.

## 📖 Links

- **Technical reference (PDF)**: [19-page overview of LIP, IBAC and agentic-bus](docs/liquid-interfaces-technical-reference.pdf) — the argument, the evidence, and the objections answered
- **Worked example**: [an upsell that touches money and a customer](docs/worked-example-upsell.md) — the five evaluation points on one interaction
- **Specifications**: [spec/](spec/)
- **RFCs**: [rfcs/](rfcs/)
- **Reference implementation**: [github.com/draiven-io/agentic-bus](https://github.com/draiven-io/agentic-bus)
- **Python SDK**: [`pip install agentic-bus`](https://pypi.org/project/agentic-bus/)
- **TypeScript SDK**: [`npm install liquid-interfaces`](https://www.npmjs.com/package/liquid-interfaces) — [source](packages/liquid-interfaces)
- **Examples**: [examples/](examples/)
- **Paper**: [arXiv:2601.21993](https://arxiv.org/abs/2601.21993)
- **Website**: [liquidinterfaces.org](https://liquidinterfaces.org)
- **Discussions**: [GitHub Discussions](https://github.com/draiven-io/liquid-interfaces/discussions)
- **Issues**: [GitHub Issues](https://github.com/draiven-io/liquid-interfaces/issues)

---

## 📖 The Crisis of Rigidity

The history of systems integration is the history of imposing order on the chaos of information. From early RPC protocols to the ubiquity of REST APIs and GraphQL, the goal has been standardization. The fundamental premise of "Solid Software Engineering" is that security and efficiency depend on predictability: System A must know *ex ante*, with byte-level precision, what System B expects to receive.

However, the introduction of Large Language Models (LLMs) and Autonomous Agents into enterprise workflows has created an **ontological dissonance**:

| The Agent (Liquid) | The API (Solid) |
|--------------------|-----------------|
| Operates probabilistically | Operates deterministically |
| Interprets natural language | Requires rigid syntax |
| Adapts to ambiguous contexts | Demands precise schemas |
| Seeks goals (e.g., "reduce logistics costs") | Executes discrete functions (e.g., `POST /orders/v1/create`) |

The translation cost between the agent's fluid "will" and the API's rigid "form" has become the primary bottleneck of intelligent automation. Maintaining connectors, updating documentation (Swagger/OpenAPI), and managing breaking changes are symptoms of a paradigm that has reached its elastic limit.

**To overcome this, we propose Liquid Interfaces**: a framework that abandons form as a prerequisite for interaction, privileging flow and intention instead.

---

## 🧠 Theoretical Foundations

Liquid Interfaces draw from three key intellectual traditions:

### Liquid Modernity (Bauman)

Zygmunt Bauman defines *solid modernity* as the era of heavy social engineering, Fordist factories, and enduring institutions. The digital world inherited this solidity: relational databases (SQL) and monolithic ERPs are the "Gothic cathedrals" of IT—grandiose but difficult to reform.

*Liquid modernity*, in contrast, is marked by the inability of forms to maintain their structure for long due to the velocity of change. In software, this manifests as the need for systems that not only "scale" (grow in size) but "flow" (change shape). **If business reality is liquid, digital infrastructure cannot be solid without causing friction and rupture.**

### Computational Hermeneutics (Gadamer)

In classical computing, communication is syntactic: the parser validates whether the message obeys the grammar. If yes, process; if no, error. There is no *understanding*, only *decoding*.

Liquid Interfaces require a hermeneutic approach. Inspired by Hans-Georg Gadamer, the integration process between agents must seek a **"fusion of horizons"**:

- The *Emitting Agent* has an intention and a context
- The *Receiving Agent* has capabilities and constraints

The interface is the space where these horizons touch and negotiate a common meaning. Error ceases to be a fatal failure (Exception) and becomes an invitation to dialectical clarification.

### Actor-Network Theory (Latour)

Bruno Latour argues that "the social" is constructed by associations between human and non-human actors. In a network of liquid interfaces, the distinction between "user" and "tool" collapses. A purchasing agent (AI) that autonomously negotiates with a supplier (AI) is not "using" a tool; it is *acting socially* within a network. **The interface is the momentary pact that stabilizes this relationship.**

> 📚 For deeper exploration, see [Theoretical Foundations](docs/foundations.md)

---

## 🌊 The Liquid Interfaces Manifesto

### Preamble

Software systems were built to be predictable.  
Reality never was.

As artificial agents become capable of interpretation, reasoning, and autonomous action, the rigid infrastructures that connect our systems have become the primary bottleneck to progress. APIs, schemas, and static contracts—once instruments of order—now impose friction, fragility, and constant translation overhead.

**Liquid Interfaces propose a new foundation for interoperability in the age of autonomous systems.**

This manifesto defines the principles that guide that foundation.

---

### 1. Interfaces Are Events, Not Objects

An interface is not a thing that exists beforehand.  
It is something that happens.

In liquid systems, an interface emerges when agents interact, stabilizes for the duration of that interaction, and dissolves afterward. No endpoint is eternal. No contract is assumed to persist.

**Interfaces are temporal agreements, not permanent structures.**

---

### 2. Intention Precedes Invocation

Rigid systems require knowing *how* to call before knowing *why*.

Liquid systems invert this relationship.

Agents express intentions—goals contextualized by constraints—before any invocation exists. The path to execution is discovered, negotiated, and adapted at runtime.

The question is no longer:

> "Which endpoint should I call?"

But instead:

> "What am I trying to achieve, given my context and constraints?"

---

### 3. Meaning Is Negotiated, Not Parsed

Traditional integration is syntactic: messages are validated against grammars.

Liquid Interfaces are hermeneutic: **meaning is negotiated through dialogue.**

Errors are not fatal exceptions; they are signals of misalignment. Failure invites clarification, adaptation, or renegotiation—not collapse.

**Understanding precedes execution.**

---

### 4. Contracts Are Ephemeral by Design

Permanent contracts accumulate permanent debt.

Liquid Interfaces deliberately avoid long-lived coupling. Every agreement has:

- a limited scope
- a defined lifetime
- an explicit dissolution

Interoperability is continuously reconstructed, not endlessly maintained.

**This is not instability. It is anti-fragility.**

---

### 5. Governance Acts on Purpose, Not Identity

Static access control assumes fixed roles and predefined permissions.

Liquid systems operate in fluid contexts, where purpose matters more than identity.

Governance must therefore evaluate:

- *why* an action is requested
- *what* data it affects
- *which* risks it introduces

**Control is applied to intent, not endpoints.**

This is **Intent-Based Access Control (IBAC)**.

---

### 6. Infrastructure Must Not Dictate Ontology

Centralized, federated, or peer-to-peer architectures are implementation choices, not philosophical commitments.

Liquid Interfaces are independent of transport, topology, and storage.

The ontology defines *how* interaction happens.  
Infrastructure merely sustains it.

---

### 7. Observation Is Semantic, Not Merely Technical

Logging "200 OK" is insufficient in systems that reason and adapt.

Liquid systems require **semantic observability**:

- *what* intention was expressed
- *why* a path was chosen
- *which* policies applied
- *how* outcomes were justified

**We must be able to audit reasoning, not just traffic.**

---

### 8. Agents Are Participants, Not Clients

In liquid ecosystems, the distinction between "user", "client", and "service" dissolves.

Every participant—human or artificial—is an **agent**:

- capable of expressing intent
- interpreting meaning
- negotiating constraints
- assuming responsibility

**Interaction is not consumption. It is participation.**

---

### 9. Rigidity Is a Liability in a Changing World

Stability does not come from immobility.  
It comes from adaptability.

Systems that cannot change shape without breaking will not survive environments defined by uncertainty, autonomy, and continuous evolution.

**Liquidity is not chaos. It is resilience under change.**

---

### 10. The Interface of the Future Is Not Built — It Emerges

We do not design every interaction in advance.  
We design the conditions under which interactions can safely emerge.

The future of interoperability is not a better specification.  
**It is a better conversation.**

---

### Closing Statement

Liquid Interfaces are not a rejection of engineering discipline.  
They are its evolution.

They recognize that in a world of autonomous agents, static assumptions collapse faster than they can be documented.

**The interface of the future is not something you deploy.**

**It is something that happens.**

---

## 📚 Repository Structure

```
liquid-interfaces/
├── README.md              # This file - manifesto + introduction
├── docs/                  # Specifications, diagrams, and guides
│   ├── overview.md        # High-level architecture overview
│   ├── foundations.md     # Theoretical foundations (Bauman, Gadamer, Latour)
│   └── glossary.md        # Key terms and definitions
├── spec/                  # Core specifications
│   ├── lip/               # Liquid Interface Protocol
│   ├── ibac/              # Intent-Based Access Control
│   └── views/             # View/Schema Registry Conventions
├── governance/            # Community governance
│   ├── CONTRIBUTING.md    # How to contribute
│   ├── CODE_OF_CONDUCT.md # Community standards
│   └── MAINTAINERS.md     # Core maintainers
└── rfcs/                  # Design proposals process
    ├── README.md          # RFC process documentation
    └── 0000-template.md   # RFC template
```

---

## 📐 Formal Definition: From Object to Event

The transition from the solid paradigm to the liquid can be formalized mathematically.

### Solid Paradigm (Contract-Based)

Let $I$ be a static interface, defined by a fixed set of function signatures $S$:

$$I_{solid} = \{ f(x) : x \in X_{schema} \}$$

The interaction is valid if and only if the input belongs strictly to the predefined set $X_{schema}$. Any deviation $\Delta$ results in failure:

$$\text{If } input \notin X_{schema} \rightarrow Error(400)$$

### Liquid Paradigm (Intent-Based)

The liquid interface is not a set $I$, but a temporal negotiation function $\mathcal{N}$.

Let $\Phi$ be the intention (goal), $\mathcal{C}$ the current context, and $\mathcal{R}$ the constraints (governance):

$$Interface_{t} \leftarrow \mathcal{N}(Agent_A, Agent_B, \Phi, \mathcal{C}, \mathcal{R})$$

In this model:

1. **Genesis**: The interface does not exist at $t_{-1}$
2. **Materialization**: At $t_{0}$, agents negotiate the ad-hoc protocol needed to satisfy $\Phi$
3. **Execution**: Data exchange occurs
4. **Dissolution**: At $t_{+1}$, the interface ceases to exist, freeing resources and leaving no coupling debt

---

## 🔧 Reference Implementations

| Project | Description | Status |
|---------|-------------|--------|
| [Agentic Bus](https://github.com/draiven-io/agentic-bus) | Full coordination runtime: intent admission, semantic discovery, negotiation, IBAC governance, dynamic graph execution, dissolution. Ships a Python agent SDK, an MCP bridge, an admin dashboard and a CLI | Active |

> **Note on earlier names.** Work published before 2026 referred to a
> *Semantic Bus* and a separate *LIP SDK*. Both were consolidated into
> Agentic Bus; the agent SDK now lives in that repository under
> `app/agents/base`. The protocol is *Liquid Interfaces Protocol (LIP)* and
> the runtime is *Agentic Bus* — those are the only two names in use.

---

## 🤖 Multi-Agent Flows

Liquid Interfaces naturally support **multi-agent workflows**. When an intent requires multiple capabilities, the system discovers and coordinates agents automatically.

### The Unified Flow Model

Instead of separate paths for "simple" and "complex" intents, LIP uses a **unified flow model**:

```
Intent → Flow Discovery → Agent(s) Selection → Execution → Result
```

This works identically whether one agent or many are involved:

| Intent | Agents Discovered | Execution |
|--------|-------------------|-----------|
| "Get weather for São Paulo" | 1 (weather agent) | Single agent execution |
| "Translate and summarize this text" | 2 (translator → summarizer) | Sequential multi-agent |
| "Analyze sales, generate report, email it" | 3 (analyst → generator → mailer) | Sequential multi-agent |

### Flow Planning

The Semantic Bus uses **LLM-powered flow planning** (via LangGraph) to:

1. Analyze the intent semantically
2. Discover which registered agents can contribute
3. Determine the optimal execution order
4. Create an aggregated offer for the requester

### Aggregated Offers

For multi-agent flows, the requester receives a single aggregated offer:

```python
{
    "offer_id": "aggregated-uuid",
    "provider_id": "agentic-bus",  # The coordinator manages the flow
    "metadata": {
        "is_multi_agent_flow": True,
        "flow_agents": ["translator-agent", "summarizer-agent"],
        "flow_reasoning": "Intent requires translation followed by summarization"
    }
}
```

### Sequential Execution with Progress

After agreement, agents execute in sequence. Each agent receives:
- The original intent payload
- Results from previous agents in the flow

The requester receives progress updates:

```
Step 1/2: Executing translator-agent...
Step 2/2: Executing summarizer-agent...
```

### Result Aggregation

The final result merges outputs from all agents:

```python
{
    "result": {
        "translated_text": "...",  # From translator
        "summary": "..."           # From summarizer
    },
    "aggregated": True,
    "flow_metadata": {
        "steps": 2,
        "agent_results": {...}     # Individual agent outputs
    }
}
```

This design embodies the Liquid Interfaces principle: **agents are participants in a workflow, not isolated services**.

---

## 🚀 Getting Started

### For Implementers

1. Read the [Architecture Overview](docs/overview.md)
2. Study the core specifications:
   - [Liquid Interface Protocol (LIP)](spec/lip/README.md)
   - [Intent-Based Access Control (IBAC)](spec/ibac/README.md)
   - [View Registry Conventions](spec/views/README.md)
3. Explore the [reference implementations](#-reference-implementations)

### For Contributors

1. Read our [Contributing Guide](governance/CONTRIBUTING.md)
2. Review the [RFC Process](rfcs/README.md)
3. Check open [RFCs](rfcs/) for discussion opportunities

---

## 🤝 Contributing

We welcome contributions from the community! Whether you're:

- Proposing new specifications via the RFC process
- Improving documentation
- Building reference implementations
- Sharing feedback and use cases

Please read our [Contributing Guide](governance/CONTRIBUTING.md) and [Code of Conduct](governance/CODE_OF_CONDUCT.md) before participating.

---

## 📄 License

This project is licensed under the [Apache License 2.0](LICENSE).

---

## � References

This work draws from:

1. **Bauman, Z.** (2000). *Liquid Modernity*. Cambridge: Polity Press.
2. **Gadamer, H-G.** (1960). *Truth and Method*. London: Sheed & Ward.
3. **Latour, B.** (2005). *Reassembling the Social: An Introduction to Actor-Network-Theory*. Oxford University Press.
4. **Bratton, B.** (2016). *The Stack: On Software and Sovereignty*. MIT Press.
5. **Wooldridge, M.** (2009). *An Introduction to MultiAgent Systems*. Wiley.
6. **Floridi, L.** (2011). *The Philosophy of Information*. Oxford University Press.

---

## �🔗 Links

- **Specifications**: [spec/](spec/)
- **RFCs**: [rfcs/](rfcs/)
- **Discussions**: [GitHub Discussions](../../discussions)
- **Issues**: [GitHub Issues](../../issues)

---

<p align="center">
  <em>Liquid Interfaces — Interoperability for the Age of Autonomous Systems</em>
</p>
