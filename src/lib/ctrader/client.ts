/**
 * cTrader Open API — TLS TCP client.
 *
 * The cTrader API uses a persistent TLS connection with length-prefixed
 * protobuf messages. Each message is framed as:
 *   [4-byte big-endian length][ProtoMessage bytes]
 *
 * Endpoints:
 *   Live:  live.ctraderapi.com:5035
 *   Demo:  demo.ctraderapi.com:5035
 */

import * as tls from "tls";
import * as crypto from "crypto";
import {
  PT,
  wrapMessage,
  unwrapMessage,
  frameMessage,
  buildHeartbeat,
  parseError,
  type ProtoEnvelope,
} from "./proto";

export interface CtraderClientOptions {
  host?: string;
  port?: number;
  timeoutMs?: number;
}

const LIVE_HOST = "live.ctraderapi.com";
const DEMO_HOST = "demo.ctraderapi.com";
const PORT = 5035;
const DEFAULT_TIMEOUT = 30_000;

type MessageHandler = (envelope: ProtoEnvelope) => void;

export class CtraderClient {
  private socket: tls.TLSSocket | null = null;
  private buffer = Buffer.alloc(0);
  private handlers = new Map<string, MessageHandler>();
  private broadcastHandlers: MessageHandler[] = [];
  private host: string;
  private port: number;
  private timeoutMs: number;

  constructor(isLive = true, opts: CtraderClientOptions = {}) {
    this.host = opts.host ?? (isLive ? LIVE_HOST : DEMO_HOST);
    this.port = opts.port ?? PORT;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = tls.connect(
        { host: this.host, port: this.port, rejectUnauthorized: true },
        () => { resolve(); }
      );
      socket.setTimeout(this.timeoutMs);
      socket.on("data", (chunk: Buffer) => this.onData(chunk));
      socket.on("error", (err) => reject(err));
      socket.on("timeout", () => {
        socket.destroy(new Error("cTrader socket timeout"));
      });
      this.socket = socket;
    });
  }

  disconnect() {
    this.socket?.destroy();
    this.socket = null;
  }

  private onData(chunk: Buffer) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 4) {
      const msgLen = this.buffer.readUInt32BE(0);
      if (this.buffer.length < 4 + msgLen) break;
      const msgBuf = this.buffer.subarray(4, 4 + msgLen);
      this.buffer = this.buffer.subarray(4 + msgLen);
      try {
        const envelope = unwrapMessage(msgBuf);
        this.dispatch(envelope);
      } catch (e) {
        // Malformed message — skip
      }
    }
  }

  private dispatch(envelope: ProtoEnvelope) {
    // Reply to server heartbeats
    if (envelope.payloadType === PT.HEARTBEAT) {
      this.sendRaw(wrapMessage(PT.HEARTBEAT, buildHeartbeat()));
      return;
    }
    // Route by clientMsgId
    if (envelope.clientMsgId) {
      const handler = this.handlers.get(envelope.clientMsgId);
      if (handler) {
        this.handlers.delete(envelope.clientMsgId);
        handler(envelope);
        return;
      }
    }
    // Broadcast to catch-all handlers
    for (const h of this.broadcastHandlers) h(envelope);
  }

  private sendRaw(msg: Buffer) {
    this.socket?.write(frameMessage(msg));
  }

  /** Send a message and wait for a specific payloadType response. */
  request(
    payloadType: number,
    payload: Buffer,
    expectPayloadType: number
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const msgId = crypto.randomUUID();
      const timer = setTimeout(() => {
        this.handlers.delete(msgId);
        reject(new Error(`cTrader request timeout (payloadType ${payloadType})`));
      }, this.timeoutMs);

      this.handlers.set(msgId, (env) => {
        clearTimeout(timer);
        if (env.payloadType === PT.OA_ERROR_RES || env.payloadType === PT.ERROR_RES) {
          reject(new Error(parseError(env.payload)));
          return;
        }
        if (env.payloadType !== expectPayloadType) {
          reject(new Error(`Expected payloadType ${expectPayloadType}, got ${env.payloadType}`));
          return;
        }
        resolve(env.payload);
      });

      this.sendRaw(wrapMessage(payloadType, payload, msgId));
    });
  }
}

/** Open a client, run the callback, then disconnect. */
export async function withCtraderClient<T>(
  isLive: boolean,
  fn: (client: CtraderClient) => Promise<T>
): Promise<T> {
  const client = new CtraderClient(isLive);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    client.disconnect();
  }
}
