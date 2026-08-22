/**
 * The agent side of the Liquid Interfaces Protocol.
 *
 * An agent registers what it can do, offers against intents it can serve,
 * executes only when authorised to, and stops when the interaction dissolves.
 * Everything else — matching, planning, authorisation — belongs to the
 * coordinator, and deliberately does not appear here.
 */

import WebSocket from "ws";

import {
  buildEnvelope,
  parseEnvelope,
  type Capability,
  type CompletePayload,
  type Envelope,
  type ExecutePayload,
  type IntentPayload,
  type MessageType,
  type OfferPayload,
  type RegisteredPayload,
  type Sender,
} from "./protocol.js";

/** Where the client reports. Swap it for your own to route into a real logger. */
export interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

const CONSOLE_LOGGER: Logger = {
  debug: () => {},
  info: (m) => console.log(m),
  warn: (m) => console.warn(m),
  error: (m) => console.error(m),
};

/** A logger that discards everything, for tests and embedded use. */
export const SILENT_LOGGER: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

/** Matches credentials embedded in a URI, so they never reach a log line. */
const URI_CREDENTIALS = /\/\/[^/\s@]*:[^/\s@]*@/g;

function stripCredentials(uri: string): string {
  return uri.replace(URI_CREDENTIALS, "//");
}

export interface AgentOptions {
  /** Stable identifier for this agent. */
  agentId: string;
  /** Coordinator WebSocket URI. Defaults to `ws://localhost:8765`. */
  coordinatorUri?: string;
  /** The agent's own version, not the protocol's. */
  version?: string;
  /** Free text used by the coordinator for semantic discovery. */
  semanticDescription?: string;
  /** `ephemeral` is discarded when the connection drops; `persistent` is recorded. */
  mode?: "ephemeral" | "persistent";
  /** Limits the coordinator should respect when planning around this agent. */
  operationalConstraints?: Record<string, unknown>;
  /**
   * Called on every connection attempt, so a rotated token is picked up on
   * reconnect rather than at construction.
   *
   * Spec §12 requires agents to be authenticated but does not say how the
   * credential travels; this follows the convention of a bearer token on the
   * WebSocket upgrade request.
   */
  tokenProvider?: () => string | Promise<string>;
  /** How long to wait for `registered` before continuing anyway. Default 10s. */
  registrationTimeoutMs?: number;
  /** Backoff floor for reconnection. Default 500ms. */
  reconnectInitialMs?: number;
  /** Backoff ceiling for reconnection. Default 30s. */
  reconnectMaxMs?: number;
  /** Defaults to logging on the console; pass {@link SILENT_LOGGER} to quieten it. */
  logger?: Logger;
}

/** What an agent implementation provides. */
export interface AgentHandler {
  /** Declared at registration and offered against every matching intent. */
  capabilities(): Capability[];

  /**
   * Runs only after an `execute` arrives — never on `intent` alone.
   *
   * `signal` aborts when the interaction dissolves. Long-running work should
   * check it, because a dissolved session has nothing left to report to.
   */
  executeTask(
    payload: ExecutePayload,
    context: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<Record<string, unknown>>;

  /**
   * Which capabilities to offer for a given intent. Optional: the default
   * offers all of them and lets the coordinator choose.
   */
  offersFor?(intent: IntentPayload, envelope: Envelope<IntentPayload>): Capability[];

  /** The coordinator admitted this agent. */
  onRegistered?(payload: RegisteredPayload): void;

  /**
   * The coordinator refused this agent, and said why.
   *
   * A refusal may be transient — an agent awaiting approval becomes valid
   * once approved — so the connection is left open and registration is
   * retried on the next reconnection.
   */
  onRegistrationRefused?(payload: RegisteredPayload): void;
}

export class LipAgent {
  private ws: WebSocket | null = null;
  private stopping = false;
  private attempt = 0;
  private registered = false;
  /** In-flight work by session, so `dissolve` cancels exactly its own. */
  private readonly sessions = new Map<string, AbortController>();
  private pendingRegistration: ((p: RegisteredPayload | null) => void) | null = null;
  private readonly registrationWaiters = new Set<() => void>();
  private readonly log: Logger;

  constructor(
    private readonly options: AgentOptions,
    private readonly handler: AgentHandler,
  ) {
    this.log = options.logger ?? CONSOLE_LOGGER;
  }

  get uri(): string {
    return this.options.coordinatorUri ?? "ws://localhost:8765";
  }

  get agentId(): string {
    return this.options.agentId;
  }

  /** Connected and admitted by the coordinator. */
  get isRegistered(): boolean {
    return this.registered;
  }

  private get sender(): Sender {
    return { kind: "agent", id: this.options.agentId, oidc_subject: "" };
  }

  private send<P>(messageType: MessageType, sessionId: string, payload: P): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.log.debug(`[${this.agentId}] dropping ${messageType}: socket not open`);
      return;
    }
    this.ws.send(
      JSON.stringify(buildEnvelope(messageType, this.sender, sessionId, payload)),
    );
  }

  /** Resolves once the coordinator has admitted this agent. */
  waitUntilRegistered(timeoutMs = 10_000): Promise<void> {
    if (this.registered) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const waiter = () => {
        clearTimeout(timer);
        this.registrationWaiters.delete(waiter);
        resolve();
      };
      const timer = setTimeout(() => {
        this.registrationWaiters.delete(waiter);
        reject(new Error(`${this.agentId} was not registered within ${timeoutMs}ms`));
      }, timeoutMs);
      this.registrationWaiters.add(waiter);
    });
  }

  /** Connect once and serve until the connection closes. */
  async start(): Promise<void> {
    await this.connectAndServe();
  }

  /** Serve until {@link stop}, reconnecting whenever the connection drops. */
  async runForever(): Promise<void> {
    this.stopping = false;
    while (!this.stopping) {
      try {
        await this.connectAndServe();
      } catch (err) {
        this.log.warn(
          `[${this.agentId}] connection to ${stripCredentials(this.uri)} failed: ${String(err)}`,
        );
      }
      if (this.stopping) break;
      await this.backoff();
    }
  }

  /**
   * Exponential backoff with full jitter.
   *
   * Every agent notices a coordinator restart at the same instant, so an
   * unjittered backoff marches them all back in lockstep and the coordinator
   * is knocked over by its own clients.
   */
  private backoff(): Promise<void> {
    const initial = this.options.reconnectInitialMs ?? 500;
    const max = this.options.reconnectMaxMs ?? 30_000;
    const window = Math.min(initial * 2 ** this.attempt, max);
    this.attempt += 1;
    return new Promise((resolve) => setTimeout(resolve, Math.random() * window));
  }

  private async connectAndServe(): Promise<void> {
    const headers: Record<string, string> = {};
    if (this.options.tokenProvider) {
      headers.Authorization = `Bearer ${await this.options.tokenProvider()}`;
    }

    const ws = new WebSocket(this.uri, { headers });
    this.ws = ws;

    try {
      await new Promise<void>((resolve, reject) => {
        const onOpen = () => {
          ws.off("error", onError);
          resolve();
        };
        const onError = (err: Error) => {
          ws.off("open", onOpen);
          reject(err);
        };
        ws.once("open", onOpen);
        ws.once("error", onError);
      });
    } catch (err) {
      ws.terminate();
      throw err;
    }

    this.attempt = 0;

    // Listen before registering. `register()` waits for the `registered`
    // answer, so a handler attached afterwards misses it — along with
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
    // Registration is per connection, so a reconnect registers again.
    await this.register();

    await closed;

    this.registered = false;
    for (const controller of this.sessions.values()) controller.abort();
    this.sessions.clear();
  }

  private async register(): Promise<void> {
    const capabilities = this.handler.capabilities();

    this.send("register", "", {
      agent_id: this.options.agentId,
      version: this.options.version ?? "0.1.0",
      mode: this.options.mode ?? "ephemeral",
      capabilities,
      semantic_description: this.options.semanticDescription ?? "",
      required_scopes: [
        ...new Set(capabilities.flatMap((c) => c.required_scopes ?? [])),
      ],
      supported_data_domains: [
        ...new Set(capabilities.flatMap((c) => c.supported_data_domains ?? [])),
      ],
      operational_constraints: this.options.operationalConstraints ?? {},
    });

    // SHOULD wait for `registered`, but MUST NOT treat its absence as fatal:
    // a coordinator implementing 0.1.0 never sends one, and refusing to run
    // against it is a worse outcome than running without confirmation.
    const ack = await this.awaitRegistered(
      this.options.registrationTimeoutMs ?? 10_000,
    );

    if (!ack) {
      this.log.warn(
        `[${this.agentId}] no acknowledgement of registration — continuing; ` +
          `the coordinator may predate LIP 0.2.0`,
      );
      this.markRegistered();
      return;
    }

    if (!ack.accepted) {
      this.log.error(
        `[${this.agentId}] registration refused: ${ack.reason || "no reason given"}`,
      );
      this.handler.onRegistrationRefused?.(ack);
      return;
    }

    this.log.info(
      `[${this.agentId}] registered ` +
        `${ack.registered_capabilities?.length ?? capabilities.length} capabilities`,
    );
    this.handler.onRegistered?.(ack);
    this.markRegistered();
  }

  private markRegistered(): void {
    this.registered = true;
    for (const waiter of [...this.registrationWaiters]) waiter();
  }

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
    const envelope = parseEnvelope(raw);
    if (!envelope) {
      this.log.warn(`[${this.agentId}] ignoring frame that is not a LIP envelope`);
      return;
    }

    switch (envelope.message_type) {
      case "registered":
        this.pendingRegistration?.(envelope.payload as unknown as RegisteredPayload);
        break;
      case "intent":
        this.handleIntent(envelope as Envelope<IntentPayload>);
        break;
      case "execute":
        void this.handleExecute(envelope as Envelope<ExecutePayload>);
        break;
      case "dissolve":
        this.handleDissolve(envelope);
        break;
      default:
        // `event` and the coordinator-directed performatives are not ours to
        // act on. Ignoring a performative you do not handle is safe by design.
        break;
    }
  }

  private handleIntent(envelope: Envelope<IntentPayload>): void {
    // One offer per capability by default. Composing them is the
    // coordinator's job; deciding which is best is not the agent's.
    const offered =
      this.handler.offersFor?.(envelope.payload, envelope) ??
      this.handler.capabilities();

    for (const capability of offered) {
      const offer: OfferPayload = {
        capability_id: capability.capability_id,
        capability_description: capability.description ?? "",
        constraints: {},
        expected_artifacts: capability.expected_artifacts ?? [],
        estimated_cost: capability.estimated_cost ?? 0,
        estimated_latency: capability.estimated_latency ?? 0,
        required_scopes: capability.required_scopes ?? [],
        output_schema: capability.output_schema ?? {},
      };
      this.send("offer", envelope.session_id, offer);
    }
  }

  private async handleExecute(envelope: Envelope<ExecutePayload>): Promise<void> {
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
        // context it would report against no longer exists.
        this.sessions.delete(sessionId);
        this.log.debug(
          `[${this.agentId}] session ${sessionId} dissolved mid-execution`,
        );
        return;
      }
      status = "error";
      result = { error: String(err) };
      this.log.warn(`[${this.agentId}] execution failed: ${String(err)}`);
    }

    this.sessions.delete(sessionId);

    const complete: CompletePayload = {
      status,
      artifacts: [result],
      metadata: { agent_id: this.options.agentId },
    };
    this.send("complete", sessionId, complete);
  }

  private handleDissolve(envelope: Envelope): void {
    // Dissolution is mandatory cleanup (spec §9), so in-flight work for the
    // session is cancelled rather than left to finish into a void.
    this.sessions.get(envelope.session_id)?.abort();
    this.sessions.delete(envelope.session_id);
  }

  /** Stop serving, cancel in-flight work, and close the connection. */
  async stop(): Promise<void> {
    this.stopping = true;
    this.registered = false;
    for (const controller of this.sessions.values()) controller.abort();
    this.sessions.clear();
    this.ws?.close();
  }
}
