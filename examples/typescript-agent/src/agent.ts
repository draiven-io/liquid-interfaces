/**
 * A weather agent, written against the LIP specification.
 *
 *   npm start -- ws://127.0.0.1:9100
 *
 * Point it at a coordinator — or at `agbus conformance` — and it registers,
 * offers against intents, and executes when authorised.
 */

import { LipAgent, type AgentHandler, type Capability } from "liquid-interfaces";

const weather: AgentHandler = {
  capabilities(): Capability[] {
    return [
      {
        capability_id: "forecast",
        description: "Weather forecast for a city",
        estimated_cost: 0.01,
        estimated_latency: 0.5,
        expected_artifacts: ["forecast"],
      },
    ];
  },

  async executeTask(payload, _context, signal) {
    // Honour cancellation: `dissolve` aborts the signal mid-flight.
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 100);
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new Error("aborted"));
      });
    });

    return {
      forecast: "sunny",
      city: String(payload.city ?? payload.intent_text ?? "unknown"),
    };
  },
};

const uri = process.argv[2] ?? "ws://127.0.0.1:8765";
const agent = new LipAgent(
  {
    agentId: process.env.AGENT_ID ?? "ts-weather-01",
    coordinatorUri: uri,
    semanticDescription: "Weather forecasting for European cities",
    tokenProvider: () =>
      JSON.stringify({ sub: process.env.AGENT_ID ?? "ts-weather-01", iss: "dev" }),
    registrationTimeoutMs: 5_000,
  },
  weather,
);

process.on("SIGINT", () => void agent.stop().then(() => process.exit(0)));

console.log(`connecting to ${uri}`);
void agent.runForever();
