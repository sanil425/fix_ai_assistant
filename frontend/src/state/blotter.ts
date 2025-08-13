// frontend/src/state/blotter.ts
export type BlotterEvent = {
  ts: string;         // ISO
  msgType: string;    // D/F/G/8
  display: string;    // pipe-formatted FIX
  note?: string;
};

export type OrderRow = {
  clOrdID: string;
  symbol: string;
  side: string;
  qty: number;
  ordType: string;
  price?: number;
  status: string;     // OrdStatus
  cumQty: number;
  leavesQty: number;
  avgPx?: number;
  orderId?: string;
  history: BlotterEvent[];
};

const STORAGE_KEY = "blotter_v1";
const _orders = new Map<string, OrderRow>();

// Load from localStorage on module load
function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      _orders.clear();
      Object.entries(parsed).forEach(([key, value]) => {
        _orders.set(key, value as OrderRow);
      });
    }
  } catch (e) {
    console.warn("Failed to load blotter from localStorage:", e);
  }
}

// Save to localStorage
function saveToStorage() {
  try {
    const data = Object.fromEntries(_orders);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to save blotter to localStorage:", e);
  }
}

// Initialize on load
if (typeof window !== "undefined") {
  loadFromStorage();
}

export const blotter = {
  upsert(row: OrderRow) { 
    _orders.set(row.clOrdID, row); 
    saveToStorage();
  },
  get(clOrdID: string) { return _orders.get(clOrdID); },
  all(): OrderRow[] { return Array.from(_orders.values()); },
  log(clOrdID: string, ev: BlotterEvent) {
    const r = _orders.get(clOrdID);
    if (r) {
      r.history.push(ev);
      saveToStorage();
    }
  },
  // Clear all orders (useful for testing)
  clear() {
    _orders.clear();
    localStorage.removeItem(STORAGE_KEY);
  }
};
