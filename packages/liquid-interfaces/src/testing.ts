/**
 * A coordinator stand-in, for testing agents without running a bus.
 *
 * ```ts
 * import { LocalBus } from "liquid-interfaces/testing";
 *
 * const bus = await new LocalBus().start();
 * const agent = new LipAgent({ agentId: "mine", coordinatorUri: bus.uri }, handler);
 * void agent.runForever();
 * await bus.waitFor("register");
 *
 * bus.send("intent", "s1", { intent_text: "weather in Lisbon" });
 * const offer = await bus.waitFor("offer");
 * ```
 *
 * It speaks enough LIP to drive an agent through the whole lifecycle: admit
 * it, put an intent to it, authorise execution, and dissolve. What it does
 * *not* do is match, plan or authorise anything — those belong to a real
 * coordinator, and a double that guessed at them would only be testing the
 * double.
 *
 * This is the counterpart of `agentic_bus.testing.LocalBus` in the Python
 * SDK, and deliberately carries the same name.
 */

import type { IncomingMessage } from "node:http";

import { WebSocketServer, type WebSocket } from "ws";

import {
  LIP_PROTOCOL_VERSION,
  type Envelope,
  type MessageType,
  type RegisterPayload,
} from "./protocol.js";

export class LocalBus {
  /** Every envelope received, in arrival order. */
  readonly messages: Envelope[] = [];
  /** Frames that arrived but were not parseable as JSON. */
  readonly malformed: string[] = [];
  /** The `Authorization` header seen on each upgrade request. */
  readonly authHeaders: (string | null)[] = [];
  /** How many registrations have been seen, counting reconnections. */
  registrationCount = 0;

  /** When false, `registered` carries `accepted: false`. */
  acceptRegistrations = true;
  /** When false, no `registered` is sent at all — as a 0.1.0 coordinator would behave. */
  answerRegistrations = true;
  /** The reason given when a registration is refused. */
  refusalReason = "agent is not approved";

  private server: WebSocketServer | null = null;
  private socket: WebSocket | null = null;
  private waiters: ((envelope: Envelope) => void)[] = [];

  /** Bind to an ephemeral port on loopback. */
  async start(): Promise<this> {
    const server = new WebSocketServer({ port: 0, host: "127.0.0.1" });
    this.server = server;
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));

    server.on("connection", (socket: WebSocket, request: IncomingMessage) => {
      this.socket = socket;
      this.authHeaders.push(request.headers.authorization ?? null);
      socket.on("message", (raw: unknown) => this.onMessage(String(raw)));
    });

    return this;
  }

  get port(): number {
    const address = this.server?.address();
    if (!address || typeof address === "string") {
      throw new Error("the bus is not listening; call start() first");
    }
    return address.port;
  }

  get uri(): string {
    return `ws://127.0.0.1:${this.port}`;
  }

  /** Every message of a given performative, oldest first. */
  of(messageType: MessageType): Envelope[] {
    return this.messages.filter((m) => m.message_type === messageType);
  }

  /** The capabilities the agent declared, or an empty list if it never registered. */
  get registeredCapabilities(): string[] {
    const register = this.of("register").at(-1);
    if (!register) return [];
    const payload = register.payload as unknown as RegisterPayload;
    return (payload.capabilities ?? []).map((c) => c.capability_id);
  }

  private onMessage(raw: string): void {
    let envelope: Envelope;
    try {
      envelope = JSON.parse(raw) as Envelope;
    } catch {
      this.malformed.push(raw);
      return;
    }
    this.messages.push(envelope);

    if (envelope.message_type === "register") {
      this.registrationCount += 1;
      // Answered synchronously, which is the tight case: an agent that
      // attaches its message handler only after sending `register` never
      // sees this answer at all.
      if (this.answerRegistrations) {
        const payload = envelope.payload as unknown as RegisterPayload;
        this.send("registered", "", {
          accepted: this.acceptRegistrations,
          agent_id: payload.agent_id,
          reason: this.acceptRegistrations ? "" : this.refusalReason,
          registered_capabilities: this.acceptRegistrations
            ? (payload.capabilities ?? []).map((c) => c.capability_id)
            : [],
          coordinator_protocol_version: LIP_PROTOCOL_VERSION,
        });
      }
    }

    for (const waiter of [...this.waiters]) waiter(envelope);
  }

  /** Send a well-formed message from the coordinator. */
  send(messageType: MessageType, sessionId: string, payload: Record<string, unknown>): void {
    this.socket?.send(
      JSON.stringify({
        protocol_version: LIP_PROTOCOL_VERSION,
        message_id: `local-bus-${this.messages.length}-${messageType}`,
        session_id: sessionId,
        message_type: messageType,
        timestamp: new Date().toISOString(),
        sender: { kind: "coordinator", id: "local-bus" },
        trace: { trace_id: "", span_id: "" },
        payload,
      }),
    );
  }

  /** Send an arbitrary frame, including one that is not an envelope at all. */
  sendRaw(frame: string): void {
    this.socket?.send(frame);
  }

  /** Drop the connection, as a restarting coordinator would. */
  disconnect(): void {
    this.socket?.terminate();
    this.socket = null;
  }

  /** Resolve when a message of this performative arrives; reject on timeout. */
  waitFor(messageType: MessageType, timeoutMs = 2_000): Promise<Envelope> {
    const seen = this.of(messageType).at(-1);
    if (seen) return Promise.resolve(seen);

    return new Promise((resolve, reject) => {
      const waiter = (envelope: Envelope) => {
        if (envelope.message_type !== messageType) return;
        clearTimeout(timer);
        this.waiters = this.waiters.filter((w) => w !== waiter);
        resolve(envelope);
      };
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w !== waiter);
        reject(
          new Error(
            `no '${messageType}' within ${timeoutMs}ms; saw: ` +
              (this.messages.map((m) => m.message_type).join(", ") || "nothing"),
          ),
        );
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }

  async stop(): Promise<void> {
    this.socket?.terminate();
    const server = this.server;
    if (!server) return;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    this.server = null;
  }
}

/** Poll until a condition holds, or the timeout expires. */
export async function until(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 2_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return false;
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
