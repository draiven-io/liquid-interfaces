/**
 * The agent client, tested against the LocalBus harness this package ships.
 *
 * These run against `dist/`, not `src/`, so what is tested is what is
 * published — including the export map, which is the part most likely to be
 * quietly wrong.
 */

import assert from "node:assert/strict";
import { after, afterEach, beforeEach, describe, it } from "node:test";

import {
  LipAgent,
  MESSAGE_TYPES,
  parseEnvelope,
  SILENT_LOGGER,
  LIP_LEGACY_VERSION,
  LIP_PROTOCOL_VERSION,
} from "../dist/index.js";

import { LocalBus, sleep, until } from "../dist/testing.js";

/** A handler that records what happened to it. */
function recordingHandler(overrides = {}) {
  const calls = { executed: [], aborted: 0, registered: [], refused: [] };

  return {
    calls,
    capabilities: () => [
      {
        capability_id: "forecast",
        description: "Weather forecast for a city",
        required_scopes: ["weather:read"],
        expected_artifacts: ["forecast"],
        estimated_cost: 0.01,
      },
    ],
    async executeTask(payload, context, signal) {
      calls.executed.push({ payload, context });
      if (signal.aborted) {
        calls.aborted += 1;
        throw new Error("aborted");
      }
      return { forecast: "sunny" };
    },
    onRegistered: (p) => calls.registered.push(p),
    onRegistrationRefused: (p) => calls.refused.push(p),
    ...overrides,
  };
}

describe("LipAgent", () => {
  let bus;
  let agent;

  beforeEach(async () => {
    bus = await new LocalBus().start();
  });

  afterEach(async () => {
    await agent?.stop();
    await bus.stop();
    agent = undefined;
  });

  /** Start an agent against the local bus. */
  async function connect(handler, options = {}) {
    agent = new LipAgent(
      {
        agentId: "test-agent",
        coordinatorUri: bus.uri,
        registrationTimeoutMs: 500,
        reconnectInitialMs: 10,
        reconnectMaxMs: 50,
        logger: SILENT_LOGGER,
        ...options,
      },
      handler,
    );
    void agent.runForever();
    return agent;
  }

  describe("registration", () => {
    it("sends register as the first message on the connection", async () => {
      const handler = recordingHandler();
      await connect(handler);
      await bus.waitFor("register");

      assert.equal(bus.messages[0].message_type, "register");
    });

    it("declares its agent id and capabilities", async () => {
      await connect(recordingHandler());
      const { payload } = await bus.waitFor("register");

      assert.equal(payload.agent_id, "test-agent");
      assert.equal(payload.capabilities.length, 1);
      assert.equal(payload.capabilities[0].capability_id, "forecast");
      assert.deepEqual(payload.required_scopes, ["weather:read"]);
    });

    it("observes an acknowledgement that arrives immediately", async () => {
      // LocalBus answers synchronously. An agent that attaches
      // its message handler after sending `register` misses this entirely —
      // which is the bug that made the first version of this client fail
      // conformance, so it is worth a test of its own.
      const handler = recordingHandler();
      await connect(handler);

      assert.ok(
        await until(() => handler.calls.registered.length === 1),
        "the acknowledgement was not observed",
      );
      assert.equal(agent.isRegistered, true);
      assert.deepEqual(handler.calls.registered[0].registered_capabilities, [
        "forecast",
      ]);
    });

    it("carries a bearer token on the upgrade request when one is provided", async () => {
      await connect(recordingHandler(), { tokenProvider: () => "a-token" });
      await bus.waitFor("register");

      assert.equal(bus.authHeaders[0], "Bearer a-token");
    });

    it("does not treat a missing acknowledgement as fatal", async () => {
      // A coordinator implementing LIP 0.1.0 never answers. Refusing to run
      // against it would be a worse outcome than running unconfirmed.
      bus.answerRegistrations = false;
      const handler = recordingHandler();
      await connect(handler);
      await bus.waitFor("register");

      await agent.waitUntilRegistered(2_000);
      assert.equal(agent.isRegistered, true);
      assert.equal(handler.calls.registered.length, 0, "nothing to report");

      // And it still serves.
      bus.send("intent", "s1", { intent_text: "weather in Lisbon" });
      await bus.waitFor("offer");
    });

    it("surfaces a refusal and stays unregistered", async () => {
      bus.acceptRegistrations = false;
      const handler = recordingHandler();
      await connect(handler);

      assert.ok(
        await until(() => handler.calls.refused.length === 1),
        "the refusal was not surfaced",
      );
      assert.equal(handler.calls.refused[0].reason, "agent is not approved");
      assert.equal(agent.isRegistered, false);
    });

    it("registers again after reconnecting", async () => {
      // Registration is per connection, not per process: an agent that
      // reconnects without registering is connected but undiscoverable.
      await connect(recordingHandler());
      await bus.waitFor("register");
      assert.equal(bus.registrationCount, 1);

      bus.disconnect();

      assert.ok(
        await until(() => bus.registrationCount === 2, 3_000),
        "the agent did not register again after reconnecting",
      );
    });
  });

  describe("discovery", () => {
    it("answers an intent with one offer per capability", async () => {
      await connect(recordingHandler());
      await bus.waitFor("register");

      bus.send("intent", "s1", { intent_text: "weather in Lisbon" });
      const offer = await bus.waitFor("offer");

      assert.equal(offer.session_id, "s1");
      assert.equal(offer.payload.capability_id, "forecast");
      assert.deepEqual(offer.payload.required_scopes, ["weather:read"]);
    });

    it("lets a handler narrow what it offers", async () => {
      const handler = recordingHandler({
        offersFor: (intent) =>
          String(intent.intent_text ?? "").includes("weather")
            ? [{ capability_id: "forecast" }]
            : [],
      });
      await connect(handler);
      await bus.waitFor("register");

      bus.send("intent", "s1", { intent_text: "book a flight" });
      await sleep(100);
      assert.equal(bus.of("offer").length, 0, "offered against a foreign intent");

      bus.send("intent", "s2", { intent_text: "weather in Lisbon" });
      await bus.waitFor("offer");
    });
  });

  describe("execution", () => {
    it("does not execute on an intent alone", async () => {
      const handler = recordingHandler();
      await connect(handler);
      await bus.waitFor("register");

      bus.send("intent", "s1", { intent_text: "weather in Lisbon" });
      await bus.waitFor("offer");
      await sleep(100);

      assert.equal(handler.calls.executed.length, 0, "executed without authorisation");
    });

    it("executes when authorised and reports completion", async () => {
      const handler = recordingHandler();
      await connect(handler);
      await bus.waitFor("register");

      bus.send("execute", "s1", {
        execution_plan: { city: "Lisbon", context: { locale: "pt-PT" } },
      });
      const complete = await bus.waitFor("complete");

      assert.equal(handler.calls.executed.length, 1);
      assert.deepEqual(handler.calls.executed[0].context, { locale: "pt-PT" });
      assert.equal(complete.session_id, "s1");
      assert.equal(complete.payload.status, "success");
      assert.deepEqual(complete.payload.artifacts, [{ forecast: "sunny" }]);
    });

    it("reports a failure as an error rather than going silent", async () => {
      const handler = recordingHandler({
        async executeTask() {
          throw new Error("upstream is down");
        },
      });
      await connect(handler);
      await bus.waitFor("register");

      bus.send("execute", "s1", { execution_plan: {} });
      const complete = await bus.waitFor("complete");

      assert.equal(complete.payload.status, "error");
      assert.match(complete.payload.artifacts[0].error, /upstream is down/);
    });
  });

  describe("dissolution", () => {
    it("cancels in-flight work and sends no completion", async () => {
      let aborted = false;
      const handler = recordingHandler({
        async executeTask(_payload, _context, signal) {
          await new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, 5_000);
            signal.addEventListener("abort", () => {
              clearTimeout(timer);
              aborted = true;
              reject(new Error("aborted"));
            });
          });
          return { never: true };
        },
      });
      await connect(handler);
      await bus.waitFor("register");

      bus.send("execute", "s1", { execution_plan: {} });
      await sleep(100);
      bus.send("dissolve", "s1", { reason: "requester went away" });

      assert.ok(await until(() => aborted), "work was not cancelled");
      await sleep(150);
      assert.equal(
        bus.of("complete").length,
        0,
        "completed against a dissolved interaction",
      );
    });

    it("dissolves only the session it names", async () => {
      const running = new Map();
      const handler = recordingHandler({
        async executeTask(payload, _context, signal) {
          const id = payload.id;
          await new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, 300);
            signal.addEventListener("abort", () => {
              clearTimeout(timer);
              running.set(id, "aborted");
              reject(new Error("aborted"));
            });
          });
          running.set(id, "finished");
          return { id };
        },
      });
      await connect(handler);
      await bus.waitFor("register");

      bus.send("execute", "s1", { execution_plan: { id: "one" } });
      bus.send("execute", "s2", { execution_plan: { id: "two" } });
      await sleep(50);
      bus.send("dissolve", "s1", {});

      const complete = await bus.waitFor("complete");
      assert.equal(running.get("one"), "aborted");
      assert.equal(complete.session_id, "s2", "the surviving session completed");
      assert.equal(bus.of("complete").length, 1);
    });
  });

  describe("protocol hygiene", () => {
    it("versions every message it sends", async () => {
      await connect(recordingHandler());
      await bus.waitFor("register");
      bus.send("execute", "s1", { execution_plan: {} });
      await bus.waitFor("complete");

      for (const message of bus.messages) {
        assert.equal(
          message.protocol_version,
          LIP_PROTOCOL_VERSION,
          `${message.message_type} carried no protocol version`,
        );
      }
    });

    it("uses only performatives the protocol defines", async () => {
      await connect(recordingHandler());
      await bus.waitFor("register");
      bus.send("intent", "s1", {});
      await bus.waitFor("offer");

      for (const message of bus.messages) {
        assert.ok(
          MESSAGE_TYPES.includes(message.message_type),
          `undefined performative: ${message.message_type}`,
        );
      }
    });

    it("leaves session_id empty on registration", async () => {
      // `register` belongs to no interaction, so a session id would be a lie.
      await connect(recordingHandler());
      const register = await bus.waitFor("register");

      assert.equal(register.session_id, "");
    });

    it("survives frames that are not envelopes", async () => {
      await connect(recordingHandler());
      await bus.waitFor("register");

      bus.sendRaw("this is not JSON");
      bus.sendRaw(JSON.stringify({ message_type: "improvise", payload: {} }));
      bus.sendRaw(JSON.stringify([1, 2, 3]));
      await sleep(100);

      // Still serving.
      bus.send("intent", "s1", {});
      await bus.waitFor("offer");
    });
  });
});

describe("parseEnvelope", () => {
  it("rejects anything that is not a LIP envelope", () => {
    assert.equal(parseEnvelope("not json"), null);
    assert.equal(parseEnvelope("null"), null);
    assert.equal(parseEnvelope("[1,2,3]"), null);
    assert.equal(parseEnvelope(JSON.stringify({ payload: {} })), null);
    assert.equal(
      parseEnvelope(JSON.stringify({ message_type: "improvise" })),
      null,
      "an undefined performative is not an envelope",
    );
  });

  it("treats an unversioned message as the version that predates the field", () => {
    // Not the current version: an unversioned message is old, not current.
    const envelope = parseEnvelope(
      JSON.stringify({ message_type: "intent", session_id: "s1", payload: {} }),
    );

    assert.equal(envelope.protocol_version, LIP_LEGACY_VERSION);
    assert.notEqual(LIP_LEGACY_VERSION, LIP_PROTOCOL_VERSION);
  });
});

after(async () => {
  // node:test keeps the process alive if a stray timer survives a failure.
  await sleep(50);
});
