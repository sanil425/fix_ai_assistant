import { Router } from "express";
const router = Router();

/**
 * POST /tools/build-fix
 * body: { version, msgType:"D", params:{ ClOrdID, Symbol, Side, OrderQty, OrdType, Price? } }
 * returns: { fix_string, fields_used, missing }
 */
router.post("/build-fix", (req, res) => {
  const { version = "4.4", msgType = "D", params = {} } = req.body || {};
  const required = ["ClOrdID", "Symbol", "Side", "OrderQty", "OrdType"];
  const missing = required.filter(k => !params[k]);

  const needsPrice = params.OrdType === "2" && !params.Price;
  if (needsPrice) missing.push("Price");

  const fields = [
    `8=FIX.${version}`,
    "9=000",
    `35=${msgType}`,
    `11=${params.ClOrdID || "<id>"}`,
    `55=${params.Symbol || "<symbol>"}`,
    `54=${params.Side || "<1=Buy|2=Sell>"}`,
    `38=${params.OrderQty || "<qty>"}`,
    `40=${params.OrdType || "<1=Market|2=Limit>"}`
  ];
  if (params.Price) fields.push(`44=${params.Price}`);
  fields.push("10=000");

  res.json({
    fix_string: fields.join("|"),
    fields_used: Object.keys(params),
    missing
  });
});

export default router;
