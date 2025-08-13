// frontend/src/fix/fixBuilder.ts
import { SOH, newOrderRequired, newOrderConditional, cancelRequired, replaceRequired, replaceConditional } from "./fixSpec";

/**
 * Compute CheckSum(10) = sum of all bytes modulo 256, formatted as 3 digits.
 */
export function computeCheckSum(raw: string): string {
  // Sum over bytes of the entire message (up to but NOT including the checksum field itself)
  let sum = 0;
  for (let i = 0; i < raw.length; i++) sum = (sum + raw.charCodeAt(i)) & 0xff;
  return String(sum % 256).padStart(3, "0");
}

/**
 * Compute BodyLength(9) as byte count from after "9=xxx<SOH>" up to and including the last <SOH> before tag 10.
 */
export function computeBodyLength(without9And10: string): number {
  // We will insert 9 later; here `without9And10` starts with BeginString and includes all body fields except 9 and 10.
  // After we insert "9=###<SOH>" after 8, the body length is everything after that inserted SOH up to before tag 10.
  // Implementation approach: simulate the inserted 9 and measure bytes after it.
  const encoder = new TextEncoder();
  const after8Index = without9And10.indexOf(SOH, without9And10.indexOf("8="));
  const prefix = without9And10.slice(0, after8Index + 1);
  const body = without9And10.slice(after8Index + 1);
  // After insertion, bodyLength counts bytes of `body`.
  return encoder.encode(body).length;
}

type Header = {
  BeginString: string; // e.g., "FIX.4.4" or "FIXT.1.1"
  SenderCompID?: string;
  TargetCompID?: string;
  MsgSeqNum?: string;
  SendingTime?: string; // If not supplied, we can auto-generate UTC
};

function isoToFixUtc(ts: Date): string {
  // Format: YYYYMMDD-HH:MM:SS.sss (UTC)
  const pad = (n: number, w = 2) => n.toString().padStart(w, "0");
  const y = ts.getUTCFullYear();
  const m = pad(ts.getUTCMonth() + 1);
  const d = pad(ts.getUTCDate());
  const hh = pad(ts.getUTCHours());
  const mm = pad(ts.getUTCMinutes());
  const ss = pad(ts.getUTCSeconds());
  const ms = ts.getUTCMilliseconds().toString().padStart(3, "0");
  return `${y}${m}${d}-${hh}:${mm}:${ss}.${ms}`;
}

export function validateNewOrder(fields: Record<string, string>) {
  const errors: string[] = [];
  for (const tag of newOrderRequired) {
    if (!fields[tag] || String(fields[tag]).trim() === "") {
      errors.push(`Missing required field ${tag}.`);
    }
  }
  for (const cond of newOrderConditional) {
    if (cond.when(fields) && (!fields[cond.tag] || String(fields[cond.tag]).trim() === "")) {
      errors.push(`Missing conditional field ${cond.tag} (Required only for limit order type).`);
    }
  }
  return errors;
}

/**
 * Build a spec-compliant 35=D message with correct 9 and 10.
 * `fields` holds business tags: 11,55,54,38,40,44?,59?,60(UTC) etc.
 * `header` holds session tags: 8,49,56,34,52.
 */
export function buildNewOrderMessage(
  fields: Record<string, string>,
  header: Header
) {
  const errors = validateNewOrder(fields);
  const hdr: Header = { ...header };

  // Auto-populate timestamps if missing
  if (!hdr.SendingTime) hdr.SendingTime = isoToFixUtc(new Date());
  if (!fields["60"]) fields["60"] = hdr.SendingTime;

  // Construct message without 9 and 10 first, but with 8 and 35.
  // Order: 8 | 35 | (session optional) | business fields (stable order)
  const parts: string[] = [];

  // 8=BeginString
  parts.push(`8=${hdr.BeginString}`);
  // 35=MsgType D
  parts.push(`35=D`);

  // Optional session header tags if provided
  if (hdr.SenderCompID) parts.push(`49=${hdr.SenderCompID}`);
  if (hdr.TargetCompID) parts.push(`56=${hdr.TargetCompID}`);
  if (hdr.MsgSeqNum) parts.push(`34=${hdr.MsgSeqNum}`);
  if (hdr.SendingTime) parts.push(`52=${hdr.SendingTime}`);

  // Business fields in reasonable canonical order
  const pushIf = (t: string) => { if (fields[t]) parts.push(`${t}=${fields[t]}`); };
  ["11","55","54","38","40","44","59","60"].forEach(pushIf);

  // Join with SOH
  let without9and10 = parts.join(SOH) + SOH;

  // Insert BodyLength right after 8=
  const after8 = without9and10.indexOf(SOH, without9and10.indexOf("8="));
  const prefix = without9and10.slice(0, after8 + 1);
  const rest = without9and10.slice(after8 + 1);

  const bodyLength = computeBodyLength(without9and10);
  const with9 = `${prefix}9=${bodyLength}${SOH}${rest}`;

  // Now append checksum 10=###
  const with10Placeholder = with9; // checksum computed over full string including the trailing SOH of all fields except 10
  const checksum = computeCheckSum(with10Placeholder);
  const finalRaw = with10Placeholder + `10=${checksum}${SOH}`;

  // Display version with pipes for UI
  const display = finalRaw.replaceAll(SOH, "|");

  return { raw: finalRaw, display, errors };
}

// EXTEND ONLY – keep previous content
function joinSOH(parts: string[]) { return parts.join(SOH) + SOH; }

export function validate(fields: Record<string,string>, req: string[], cond?: {tag:string; when:(f:Record<string,string>)=>boolean}[]) {
  const errors: string[] = [];
  for (const t of req) if (!fields[t] || String(fields[t]).trim()==="") errors.push(`Missing required field ${t}.`);
  (cond||[]).forEach(c => { if (c.when(fields) && (!fields[c.tag] || String(fields[c.tag]).trim()==="")) errors.push(`Missing conditional field ${c.tag}.`); });
  return errors;
}

function insert9and10(msgWithout9and10: string) {
  const after8 = msgWithout9and10.indexOf(SOH, msgWithout9and10.indexOf("8="));
  const prefix = msgWithout9and10.slice(0, after8 + 1);
  const rest = msgWithout9and10.slice(after8 + 1);
  const bodyLength = computeBodyLength(msgWithout9and10);
  const with9 = `${prefix}9=${bodyLength}${SOH}${rest}`;
  const checksum = computeCheckSum(with9);
  return with9 + `10=${checksum}${SOH}`;
}

// Generic builder core
function buildCore(header: any, headParts: string[], bodyParts: string[]) {
  const start = joinSOH([`8=${header.BeginString}`, ...headParts, ...bodyParts]);
  const raw = insert9and10(start);
  return { raw, display: raw.replaceAll(SOH,"|") };
}

export function buildCancel(fields: Record<string,string>, header: any) {
  const errors = validate(fields, cancelRequired);
  // 35=F body set (order of common tags)
  const body = [
    "35=F",
    header.SenderCompID ? `49=${header.SenderCompID}` : "",
    header.TargetCompID ? `56=${header.TargetCompID}` : "",
    header.MsgSeqNum ? `34=${header.MsgSeqNum}` : "",
    header.SendingTime ? `52=${header.SendingTime}` : "",
    `41=${fields["41"]}`,
    `11=${fields["11"]}`,
    `55=${fields["55"]}`,
    `54=${fields["54"]}`,
    `60=${fields["60"] || header.SendingTime}`,
  ].filter(Boolean);
  const { raw, display } = buildCore(header, [], body);
  return { raw, display, errors };
}

export function buildReplace(fields: Record<string,string>, header: any) {
  const errors = validate(fields, replaceRequired, replaceConditional);
  const body = [
    "35=G",
    header.SenderCompID ? `49=${header.SenderCompID}` : "",
    header.TargetCompID ? `56=${header.TargetCompID}` : "",
    header.MsgSeqNum ? `34=${header.MsgSeqNum}` : "",
    header.SendingTime ? `52=${header.SendingTime}` : "",
    `41=${fields["41"]}`,
    `11=${fields["11"]}`,
    `55=${fields["55"]}`,
    `54=${fields["54"]}`,
    `38=${fields["38"]}`,
    `40=${fields["40"]}`,
    ...(fields["44"] ? [`44=${fields["44"]}`] : []),
    ...(fields["59"] ? [`59=${fields["59"]}`] : []),
    `60=${fields["60"] || header.SendingTime}`,
  ].filter(Boolean);
  const { raw, display } = buildCore(header, [], body);
  return { raw, display, errors };
}

// Simplified ExecReport helper for our mock (not full spec)
export function buildExecReport(fields: Record<string,string>, header: any) {
  // Required subset for our blotter transitions
  const base = [
    "35=8",
    header.SenderCompID ? `49=${header.SenderCompID}` : "",
    header.TargetCompID ? `56=${header.TargetCompID}` : "",
    header.MsgSeqNum ? `34=${header.MsgSeqNum}` : "",
    header.SendingTime ? `52=${header.SendingTime}` : "",
    `37=${fields["37"] || "SIM-ORDERID"}`,
    `11=${fields["11"] || ""}`,
    `150=${fields["150"]}`, // ExecType
    `39=${fields["39"]}`,    // OrdStatus
    `55=${fields["55"] || ""}`,
    `54=${fields["54"] || ""}`,
    `38=${fields["38"] || ""}`,
    `14=${fields["14"] || "0"}`,
    `151=${fields["151"] || ""}`,
    ...(fields["6"] ? [`6=${fields["6"]}`] : []),
    `60=${fields["60"] || header.SendingTime}`,
  ].filter(Boolean);
  const { raw, display } = buildCore(header, [], base);
  return { raw, display, errors: [] as string[] };
}
