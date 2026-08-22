/**
 * A minimal Liquid Interfaces Protocol agent client.
 *
 * Written from `spec/lip/README.md` and the published JSON Schemas, without
 * reference to the Python implementation — the point being to find out
 * whether the specification is sufficient on its own.
 *
 * Covers the agent side of LIP 0.2.0: registration, offering against an
 * intent, executing when authorised, and honouring dissolution.
 */

import WebSocket from "ws";
import { randomUUID } from "node:crypto";

export const LIP_PROTOCOL_VERSION = "0.2.0";

/**
 * The closed set of performatives (spec §10). An implementation needing a new
 * one needs an RFC, so this is deliberately not extensible.
 */
export type MessageType =
  | "register"
  | "registered"
  | "intent"
  | "offer"
  | "accept"
  | "reject"
  | "execute"
  | "complete"
  | "dissolve"
  | "event";

export type SenderKind = "requester" | "coordinator" | "agent";

export interface Sender {
  kind: SenderKind;
  id: string;
  oidc_subject?: string;
}

export interface Envelope<P = Record<string, unknown>> {
  protocol_version: string;
  message_id: string;
  session_id: string;
  message_type: MessageType;
  timestamp: string;
  sender: Sender;
  trace?: { trace_id: string; span_id: string };
  payload: P;
}

/** A capability descriptor, as carried in a register payload. */
export interface Capability {
  capability_id: string;
  description?: string;
  required_scopes?: string[];
  supported_data_domains?: string[];
  expected_artifacts?: string[];
  estimated_cost?: number;
  estimated_latency?: number;
  output_schema?: Record<string, unknown>;
}

export interface RegisteredPayload {
  accepted: boolean;
  agent_id?: string;
  reason?: string;
  registered_capabilities?: string[];
  coordinator_protocol_version?: string;
}

export interface AgentOptions {
  agentId: string;
  coordinatorUri?: string;
  version?: string;
  semanticDescription?: string;
  /**
   * Called on every connection. Spec §12 requires agents to be authenticated
   * but does not say how the credential is carried, so this follows the
   * common convention of a bearer token in the upgrade request.
   */
  tokenProvider?: () => string | Promise<string>;
  /** Milliseconds to wait for `registered` before continuing anyway. */
  registrationTimeoutMs?: number;
  /** Backoff bounds for reconnection. */
  reconnectInitialMs?: number;
  reconnectMaxMs?: number;
}

/** What a subclass implements. */
export interface AgentHandler {
  capabilities(): Capability[];
  /** Runs only after an `execute` arrives, and may be cancelled by `dissolve`. */
  executeTask(
    payload: Record<string, unknown>,
    context: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<Record<string, unknown>>;
}

export class LipAgent {
  private ws: WebSocket | null = null;
  private stopping = false;
  private attempt = 0;
  /** In-flight work per session, so `dissolve` can cancel exactly its own. */
  private sessions = new Map<string, AbortController>();

  constructor(
    private readonly options: AgentOptions,
    private readonly handler: AgentHandler,
  ) {}

  private get uri(): string {
    return this.options.coordinatorUri ?? "ws://localhost:8765";
  }

  private envelope<P>(
    messageType: MessageType,
    sessionId: string,
    payload: P,
  ): Envelope<P> {
    return {
      protocol_version: LIP_PROTOCOL_VERSION,
      message_id: randomUUID(),
      session_id: sessionId,
      message_type: messageType,
      timestamp: new Date().toISOString(),
      sender: { kind: "agent", id: this.options.agentId, oidc_subject: "" },
      trace: { trace_id: "", span_id: "" },
      payload,
    };
  }

  private send<P>(messageType: MessageType, sessionId: string, payload: P): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(this.envelope(messageType, sessionId, payload)));
  }

  /** Serve until `stop()`, reconnecting whenever the connection drops. */
  async runForever(): Promise<void> {
    this.stopping = false;
    while (!this.stopping) {
      try {
        await this.connectAndServe();
      } catch (err) {
        console.warn(`[${this.options.agentId}] connection failed:`, String(err));
      }
      if (this.stopping) break;

      // Exponential backoff with full jitter: every agent notices a
      // coordinator restart at the same instant, and an unjittered backoff
      // marches them all back in lockstep.
      const initial = this.options.reconnectInitialMs ?? 500;
      const max = this.options.reconnectMaxMs ?? 30_000;
      const window = Math.min(initial * 2 ** this.attempt, max);
      this.attempt += 1;
      await new Promise((r) => setTimeout(r, Math.random() * window));
    }
  }

  private async connectAndServe(): Promise<void> {
    const headers: Record<string, string> = {};
    if (this.options.tokenProvider) {
      headers.Authorization = `Bearer ${await this.options.tokenProvider()}`;
    }

    const ws = new WebSocket(this.uri, { headers });
    this.ws = ws;

    await new Promise<void>((resolve, reject) => {
      ws.once("open", () => resolve());
      ws.once("error", reject);
    });

    this.attempt = 0;

    // Listen before registering. `register()` waits for the `registered`
    // answer, so a handler attached afterwards misses it — and misses
    // anything else the coordinator sends during that window. The spec's
    // "send register and wait" phrasing invites exactly this ordering
    // mistake; the acknowledgement is only observable if you are already
    // listening when you ask for it.
    const closed = new Promise<void>((resolve) => {
      ws.on("message", (raw) => this.onMessage(raw.toString()));
      ws.once("close", () => resolve());
      ws.once("error", () => resolve());
    });

    // Spec §10: `register` MUST be the first message on every connection.
    // Registration is per-connection, so a reconnect registers again.
    await this.register();

    await closed;
  }

  private async register(): Promise<void> {
    const capabilities = this.handler.capabilities();

    this.send("register", "", {
      agent_id: this.options.agentId,
      version: this.options.version ?? "0.1.0",
      mode: "ephemeral",
      capabilities,
      semantic_description: this.options.semanticDescription ?? "",
      required_scopes: capabilities.flatMap((c) => c.required_scopes ?? []),
      supported_data_domains: capabilities.flatMap(
        (c) => c.supported_data_domains ?? [],
      ),
      operational_constraints: {},
    });

    // SHOULD wait for `registered`, but MUST NOT treat its absence as fatal:
    // a coordinator implementing 0.1.0 never sends one.
    const ack = await this.awaitRegistered(
      this.options.registrationTimeoutMs ?? 10_000,
    );
    if (!ack) {
      console.warn(
        `[${this.options.agentId}] no 'registered' answer — continuing; ` +
          `the coordinator may predate LIP 0.2.0`,
      );
      return;
    }
    if (!ack.accepted) {
      console.error(
        `[${this.options.agentId}] registration refused: ${ack.reason ?? "no reason given"}`,
      );
      return;
    }
    console.log(
      `[${this.options.agentId}] registered ` +
        `${ack.registered_capabilities?.length ?? capabilities.length} capabilities`,
    );
  }

  private pendingRegistration: ((p: RegisteredPayload | null) => void) | null = null;

  private awaitRegistered(timeoutMs: number): Promise<RegisteredPayload | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pendingRegistration = null;
        resolve(null);
      }, timeoutMs);
      this.pendingRegistration = (payload) => {
        clearTimeout(timer);
        this.pendingRegistration = null;
        resolve(payload);
      };
    });
  }

  private onMessage(raw: string): void {
    let envelope: Envelope;
    try {
      envelope = JSON.parse(raw) as Envelope;
    } catch {
      console.warn(`[${this.options.agentId}] ignoring unparseable frame`);
      return;
    }

    switch (envelope.message_type) {
      case "registered":
        this.pendingRegistration?.(envelope.payload as unknown as RegisteredPayload);
        break;
      case "intent":
        // Offer generation may be slow, so it does not block the socket.
        void this.handleIntent(envelope);
        break;
      case "execute":
        void this.handleExecute(envelope);
        break;
      case "dissolve":
        this.handleDissolve(envelope);
        break;
      default:
        // `event` and coordinator-directed performatives are not ours to act
        // on. Ignoring an unknown type is safe by design (spec §13).
        break;
    }
  }

  private async handleIntent(envelope: Envelope): Promise<void> {
    // One offer per capability. A coordinator composes them; deciding which
    // is best is not the agent's job.
    for (const capability of this.handler.capabilities()) {
      this.send("offer", envelope.session_id, {
        capability_id: capability.capability_id,
        capability_description: capability.description ?? "",
        constraints: {},
        expected_artifacts: capability.expected_artifacts ?? [],
        estimated_cost: capability.estimated_cost ?? 0,
        estimated_latency: capability.estimated_latency ?? 0,
        required_scopes: capability.required_scopes ?? [],
        output_schema: capability.output_schema ?? {},
      });
    }
  }

  private async handleExecute(envelope: Envelope): Promise<void> {
    const sessionId = envelope.session_id;
    const plan = (envelope.payload.execution_plan ?? {}) as Record<string, unknown>;
    const context = (plan.context ?? {}) as Record<string, unknown>;

    const controller = new AbortController();
    this.sessions.set(sessionId, controller);

    let status = "success";
    let result: Record<string, unknown>;
    try {
      result = await this.handler.executeTask(plan, context, controller.signal);
    } catch (err) {
      if (controller.signal.aborted) {
        // Dissolved mid-flight. No `complete` is sent: the interaction
        // context no longer exists to complete.
        this.sessions.delete(sessionId);
        return;
      }
      status = "error";
      result = { error: String(err) };
    }

    this.sessions.delete(sessionId);
    this.send("complete", sessionId, {
      status,
      artifacts: [result],
      metadata: { agent_id: this.options.agentId },
    });
  }

  private handleDissolve(envelope: Envelope): void {
    // Dissolution is mandatory cleanup (spec §9), so in-flight work for the
    // session is cancelled rather than allowed to finish.
    const controller = this.sessions.get(envelope.session_id);
    controller?.abort();
    this.sessions.delete(envelope.session_id);
  }

  async stop(): Promise<void> {
    this.stopping = true;
    for (const controller of this.sessions.values()) controller.abort();
    this.sessions.clear();
    this.ws?.close();
  }
}
