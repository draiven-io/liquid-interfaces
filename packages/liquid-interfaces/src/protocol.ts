/**
 * The wire format of the Liquid Interfaces Protocol.
 *
 * These declarations follow `spec/lip/README.md` and the published JSON
 * Schemas. They describe what goes on the wire and nothing else — no
 * transport, no behaviour — so they are useful to a coordinator, a requester
 * or an agent alike.
 *
 * @see https://github.com/draiven-io/liquid-interfaces/blob/main/spec/lip/README.md
 */

import { randomUUID } from "node:crypto";

/** The protocol version this package speaks. */
export const LIP_PROTOCOL_VERSION = "0.2.0";

/**
 * The version assumed for a message that arrives without one.
 *
 * Pinned to the last version that predates the `protocol_version` field, and
 * deliberately not tracking {@link LIP_PROTOCOL_VERSION}: an unversioned
 * message is old, not current.
 */
export const LIP_LEGACY_VERSION = "0.1.0";

/**
 * The closed set of performatives (spec §10).
 *
 * Closed is the point. A performative is an act that changes the state of an
 * interaction, so adding one changes what the protocol means — which is what
 * the RFC process is for. Declaring it as a union rather than `string` puts
 * that constraint in the compiler.
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

export const MESSAGE_TYPES: readonly MessageType[] = [
  "register",
  "registered",
  "intent",
  "offer",
  "accept",
  "reject",
  "execute",
  "complete",
  "dissolve",
  "event",
] as const;

export type SenderKind = "requester" | "coordinator" | "agent";

export interface Sender {
  kind: SenderKind;
  id: string;
  /** The authenticated subject behind this sender, when there is one. */
  oidc_subject?: string;
}

export interface TraceContext {
  trace_id: string;
  span_id: string;
}

/** Every LIP message, whatever its performative, has this shape. */
export interface Envelope<P = Record<string, unknown>> {
  protocol_version: string;
  message_id: string;
  /** The interaction context. Empty for `register` and `registered`, which belong to no interaction. */
  session_id: string;
  message_type: MessageType;
  timestamp: string;
  sender: Sender;
  trace?: TraceContext;
  payload: P;
}

/** What an agent can do, as declared at registration and offered against an intent. */
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

export interface RegisterPayload {
  agent_id: string;
  version?: string;
  mode?: "ephemeral" | "persistent";
  capabilities?: Capability[];
  semantic_description?: string;
  required_scopes?: string[];
  supported_data_domains?: string[];
  operational_constraints?: Record<string, unknown>;
}

export interface RegisteredPayload {
  accepted: boolean;
  agent_id?: string;
  /** Why registration was refused. Empty when accepted. */
  reason?: string;
  /** The capabilities actually accepted, which MAY be a subset of those offered. */
  registered_capabilities?: string[];
  coordinator_protocol_version?: string;
}

export interface IntentPayload {
  intent_text?: string;
  constraints?: Record<string, unknown>;
  context?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface OfferPayload {
  capability_id: string;
  capability_description?: string;
  constraints?: Record<string, unknown>;
  expected_artifacts?: string[];
  estimated_cost?: number;
  estimated_latency?: number;
  required_scopes?: string[];
  output_schema?: Record<string, unknown>;
}

export interface ExecutePayload {
  execution_plan?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CompletePayload {
  status: "success" | "error" | string;
  artifacts?: unknown[];
  metadata?: Record<string, unknown>;
}

/** Build a well-formed envelope. Exported because coordinators and requesters need it too. */
export function buildEnvelope<P>(
  messageType: MessageType,
  sender: Sender,
  sessionId: string,
  payload: P,
  trace?: TraceContext,
): Envelope<P> {
  return {
    protocol_version: LIP_PROTOCOL_VERSION,
    message_id: randomUUID(),
    session_id: sessionId,
    message_type: messageType,
    timestamp: new Date().toISOString(),
    sender,
    trace: trace ?? { trace_id: "", span_id: "" },
    payload,
  };
}

/**
 * Parse a frame into an envelope, or return `null` if it is not one.
 *
 * A message with no `protocol_version` is treated as {@link LIP_LEGACY_VERSION}
 * rather than rejected, so a 0.2.0 peer can still talk to a 0.1.0 one.
 */
export function parseEnvelope(raw: string): Envelope | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;

  const candidate = data as Partial<Envelope>;
  if (typeof candidate.message_type !== "string") return null;
  if (!MESSAGE_TYPES.includes(candidate.message_type as MessageType)) return null;

  return {
    ...(candidate as Envelope),
    protocol_version: candidate.protocol_version ?? LIP_LEGACY_VERSION,
    payload: candidate.payload ?? {},
  };
}
