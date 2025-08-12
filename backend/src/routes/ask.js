import { Router } from "express";
const router = Router();

/**
 * POST /ask
 * body: { query: string, version?: "4.0"|"4.2"|"4.4"|"5.0" }
 * returns: { answer, citations: [{title,url}], used_version }
 */
router.post("/", (req, res) => {
  const { query = "", version = "4.4" } = req.body || {};
  const answer = `**Answer (preview, local stub) — FIX ${version}**

You asked: "${query}"

- MsgType (35) identifies message type.
- New Order Single is **35=D**.
- Version-specific differences will appear once the KB/LLM is plugged in.`;

  const citations = [
    { title: "FIX Trading Community", url: "https://www.fixtrading.org/" },
    { title: "OnixS FIX Dictionary", url: "https://www.onixs.biz/fix-dictionary.html" }
  ];

  res.json({ answer, citations, used_version: version });
});

export default router;
