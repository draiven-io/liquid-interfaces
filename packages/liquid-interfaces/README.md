# liquid-interfaces

A TypeScript client for the **Liquid Interfaces Protocol** (LIP): agents that
register what they can do, offer against intents they can serve, execute only
when authorised, and stop when the interaction dissolves.

```bash
npm install liquid-interfaces
```

Roughly 300 lines over one runtime dependency (`ws`). ESM and CommonJS, with
types.

## Why this exists

Most agent frameworks wire agents to each other. LIP has them describe what
they can do, and lets a coordinator work out who should do what — so an agent
never names the agent it is collaborating with, and adding one does not mean
editing another.

The full argument is in the [specification][spec]; this package is the agent
half of it.

## An agent

```ts
import { LipAgent, type AgentHandler } from "liquid-interfaces";

const weather: AgentHandler = {
  capabilities: () => [
    {
      capability_id: "forecast",
      description: "Weather forecast for a city",
      required_scopes: ["weather:read"],
      expected_artifacts: ["forecast"],
    },
  ],

  async executeTask(payload, context, signal) {
    const city = String(payload.city ?? "unknown");
    const response = await fetch(`https://example.com/forecast/${city}`, { signal });
    return { forecast: await response.json() };
  },
};

const agent = new LipAgent(
  {
    agentId: "weather-01",
    coordinatorUri: "ws://localhost:8765",
    semanticDescription: "Weather forecasting for European cities",
  },
  weather,
);

await agent.runForever();
```

That is the whole surface. There is no router to configure and no other agent
to point at: the coordinator discovers `forecast` from the registration and
addresses it when an intent calls for it.

### Passing `signal` through matters

`executeTask` receives an `AbortSignal` that fires when the interaction
dissolves — the requester disconnected, the plan was abandoned, the session
was revoked. Work that ignores it keeps running against a context that no
longer exists, and its result has nowhere to go. Hand it to `fetch`, to your
database driver, to anything that accepts one.

## What the client does for you

- **Registers on every connection.** Registration is per connection, not per
  process, so a reconnect registers again. An agent that reconnects without
  registering is connected but undiscoverable — a failure that looks healthy
  to a process supervisor.
- **Reconnects with jittered backoff.** Every agent notices a coordinator
  restart at the same instant; unjittered backoff marches them all back in
  lockstep and the coordinator is knocked over by its own clients.
- **Executes only on `execute`.** An `intent` produces an offer and nothing
  else. Acting on an intent alone is acting without authorisation.
- **Cancels on `dissolve`**, per session, and sends no `complete` afterwards.
- **Tolerates a coordinator that never acknowledges.** LIP 0.1.0 has no
  `registered` performative, so its absence is warned about, not fatal.

## Options

| Option | Default | |
|---|---|---|
| `agentId` | — | Stable identifier. Required |
| `coordinatorUri` | `ws://localhost:8765` | |
| `semanticDescription` | `""` | Free text used for semantic discovery |
| `mode` | `ephemeral` | `persistent` is also recorded by the coordinator |
| `tokenProvider` | — | Called per connection, so rotated tokens are picked up on reconnect |
| `registrationTimeoutMs` | `10000` | How long to wait for acknowledgement before continuing |
| `reconnectInitialMs` / `reconnectMaxMs` | `500` / `30000` | Backoff bounds |
| `logger` | console | Pass `SILENT_LOGGER`, or your own |

Beyond `capabilities` and `executeTask`, a handler may implement
`offersFor(intent, envelope)` to narrow what it offers, and `onRegistered` /
`onRegistrationRefused` to observe admission. A refusal may be transient — an
agent awaiting approval becomes valid once approved — so the client stays
connected and registers again on the next reconnection.

## Testing your agent

The package ships the coordinator half as a test double, so you can drive an
agent through its whole lifecycle without running a bus:

```ts
import { LocalBus, until } from "liquid-interfaces/testing";

const bus = await new LocalBus().start();
const agent = new LipAgent({ agentId: "weather-01", coordinatorUri: bus.uri }, weather);
void agent.runForever();
await bus.waitFor("register");

bus.send("execute", "s1", { execution_plan: { city: "Lisbon" } });
const complete = await bus.waitFor("complete");
// complete.payload.status === "success"

await agent.stop();
await bus.stop();
```

`LocalBus` can also refuse registrations (`acceptRegistrations = false`), stay
silent as a 0.1.0 coordinator would (`answerRegistrations = false`), drop the
connection (`disconnect()`), and send frames that are not envelopes at all
(`sendRaw`) — the cases that are awkward to reproduce against a real bus and
are exactly where agents break.

It is the counterpart of `agentic_bus.testing.LocalBus` in the Python SDK, and
carries the same name deliberately.

## Conformance

This client is verified against the reference conformance suite:

```bash
pip install agentic-bus
agbus conformance --port 9100
```

```bash
node your-agent.js ws://127.0.0.1:9100
```

The suite grades an agent against the specification's MUST and SHOULD
requirements and is protocol-only, so it does not care what language the agent
is written in. This package passes it with no advisory warnings.

## Interoperability

LIP is versioned independently of this package. The minor version tracks the
protocol version implemented (`0.2.x` implements LIP 0.2.0); patches are
package fixes.

A 0.2.0 agent needs a 0.2.0 coordinator — an older one ignores `register`
entirely — so **coordinators are upgraded before agents**. The reverse
direction is fine: a 0.1.0 agent still works against a 0.2.0 coordinator.

## What is not here yet

This is the **agent** side. Submitting intents as a requester is not
implemented in TypeScript — use the Python SDK's `submit_intent`, or the
coordinator's HTTP API, and open an issue if you need it here.

## Links

- [Specification][spec] · [RFCs](https://github.com/draiven-io/liquid-interfaces/tree/main/rfcs) · [JSON Schemas](https://github.com/draiven-io/agentic-bus/tree/main/schemas)
- [agentic-bus](https://github.com/draiven-io/agentic-bus) — the reference coordinator and Python SDK
- [liquidinterfaces.org](https://liquidinterfaces.org)

Apache-2.0.

[spec]: https://github.com/draiven-io/liquid-interfaces/blob/main/spec/lip/README.md
