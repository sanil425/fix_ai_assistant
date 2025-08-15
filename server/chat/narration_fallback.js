// Deterministic English text if LLM isn't available
export function narrateFallback(payload) {
  const { intent, result } = payload || {};
  if (!result) return "I processed your request.";

  switch (result.type) {
    case "need_info": {
      const missing = (result.missing || []).join(", ");
      return missing
        ? `I need one more detail to proceed: ${missing}. For example, you can reply with "price 187.5".`
        : "I need one more detail to proceed.";
    }
    case "confirm": {
      const s = [];
      if (result.order) {
        const o = result.order;
        if (o.side) s.push(o.side);
        if (o.quantity) s.push(o.quantity);
        if (o.symbol) s.push(o.symbol);
        if (o.ordType) s.push(o.ordType);
        if (o.price) s.push(`@ ${o.price}`);
      }
      const line = s.length ? s.join(" ") : "the order details above";
      return `Please confirm ${line}. Reply "yes" to build, or "no" to cancel.`;
    }
    case "built": {
      return `Order built successfully. I can show you the FIX string or add it to the blotter.`;
    }
    case "parsed": {
      const n = (result.fields || []).length;
      return `I parsed the FIX message (${n} fields). Expand "raw" to inspect tags.`;
    }
    case "validated": {
      if (result.valid) return "Validation passed. The message meets the required checks.";
      return `Validation failed: ${ (result.errors || []).join("; ") || "see details" }`;
    }
    default:
      return "Operation completed.";
  }
}
