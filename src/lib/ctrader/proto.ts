/**
 * Minimal hand-rolled protobuf encoder/decoder for the cTrader Open API.
 * Covers only the message types required for this integration.
 * No external packages needed — uses Node.js Buffer primitives.
 *
 * cTrader payload type constants:
 *   https://github.com/spotware/open-api-proto-messages
 */

// ─── Payload type IDs ────────────────────────────────────────────────────────

export const PT = {
  HEARTBEAT:             51,
  ERROR_RES:             50,
  OA_APP_AUTH_REQ:       2100,
  OA_APP_AUTH_RES:       2101,
  OA_ACCOUNT_AUTH_REQ:   2102,
  OA_ACCOUNT_AUTH_RES:   2103,
  OA_ACCOUNTS_REQ:       2149,
  OA_ACCOUNTS_RES:       2150,
  OA_TRADER_REQ:         2119,
  OA_TRADER_RES:         2120,
  OA_RECONCILE_REQ:      2124,
  OA_RECONCILE_RES:      2125,
  OA_DEAL_LIST_REQ:      2155,
  OA_DEAL_LIST_RES:      2156,
  OA_SYMBOLS_REQ:        2114,
  OA_SYMBOLS_RES:        2115,
  OA_ERROR_RES:          2142,
} as const;

// ─── Encoding helpers ────────────────────────────────────────────────────────

function encodeVarint(value: bigint): Buffer {
  if (value < 0n) value = (1n << 64n) + value; // two's complement (int64)
  const bytes: number[] = [];
  while (true) {
    const byte = Number(value & 0x7fn);
    value >>= 7n;
    if (value === 0n) { bytes.push(byte); break; }
    bytes.push(byte | 0x80);
  }
  return Buffer.from(bytes);
}

/** Wire type 0 — varint (int32, int64, uint32, uint64, bool, enum) */
export function fVarint(fieldNum: number, value: number | bigint): Buffer {
  const key = encodeVarint(BigInt((fieldNum << 3) | 0));
  return Buffer.concat([key, encodeVarint(BigInt(value))]);
}

/** Wire type 1 — 64-bit little-endian (double) */
export function fDouble(fieldNum: number, value: number): Buffer {
  const key = encodeVarint(BigInt((fieldNum << 3) | 1));
  const val = Buffer.allocUnsafe(8);
  val.writeDoubleLE(value, 0);
  return Buffer.concat([key, val]);
}

/** Wire type 2 — length-delimited (string) */
export function fString(fieldNum: number, value: string): Buffer {
  const key = encodeVarint(BigInt((fieldNum << 3) | 2));
  const bytes = Buffer.from(value, "utf8");
  const len = encodeVarint(BigInt(bytes.length));
  return Buffer.concat([key, len, bytes]);
}

/** Wire type 2 — length-delimited (bytes or embedded message) */
export function fBytes(fieldNum: number, value: Buffer): Buffer {
  const key = encodeVarint(BigInt((fieldNum << 3) | 2));
  const len = encodeVarint(BigInt(value.length));
  return Buffer.concat([key, len, value]);
}

/** Wire type 0 — bool */
export function fBool(fieldNum: number, value: boolean): Buffer {
  return fVarint(fieldNum, value ? 1n : 0n);
}

// ─── Decoding helpers ────────────────────────────────────────────────────────

export interface RawField {
  fieldNum: number;
  wireType: number;
  /** varint / fixed value as bigint, or bytes Buffer for wire type 2 */
  value: bigint | Buffer;
}

function readVarint(buf: Buffer, offset: number): { value: bigint; read: number } {
  let result = 0n;
  let shift = 0n;
  let read = 0;
  while (offset + read < buf.length) {
    const byte = buf[offset + read];
    result |= BigInt(byte & 0x7f) << shift;
    shift += 7n;
    read++;
    if ((byte & 0x80) === 0) break;
    if (read > 10) throw new Error("Varint overflow");
  }
  return { value: result, read };
}

export function decodeFields(buf: Buffer): RawField[] {
  const fields: RawField[] = [];
  let offset = 0;
  while (offset < buf.length) {
    const { value: key, read: keyRead } = readVarint(buf, offset);
    offset += keyRead;
    const fieldNum = Number(key >> 3n);
    const wireType = Number(key & 0x7n);
    switch (wireType) {
      case 0: {
        const { value, read } = readVarint(buf, offset);
        offset += read;
        fields.push({ fieldNum, wireType, value });
        break;
      }
      case 1: {
        const data = buf.subarray(offset, offset + 8);
        offset += 8;
        fields.push({ fieldNum, wireType, value: Buffer.from(data) });
        break;
      }
      case 2: {
        const { value: len, read: lenRead } = readVarint(buf, offset);
        offset += lenRead;
        const data = buf.subarray(offset, offset + Number(len));
        offset += Number(len);
        fields.push({ fieldNum, wireType, value: Buffer.from(data) });
        break;
      }
      case 5: {
        const data = buf.subarray(offset, offset + 4);
        offset += 4;
        fields.push({ fieldNum, wireType, value: Buffer.from(data) });
        break;
      }
      default:
        throw new Error(`Unknown wire type ${wireType} at offset ${offset}`);
    }
  }
  return fields;
}

export function getVarint(fields: RawField[], fieldNum: number): bigint | undefined {
  return fields.find(f => f.fieldNum === fieldNum && f.wireType === 0)?.value as bigint | undefined;
}

export function getString(fields: RawField[], fieldNum: number): string | undefined {
  const f = fields.find(f => f.fieldNum === fieldNum && f.wireType === 2);
  if (!f) return undefined;
  return (f.value as Buffer).toString("utf8");
}

export function getBytes(fields: RawField[], fieldNum: number): Buffer | undefined {
  const f = fields.find(f => f.fieldNum === fieldNum && f.wireType === 2);
  return f ? (f.value as Buffer) : undefined;
}

export function getAllBytes(fields: RawField[], fieldNum: number): Buffer[] {
  return fields
    .filter(f => f.fieldNum === fieldNum && f.wireType === 2)
    .map(f => f.value as Buffer);
}

export function getDouble(fields: RawField[], fieldNum: number): number | undefined {
  const f = fields.find(f => f.fieldNum === fieldNum && f.wireType === 1);
  if (!f) return undefined;
  return (f.value as Buffer).readDoubleLE(0);
}

export function getBool(fields: RawField[], fieldNum: number): boolean | undefined {
  const v = getVarint(fields, fieldNum);
  return v !== undefined ? v !== 0n : undefined;
}

// ─── ProtoMessage wrapper ────────────────────────────────────────────────────

/** Wrap a payload in the ProtoMessage envelope. */
export function wrapMessage(payloadType: number, payload: Buffer, clientMsgId?: string): Buffer {
  const parts: Buffer[] = [fVarint(1, payloadType)];
  if (payload.length > 0) parts.push(fBytes(2, payload));
  if (clientMsgId) parts.push(fString(3, clientMsgId));
  return Buffer.concat(parts);
}

export interface ProtoEnvelope {
  payloadType: number;
  payload: Buffer;
  clientMsgId?: string;
}

/** Unwrap a ProtoMessage envelope. */
export function unwrapMessage(buf: Buffer): ProtoEnvelope {
  const fields = decodeFields(buf);
  const payloadType = Number(getVarint(fields, 1) ?? 0n);
  const payload = getBytes(fields, 2) ?? Buffer.alloc(0);
  const clientMsgId = getString(fields, 3);
  return { payloadType, payload, clientMsgId };
}

// ─── Frame helpers ───────────────────────────────────────────────────────────

/** Prepend a 4-byte big-endian length to a message for wire framing. */
export function frameMessage(msg: Buffer): Buffer {
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(msg.length, 0);
  return Buffer.concat([len, msg]);
}

// ─── Message builders ────────────────────────────────────────────────────────

export function buildAppAuthReq(clientId: string, clientSecret: string): Buffer {
  return Buffer.concat([fString(1, clientId), fString(2, clientSecret)]);
}

export function buildAccountAuthReq(ctid: bigint, accessToken: string): Buffer {
  return Buffer.concat([fVarint(1, ctid), fString(2, accessToken)]);
}

export function buildGetAccountsReq(accessToken: string): Buffer {
  return fString(1, accessToken);
}

export function buildTraderReq(ctid: bigint): Buffer {
  return fVarint(1, ctid);
}

export function buildReconcileReq(ctid: bigint): Buffer {
  return fVarint(1, ctid);
}

export function buildDealListReq(ctid: bigint, fromMs: bigint, toMs: bigint, maxRows = 500): Buffer {
  return Buffer.concat([
    fVarint(1, ctid),
    fVarint(2, fromMs),
    fVarint(3, toMs),
    fVarint(4, maxRows),
  ]);
}

export function buildSymbolsReq(ctid: bigint): Buffer {
  return Buffer.concat([fVarint(1, ctid), fBool(2, false)]);
}

export function buildHeartbeat(): Buffer {
  return Buffer.alloc(0);
}

// ─── Message parsers ─────────────────────────────────────────────────────────

export function parseAccounts(buf: Buffer) {
  const fields = decodeFields(buf);
  return getAllBytes(fields, 1).map(b => {
    const f = decodeFields(b);
    return {
      ctid: (getVarint(f, 1) ?? 0n).toString(),
      isLive: getBool(f, 2) ?? false,
      traderLogin: Number(getVarint(f, 3) ?? 0n),
      brokerTitle: getString(f, 4),
    };
  });
}

export function parseTrader(buf: Buffer) {
  const fields = decodeFields(buf);
  const traderBuf = getBytes(fields, 1);
  if (!traderBuf) throw new Error("ProtoOATraderRes missing trader field");
  const tf = decodeFields(traderBuf);
  return {
    ctid: (getVarint(tf, 1) ?? 0n).toString(),
    balance: Number(getVarint(tf, 2) ?? 0n),
    equity: Number(getVarint(tf, 11) ?? 0n),
    moneyDigits: Number(getVarint(tf, 22) ?? 2n),
    currency: getString(tf, 18) ?? "USD",
    traderLogin: Number(getVarint(tf, 38) ?? getVarint(tf, 8) ?? 0n),
  };
}

export function parseDeals(buf: Buffer) {
  const fields = decodeFields(buf);
  const hasMore = getBool(fields, 3) ?? false;
  const deals = getAllBytes(fields, 2).map(b => {
    const f = decodeFields(b);
    const closeDetailBuf = getBytes(f, 16);
    let closeDetail;
    if (closeDetailBuf) {
      const cd = decodeFields(closeDetailBuf);
      closeDetail = {
        entryPrice: getDouble(cd, 1) ?? 0,
        closedVolume: Number(getVarint(cd, 2) ?? 0n),
        grossProfit: Number(getVarint(cd, 3) ?? 0n),
        swap: Number(getVarint(cd, 4) ?? 0n),
        commission: Number(getVarint(cd, 5) ?? 0n),
      };
    }
    const tradeSideRaw = Number(getVarint(f, 11) ?? 1n);
    return {
      dealId: (getVarint(f, 1) ?? 0n).toString(),
      orderId: (getVarint(f, 2) ?? 0n).toString(),
      positionId: (getVarint(f, 3) ?? 0n).toString(),
      symbolId: Number(getVarint(f, 6) ?? 0n),
      tradeSide: tradeSideRaw === 2 ? "SELL" : "BUY" as "BUY" | "SELL",
      volume: Number(getVarint(f, 4) ?? 0n),
      filledVolume: Number(getVarint(f, 5) ?? 0n),
      executionPrice: getDouble(f, 10) ?? 0,
      executionTimestamp: Number(getVarint(f, 8) ?? 0n),
      commission: Number(getVarint(f, 14) ?? 0n),
      status: Number(getVarint(f, 12) ?? 0n),
      isClosing: getBool(f, 17) ?? false,
      closeDetail,
    };
  });
  return { deals, hasMore };
}

export function parsePositions(buf: Buffer) {
  const fields = decodeFields(buf);
  return getAllBytes(fields, 2).map(b => {
    const f = decodeFields(b);
    const tradeSideRaw = Number(getVarint(f, 2) ?? 1n);
    return {
      positionId: (getVarint(f, 1) ?? 0n).toString(),
      tradeSide: tradeSideRaw === 2 ? "SELL" : "BUY" as "BUY" | "SELL",
      volume: Number(getVarint(f, 3) ?? 0n),
      entryPrice: getDouble(f, 4) ?? 0,
      symbolId: Number(getVarint(f, 5) ?? 0n),
      commission: Number(getVarint(f, 8) ?? 0n),
      swap: Number(getVarint(f, 9) ?? 0n),
      openTimestamp: Number(getVarint(f, 11) ?? 0n),
    };
  });
}

export function parseSymbols(buf: Buffer) {
  const fields = decodeFields(buf);
  return getAllBytes(fields, 2).map(b => {
    const f = decodeFields(b);
    return {
      symbolId: Number(getVarint(f, 1) ?? 0n),
      symbolName: getString(f, 2) ?? `SYM_${Number(getVarint(f, 1) ?? 0n)}`,
    };
  });
}

export function parseError(buf: Buffer): string {
  const f = decodeFields(buf);
  const code = getString(f, 1) ?? getString(f, 2) ?? "UNKNOWN";
  const desc = getString(f, 2) ?? getString(f, 3);
  return desc ? `${code}: ${desc}` : code;
}
