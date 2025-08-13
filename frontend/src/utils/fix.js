// src/utils/fix.js

// Compute byte length using TextEncoder (browser-safe)
function byteLen(str) {
  return new TextEncoder().encode(str).length;
}

// Sum of bytes for FIX checksum computation
function byteSum(str) {
  const arr = new TextEncoder().encode(str);
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  return sum;
}

// Build a FIX NewOrderSingle (MsgType D) from core fields.
// Returns { fields: Array<{tag,name,value}>, rendered: string }
export function buildNewOrderSingle({
  version = "4.4",
  symbol = "",
  side = "1",        // 1=Buy, 2=Sell
  qty = "",
  ordType = "2",     // 1=Market, 2=Limit
  price = "",
  tif = "0",         // 0=Day (optional)
  clOrdID,
  transactTime,      // optional ISO string; if absent, we set current
  senderCompID,      // optional, omitted from demo
  targetCompID       // optional, omitted from demo
} = {}) {
  const SOH = "\x01";
  const now = new Date();
  const iso = (transactTime || now.toISOString()).replace("Z", ".000Z"); // FIX-style millisecond-ish

  const _clOrdID = clOrdID || `CID-${now.getTime()}`;

  // Required fields for MsgType D (typical minimal demo)
  const pairs = [
    ["35", "D"],                // MsgType = NewOrderSingle
    ["11", _clOrdID],           // ClOrdID
    ["55", symbol],             // Symbol
    ["54", side],               // Side
    ["38", String(qty)],        // OrderQty
    ["40", ordType],            // OrdType
  ];

  // Conditional: Price required for Limit (OrdType=2), must be omitted for Market (OrdType=1)
  if (ordType === "2") {
    pairs.push(["44", String(price || "")]); // enforce presence (validation handled separately)
  }

  // Recommended (nice for venues, optional for demo)
  if (tif) pairs.push(["59", tif]);          // TimeInForce
  pairs.push(["60", iso]);                   // TransactTime

  // Compose the message without 9/10 first
  // We'll prepend 8/9 and append 10 after computing lengths.
  // Header BeginString (8=FIX.x.y)
  const begin = `8=FIX.${version}${SOH}`;

  // Tail (everything from 35... plus any header fields we didn't include in demo)
  const tail = pairs.map(([t,v]) => `${t}=${v}`).join(SOH) + SOH;

  // BodyLength (9) is the length in bytes from after the 9=...<SOH> up to, but not including, tag 10
  // So it's simply the byte length of `tail` when we format as:
  // 8=...<SOH>9=NNN<SOH><tail>
  const bodyLen = byteLen(tail);
  const head = `${begin}9=${bodyLen}${SOH}`;
  const preChecksum = head + tail;

  // CheckSum (10) is (sum of all bytes up to and including the last <SOH> before tag 10) % 256, 3-digit padded
  const csum = String(byteSum(preChecksum) % 256).padStart(3, "0");
  const finalMsg = preChecksum + `10=${csum}${SOH}`;

  // For UI display, replace SOH with '|'
  const rendered = finalMsg.replaceAll(SOH, "|");

  const fields = [
    { tag: 8,  name: "BeginString",  value: `FIX.${version}` },
    { tag: 9,  name: "BodyLength",   value: String(bodyLen) },
    { tag: 35, name: "MsgType",      value: "D" },
    { tag: 11, name: "ClOrdID",      value: _clOrdID },
    { tag: 55, name: "Symbol",       value: symbol },
    { tag: 54, name: "Side",         value: side },
    { tag: 38, name: "OrderQty",     value: String(qty) },
    { tag: 40, name: "OrdType",      value: ordType },
    ...(ordType === "2" ? [{ tag: 44, name: "Price", value: String(price || "") }] : []),
    ...(tif ? [{ tag: 59, name: "TimeInForce", value: tif }] : []),
    { tag: 60, name: "TransactTime", value: iso },
    { tag: 10, name: "CheckSum",     value: csum },
  ];

  return { fields, rendered };
}

// Basic client-side validation rules for demo UI
export function validateNewOrder({ symbol, side, qty, ordType, price }) {
  const issues = [];

  if (!symbol) issues.push({ severity: "error", tag: 55, message: "Symbol is required." });
  if (!side)   issues.push({ severity: "error", tag: 54, message: "Side is required." });
  if (!qty)    issues.push({ severity: "error", tag: 38, message: "OrderQty is required." });
  if (!ordType) issues.push({ severity: "error", tag: 40, message: "OrdType is required." });

  if (ordType === "2" && (price === undefined || price === null || String(price).trim() === "")) {
    issues.push({ severity: "error", tag: 44, message: "Price is required for OrdType=2 (Limit)." });
  }
  if (ordType === "1" && String(price).trim() !== "") {
    issues.push({ severity: "warn", tag: 44, message: "Price should be omitted for OrdType=1 (Market)." });
  }
  return issues;
}
