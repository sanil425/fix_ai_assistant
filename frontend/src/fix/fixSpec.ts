// frontend/src/fix/fixSpec.ts
export const SOH = "\x01";

export const OrdType = {
  Market: "1",
  Limit: "2",
  Stop: "3",
  StopLimit: "4",
  MarketOnClose: "5",
} as const;

export const Side = {
  Buy: "1",
  Sell: "2",
  BuyMinus: "3",
  SellPlus: "4",
  SellShort: "5",
  SellShortExempt: "6",
} as const;

export const TimeInForce = {
  Day: "0",
  GTC: "1",
  OPG: "2",
  IOC: "3",
  FOK: "4",
  GTX: "5",
  GTD: "6",
} as const;

export const ExecType = {
  New: "0",
  PartialFill: "1",
  Fill: "2",
  Canceled: "4",
  Replaced: "5",
  Rejected: "8",
  PendingNew: "A",
  PendingReplace: "E",
  PendingCancel: "6",
} as const;

export const OrdStatus = {
  New: "0",
  PartiallyFilled: "1",
  Filled: "2",
  Canceled: "4",
  Replaced: "5",
  Rejected: "8",
  PendingNew: "A",
  PendingReplace: "E",
  PendingCancel: "6",
} as const;

// Human-friendly field metadata for tooltips and UI hints
export const fieldMeta: Record<string, { label: string; help?: string; required?: boolean; condition?: string; }> = {
  "11": { label: "ClOrdID", help: "Unique ID for this order assigned by you (client).", required: true },
  "55": { label: "Symbol", help: "Ticker or instrument identifier (e.g., AAPL).", required: true },
  "54": { label: "Side", help: "1=Buy, 2=Sell, etc.", required: true },
  "38": { label: "OrderQty", help: "Total order quantity.", required: true },
  "40": { label: "OrdType", help: "1=Market, 2=Limit, 3=Stop, 4=StopLimit.", required: true },
  "44": { label: "Price", help: "Required only for limit order type.", required: false, condition: "OrdType=2|4" },
  "59": { label: "TimeInForce", help: "How long the order remains active (0=Day, 1=GTC, 3=IOC, 4=FOK).", required: false },
  "60": { label: "TransactTime", help: "UTC time of order creation in YYYYMMDD-HH:MM:SS.sss.", required: true },
  // Optional session/routing tags (if you collect them from settings)
  "49": { label: "SenderCompID", help: "Your firm/session ID (configurable)." },
  "56": { label: "TargetCompID", help: "Counterparty/session ID (configurable)." },
  "34": { label: "MsgSeqNum", help: "Monotonic session sequence number (if managing sessions)." },
  "52": { label: "SendingTime", help: "UTC sending time auto-populated by system." },
};

// Add field meta used by F/G/8
Object.assign(fieldMeta, {
  "41": { label: "OrigClOrdID", help: "ClOrdID of the order you are changing/canceling.", required: true },
  "37": { label: "OrderID", help: "Assigned by the counterparty/broker (execution reports)." },
  "150": { label: "ExecType", help: "Execution type for 35=8." },
  "39":  { label: "OrdStatus", help: "Current order status for 35=8." },
  "151": { label: "LeavesQty", help: "Quantity remaining on the order." },
  "14":  { label: "CumQty", help: "Total quantity executed so far." },
  "6":   { label: "AvgPx", help: "Average execution price." },
});

// Minimal spec for 35=D construction (core tags); session-layer tags are added from context/settings.
export const newOrderRequired = ["11", "55", "54", "38", "40", "60"];
export const newOrderConditional = [{ tag: "44", when: (fields: Record<string,string>) => ["2","4"].includes(fields["40"]) }];

// Minimal specs
export const cancelRequired = ["41", "11", "55", "54", "60"];
export const replaceRequired = ["41", "11", "55", "54", "38", "40", "60"];
export const replaceConditional = [{ tag: "44", when: (f: Record<string,string>) => ["2","4"].includes(f["40"]) }];
