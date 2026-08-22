/**
 * A TypeScript client for the Liquid Interfaces Protocol.
 *
 * @see https://github.com/draiven-io/liquid-interfaces
 */

export {
  LipAgent,
  SILENT_LOGGER,
  type AgentHandler,
  type AgentOptions,
  type Logger,
} from "./agent.js";

export {
  buildEnvelope,
  parseEnvelope,
  LIP_LEGACY_VERSION,
  LIP_PROTOCOL_VERSION,
  MESSAGE_TYPES,
  type Capability,
  type CompletePayload,
  type Envelope,
  type ExecutePayload,
  type IntentPayload,
  type MessageType,
  type OfferPayload,
  type RegisterPayload,
  type RegisteredPayload,
  type Sender,
  type SenderKind,
  type TraceContext,
} from "./protocol.js";
